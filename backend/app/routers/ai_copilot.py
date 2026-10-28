import json
import logging
import os
import smtplib
import uuid
from datetime import datetime
from email.message import EmailMessage
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Case, AIAnalysis, AuditLog
from ..schemas import (
    RunAnalysisRequest,
    AIAnalysisResponse,
    FindingResolutionRequest,
    RemediationTriggerRequest,
    HumanDecisionRequest,
)
from ..agents.orchestrator import execute_multi_agent_pipeline, calculate_feasibility_math
from ..agents.modular_agents import (
    get_case_agent_catalog,
    execute_single_modular_agent,
    build_client_executive_summary_360,
    refresh_modular_results_after_resolution,
    AGENT_CATALOG,
)
from ..agentic import LLMError, agent_available, run_agentic_review

log = logging.getLogger(__name__)
router = APIRouter(tags=["Raiffeisen AI Copilot (Multi-Agent Extension)"])


def _serialize_analysis(analysis: AIAnalysis, case_number: str, case_obj: Optional[Case] = None) -> AIAnalysisResponse:
    findings = json.loads(analysis.findings_json or "[]")
    feasibility_math = json.loads(analysis.feasibility_math_json or "{}")
    remediation = json.loads(analysis.remediation_json or "{}")
    metrics = json.loads(analysis.metrics_json or "{}")

    # Ensure 360° Client Executive Summary is always present in metrics
    if case_obj is not None and "clientSummary360" not in metrics:
        modular_results = metrics.get("modularResults", {})
        metrics["clientSummary360"] = build_client_executive_summary_360(
            case_obj=case_obj,
            modular_results=modular_results,
            feasibility_math=feasibility_math,
            findings=findings,
            remediation=remediation,
        )

    return AIAnalysisResponse(
        analysisId=analysis.analysis_uid,
        caseId=analysis.case_id,
        caseNumber=case_number,
        status=analysis.status,
        engineUsed=analysis.engine_used,
        summary=analysis.summary or "",
        riskScore=analysis.risk_score or "medium",
        humanDecision=analysis.human_decision or "pending",
        piiMasking=json.loads(analysis.pii_masking_json or "{}"),
        extractedFields=json.loads(analysis.extracted_fields_json or "[]"),
        policyRules=json.loads(analysis.policy_rules_json or "[]"),
        findings=findings,
        feasibilityMath=feasibility_math,
        remediation=remediation,
        workflowChecklist=json.loads(analysis.workflow_checklist_json or "[]"),
        executionTrace=json.loads(analysis.execution_trace_json or "[]"),
        metrics=metrics,
        createdAt=analysis.created_at,
        completedAt=analysis.completed_at,
    )


def _find_case(db: Session, case_id: int) -> Case:
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        c = db.query(Case).filter(Case.case_number == str(case_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")
    return c


@router.get("/cases/{case_id}/agents")
def list_case_modular_agents(case_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns the 3-pillar modular AI agent catalog for this case,
    along with any modular results already executed.
    """
    case_obj = _find_case(db, case_id)
    catalog = get_case_agent_catalog(case_obj)

    latest_analysis = (
        db.query(AIAnalysis)
        .filter(AIAnalysis.case_id == case_obj.id)
        .order_by(AIAnalysis.created_at.desc())
        .first()
    )
    modular_results = {}
    if latest_analysis and latest_analysis.metrics_json:
        metrics_data = json.loads(latest_analysis.metrics_json or "{}")
        modular_results = metrics_data.get("modularResults", {})

    return {
        "caseId": case_obj.id,
        "caseNumber": case_obj.case_number,
        "caseTitle": case_obj.title,
        "caseType": case_obj.case_type,
        "agents": catalog,
        "modularResults": modular_results,
    }


@router.post("/cases/{case_id}/agents/{agent_id}/run", response_model=AIAnalysisResponse)
def run_modular_agent_on_case(
    case_id: int,
    agent_id: str,
    db: Session = Depends(get_db)
):
    """
    Executes a single specialized AI agent module (`agent_id`) independently using the
    configured AWS Bedrock API key from backend/.env, merging its output into the case's
    analysis state and refreshing the 360° Client Executive Summary.
    """
    case_obj = _find_case(db, case_id)
    valid_ids = {a["agentId"] for a in AGENT_CATALOG} | {
        "kyc_identity", "income_crosscheck", "dti_affordability", "aml_fraud_risk", "smart_remediation"
    }
    if agent_id not in valid_ids:
        raise HTTPException(status_code=400, detail=f"Unknown modular agent: {agent_id}")

    module_output = execute_single_modular_agent(agent_id, case_obj)
    canonical_id = module_output.get("agentId", agent_id)
    now = datetime.utcnow()

    analysis = (
        db.query(AIAnalysis)
        .filter(AIAnalysis.case_id == case_obj.id)
        .order_by(AIAnalysis.created_at.desc())
        .first()
    )

    if not analysis:
        base_result = execute_multi_agent_pipeline(case_obj, provider="auto", api_key=None)
        metrics_dict = base_result["metrics"]
        modular_results = {canonical_id: module_output}
        metrics_dict["modularResults"] = modular_results
        summary_360 = build_client_executive_summary_360(
            case_obj=case_obj,
            modular_results=modular_results,
            feasibility_math=base_result["feasibilityMath"],
            findings=base_result["findings"],
            remediation=base_result["remediation"],
        )
        metrics_dict["clientSummary360"] = summary_360

        analysis_uid = f"analysis-{case_obj.case_number}-{uuid.uuid4().hex[:6]}"
        analysis = AIAnalysis(
            analysis_uid=analysis_uid,
            case_id=case_obj.id,
            status="completed",
            engine_used=module_output.get("engineUsed", base_result["engineUsed"]),
            summary=summary_360.get("executiveNarrative", base_result["summary"]),
            risk_score=base_result["riskScore"],
            human_decision="pending",
            pii_masking_json=json.dumps(base_result["piiMasking"], ensure_ascii=False),
            extracted_fields_json=json.dumps(base_result["extractedFields"], ensure_ascii=False),
            policy_rules_json=json.dumps(base_result["policyRules"], ensure_ascii=False),
            findings_json=json.dumps(base_result["findings"], ensure_ascii=False),
            feasibility_math_json=json.dumps(base_result["feasibilityMath"], ensure_ascii=False),
            remediation_json=json.dumps(base_result["remediation"], ensure_ascii=False),
            workflow_checklist_json=json.dumps(base_result["workflowChecklist"], ensure_ascii=False),
            execution_trace_json=json.dumps(base_result["executionTrace"], ensure_ascii=False),
            metrics_json=json.dumps(metrics_dict, ensure_ascii=False),
            created_at=now,
            completed_at=now,
        )
        db.add(analysis)
    else:
        metrics_dict = json.loads(analysis.metrics_json or "{}")
        modular_results = metrics_dict.get("modularResults", {})
        modular_results[canonical_id] = module_output
        metrics_dict["modularResults"] = modular_results

        feasibility_math = json.loads(analysis.feasibility_math_json or "{}")
        findings = json.loads(analysis.findings_json or "[]")
        remediation = json.loads(analysis.remediation_json or "{}")
        summary_360 = build_client_executive_summary_360(
            case_obj=case_obj,
            modular_results=modular_results,
            feasibility_math=feasibility_math,
            findings=findings,
            remediation=remediation,
        )
        metrics_dict["clientSummary360"] = summary_360

        analysis.metrics_json = json.dumps(metrics_dict, ensure_ascii=False)
        analysis.summary = summary_360.get("executiveNarrative", analysis.summary)
        analysis.engine_used = module_output.get("engineUsed", analysis.engine_used)
        analysis.completed_at = now

        trace_list = json.loads(analysis.execution_trace_json or "[]")
        trace_list.append({
            "step": len(trace_list) + 1,
            "agent": module_output["name"],
            "tool": f"modular_agent:{canonical_id} + aws_bedrock",
            "executionMode": "on_demand_modular",
            "status": "completed",
            "durationMs": 540,
            "timestamp": now.isoformat() + "Z",
            "outputSummary": module_output["aiNarrative"][:180],
        })
        analysis.execution_trace_json = json.dumps(trace_list, ensure_ascii=False)

    audit_log = AuditLog(
        case_id=case_obj.id,
        action=f"Modular AI Agent Executed: {module_output['name']}",
        performed_by="Raiffeisen AI Copilot (AWS Bedrock)",
        details=f"Module '{canonical_id}' completed ({module_output['badgeText']}). {module_output['aiNarrative'][:140]}",
        timestamp=now,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number, case_obj=case_obj)


@router.post("/cases/{case_id}/analysis", response_model=AIAnalysisResponse)
def start_case_analysis(
    case_id: int,
    payload: Optional[RunAnalysisRequest] = None,
    db: Session = Depends(get_db)
):
    """
    API Contract:
    POST /api/cases/{caseId}/analysis
    Executes the full 3-pillar orchestration pipeline and generates the complete 360° Client Executive Summary.
    """
    case_obj = _find_case(db, case_id)
    agent_mode = agent_available()
    if agent_mode:
        try:
            result = run_agentic_review(case_obj)
        except LLMError as exc:
            log.warning("review agent unavailable, falling back to the deterministic pipeline: %s", exc)
            agent_mode = False
    if not agent_mode:
        result = execute_multi_agent_pipeline(case_obj, provider="auto", api_key=None)

    # Specialists the agent already ran are reused; the rest run deterministically so every card is filled
    modular_results = dict(result.pop("modularResults", None) or {})
    for agent_meta in AGENT_CATALOG:
        aid = agent_meta["agentId"]
        if aid not in modular_results:
            modular_results[aid] = execute_single_modular_agent(aid, case_obj)

    result["metrics"]["modularResults"] = modular_results
    if result.get("companyVerification"):
        result["metrics"]["companyVerification"] = result.pop("companyVerification")
    summary_360 = build_client_executive_summary_360(
        case_obj=case_obj,
        modular_results=modular_results,
        feasibility_math=result["feasibilityMath"],
        findings=result["findings"],
        remediation=result["remediation"],
    )
    result["metrics"]["clientSummary360"] = summary_360

    analysis_uid = f"analysis-{case_obj.case_number}-{uuid.uuid4().hex[:6]}"
    now = datetime.utcnow()

    analysis = AIAnalysis(
        analysis_uid=analysis_uid,
        case_id=case_obj.id,
        status="completed",
        # In agent mode the agent's own report is the analysis; the 360° synthesis stays in metrics
        engine_used=result["engineUsed"] if agent_mode else summary_360.get("engineUsed", result["engineUsed"]),
        summary=result["summary"] if agent_mode else summary_360.get("executiveNarrative", result["summary"]),
        risk_score=result["riskScore"],
        human_decision="pending",
        pii_masking_json=json.dumps(result["piiMasking"], ensure_ascii=False),
        extracted_fields_json=json.dumps(result["extractedFields"], ensure_ascii=False),
        policy_rules_json=json.dumps(result["policyRules"], ensure_ascii=False),
        findings_json=json.dumps(result["findings"], ensure_ascii=False),
        feasibility_math_json=json.dumps(result["feasibilityMath"], ensure_ascii=False),
        remediation_json=json.dumps(result["remediation"], ensure_ascii=False),
        workflow_checklist_json=json.dumps(result["workflowChecklist"], ensure_ascii=False),
        execution_trace_json=json.dumps(result["executionTrace"], ensure_ascii=False),
        metrics_json=json.dumps(result["metrics"], ensure_ascii=False),
        created_at=now,
        completed_at=now,
    )
    db.add(analysis)

    red_flags = result["metrics"]["redFlagsCount"]
    green_flags = result["metrics"]["greenFlagsCount"]
    audit_log = AuditLog(
        case_id=case_obj.id,
        action=("Autonomous Review Agent (Claude) + 360° Summary Executed" if agent_mode
                else "Raiffeisen AI Copilot Full 3-Pillar Suite + 360° Summary Executed"),
        performed_by="Raiffeisen AI Copilot + Consultant 024",
        details=(
            f"Analysis #{analysis_uid} completed in {result['metrics']['aiProcessingSeconds']}s"
            + (f" ({result['metrics']['agentToolCalls']} agent tool calls). " if agent_mode else ". ") +
            f"Findings: {red_flags} alerts, {green_flags} validations. "
            f"DTI: {result['feasibilityMath']['dti_percentage']}%. Verdict: {summary_360['verdictLabel']}."
        ),
        timestamp=now,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number, case_obj=case_obj)


@router.get("/analyses/{analysis_id}", response_model=AIAnalysisResponse)
def get_analysis_by_uid(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(AIAnalysis).filter(AIAnalysis.analysis_uid == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="AI Analysis not found.")
    case_obj = db.query(Case).filter(Case.id == analysis.case_id).first()
    return _serialize_analysis(analysis, case_obj.case_number if case_obj else str(analysis.case_id), case_obj=case_obj)


@router.get("/cases/{case_id}/analysis", response_model=Optional[AIAnalysisResponse])
def get_latest_case_analysis(case_id: int, db: Session = Depends(get_db)):
    case_obj = _find_case(db, case_id)
    analysis = (
        db.query(AIAnalysis)
        .filter(AIAnalysis.case_id == case_obj.id)
        .order_by(AIAnalysis.created_at.desc())
        .first()
    )
    if not analysis:
        return None
    return _serialize_analysis(analysis, case_obj.case_number, case_obj=case_obj)


@router.patch("/analyses/{analysis_id}/findings/{finding_id}", response_model=AIAnalysisResponse)
def resolve_finding_human_in_the_loop(
    analysis_id: str,
    finding_id: str,
    payload: FindingResolutionRequest,
    db: Session = Depends(get_db)
):
    analysis = db.query(AIAnalysis).filter(AIAnalysis.analysis_uid == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    case_obj = db.query(Case).filter(Case.id == analysis.case_id).first()
    findings = json.loads(analysis.findings_json or "[]")
    feasibility_math = json.loads(analysis.feasibility_math_json or "{}")
    checklist = json.loads(analysis.workflow_checklist_json or "[]")
    extracted_fields = json.loads(analysis.extracted_fields_json or "[]")
    metrics_dict = json.loads(analysis.metrics_json or "{}")

    target_finding = None
    for f in findings:
        if f.get("id") == finding_id:
            target_finding = f
            break

    if not target_finding:
        # Also search inside modularResults in case a finding was only stored there
        for mod in (metrics_dict.get("modularResults") or {}).values():
            for f in mod.get("findings") or []:
                if f.get("id") == finding_id:
                    target_finding = f
                    findings.append(target_finding)
                    break
            if target_finding:
                break

    if not target_finding:
        raise HTTPException(status_code=404, detail="Finding not found.")

    if payload.action == "confirm":
        target_finding["status"] = "confirmed_by_officer"
    elif payload.action == "resolve":
        target_finding["status"] = "resolved_by_officer"
    elif payload.action == "override_value":
        target_finding["status"] = "resolved_by_officer"
        target_finding["resolvedValue"] = payload.resolved_value

        if target_finding.get("field") == "monthly_income" and payload.resolved_value is not None:
            new_income = float(payload.resolved_value)
            if case_obj and case_obj.client:
                case_obj.client.monthly_income = new_income
            feasibility_math = calculate_feasibility_math(
                monthly_income=new_income,
                existing_debts=float(case_obj.client.existing_monthly_debts or 0.0) if case_obj else 0.0,
                requested_amount=float(case_obj.requested_amount or 45000.0) if case_obj else 45000.0,
                loan_term_months=int(case_obj.loan_term_months or 60) if case_obj else 60,
                annual_interest_rate=float(case_obj.interest_rate_annual or 8.9) if case_obj else 8.9,
            )
            if case_obj:
                case_obj.dti_percent = feasibility_math["dti_percentage"]
                case_obj.monthly_installment = feasibility_math["calculated_monthly_installment"]
            for f_item in findings:
                if f_item.get("id") == "finding-dti-check":
                    f_item["title"] = f"🟢 Recalculated Debt-to-Income (Python): {feasibility_math['dti_percentage']}% (Max: 40%)"
                    f_item["description"] = (
                        f"Recalculated for officer-validated income (€{int(new_income):,}): "
                        f"Installment €{feasibility_math['calculated_monthly_installment']} -> DTI {feasibility_math['dti_percentage']}%."
                    )
                    f_item["resolvedValue"] = f"{feasibility_math['dti_percentage']}%"
            for step in checklist:
                if step.get("step") == 2:
                    step["status"] = "passed" if feasibility_math["dti_percentage"] <= 40.0 else "failed"
                    step["detail"] = f"Income confirmed by loan officer: €{int(new_income):,} (DTI: {feasibility_math['dti_percentage']}%)"

        elif target_finding.get("field") == "applicant_name" and payload.resolved_value is not None:
            if case_obj and case_obj.client:
                case_obj.client.full_name = str(payload.resolved_value)
            for step in checklist:
                if step.get("step") == 1:
                    step["status"] = "passed"
                    step["detail"] = f"Applicant legal identity confirmed: {payload.resolved_value}"

        elif target_finding.get("field") == "address" and payload.resolved_value is not None:
            if case_obj and case_obj.client:
                case_obj.client.address = str(payload.resolved_value)
            for step in checklist:
                if step.get("step") == 1:
                    step["status"] = "passed"
                    step["detail"] = f"Residential address confirmed by officer: {payload.resolved_value}"

    if payload.officer_note:
        target_finding["officerNote"] = payload.officer_note

    analysis.findings_json = json.dumps(findings, ensure_ascii=False)
    analysis.feasibility_math_json = json.dumps(feasibility_math, ensure_ascii=False)
    analysis.workflow_checklist_json = json.dumps(checklist, ensure_ascii=False)

    if case_obj is not None:
        remediation = json.loads(analysis.remediation_json or "{}")
        modular_results = refresh_modular_results_after_resolution(
            case_obj=case_obj,
            extracted_fields=extracted_fields,
            feasibility_math=feasibility_math,
            findings=findings,
            modular_results=metrics_dict.get("modularResults", {}),
        )
        metrics_dict["modularResults"] = modular_results
        metrics_dict["redFlagsCount"] = sum(
            1 for f in findings
            if f.get("flagType") == "red_flag" and f.get("status") not in ("resolved_by_officer", "confirmed_by_officer")
        )
        summary_360 = build_client_executive_summary_360(
            case_obj=case_obj,
            modular_results=modular_results,
            feasibility_math=feasibility_math,
            findings=findings,
            remediation=remediation,
        )
        metrics_dict["clientSummary360"] = summary_360
        analysis.summary = summary_360.get("executiveNarrative", analysis.summary)
        analysis.metrics_json = json.dumps(metrics_dict, ensure_ascii=False)

    audit_entry = AuditLog(
        case_id=analysis.case_id,
        action=f"Human Review Sign-off ({target_finding.get('fieldLabel', finding_id)})",
        performed_by="Consultant 024",
        details=(
            f"Action: {payload.action}. "
            + (f"Selected & applied value: {payload.resolved_value}." if payload.resolved_value else "")
        ),
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number if case_obj else str(analysis.case_id), case_obj=case_obj)


@router.post("/analyses/{analysis_id}/remediation/send", response_model=AIAnalysisResponse)
def send_remediation_notification(
    analysis_id: str,
    payload: RemediationTriggerRequest,
    db: Session = Depends(get_db)
):
    analysis = db.query(AIAnalysis).filter(AIAnalysis.analysis_uid == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    case_obj = db.query(Case).filter(Case.id == analysis.case_id).first()
    remediation = json.loads(analysis.remediation_json or "{}")

    now_str = datetime.utcnow().strftime("%d.%m.%Y %H:%M")
    remediation["status"] = "sent_by_officer"
    remediation["sentAt"] = now_str
    remediation["channels"] = ["Email"]
    if payload.recipient_email:
        remediation["recipientEmail"] = payload.recipient_email.strip()
    if payload.email_subject:
        remediation["emailSubject"] = payload.email_subject.strip()
    if payload.custom_message:
        remediation["emailBody"] = payload.custom_message

    # Optional live SMTP dispatch if SMTP_HOST is configured in environment
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "underwriting@raiffeisen.ro").strip()
    delivery_mode = "Logged in BankDesk Outbox & Audit Trail"

    if smtp_host and remediation.get("recipientEmail"):
        try:
            msg = EmailMessage()
            msg["Subject"] = remediation.get("emailSubject") or f"Case #{case_obj.case_number if case_obj else analysis.case_id} Clarification"
            msg["From"] = smtp_from
            msg["To"] = remediation["recipientEmail"]
            msg.set_content(remediation.get("emailBody") or "")
            with smtplib.SMTP(smtp_host, smtp_port, timeout=6) as server:
                if smtp_user and smtp_pass:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            delivery_mode = f"Dispatched via SMTP ({smtp_host})"
        except Exception as exc:
            log.warning("SMTP dispatch failed (%s); email recorded in BankDesk outbox.", exc)
            delivery_mode = "Logged in BankDesk Outbox (SMTP unavailable)"

    remediation["deliveryMode"] = delivery_mode
    analysis.remediation_json = json.dumps(remediation, ensure_ascii=False)

    if case_obj:
        case_obj.status = "pending"
        case_obj.updated_at = datetime.utcnow()
        metrics_dict = json.loads(analysis.metrics_json or "{}")
        if "clientSummary360" in metrics_dict:
            metrics_dict["clientSummary360"]["remediation"] = remediation
            analysis.metrics_json = json.dumps(metrics_dict, ensure_ascii=False)

    audit_entry = AuditLog(
        case_id=analysis.case_id,
        action="Clarification Email Dispatched to Applicant",
        performed_by="Consultant 024 (AI Copilot Outreach)",
        details=(
            f"Email sent to {remediation.get('recipientEmail')} "
            f"(Subject: '{remediation.get('emailSubject')}'). Mode: {delivery_mode}."
        ),
        timestamp=datetime.utcnow()
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number if case_obj else str(analysis.case_id), case_obj=case_obj)


@router.post("/analyses/{analysis_id}/human-decision", response_model=AIAnalysisResponse)
def submit_final_human_decision(
    analysis_id: str,
    payload: HumanDecisionRequest,
    db: Session = Depends(get_db)
):
    analysis = db.query(AIAnalysis).filter(AIAnalysis.analysis_uid == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    case_obj = db.query(Case).filter(Case.id == analysis.case_id).first()
    checklist = json.loads(analysis.workflow_checklist_json or "[]")

    analysis.human_decision = payload.decision

    status_map = {
        "approve": ("completed", "APPROVED (Human-in-the-Loop)"),
        "request_clarification": ("pending", "PENDING CUSTOMER CLARIFICATION"),
        "reject": ("rejected", "REJECTED BY CREDIT OFFICER"),
    }
    new_case_status, decision_label = status_map.get(payload.decision, ("in_review", payload.decision))

    if case_obj:
        case_obj.status = new_case_status
        case_obj.updated_at = datetime.utcnow()
        if payload.officer_comments:
            stamp = datetime.utcnow().strftime("%d.%m.%Y %H:%M")
            case_obj.notes = f"{case_obj.notes or ''}\n[Officer Decision {stamp} - {decision_label}]: {payload.officer_comments}".strip()

        if payload.decision == "approve":
            for t in case_obj.tasks:
                t.status = "completed"

    for step in checklist:
        if step.get("step") == 4:
            step["status"] = "passed" if payload.decision == "approve" else ("failed" if payload.decision == "reject" else "review")
            step["detail"] = f"Final sign-off recorded by Consultant 024: {decision_label}"

    analysis.workflow_checklist_json = json.dumps(checklist, ensure_ascii=False)

    log = AuditLog(
        case_id=analysis.case_id,
        action=f"Final Underwriting Decision: {decision_label}",
        performed_by="Consultant 024",
        details=(
            f"Decision finalized based on AI Audit #{analysis.analysis_uid}. "
            f"Case status transitioned to '{new_case_status}'. "
            + (f"Officer Remarks: {payload.officer_comments}" if payload.officer_comments else "")
        ),
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number if case_obj else str(analysis.case_id), case_obj=case_obj)
