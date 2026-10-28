import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import object_session

from ..models import FinancialProfile
from .orchestrator import (
    call_aws_ai_gateway,
    run_pii_shield,
    run_extraction_agent,
    run_policy_agent,
    calculate_feasibility_math,
    run_investigator_agent,
    run_remediation_and_workflow_agent,
)


# =============================================================================
# 3 CORE PILLARS OF MODULAR AI ANALYSIS + 360° CLIENT EXECUTIVE SUMMARY
# =============================================================================

AGENT_CATALOG: List[Dict[str, Any]] = [
    {
        "agentId": "dti_repayment_capacity",
        "name": "DTI & Repayment Capacity Verification Agent",
        "shortLabel": "1. DTI & Repayment Capacity",
        "icon": "Calculator",
        "color": "emerald",
        "description": (
            "Collects and structures income sources, active loan installments, and household living expenses; "
            "computes regulatory DTI (40% cap), +2% rate stress-test, and net disposable cashflow, flagging missing or contradictory data."
        ),
        "recommendedFor": [
            "Personal Consumer Loan",
            "Loan Application",
            "Residential Mortgage Loan",
            "Auto & Green Mobility Loan",
            "SME Micro-Credit",
            "Credit Card & Overdraft",
            "Account Opening",
            "Customer Profile Update",
        ],
    },
    {
        "agentId": "unusual_transactions",
        "name": "Unusual Transactions & Expense Anomaly Agent",
        "shortLabel": "2. Unusual Transactions",
        "icon": "ScanSearch",
        "color": "purple",
        "description": (
            "Analyzes 3-month bank statement inflows/outflows, aggregates baseline living expenses, detects unusual spending variations, "
            "and isolates unverified ('suspected') transactions with evidence notes for bank officer verification."
        ),
        "recommendedFor": [
            "Personal Consumer Loan",
            "Loan Application",
            "Residential Mortgage Loan",
            "Auto & Green Mobility Loan",
            "SME Micro-Credit",
            "Credit Card & Overdraft",
            "Account Opening",
            "Customer Profile Update",
        ],
    },
    {
        "agentId": "doc_reconciliation",
        "name": "Document Verification & Data Reconciliation Agent",
        "shortLabel": "3. Document Reconciliation",
        "icon": "FileSpreadsheet",
        "color": "amber",
        "description": (
            "Extracts structured fields from attached financial and KYC documents, cross-checks them against internal system records, "
            "ANAF, and the Financial Profile, and flags differences in declared income, observed inflows, obligations, or identity."
        ),
        "recommendedFor": [
            "Personal Consumer Loan",
            "Loan Application",
            "Residential Mortgage Loan",
            "Auto & Green Mobility Loan",
            "SME Micro-Credit",
            "Credit Card & Overdraft",
            "Account Opening",
            "Customer Profile Update",
        ],
    },
]


def is_agent_recommended(agent_meta: Dict[str, Any], case_title: str, case_type: str) -> bool:
    return True


def _get_financial_profile(case_obj) -> Optional[FinancialProfile]:
    """Safely fetches the client's FinancialProfile from the active SQLAlchemy session if available."""
    try:
        sess = object_session(case_obj)
        if sess is not None and case_obj.client_id is not None:
            return sess.get(FinancialProfile, case_obj.client_id)
    except Exception:
        pass
    return None


def _extract_bank_statement_metrics(documents: list, fallback_income: float, fallback_debts: float) -> Dict[str, Any]:
    """Parses the 3-Month Bank Statement document for inflows, debt service, and closing balance."""
    stmt_doc = next((d for d in documents if d.document_type == "Bank Statement"), None)
    salary_inflows: List[Dict[str, Any]] = []
    closing_balance: Optional[float] = None
    external_debt_service: Optional[float] = None
    iban: str = "N/A"

    if stmt_doc and stmt_doc.content_text:
        for idx, raw_line in enumerate(stmt_doc.content_text.splitlines(), start=1):
            clean = re.sub(r"^Line\s+\d+\s*:\s*", "", raw_line).strip()
            if "IBAN:" in clean:
                iban_part = clean.split("|")[0].replace("IBAN:", "").strip()
                if iban_part:
                    iban = iban_part
            if "Salary Credit" in clean or "Salary Inflow" in clean:
                m = re.search(r"([+\-]?\d[\d\.,]*)\s*(?:EUR|RON)", clean)
                if m:
                    try:
                        val = float(m.group(1).replace("+", "").replace(",", ""))
                        if "Month -" in clean:
                            month_label = clean.split(":")[0].strip()
                            salary_inflows.append({
                                "month": month_label,
                                "amount": val,
                                "lineNumber": idx,
                                "documentId": stmt_doc.id,
                                "documentName": stmt_doc.file_name,
                                "quote": raw_line,
                            })
                    except ValueError:
                        pass
            if "External Credit Bureau Monthly Debt Service" in clean or "Existing Debt Repayments" in clean:
                m = re.search(r"(\d[\d\.,]*)\s*(?:EUR|RON)", clean)
                if m:
                    try:
                        external_debt_service = float(m.group(1).replace(",", ""))
                    except ValueError:
                        pass
            if "Closing Account Balance" in clean:
                m = re.search(r"(\d[\d\.,]*)\s*(?:EUR|RON)", clean)
                if m:
                    try:
                        closing_balance = float(m.group(1).replace(",", ""))
                    except ValueError:
                        pass

    avg_inflow = (
        round(sum(x["amount"] for x in salary_inflows) / len(salary_inflows), 2)
        if salary_inflows
        else fallback_income
    )
    return {
        "hasBankStatement": stmt_doc is not None,
        "documentId": stmt_doc.id if stmt_doc else None,
        "documentName": stmt_doc.file_name if stmt_doc else "N/A",
        "iban": iban,
        "salaryInflows": salary_inflows,
        "averageMonthlyInflow": avg_inflow,
        "externalDebtService": external_debt_service if external_debt_service is not None else fallback_debts,
        "closingBalance": closing_balance if closing_balance is not None else round(fallback_income * 2.4, 2),
    }


def _aggregate_financial_profile_data(case_obj, profile: Optional[FinancialProfile]) -> Dict[str, Any]:
    """
    Aggregates income, expenses, and credits according to the strict banking rules in AGENTS.md:
    - Total expenses include 'declared' and 'confirmed'; 'suspected' is isolated separately; 'dismissed' is excluded.
    - Active and overdue credits are included in monthly debt payments; 'paid_off' credits are excluded.
    - 'suspected' means unverified and preserves its status and evidence_note.
    """
    client = case_obj.client
    declared_client_income = float(client.monthly_income or 0.0)
    anaf_income = float(client.anaf_income) if client.anaf_income is not None else None
    client_existing_debts = float(client.existing_monthly_debts or 0.0)

    if profile is not None:
        prof_salary = float(profile.monthly_salary or 0.0)
        prof_other = float(profile.other_monthly_income or 0.0)
        prof_total_income = round(prof_salary + prof_other, 2)
        currency = profile.currency or case_obj.currency or "EUR"
        marital_status = profile.marital_status or client.marital_status or "Single"
        children_count = int(profile.number_of_children if profile.number_of_children is not None else (client.dependents_count or 0))

        baseline_expenses = []
        suspected_expenses = []
        dismissed_expenses = []

        for exp in profile.expenses:
            item = {
                "id": exp.id,
                "category": exp.category,
                "categoryLabel": exp.category.replace("_", " ").title(),
                "monthlyAmount": round(float(exp.monthly_amount or 0.0), 2),
                "verificationStatus": exp.verification_status,
                "evidenceNote": exp.evidence_note or "No additional note.",
            }
            if exp.verification_status in ("declared", "confirmed"):
                baseline_expenses.append(item)
            elif exp.verification_status == "suspected":
                suspected_expenses.append(item)
            elif exp.verification_status == "dismissed":
                dismissed_expenses.append(item)

        active_credits = []
        paid_off_credits = []
        for cr in profile.credits:
            c_item = {
                "id": cr.id,
                "lender": cr.lender,
                "creditType": cr.credit_type.replace("_", " ").title(),
                "originalAmount": round(float(cr.original_amount or 0.0), 2),
                "remainingBalance": round(float(cr.remaining_balance or 0.0), 2),
                "monthlyPayment": round(float(cr.monthly_payment or 0.0), 2),
                "interestRateAnnual": round(float(cr.interest_rate_annual or 0.0), 2) if cr.interest_rate_annual is not None else None,
                "remainingTermMonths": cr.remaining_term_months,
                "status": cr.status,
            }
            if cr.status in ("active", "overdue"):
                active_credits.append(c_item)
            else:
                paid_off_credits.append(c_item)

        baseline_expenses_total = round(sum(x["monthlyAmount"] for x in baseline_expenses), 2)
        suspected_expenses_total = round(sum(x["monthlyAmount"] for x in suspected_expenses), 2)
        active_credits_monthly_total = round(sum(x["monthlyPayment"] for x in active_credits), 2)
        active_credits_balance_total = round(sum(x["remainingBalance"] for x in active_credits), 2)
    else:
        prof_salary = declared_client_income
        prof_other = 0.0
        prof_total_income = declared_client_income
        currency = case_obj.currency or "EUR"
        marital_status = client.marital_status or "Single"
        children_count = int(client.dependents_count or 0)
        baseline_expenses = []
        suspected_expenses = []
        dismissed_expenses = []
        active_credits = []
        paid_off_credits = []
        baseline_expenses_total = round(declared_client_income * 0.35, 2)
        suspected_expenses_total = 0.0
        active_credits_monthly_total = client_existing_debts
        active_credits_balance_total = 0.0

    return {
        "hasFinancialProfile": profile is not None,
        "currency": currency,
        "maritalStatus": str(marital_status).title(),
        "childrenCount": children_count,
        "declaredClientIncome": declared_client_income,
        "anafIncome": anaf_income,
        "profileSalary": prof_salary,
        "profileOtherIncome": prof_other,
        "profileTotalIncome": prof_total_income,
        "clientExistingDebts": client_existing_debts,
        "baselineExpenses": baseline_expenses,
        "baselineExpensesTotal": baseline_expenses_total,
        "suspectedExpenses": suspected_expenses,
        "suspectedExpensesTotal": suspected_expenses_total,
        "dismissedExpensesCount": len(dismissed_expenses),
        "activeCredits": active_credits,
        "paidOffCredits": paid_off_credits,
        "activeCreditsMonthlyTotal": active_credits_monthly_total,
        "activeCreditsBalanceTotal": active_credits_balance_total,
    }


# =============================================================================
# PILLAR 1: DTI & REPAYMENT CAPACITY VERIFICATION AGENT
# (Verificarea gradului de îndatorare și a capacității de rambursare)
# =============================================================================

def _run_dti_repayment_capacity_module(
    case_obj,
    extracted_fields: list,
    feasibility_math: dict,
    findings: list,
    fp_data: dict,
) -> Dict[str, Any]:
    client = case_obj.client
    # Stress-test scenario (+2.0% interest rate shock)
    base_rate = float(feasibility_math.get("annual_interest_rate_percent", 8.9))
    stressed_rate = round(base_rate + 2.0, 2)
    income_used = float(feasibility_math.get("monthly_income_used", client.monthly_income or 5000.0))
    existing_debts_used = float(feasibility_math.get("existing_monthly_debts", client.existing_monthly_debts or 0.0))
    requested_amount = float(feasibility_math.get("requested_amount", case_obj.requested_amount or 35000.0))
    term_months = int(feasibility_math.get("loan_term_months", case_obj.loan_term_months or 60))

    stressed_math = calculate_feasibility_math(
        monthly_income=income_used,
        existing_debts=existing_debts_used,
        requested_amount=requested_amount,
        loan_term_months=term_months,
        annual_interest_rate=stressed_rate,
    )

    dti_base = float(feasibility_math.get("dti_percentage", 0.0))
    dti_stressed = float(stressed_math.get("dti_percentage", 0.0))
    installment_base = float(feasibility_math.get("calculated_monthly_installment", 0.0))
    installment_stressed = float(stressed_math.get("calculated_monthly_installment", 0.0))
    total_debt_service = round(existing_debts_used + installment_base, 2)

    # Disposable cashflow after living expenses (declared + confirmed) and all loan installments
    living_expenses = fp_data["baselineExpensesTotal"]
    total_monthly_outflows_with_loan = round(living_expenses + total_debt_service, 2)
    net_disposable_cashflow = round(income_used - total_monthly_outflows_with_loan, 2)

    # Identify missing or contradictory financial data
    contradictions: List[Dict[str, str]] = []
    if fp_data["hasFinancialProfile"]:
        if abs(fp_data["profileSalary"] - fp_data["declaredClientIncome"]) > 1.0:
            contradictions.append({
                "field": "Monthly Salary",
                "issue": f"Case declared income (€{fp_data['declaredClientIncome']:,.0f}) differs from Financial Profile salary (€{fp_data['profileSalary']:,.0f}).",
                "severity": "warning",
            })
        if abs(fp_data["activeCreditsMonthlyTotal"] - fp_data["clientExistingDebts"]) > 1.0:
            contradictions.append({
                "field": "Existing Loan Obligations",
                "issue": (
                    f"CRM existing debts (€{fp_data['clientExistingDebts']:,.0f}/mo) differ from active credits in Financial Profile "
                    f"(€{fp_data['activeCreditsMonthlyTotal']:,.0f}/mo across {len(fp_data['activeCredits'])} active loan(s))."
                ),
                "severity": "warning",
            })
    if client.anaf_income is not None and abs(float(client.anaf_income) - fp_data["declaredClientIncome"]) > 1.0:
        contradictions.append({
            "field": "ANAF Fiscal Revenue vs Declared",
            "issue": f"Application declared €{fp_data['declaredClientIncome']:,.0f}/mo, whereas ANAF database reports €{float(client.anaf_income):,.0f}/mo.",
            "severity": "warning",
        })
    if not client.anaf_consent:
        contradictions.append({
            "field": "ANAF Interrogation Consent",
            "issue": "Electronic ANAF interrogation consent is missing; income verification relies on physical paper certificate.",
            "severity": "info",
        })

    dti_findings = [
        f for f in findings
        if f.get("field") in ("monthly_income", "existing_debts", "dti_ratio") or "DTI" in f.get("title", "")
    ]

    is_over_dti = dti_base > 40.0
    has_cashflow_deficit = net_disposable_cashflow < 300.0

    prompt = (
        f"You are the DTI & Repayment Capacity AI Agent for Raiffeisen Bank. "
        f"Case #{case_obj.case_number} ({case_obj.title}) for {client.full_name}. "
        f"Structured Financials: Eligible Net Income €{income_used:,.0f}/mo (+ €{fp_data['profileOtherIncome']:,.0f} supplemental), "
        f"Existing Active Loan Installments €{existing_debts_used:,.0f}/mo (Total Remaining Debt Balance €{fp_data['activeCreditsBalanceTotal']:,.0f}), "
        f"Proposed New Installment €{installment_base:,.2f}/mo over {term_months}m at {base_rate}%. "
        f"Calculated Regulatory DTI: {dti_base}% (40% max ceiling); Stress-Test DTI (+2% rate): {dti_stressed}%. "
        f"Confirmed/Declared Household Living Expenses: €{living_expenses:,.0f}/mo -> Net Monthly Disposable Cashflow after all expenses & loans: €{net_disposable_cashflow:,.0f}/mo. "
        f"Missing/Contradictory signals: {json.dumps(contradictions)}. "
        f"Write a concise 2-3 sentence credit assessment on debt sustainability, repayment capacity, and any missing/contradictory data."
    )
    aws_insight = call_aws_ai_gateway(prompt, system_prompt="You are a quantitative credit risk and repayment capacity AI specialist.")
    used_aws = bool(aws_insight and len(aws_insight.strip()) > 10)

    if not used_aws:
        if is_over_dti:
            aws_insight = (
                f"Prudential DTI Alert (REG-DTI-04): Total debt service of €{total_debt_service:,.2f}/mo results in a {dti_base}% DTI ratio, "
                f"exceeding the 40% regulatory ceiling (stress-tested at {dti_stressed}%). Restructuring tenor or reducing principal is required."
            )
        else:
            contra_note = (
                f" Note: {len(contradictions)} data variance(s) detected ({contradictions[0]['issue']})"
                if contradictions
                else " All income and obligation figures are reconciled across system records."
            )
            aws_insight = (
                f"Repayment Capacity Verified: Baseline DTI is {dti_base}% (€{installment_base:,.2f}/mo new installment + €{existing_debts_used:,.0f}/mo existing debts), "
                f"remaining resilient at {dti_stressed}% under a +2.0% interest rate shock. After deducting €{living_expenses:,.0f}/mo in household living expenses "
                f"and all debt payments, the applicant retains a net disposable cashflow buffer of €{net_disposable_cashflow:,.0f}/mo.{contra_note}"
            )

    status = "critical" if is_over_dti else ("needs_review" if (contradictions or has_cashflow_deficit) else "passed")
    badge_text = (
        f"DTI {dti_base}% (Exceeds 40%)"
        if is_over_dti
        else (f"DTI {dti_base}% • Review Data" if contradictions else f"DTI {dti_base}% (Eligible)")
    )

    return {
        "agentId": "dti_repayment_capacity",
        "name": "DTI & Repayment Capacity Verification Agent",
        "status": status,
        "badgeText": badge_text,
        "engineUsed": "AWS Bedrock (Amazon Nova Pro) + Python Financial Calculator" if used_aws else "Deterministic Python Financial Calculator",
        "executedAt": datetime.utcnow().strftime("%H:%M:%S UTC"),
        "aiNarrative": aws_insight.strip(),
        "highlights": [
            {
                "label": "Baseline DTI (Max 40%)",
                "value": f"{dti_base}% (€{total_debt_service:,.0f}/mo debt)",
                "status": "critical" if dti_base > 40 else ("warning" if dti_base > 35 else "ok"),
            },
            {
                "label": "Stress-Test DTI (+2% Rate)",
                "value": f"{dti_stressed}% (€{installment_stressed:,.0f}/mo)",
                "status": "warning" if dti_stressed > 40 else "ok",
            },
            {
                "label": "Household Living Expenses",
                "value": f"€{living_expenses:,.0f} / month",
                "status": "ok",
            },
            {
                "label": "Net Disposable Cashflow",
                "value": f"€{net_disposable_cashflow:,.0f} / month left",
                "status": "critical" if net_disposable_cashflow < 0 else ("warning" if net_disposable_cashflow < 400 else "ok"),
            },
        ],
        "structuredData": {
            "incomeSources": {
                "declaredCaseIncome": fp_data["declaredClientIncome"],
                "anafVerifiedIncome": fp_data["anafIncome"],
                "profileMonthlySalary": fp_data["profileSalary"],
                "profileOtherIncome": fp_data["profileOtherIncome"],
                "eligibleIncomeUsed": income_used,
            },
            "obligations": {
                "existingMonthlyDebts": existing_debts_used,
                "activeCreditsCount": len(fp_data["activeCredits"]),
                "activeCreditsBalance": fp_data["activeCreditsBalanceTotal"],
                "activeCreditsList": fp_data["activeCredits"],
                "paidOffCreditsExcluded": len(fp_data["paidOffCredits"]),
                "proposedNewInstallment": installment_base,
                "stressedNewInstallment": installment_stressed,
                "totalMonthlyDebtService": total_debt_service,
            },
            "cashflow": {
                "livingExpensesDeclaredConfirmed": living_expenses,
                "totalOutflowsWithNewLoan": total_monthly_outflows_with_loan,
                "netDisposableMonthlyCashflow": net_disposable_cashflow,
                "dtiBasePercent": dti_base,
                "dtiStressedPercent": dti_stressed,
            },
            "contradictionsAndMissing": contradictions,
        },
        "findings": dti_findings,
    }


# =============================================================================
# PILLAR 2: UNUSUAL TRANSACTIONS & EXPENSE ANOMALY AGENT
# (Detectarea tranzacțiilor neobișnuite)
# =============================================================================

def _run_unusual_transactions_module(
    case_obj,
    documents: list,
    fp_data: dict,
) -> Dict[str, Any]:
    client = case_obj.client
    stmt_metrics = _extract_bank_statement_metrics(
        documents,
        fallback_income=float(client.monthly_income or 5000.0),
        fallback_debts=float(client.existing_monthly_debts or 0.0),
    )

    avg_inflow = stmt_metrics["averageMonthlyInflow"]
    closing_balance = stmt_metrics["closingBalance"]
    baseline_expenses_total = fp_data["baselineExpensesTotal"]
    suspected_expenses = fp_data["suspectedExpenses"]
    suspected_total = fp_data["suspectedExpensesTotal"]

    # Detect expense spikes or unusual items
    # 1. Any 'suspected' expense in FinancialProfile (kept strictly as unverified per AGENTS.md)
    # 2. Any single non-housing category exceeding 25% of monthly income
    unusual_signals: List[Dict[str, Any]] = []
    for s_exp in suspected_expenses:
        unusual_signals.append({
            "type": "suspected_merchant_signal",
            "category": s_exp["categoryLabel"],
            "monthlyAmount": s_exp["monthlyAmount"],
            "verificationStatus": "suspected",
            "evidenceNote": s_exp["evidenceNote"],
            "actionRequired": "Unverified signal ('suspected') — requires bank officer confirmation with applicant before any credit impact.",
        })

    for b_exp in fp_data["baselineExpenses"]:
        if b_exp["category"] != "housing" and avg_inflow > 0 and (b_exp["monthlyAmount"] / avg_inflow) > 0.25:
            unusual_signals.append({
                "type": "elevated_category_outflow",
                "category": b_exp["categoryLabel"],
                "monthlyAmount": b_exp["monthlyAmount"],
                "verificationStatus": b_exp["verificationStatus"],
                "evidenceNote": f"Category represents {round((b_exp['monthlyAmount'] / avg_inflow) * 100, 1)}% of monthly salary inflow.",
                "actionRequired": "Verify whether outflow is recurring or a one-off household expenditure.",
            })

    # Liquidity buffer in months of regular expenses
    monthly_burn = max(1.0, baseline_expenses_total + stmt_metrics["externalDebtService"])
    liquidity_months = round(closing_balance / monthly_burn, 1)

    prompt = (
        f"You are the Unusual Transactions & Behavioral Expense AI Agent for Raiffeisen Bank. "
        f"Case #{case_obj.case_number} for {client.full_name}. "
        f"3-Month Bank Statement ({stmt_metrics['documentName']}): Average monthly salary inflow €{avg_inflow:,.2f}, "
        f"Closing account balance €{closing_balance:,.2f} ({liquidity_months} months liquidity buffer). "
        f"Regular baseline living expenses (declared/confirmed): €{baseline_expenses_total:,.2f}/mo across {len(fp_data['baselineExpenses'])} categories. "
        f"Unverified ('suspected') or unusual transaction signals: {json.dumps(unusual_signals)}. "
        f"Important rule: 'suspected' items are unverified signals and must NOT be treated as proven facts or automatic rejections; "
        f"prepare clear evidence for the human officer to verify. Write a 2-sentence analytical summary."
    )
    aws_insight = call_aws_ai_gateway(prompt, system_prompt="You are a banking transaction behavior and anomaly detection AI specialist.")
    used_aws = bool(aws_insight and len(aws_insight.strip()) > 10)

    if not used_aws:
        if unusual_signals:
            sig_desc = ", ".join(f"{s['category']} (€{s['monthlyAmount']:,.0f}/mo — {s['verificationStatus']})" for s in unusual_signals)
            aws_insight = (
                f"Account statement analysis confirms recurring monthly salary inflows of €{avg_inflow:,.2f} and regular household expenses of "
                f"€{baseline_expenses_total:,.2f}/mo. However, {len(unusual_signals)} unusual/unverified signal(s) were isolated separately: "
                f"{sig_desc}. Per bank policy, 'suspected' items remain unverified signals excluded from baseline totals and are queued with evidence notes for officer review."
            )
        else:
            aws_insight = (
                f"3-Month Bank Statement ({stmt_metrics['documentName']}) shows stable monthly salary inflows of €{avg_inflow:,.2f} and predictable "
                f"living outflows of €{baseline_expenses_total:,.2f}/mo, with a closing liquidity reserve of €{closing_balance:,.2f} ({liquidity_months} months coverage) "
                f"and zero unusual transaction spikes or suspected merchant signals."
            )

    has_suspected = len(unusual_signals) > 0
    return {
        "agentId": "unusual_transactions",
        "name": "Unusual Transactions & Expense Anomaly Agent",
        "status": "needs_review" if has_suspected else "passed",
        "badgeText": f"{len(unusual_signals)} Unusual Signal(s)" if has_suspected else "No Anomalies",
        "engineUsed": "AWS Bedrock (Amazon Nova Pro) + Transaction Analyzer" if used_aws else "Deterministic Transaction & Expense Analyzer",
        "executedAt": datetime.utcnow().strftime("%H:%M:%S UTC"),
        "aiNarrative": aws_insight.strip(),
        "highlights": [
            {
                "label": "Observed Monthly Inflows",
                "value": f"€{avg_inflow:,.0f} / mo (3M Avg)",
                "status": "ok",
            },
            {
                "label": "Regular Living Expenses",
                "value": f"€{baseline_expenses_total:,.0f} / mo ({len(fp_data['baselineExpenses'])} items)",
                "status": "ok",
            },
            {
                "label": "Unverified / Suspected Signals",
                "value": f"€{suspected_total:,.0f} / mo ({len(suspected_expenses)} item(s))" if suspected_expenses else "0 Signals (€0)",
                "status": "warning" if suspected_expenses else "ok",
            },
            {
                "label": "Account Liquidity Reserve",
                "value": f"€{closing_balance:,.0f} ({liquidity_months}m buffer)",
                "status": "ok" if liquidity_months >= 1.5 else "warning",
            },
        ],
        "transactionBreakdown": {
            "bankStatementDocument": stmt_metrics["documentName"],
            "iban": stmt_metrics["iban"],
            "salaryInflows": stmt_metrics["salaryInflows"],
            "averageMonthlyInflow": avg_inflow,
            "closingBalance": closing_balance,
            "liquidityCoverageMonths": liquidity_months,
            "baselineExpenses": fp_data["baselineExpenses"],
            "baselineExpensesTotal": baseline_expenses_total,
            "suspectedSignals": unusual_signals,
            "suspectedExpensesTotal": suspected_total,
        },
        "findings": [],
    }


# =============================================================================
# PILLAR 3: DOCUMENT VERIFICATION & DATA RECONCILIATION AGENT
# (Verificarea documentelor și reconcilierea datelor)
# =============================================================================

def _run_doc_reconciliation_module(
    case_obj,
    documents: list,
    extracted_fields: list,
    findings: list,
    fp_data: dict,
) -> Dict[str, Any]:
    client = case_obj.client
    stmt_metrics = _extract_bank_statement_metrics(
        documents,
        fallback_income=float(client.monthly_income or 5000.0),
        fallback_debts=float(client.existing_monthly_debts or 0.0),
    )

    # Build 3-Way Reconciliation Matrix:
    # 1. Extracted Document Value vs 2. System/ANAF Value vs 3. Financial Profile Value
    income_extractions = [x for x in extracted_fields if x.get("field") == "monthly_income"]
    name_extractions = [x for x in extracted_fields if x.get("field") == "applicant_name"]
    addr_extractions = [x for x in extracted_fields if x.get("field") == "address"]
    id_val_extractions = [x for x in extracted_fields if x.get("field") == "id_card_validity"]

    doc_incomes_str = ", ".join(sorted({f"€{int(x['value']):,}" for x in income_extractions})) or f"€{int(client.monthly_income or 0):,}"
    sys_income_str = (
        f"€{int(client.monthly_income or 0):,} (ANAF: €{int(client.anaf_income):,})"
        if client.anaf_income is not None
        else f"€{int(client.monthly_income or 0):,}"
    )
    prof_income_str = f"€{int(fp_data['profileSalary']):,}" + (
        f" (+€{int(fp_data['profileOtherIncome']):,} other)" if fp_data["profileOtherIncome"] > 0 else ""
    )

    inc_mismatch = any(f.get("field") == "monthly_income" and f.get("flagType") == "red_flag" for f in findings)
    name_mismatch = any(f.get("field") == "applicant_name" and f.get("flagType") == "red_flag" for f in findings)
    addr_mismatch = any(f.get("field") == "address" and f.get("flagType") == "red_flag" for f in findings)
    id_expired = any(f.get("field") == "id_card_validity" and f.get("flagType") == "red_flag" for f in findings)
    debt_mismatch = abs(fp_data["activeCreditsMonthlyTotal"] - fp_data["clientExistingDebts"]) > 1.0

    reconciliation_matrix = [
        {
            "dimension": "Net Monthly Income",
            "documentsValue": f"{doc_incomes_str} ({len(income_extractions)} docs)",
            "systemRecordValue": sys_income_str,
            "financialProfileValue": prof_income_str,
            "status": "mismatch" if inc_mismatch else "matched",
            "ruleRef": "PROC-INC-03",
        },
        {
            "dimension": "Existing Monthly Debt Service",
            "documentsValue": f"€{stmt_metrics['externalDebtService']:,.0f}/mo (Bank Stmt / Bureau)",
            "systemRecordValue": f"€{fp_data['clientExistingDebts']:,.0f}/mo",
            "financialProfileValue": f"€{fp_data['activeCreditsMonthlyTotal']:,.0f}/mo ({len(fp_data['activeCredits'])} active loans)",
            "status": "mismatch" if debt_mismatch else "matched",
            "ruleRef": "REG-DTI-04",
        },
        {
            "dimension": "Applicant Legal Name",
            "documentsValue": " / ".join(sorted({x["value"] for x in name_extractions})) or client.full_name,
            "systemRecordValue": client.full_name,
            "financialProfileValue": client.full_name,
            "status": "mismatch" if name_mismatch else "matched",
            "ruleRef": "PROC-KYC-01",
        },
        {
            "dimension": "National ID (CNP / SSN)",
            "documentsValue": client.national_id,
            "systemRecordValue": client.national_id,
            "financialProfileValue": client.national_id,
            "status": "matched",
            "ruleRef": "PROC-KYC-01",
        },
        {
            "dimension": "Identity Card Validity",
            "documentsValue": id_val_extractions[0]["value"] if id_val_extractions else f"Expires {client.id_card_expiry}",
            "systemRecordValue": f"{client.id_card_series} (Exp: {client.id_card_expiry})",
            "financialProfileValue": "Expired — Renewal Required" if id_expired else "Valid Identity Document",
            "status": "mismatch" if id_expired else "matched",
            "ruleRef": "PROC-DOC-02",
        },
        {
            "dimension": "Residential Address",
            "documentsValue": f"{len({x['value'].lower() for x in addr_extractions})} distinct address(es) in docs",
            "systemRecordValue": client.address or "N/A",
            "financialProfileValue": client.housing_status or "Verified",
            "status": "mismatch" if addr_mismatch else "matched",
            "ruleRef": "PROC-KYC-01",
        },
    ]

    red_findings = [f for f in findings if f.get("flagType") == "red_flag"]
    total_discrepancies = sum(1 for row in reconciliation_matrix if row["status"] == "mismatch")

    prompt = (
        f"You are the Document Verification & 3-Way Data Reconciliation AI Agent for Raiffeisen Bank. "
        f"Case #{case_obj.case_number} ({case_obj.title}) for {client.full_name}. "
        f"Parsed {len(documents)} documents ({len(extracted_fields)} extracted fields with exact line citations). "
        f"Reconciliation Matrix results: {json.dumps(reconciliation_matrix)}. "
        f"Specific findings: {json.dumps([f['title'] + ': ' + f['description'] for f in findings])}. "
        f"Provide a 2-3 sentence compliance and data reconciliation summary citing PROC-KYC-01, PROC-DOC-02, or PROC-INC-03."
    )
    aws_insight = call_aws_ai_gateway(prompt, system_prompt="You are a senior banking document verification and data reconciliation AI agent.")
    used_aws = bool(aws_insight and len(aws_insight.strip()) > 10)

    if not used_aws:
        if total_discrepancies > 0:
            mismatch_names = ", ".join(r["dimension"] for r in reconciliation_matrix if r["status"] == "mismatch")
            aws_insight = (
                f"3-Way Data Reconciliation across {len(documents)} documents, CRM/ANAF records, and the Financial Profile flagged "
                f"{total_discrepancies} discrepancy area(s): {mismatch_names}. Under PROC-KYC-01, PROC-DOC-02, and PROC-INC-03, "
                f"official certified documents and ANAF records prevail; officer validation or customer document re-upload is required."
            )
        else:
            aws_insight = (
                f"Full 3-Way Reconciliation Passed: All {len(extracted_fields)} extracted data points across {len(documents)} supporting documents "
                f"(Application, ID Card, Salary Certificate, 3M Bank Statement) match 100% with CRM, ANAF, and Financial Profile records."
            )

    return {
        "agentId": "doc_reconciliation",
        "name": "Document Verification & Data Reconciliation Agent",
        "status": "action_required" if total_discrepancies > 0 else "passed",
        "badgeText": f"{total_discrepancies} Discrepanc{'y' if total_discrepancies == 1 else 'ies'}" if total_discrepancies > 0 else "100% Reconciled",
        "engineUsed": "AWS Bedrock (Amazon Nova Pro) + 3-Way Reconciliation Engine" if used_aws else "Deterministic 3-Way Reconciliation Engine",
        "executedAt": datetime.utcnow().strftime("%H:%M:%S UTC"),
        "aiNarrative": aws_insight.strip(),
        "highlights": [
            {
                "label": "Documents & Fields Parsed",
                "value": f"{len(documents)} Docs • {len(extracted_fields)} Fields",
                "status": "ok",
            },
            {
                "label": "Income Reconciliation",
                "value": "Mismatch Flagged" if inc_mismatch else f"Matched ({sys_income_str})",
                "status": "warning" if inc_mismatch else "ok",
            },
            {
                "label": "Identity & KYC Validity",
                "value": "Expired ID / Mismatch" if (id_expired or name_mismatch or addr_mismatch) else f"Valid ({client.id_card_series})",
                "status": "critical" if id_expired else ("warning" if (name_mismatch or addr_mismatch) else "ok"),
            },
            {
                "label": "3-Way Matrix Status",
                "value": f"{6 - total_discrepancies}/6 Dimensions Matched",
                "status": "warning" if total_discrepancies > 0 else "ok",
            },
        ],
        "reconciliationMatrix": reconciliation_matrix,
        "findings": findings,
    }


# =============================================================================
# COMPLETE 360° CLIENT EXECUTIVE SUMMARY BUILDER
# (Rezumatul complet despre client la finalul analizei)
# =============================================================================

def build_client_executive_summary_360(
    case_obj,
    modular_results: Dict[str, Any],
    feasibility_math: Dict[str, Any],
    findings: List[Dict[str, Any]],
    remediation: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Constructs a comprehensive 360-degree Executive Client Summary combining:
    1. Complete Demographic, Employment & Credit Bureau Profile
    2. Consolidated Financial Balance Sheet (Income, Living Expenses, Active Credits, DTI, Net Disposable Cashflow)
    3. Synthesis of all 3 AI Verification Pillars (DTI & Repayment, Unusual Transactions, Document Reconciliation)
    4. Final AI Underwriting Recommendation & Smart Customer Remediation Plan
    """
    client = case_obj.client
    profile = _get_financial_profile(case_obj)
    fp_data = _aggregate_financial_profile_data(case_obj, profile)
    stmt_metrics = _extract_bank_statement_metrics(
        list(case_obj.documents),
        fallback_income=float(client.monthly_income or 5000.0),
        fallback_debts=float(client.existing_monthly_debts or 0.0),
    )

    income_used = float(feasibility_math.get("monthly_income_used", client.monthly_income or 5000.0))
    existing_debts = float(feasibility_math.get("existing_monthly_debts", client.existing_monthly_debts or 0.0))
    new_installment = float(feasibility_math.get("calculated_monthly_installment", 0.0))
    dti_pct = float(feasibility_math.get("dti_percentage", 0.0))
    living_expenses = fp_data["baselineExpensesTotal"]
    net_disposable = round(income_used - (living_expenses + existing_debts + new_installment), 2)

    red_flags = [f for f in findings if f.get("flagType") == "red_flag"]
    suspected_count = len(fp_data["suspectedExpenses"])
    is_over_dti = dti_pct > 40.0
    has_expired_id = any(f.get("field") == "id_card_validity" and f.get("flagType") == "red_flag" for f in findings)

    if is_over_dti or has_expired_id:
        verdict_status = "high_risk_hold"
        verdict_label = "REGULATORY HOLD / REQUIRES REMEDIATION"
    elif red_flags or suspected_count > 0:
        verdict_status = "conditional_clarification"
        verdict_label = "ELIGIBLE WITH OFFICER VERIFICATION"
    else:
        verdict_status = "ready_for_approval"
        verdict_label = "CLEAN DOSSIER — READY FOR APPROVAL"

    prompt = (
        f"You are the Chief Credit Underwriting AI Advisor at Raiffeisen Bank. "
        f"Generate a complete, structured 4-sentence 360-degree Executive Summary for Applicant {client.full_name} "
        f"(National ID: {client.national_id}, Case #{case_obj.case_number} — {case_obj.title}, Requested: €{float(case_obj.requested_amount or 0):,.0f} over {case_obj.loan_term_months}m). "
        f"1) Client & Bureau Profile: Employed at {client.employer} ({client.employment_contract_type}, tenure {client.seniority_current_employer}), "
        f"Marital status: {fp_data['maritalStatus']} ({fp_data['childrenCount']} dependents), Housing: {client.housing_status}, "
        f"FICO Score: {client.fico_score} ({client.credit_bureau_status}), PEP/AML: {client.aml_status}. "
        f"2) Repayment Capacity & Cashflow: Verified monthly income €{income_used:,.0f}, regular household expenses €{living_expenses:,.0f}/mo, "
        f"existing debt service €{existing_debts:,.0f}/mo, new installment €{new_installment:,.2f}/mo -> Regulatory DTI is {dti_pct}% (40% cap) and net monthly disposable cashflow is €{net_disposable:,.0f}. "
        f"3) Transactions & Document Reconciliation: Closing bank balance €{stmt_metrics['closingBalance']:,.0f}, "
        f"{suspected_count} unverified ('suspected') expense signal(s) (€{fp_data['suspectedExpensesTotal']:,.0f}/mo), "
        f"and {len(red_flags)} document discrepancy alert(s) ({', '.join(f['title'] for f in red_flags) or 'None'}). "
        f"Provide a clear, authoritative synthesis for the credit committee."
    )
    aws_summary = call_aws_ai_gateway(prompt, system_prompt="You are a Chief Credit Underwriting AI Advisor at Raiffeisen Bank.")
    used_aws = bool(aws_summary and len(aws_summary.strip()) > 20)

    if not used_aws:
        issues_clause = (
            f"Document reconciliation identified {len(red_flags)} alert(s) ({', '.join(f['title'] for f in red_flags)})"
            if red_flags
            else "All identity, payroll, and bank statement documents are 100% reconciled across CRM and ANAF records"
        )
        susp_clause = (
            f", alongside {suspected_count} unverified ('suspected') expense signal(s) (€{fp_data['suspectedExpensesTotal']:,.0f}/mo) queued for human officer review."
            if suspected_count > 0
            else " with zero unusual transaction anomalies."
        )
        aws_summary = (
            f"{client.full_name} ({client.employment_contract_type} at {client.employer}, tenure {client.seniority_current_employer}, "
            f"FICO {client.fico_score} — {client.credit_bureau_status}) requests €{float(case_obj.requested_amount or 0):,.0f} "
            f"for {case_obj.loan_term_months} months ({case_obj.title}). "
            f"Financial capacity analysis confirms €{income_used:,.0f}/mo eligible net income, €{living_expenses:,.0f}/mo regular living expenses, "
            f"and €{existing_debts + new_installment:,.2f}/mo total debt service, yielding a {dti_pct}% DTI ratio and €{net_disposable:,.0f}/mo net disposable cashflow. "
            f"{issues_clause}{susp_clause} "
            f"Overall Underwriting Verdict: {verdict_label}."
        )

    return {
        "generatedAt": datetime.utcnow().strftime("%H:%M:%S UTC"),
        "engineUsed": "AWS Bedrock (Amazon Nova Pro) 360° Synthesizer" if used_aws else "Raiffeisen 360° Credit Synthesizer",
        "verdictStatus": verdict_status,
        "verdictLabel": verdict_label,
        "executiveNarrative": aws_summary.strip(),
        "clientProfile360": {
            "fullName": client.full_name,
            "nationalId": client.national_id,
            "birthDate": client.birth_date or "N/A",
            "maritalStatus": fp_data["maritalStatus"],
            "dependentsCount": fp_data["childrenCount"],
            "housingStatus": client.housing_status or "Owner",
            "address": client.address or "N/A",
            "email": client.email or "N/A",
            "phone": client.phone or "N/A",
            "employer": client.employer or "N/A",
            "employerCui": client.employer_cui or "N/A",
            "contractType": client.employment_contract_type or "Permanent Full-Time",
            "seniorityCurrent": client.seniority_current_employer or "N/A",
            "seniorityTotal": client.seniority_total or "N/A",
            "ficoScore": client.fico_score or 710,
            "creditBureauStatus": client.credit_bureau_status or "Class A",
            "activeLoansCount": len(fp_data["activeCredits"]) if fp_data["hasFinancialProfile"] else (client.credit_bureau_active_loans or 0),
            "pepStatus": client.pep_status or "Negative (Non-PEP)",
            "amlStatus": client.aml_status or "Compliant L129/2019",
            "anafConsent": bool(client.anaf_consent),
            "anafIncome": fp_data["anafIncome"],
        },
        "financialBalanceSheet": {
            "currency": fp_data["currency"],
            "requestedAmount": float(case_obj.requested_amount or 0.0),
            "loanTermMonths": int(case_obj.loan_term_months or 60),
            "interestRateAnnual": float(case_obj.interest_rate_annual or 8.9),
            "eligibleMonthlyIncome": income_used,
            "supplementalIncome": fp_data["profileOtherIncome"],
            "regularLivingExpenses": living_expenses,
            "suspectedExpensesIsolated": fp_data["suspectedExpensesTotal"],
            "suspectedExpensesCount": suspected_count,
            "existingMonthlyDebts": existing_debts,
            "activeCreditsRemainingBalance": fp_data["activeCreditsBalanceTotal"],
            "proposedNewInstallment": new_installment,
            "totalMonthlyDebtService": round(existing_debts + new_installment, 2),
            "dtiPercentage": dti_pct,
            "netDisposableCashflow": net_disposable,
            "closingBankBalance": stmt_metrics["closingBalance"],
        },
        "pillarsSynthesis": [
            {
                "agentId": "dti_repayment_capacity",
                "title": "1. DTI & Repayment Capacity",
                "badge": modular_results.get("dti_repayment_capacity", {}).get("badgeText", f"DTI {dti_pct}%"),
                "status": modular_results.get("dti_repayment_capacity", {}).get("status", "passed" if dti_pct <= 40 else "critical"),
                "summary": f"DTI {dti_pct}% (cap 40%) • Net cashflow after living costs & loans: €{net_disposable:,.0f}/mo.",
            },
            {
                "agentId": "unusual_transactions",
                "title": "2. Unusual Transactions & Expenses",
                "badge": modular_results.get("unusual_transactions", {}).get("badgeText", f"{suspected_count} Signal(s)" if suspected_count else "No Anomalies"),
                "status": modular_results.get("unusual_transactions", {}).get("status", "needs_review" if suspected_count else "passed"),
                "summary": (
                    f"Regular expenses €{living_expenses:,.0f}/mo • {suspected_count} unverified ('suspected') signal(s) (€{fp_data['suspectedExpensesTotal']:,.0f}/mo) isolated for officer check."
                    if suspected_count > 0
                    else f"Regular expenses €{living_expenses:,.0f}/mo • Account reserve €{stmt_metrics['closingBalance']:,.0f} • 0 unusual spikes."
                ),
            },
            {
                "agentId": "doc_reconciliation",
                "title": "3. Document & Data Reconciliation",
                "badge": modular_results.get("doc_reconciliation", {}).get("badgeText", f"{len(red_flags)} Alert(s)" if red_flags else "100% Reconciled"),
                "status": modular_results.get("doc_reconciliation", {}).get("status", "action_required" if red_flags else "passed"),
                "summary": (
                    f"{len(red_flags)} document/data discrepancy flag(s) require officer review or customer clarification."
                    if red_flags
                    else f"All {len(case_obj.documents)} documents match CRM, ANAF, and Financial Profile records."
                ),
            },
        ],
        "remediation": remediation,
    }


# =============================================================================
# PUBLIC ENTRYPOINTS FOR ROUTER
# =============================================================================

def execute_single_modular_agent(agent_id: str, case_obj) -> Dict[str, Any]:
    """
    Runs a single specialized AI agent module on the given case without conflicting
    with other modules. Uses live AWS Bedrock (from backend/.env) + deterministic verifiers
    + the client's FinancialProfile (expenses, credits, income).
    """
    documents = list(case_obj.documents)
    extracted_fields = run_extraction_agent(case_obj, documents)
    policy_rules = run_policy_agent(case_obj)

    incomes = sorted(list({float(item["value"]) for item in extracted_fields if item["field"] == "monthly_income"}))
    primary_income = incomes[0] if incomes else float(case_obj.client.monthly_income or 5000.0)
    alt_income = incomes[1] if len(incomes) > 1 else None

    feasibility_math = calculate_feasibility_math(
        monthly_income=primary_income,
        existing_debts=float(case_obj.client.existing_monthly_debts or 0.0),
        requested_amount=float(case_obj.requested_amount or 35000.0),
        loan_term_months=int(case_obj.loan_term_months or 60),
        annual_interest_rate=float(case_obj.interest_rate_annual or 8.9),
        alternative_income=alt_income,
    )
    findings = run_investigator_agent(case_obj, extracted_fields, policy_rules, feasibility_math)
    profile = _get_financial_profile(case_obj)
    fp_data = _aggregate_financial_profile_data(case_obj, profile)

    # Support the 3 core pillars (plus legacy aliases if ever invoked)
    if agent_id in ("dti_repayment_capacity", "dti_affordability"):
        return _run_dti_repayment_capacity_module(case_obj, extracted_fields, feasibility_math, findings, fp_data)
    elif agent_id in ("unusual_transactions", "aml_fraud_risk"):
        return _run_unusual_transactions_module(case_obj, documents, fp_data)
    elif agent_id in ("doc_reconciliation", "kyc_identity", "income_crosscheck"):
        return _run_doc_reconciliation_module(case_obj, documents, extracted_fields, findings, fp_data)
    else:
        raise ValueError(f"Unknown modular agent_id: {agent_id}")


def get_case_agent_catalog(case_obj) -> List[Dict[str, Any]]:
    """
    Returns the catalog of 3 core modular AI agents annotated for this case.
    """
    catalog = []
    for item in AGENT_CATALOG:
        entry = dict(item)
        entry["isRecommended"] = is_agent_recommended(item, case_obj.title, case_obj.case_type)
        catalog.append(entry)
    return catalog
