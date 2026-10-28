from datetime import datetime, timedelta
import math
from random import Random
from sqlalchemy.orm import Session
from .models import Client, Case, Document, Task, AuditLog


FIRST_NAMES = [
    ("Alexander", 1), ("Elena", 2), ("Marcus", 1), ("Sophia", 2), ("Lukas", 1),
    ("Clara", 2), ("Sebastian", 1), ("Hannah", 2), ("Maximilian", 1), ("Victoria", 2),
    ("Gabriel", 1), ("Natalia", 2), ("Julian", 1), ("Camilla", 2), ("Dominik", 1),
    ("Laura", 2), ("Adrian", 1), ("Miriam", 2), ("Felix", 1), ("Bianca", 2),
    ("Christian", 1), ("Diana", 2), ("Florian", 1), ("Alina", 2), ("Stefan", 1),
    ("Andreea", 2), ("Tobias", 1), ("Cristina", 2), ("Philipp", 1), ("Ioana", 2),
]

LAST_NAMES = [
    "Gruber", "Ionescu", "Wagner", "Popescu", "Bauer",
    "Dumitrescu", "Pichler", "Stan", "Moser", "Stoica",
]

CITIES_AND_STREETS = [
    ("Vienna", ["Mariahilfer St", "Kärntner Ring", "Praterstrasse", "Favoritenstrasse", "Währinger St"], "Vienna District Registry", "AT49RZBR0000"),
    ("Salzburg", ["Getreidegasse", "Linzer Gasse", "Alpenstrasse", "Ignaz-Harrer-St"], "Salzburg Municipal Authority", "AT61RZBS0000"),
    ("Graz", ["Herrengasse", "Annenstrasse", "Heinrichstrasse", "Stremayrgasse"], "Graz Civic Registry", "AT82RZST0000"),
    ("Linz", ["Landstrasse", "Hauptplatz", "Mozartstrasse", "Wiener Strasse"], "Linz Registration Office", "AT33RZOO0000"),
    ("Bucharest", ["Calea Victoriei", "Unirii Blvd", "Aviatorilor Blvd", "Floreasca Rd"], "SPCLEP Sector 1 Bucharest", "RO49RZBR0000"),
    ("Cluj-Napoca", ["Eroilor Blvd", "Memorandumului St", "Dorobantilor Way", "Observatorului St"], "SPCLEP Cluj-Napoca", "RO72RZBR0000"),
    ("Timisoara", ["Take Ionescu Blvd", "Republicii Blvd", "Cetatii Blvd", "Aradului Way"], "SPCLEP Timisoara", "RO18RZBR0000"),
    ("Iasi", ["Stefan cel Mare Blvd", "Carol I Blvd", "Palas St", "Pacurari Way"], "SPCLEP Iasi", "RO55RZBR0000"),
]

EMPLOYERS = [
    ("Danube Cloud Technologies GmbH", "ATU51920411", "Senior Systems Architect", "IT & Software"),
    ("Alpine Precision Engineering AG", "ATU44819203", "Principal Mechanical Engineer", "Manufacturing"),
    ("Vindobona Pharma Research Ltd", "ATU66301928", "Clinical Operations Manager", "Pharmaceuticals"),
    ("Central European Logistics Group", "ATU39104827", "Supply Chain Director", "Logistics & Transport"),
    ("Carpathian Energy Grid SA", "RO18920341", "Grid Operations Specialist", "Energy & Utilities"),
    ("MedLife Diagnostics Clinic", "RO24910284", "Attending Specialist Physician", "Healthcare"),
    ("Balkan Retail Distribution SRL", "RO33109482", "Regional Commercial Manager", "Retail & FMCG"),
    ("Meridian Financial Advisory GmbH", "ATU77482910", "Senior Risk Analyst", "Financial Services"),
    ("Kronstadt Aerospace Systems", "RO41029384", "Avionics Quality Lead", "Aerospace"),
    ("Helvetia Construction & Infra AG", "ATU88392014", "Civil Project Coordinator", "Construction"),
    ("Transylvania CyberSecurity Labs", "RO38910245", "Lead Security Researcher", "Cybersecurity"),
    ("St. Stephen Private Hospital", "ATU29104958", "Chief Nursing Officer", "Healthcare"),
    ("Continental Automotive Systems", "RO15928374", "Embedded Firmware Team Lead", "Automotive R&D"),
    ("Vienna Philharmonic Foundation", "ATU11029384", "Financial Controller", "Arts & Administration"),
    ("GreenWave Renewables GmbH", "ATU90128374", "Solar Portfolio Manager", "Renewable Energy"),
]

LOAN_PRODUCTS = [
    {
        "case_type": "Residential Mortgage Loan",
        "titles": [
            "Prime Residential Mortgage Acquisition",
            "Green Energy Efficient Home Mortgage",
            "Primary Residence Construction & Mortgage",
            "Urban Apartment Purchase Mortgage Facility",
        ],
        "department": "Mortgage & Real Estate Lending",
        "amount_range": (95000, 340000, 5000),
        "terms": [180, 240, 300, 360],
        "rate": 5.45,
        "dae": 5.89,
        "interest_type": "Variable (Euribor 6M + 2.10%)",
        "extra_doc_type": "Collateral Valuation Report",
    },
    {
        "case_type": "Personal Consumer Loan",
        "titles": [
            "Flexi Express Personal Consumer Loan",
            "Home Renovation & Modernization Loan",
            "Medical & Education Personal Facility",
            "Unsecured Retail Consumer Credit",
        ],
        "department": "Retail Lending",
        "amount_range": (8000, 48000, 2000),
        "terms": [24, 36, 48, 60],
        "rate": 8.90,
        "dae": 9.42,
        "interest_type": "Fixed (Promotional)",
        "extra_doc_type": "Credit Bureau Report",
    },
    {
        "case_type": "Refinancing Loan",
        "titles": [
            "Multi-Bank Debt Consolidation Facility",
            "Fixed-Rate Balance Refinancing Loan",
            "Retail Credit Restructuring & Top-Up",
        ],
        "department": "Retail Lending",
        "amount_range": (18000, 85000, 2500),
        "terms": [48, 60, 72, 84],
        "rate": 7.65,
        "dae": 8.15,
        "interest_type": "Fixed",
        "extra_doc_type": "Credit Bureau Report",
    },
    {
        "case_type": "Auto Loan",
        "titles": [
            "Eco-Mobility Electric Vehicle Loan",
            "New Passenger Vehicle Financing",
            "Hybrid Fleet Individual Auto Credit",
        ],
        "department": "Retail Lending",
        "amount_range": (16000, 68000, 2000),
        "terms": [36, 48, 60],
        "rate": 6.95,
        "dae": 7.40,
        "interest_type": "Fixed (Green Mobility)",
        "extra_doc_type": "Vehicle Proforma & Casco Quote",
    },
    {
        "case_type": "Credit Card",
        "titles": [
            "Raiffeisen World Elite Mastercard Limit",
            "Gold Revolving Credit Card Facility",
            "Platinum Travel Credit Line Application",
        ],
        "department": "Cards & Revolving Credit",
        "amount_range": (5000, 25000, 1000),
        "terms": [24, 36],
        "rate": 11.50,
        "dae": 12.40,
        "interest_type": "Revolving Variable",
        "extra_doc_type": "ANAF Tax Revenue Certificate",
    },
    {
        "case_type": "Overdraft Facility",
        "titles": [
            "Salary Account Multi-Month Overdraft",
            "Executive Current Account Overdraft Line",
            "Dynamic Liquidity Overdraft Facility",
        ],
        "department": "Accounts & Payments",
        "amount_range": (4000, 18000, 1000),
        "terms": [12, 24, 36],
        "rate": 9.50,
        "dae": 10.15,
        "interest_type": "Fixed",
        "extra_doc_type": "Utility Bill",
    },
    {
        "case_type": "SME Micro-Credit",
        "titles": [
            "PFA / Freelance Working Capital Facility",
            "Medical Practice Equipment Micro-Loan",
            "Authorized Professional Liquidity Line",
        ],
        "department": "Micro & SME Banking",
        "amount_range": (20000, 110000, 5000),
        "terms": [36, 48, 60, 72],
        "rate": 7.90,
        "dae": 8.45,
        "interest_type": "Variable (Euribor 3M + 3.00%)",
        "extra_doc_type": "ANAF Tax Revenue Certificate",
    },
]

BRANCHES = [
    "Central Plaza Branch",
    "Financial District Branch",
    "West City Branch",
    "Metropolitan Branch 1",
    "Metropolitan Branch 2",
    "Danube Tower Corporate Center",
    "Transylvania Regional Hub",
    "Victoria Square Flagship Branch",
    "Alpine Private Banking Suite",
    "North Gate Digital Hub",
]

CHANNELS = [
    "Online Web Onboarding",
    "Mobile Banking App (SmartToken)",
    "Direct Branch Advisory",
    "Mortgage Broker Network",
    "Video KYC Advisory Desk",
]

OFFICERS = [
    "Consultant 024",
    "Consultant 018 (Elena Varga)",
    "Consultant 031 (Markus Weber)",
    "Consultant 042 (Radu Ionescu)",
    "Consultant 009 (Sophie Kolar)",
]

NICKNAME_MAP = {
    "Alexander": "Alex",
    "Maximilian": "Max",
    "Sebastian": "Seb",
    "Christian": "Chris",
    "Dominik": "Dom",
    "Philipp": "Phil",
    "Gabriel": "Gabi",
    "Victoria": "Vicky",
    "Camilla": "Milla",
    "Cristina": "Crina",
}


def _calc_annuity(principal: float, annual_rate: float, months: int) -> float:
    if principal <= 0 or months <= 0:
        return 0.0
    r = (annual_rate / 100.0) / 12.0
    if r <= 0:
        return round(principal / months, 2)
    factor = math.pow(1.0 + r, months)
    return round(principal * (r * factor) / (factor - 1.0), 2)


def seed_extended_bank_dossiers(db: Session):
    """
    Populates 185 additional unique, realistic banking client dossiers (bringing total > 215 clients)
    modeled on real European & Romanian (NBR Reg. 17/2012, KYC/AML Law 129/2019, Credit Bureau / ANAF)
    loan origination files. Safe and idempotent on existing databases.
    """
    existing_nat_ids = {row[0] for row in db.query(Client.national_id).all()}
    existing_case_nums = {row[0] for row in db.query(Case.case_number).all()}

    new_clients_data = []
    idx = 0
    for f_idx, (first_name, gender_digit) in enumerate(FIRST_NAMES):
        for l_idx, last_name in enumerate(LAST_NAMES):
            if idx >= 185:
                break
            idx += 1
            rng = Random(f"bankdesk-dossier-{idx}-v1")

            birth_year = 1968 + ((idx * 7 + f_idx * 3) % 33)
            birth_month = ((idx * 5 + l_idx) % 12) + 1
            birth_day = ((idx * 11 + f_idx) % 28) + 1
            yy = birth_year % 100
            century_gender = gender_digit if birth_year < 2000 else (gender_digit + 4)
            county_code = ((idx * 3) % 46) + 1
            seq_code = 200 + idx

            nat_id = f"{century_gender}{yy:02d}{birth_month:02d}{birth_day:02d}{county_code:02d}{seq_code:04d}"
            if nat_id in existing_nat_ids:
                continue

            case_num = str(10600 + idx)
            if case_num in existing_case_nums:
                continue

            full_name = f"{first_name} {last_name}"
            city, streets, issuer, iban_prefix = CITIES_AND_STREETS[(idx + f_idx) % len(CITIES_AND_STREETS)]
            street = streets[(idx + l_idx) % len(streets)]
            house_no = 4 + ((idx * 7) % 140)
            apt_no = (idx % 45) + 1
            address = f"{house_no} {street}, Apt. {apt_no}, {city}"

            emp_name, emp_cui, job_role, industry = EMPLOYERS[(idx * 3 + l_idx) % len(EMPLOYERS)]
            product = LOAN_PRODUCTS[(idx + f_idx * 2) % len(LOAN_PRODUCTS)]

            mod_arch = idx % 14
            if mod_arch in (1, 8):
                scenario_tag = "discrepancy_case"
                status = "in_review"
                priority = "high"
            elif mod_arch == 5:
                scenario_tag = "expired_id_case"
                status = "pending"
                priority = "urgent"
            elif mod_arch == 11:
                scenario_tag = "high_dti_case"
                status = rng.choice(["in_review", "rejected"])
                priority = "high"
            else:
                scenario_tag = "valid_green_case"
                status = rng.choice(["completed", "completed", "in_progress", "in_progress", "in_review"])
                priority = rng.choice(["normal", "normal", "normal", "high"])

            base_income = float(rng.randrange(2600, 11500, 150))
            if product["case_type"] == "Residential Mortgage Loan" and base_income < 4500:
                base_income += 2400.0

            existing_debts = float(rng.choice([0, 0, 0, 180, 260, 350, 490, 620, 780]))
            min_amt, max_amt, step_amt = product["amount_range"]
            requested_amount = float(rng.randrange(min_amt, max_amt + 1, step_amt))
            term_months = rng.choice(product["terms"])
            rate_annual = product["rate"]

            monthly_inst = _calc_annuity(requested_amount, rate_annual, term_months)

            if scenario_tag == "high_dti_case":
                base_income = max(2400.0, round((monthly_inst + existing_debts) / rng.uniform(0.43, 0.52), -1))
                verified_income = base_income
            elif scenario_tag == "discrepancy_case":
                while (monthly_inst + existing_debts) / base_income > 0.35:
                    base_income += 600.0
                delta = float(rng.choice([350, 450, 600, -400]))
                verified_income = max(2200.0, base_income + delta)
            else:
                while (monthly_inst + existing_debts) / base_income > 0.34:
                    base_income += 500.0
                verified_income = base_income

            dti_pct = round(((monthly_inst + existing_debts) / base_income) * 100.0, 2)

            if scenario_tag == "expired_id_case":
                exp_month = ((idx % 9) + 1)
                exp_day = ((idx * 3) % 25) + 1
                id_expiry_iso = f"2026-{exp_month:02d}-{exp_day:02d}"
                id_validity_doc = f"{exp_day:02d}.{exp_month:02d}.2016 - 10.02.2026 [DOCUMENT EXPIRED]"
            else:
                exp_year = 2028 + (idx % 7)
                exp_month = ((idx * 2) % 12) + 1
                exp_day = ((idx * 5) % 27) + 1
                id_expiry_iso = f"{exp_year}-{exp_month:02d}-{exp_day:02d}"
                id_validity_doc = f"{exp_day:02d}.{exp_month:02d}.{exp_year - 10} - {exp_day:02d}.{exp_month:02d}.{exp_year}"

            series_prefix = city[:2].upper()
            id_series = f"{series_prefix} {410000 + idx * 13}"
            birth_date_str = f"{birth_day:02d}.{birth_month:02d}.{birth_year}"

            marital = rng.choice(["Single", "Married", "Married", "Divorced", "Widowed"])
            dependents = 0 if marital == "Single" else rng.choice([0, 1, 2, 3])
            housing = rng.choice([
                "Owner (No Mortgage)",
                "Owner (With Mortgage)",
                "Rented Apartment",
                "Family Property",
            ])
            contract_type = (
                "Authorized Freelancer (PFA)"
                if product["case_type"] == "SME Micro-Credit"
                else rng.choice([
                    "Permanent Full-Time (CIM)",
                    "Permanent Full-Time (CIM)",
                    "Permanent Full-Time (Executive)",
                    "Fixed-Term Collective Contract (24m)",
                ])
            )
            sen_curr_yrs = 1 + (idx % 11)
            sen_tot_yrs = sen_curr_yrs + 2 + (idx % 9)

            if scenario_tag == "high_dti_case":
                fico = rng.randint(565, 635)
                cb_status = "1 historical delay (31-60 days) in past 24 months (Class B)"
            elif scenario_tag == "expired_id_case":
                fico = rng.randint(635, 695)
                cb_status = "No active delinquencies (1 minor delay < 15 days)"
            else:
                fico = rng.randint(685, 825)
                cb_status = "No delinquencies past 48 months (Class A0)"

            active_loans_count = 0 if existing_debts == 0 else rng.choice([1, 1, 2, 3])
            pep_status = "PEP Family Member — Enhanced Due Diligence" if idx % 47 == 0 else "Negative (Non-PEP)"
            aml_status = (
                "EDD Completed L129/2019 — Approved"
                if idx % 47 == 0
                else "Compliant L129/2019 — 0 Sanctions / 0 Alerts"
            )
            anaf_consent = (idx % 9 != 0)

            phone_prefix = "+40 7" if city in ("Bucharest", "Cluj-Napoca", "Timisoara", "Iasi") else "+43 6"
            phone = f"{phone_prefix}{20 + (idx % 79):02d} {100 + idx:03d} {200 + (idx * 3) % 799:03d}"
            email_slug = f"{first_name.lower()}.{last_name.lower()}.{idx}"
            email_domain = rng.choice(["raiffeisen-mail.eu", "corporate-inbox.at", "euro-post.ro", "danube-net.com"])
            email = f"{email_slug}@{email_domain}"

            created_dt = datetime.utcnow() - timedelta(days=(idx % 45) + 1, hours=(idx * 3) % 23)
            updated_dt = created_dt + timedelta(hours=rng.randint(2, 18))

            cl = Client(
                full_name=full_name,
                national_id=nat_id,
                email=email,
                phone=phone,
                address=address,
                employer=emp_name,
                monthly_income=base_income,
                existing_monthly_debts=existing_debts,
                id_card_series=id_series,
                id_card_expiry=id_expiry_iso,
                id_card_issuer=issuer,
                birth_date=birth_date_str,
                marital_status=marital,
                dependents_count=dependents,
                housing_status=housing,
                employer_cui=emp_cui,
                employment_contract_type=contract_type,
                seniority_current_employer=f"{sen_curr_yrs} years and {(idx % 11) + 1} months",
                seniority_total=f"{sen_tot_yrs} years",
                fico_score=fico,
                credit_bureau_status=cb_status,
                credit_bureau_active_loans=active_loans_count,
                pep_status=pep_status,
                aml_status=aml_status,
                anaf_consent=anaf_consent,
                anaf_income=verified_income if anaf_consent else None,
                created_at=created_dt - timedelta(days=3),
            )
            db.add(cl)
            db.flush()

            title = rng.choice(product["titles"])
            branch = BRANCHES[(idx + l_idx) % len(BRANCHES)]
            channel = CHANNELS[(idx + f_idx) % len(CHANNELS)]
            officer = OFFICERS[idx % len(OFFICERS)]

            if scenario_tag == "discrepancy_case":
                notes = (
                    f"Dossier #{case_num} ({product['case_type']}): Cross-check alert triggered. "
                    f"Application states net income €{base_income:,.0f}, whereas ANAF & Employer Certificate confirm €{verified_income:,.0f}. "
                    f"Assigned to {officer} for reconciliation."
                )
            elif scenario_tag == "expired_id_case":
                notes = (
                    f"Compliance hold on Dossier #{case_num}: Identity Card ({id_series}) expired prior to underwriting date "
                    f"and utility bill service address differs from primary domicile. Automated remediation link prepared."
                )
            elif scenario_tag == "high_dti_case":
                notes = (
                    f"Prudential NBR Regulation 17/2012 alert: Calculated Debt-to-Income ratio is {dti_pct}% "
                    f"(exceeds 40% maximum ceiling). Requires tenor extension, co-debtor, or principal reduction."
                )
            else:
                notes = (
                    f"Complete retail credit file #{case_num} for {full_name} ({job_role} at {emp_name}). "
                    f"KYC/AML L129/2019 clear, FICO {fico}, verified income €{verified_income:,.0f}/mo, DTI {dti_pct}% (< 40% ceiling)."
                )

            c = Case(
                case_number=case_num,
                title=title,
                case_type=product["case_type"],
                status=status,
                department=product["department"],
                branch=branch,
                channel=channel,
                priority=priority,
                assigned_to=officer,
                requested_amount=requested_amount,
                loan_term_months=term_months,
                interest_rate_annual=rate_annual,
                interest_type=product["interest_type"],
                dae_percent=product["dae"],
                monthly_installment=monthly_inst,
                dti_percent=dti_pct,
                currency="EUR",
                scenario_tag=scenario_tag,
                notes=notes,
                client_id=cl.id,
                created_at=created_dt,
                updated_at=updated_dt,
            )
            db.add(c)
            db.flush()

            cert_employee_name = full_name
            if scenario_tag == "discrepancy_case" and first_name in NICKNAME_MAP and (idx % 2 == 0):
                cert_employee_name = f"{NICKNAME_MAP[first_name]} {last_name}"

            iban = f"{iban_prefix}0600{10000000 + idx * 97}"
            closing_balance = round(verified_income * rng.uniform(1.8, 6.4), 2)

            doc1 = Document(
                case_id=c.id,
                doc_code="doc-1",
                file_name=f"Loan_Application_Form_{case_num}.pdf",
                document_type="Application Form",
                file_size_kb=280 + (idx % 90),
                page_count=2,
                status="uploaded" if status != "completed" else "verified",
                content_text=(
                    f"Line 1: RAIFFEISEN BANK - STANDARDIZED CREDIT APPLICATION FORM ({product['case_type'].upper()})\n"
                    f"Line 2: Case Registration Number: #{case_num} | Branch: {branch} | Channel: {channel}\n"
                    f"Line 3: ------------------------------------------------------------------\n"
                    f"Line 4: Applicant Name: {full_name}\n"
                    f"Line 5: National ID Number: {nat_id} | Birth Date: {birth_date_str}\n"
                    f"Line 6: Declared Residential Address: {address}\n"
                    f"Line 7: Employer: {emp_name} (CUI/VAT: {emp_cui} | Role: {job_role})\n"
                    f"Line 8: Declared Net Monthly Income: {base_income:,.0f} EUR\n"
                    f"Line 9: Requested Loan Amount: {requested_amount:,.0f} EUR | Loan Term: {term_months} Months | Rate: {rate_annual}% ({product['interest_type']})\n"
                    f"Line 10: Existing Monthly Debt Repayments: {existing_debts:,.0f} EUR | Estimated New Installment: {monthly_inst:,.2f} EUR\n"
                    f"Line 11: GDPR & ANAF Electronic Interrogation Consent: {'GRANTED' if anaf_consent else 'PAPER CERTIFICATE'}\n"
                    f"Line 12: Electronic Signature: VERIFIED (Qualified Certificate #{88000 + idx})"
                ),
                created_at=created_dt,
            )

            doc2 = Document(
                case_id=c.id,
                doc_code="doc-2",
                file_name=f"Identity_Card_{first_name}_{last_name}_{case_num}.pdf",
                document_type="ID Card Copy",
                file_size_kb=165 + (idx % 50),
                page_count=1,
                status="expired" if scenario_tag == "expired_id_case" else "verified",
                content_text=(
                    f"Line 1: EUROPEAN UNION / NATIONAL IDENTITY CARD (OCR ARCHIVE SCAN)\n"
                    f"Line 2: Document Number: {id_series} | Issuing Authority: {issuer}\n"
                    f"Line 3: National ID: {nat_id}\n"
                    f"Line 4: Surname: {last_name} | Given Name: {first_name}\n"
                    f"Line 5: Date of Birth: {birth_date_str} | Domicile City: {city}\n"
                    f"Line 6: Permanent Residence: {address}\n"
                    f"Line 7: Validity Period: {id_validity_doc}"
                ),
                created_at=created_dt + timedelta(minutes=8),
            )

            doc3 = Document(
                case_id=c.id,
                doc_code="doc-3",
                file_name=f"Employer_Income_Certificate_{case_num}.pdf",
                document_type="Income Certificate",
                file_size_kb=210 + (idx % 60),
                page_count=1,
                status="flagged" if scenario_tag == "discrepancy_case" else "verified",
                content_text=(
                    f"Line 1: OFFICIAL EMPLOYER SALARY & ANAF REVENUE CERTIFICATE NO. {4000 + idx}\n"
                    f"Line 2: Employer: {emp_name} | Fiscal Registration: {emp_cui} | Industry: {industry}\n"
                    f"Line 3: Employee: {cert_employee_name}\n"
                    f"Line 4: National ID: {nat_id} | Position: {job_role} ({contract_type})\n"
                    f"Line 5: Permanent Residence: {address}\n"
                    f"Line 6: Employment Tenure: {sen_curr_yrs} years at current employer ({sen_tot_yrs} years total career)\n"
                    f"Line 7: Certified Net Monthly Salary: {verified_income:,.0f} EUR\n"
                    f"Line 8: Salary encumbrances / garnishments: 0.00 EUR (Clean payroll record)"
                ),
                created_at=created_dt + timedelta(minutes=16),
            )

            doc4 = Document(
                case_id=c.id,
                doc_code="doc-4",
                file_name=f"Bank_Account_Statement_3M_{case_num}.pdf",
                document_type="Bank Statement",
                file_size_kb=420 + (idx % 150),
                page_count=3,
                status="verified",
                content_text=(
                    f"Line 1: CONSOLIDATED 3-MONTH CURRENT ACCOUNT STATEMENT — CASE #{case_num}\n"
                    f"Line 2: Account Holder: {full_name} | National ID: {nat_id}\n"
                    f"Line 3: IBAN: {iban} | Currency: EUR\n"
                    f"Line 4: ------------------------------------------------------------------\n"
                    f"Line 5: Month -3 Salary Credit ({emp_name}): +{verified_income:,.2f} EUR\n"
                    f"Line 6: Month -2 Salary Credit ({emp_name}): +{verified_income:,.2f} EUR\n"
                    f"Line 7: Month -1 Salary Credit ({emp_name}): +{verified_income:,.2f} EUR\n"
                    f"Line 8: Average Monthly Salary Inflow: {verified_income:,.0f} EUR\n"
                    f"Line 9: External Credit Bureau Monthly Debt Service: {existing_debts:,.2f} EUR\n"
                    f"Line 10: Closing Account Balance: {closing_balance:,.2f} EUR"
                ),
                created_at=created_dt + timedelta(minutes=24),
            )

            extra_doc_type = product["extra_doc_type"]
            if scenario_tag == "expired_id_case":
                extra_doc_type = "Utility Bill"

            if extra_doc_type == "Utility Bill":
                util_address = (
                    f"{house_no + 55} Panorama Hill Rd, {city}"
                    if scenario_tag == "expired_id_case"
                    else address
                )
                doc5 = Document(
                    case_id=c.id,
                    doc_code="doc-5",
                    file_name=f"Residential_Utility_Invoice_{case_num}.pdf",
                    document_type="Utility Bill",
                    file_size_kb=145,
                    page_count=1,
                    status="flagged" if scenario_tag == "expired_id_case" else "verified",
                    content_text=(
                        f"Line 1: ELECTRICITY & GAS UTILITY STATEMENT — SUBSCRIBER #{910000 + idx}\n"
                        f"Line 2: Account Holder: {full_name} | National ID: {nat_id}\n"
                        f"Line 3: Service Location Address: {util_address}\n"
                        f"Line 4: Billing Cycle: October 2026 | Total Due: {115 + (idx % 140)}.40 EUR\n"
                        f"Line 5: Direct Debit Status: ACTIVE"
                    ),
                    created_at=created_dt + timedelta(minutes=30),
                )
            elif extra_doc_type == "Collateral Valuation Report":
                property_val = round(requested_amount * rng.uniform(1.25, 1.55), -3)
                ltv_pct = round((requested_amount / property_val) * 100.0, 1)
                doc5 = Document(
                    case_id=c.id,
                    doc_code="doc-5",
                    file_name=f"ANEVAR_Property_Valuation_{case_num}.pdf",
                    document_type="Collateral Valuation Report",
                    file_size_kb=640,
                    page_count=6,
                    status="verified",
                    content_text=(
                        f"Line 1: CERTIFIED REAL ESTATE COLLATERAL VALUATION REPORT (ANEVAR / RICS STANDARD)\n"
                        f"Line 2: Applicant Name: {full_name} | National ID: {nat_id}\n"
                        f"Line 3: Mortgaged Property Address: {address}\n"
                        f"Line 4: Appraised Market Value: {property_val:,.0f} EUR | Loan-to-Value (LTV): {ltv_pct}%\n"
                        f"Line 5: Land Book / Cadastre Excerpt: Clean title, 0 prior mortgages, PAD & All-Risk Insurance mandatory"
                    ),
                    created_at=created_dt + timedelta(minutes=30),
                )
            else:
                doc5 = Document(
                    case_id=c.id,
                    doc_code="doc-5",
                    file_name=f"Credit_Bureau_And_KYC_Clearance_{case_num}.pdf",
                    document_type="Credit Bureau Report",
                    file_size_kb=195,
                    page_count=2,
                    status="verified",
                    content_text=(
                        f"Line 1: CENTRAL CREDIT BUREAU & AML/KYC COMPLIANCE DOSSIER — #{case_num}\n"
                        f"Line 2: Applicant Name: {full_name} | National ID: {nat_id}\n"
                        f"Line 3: FICO Score: {fico} / 850 | Bureau Classification: {cb_status}\n"
                        f"Line 4: Active External Loans: {active_loans_count} | Monthly Obligations: {existing_debts:,.0f} EUR\n"
                        f"Line 5: PEP & Sanctions Screening: {pep_status} | {aml_status}"
                    ),
                    created_at=created_dt + timedelta(minutes=30),
                )

            db.add_all([doc1, doc2, doc3, doc4, doc5])

            task_status = "completed" if status == "completed" else ("pending" if status == "pending" else "in_progress")
            if scenario_tag == "discrepancy_case":
                t_title = f"Reconcile income/identity discrepancy on Case #{case_num} (€{base_income:,.0f} vs €{verified_income:,.0f})"
            elif scenario_tag == "expired_id_case":
                t_title = f"Follow up on expired ID card ({id_series}) and utility bill address for {full_name}"
            elif scenario_tag == "high_dti_case":
                t_title = f"Review NBR Reg. 17/2012 DTI exception ({dti_pct}% > 40%) for {full_name}"
            else:
                t_title = f"Complete final underwriting sign-off for {full_name} ({product['case_type']})"

            db.add(
                Task(
                    case_id=c.id,
                    title=t_title,
                    status=task_status,
                    priority=priority,
                    assigned_to=officer,
                    due_date=created_dt + timedelta(days=3),
                    created_at=created_dt + timedelta(minutes=35),
                )
            )

            db.add(
                AuditLog(
                    case_id=c.id,
                    action="Credit Dossier Registered & KYC Initialized",
                    performed_by=channel,
                    details=(
                        f"Case #{case_num} ({product['case_type']}) registered at {branch} with 5 supporting documents "
                        f"(Application, ID Card, Employer Certificate, 3M Bank Statement, {extra_doc_type})."
                    ),
                    timestamp=created_dt,
                )
            )
            db.add(
                AuditLog(
                    case_id=c.id,
                    action="Credit Bureau, ANAF & AML Screening Completed",
                    performed_by="Automated Risk Engine",
                    details=(
                        f"FICO Score {fico} ({cb_status}). AML/PEP: {aml_status}. "
                        f"Calculated installment €{monthly_inst:,.2f}/mo (DTI: {dti_pct}%)."
                    ),
                    timestamp=created_dt + timedelta(hours=1),
                )
            )
            new_clients_data.append(cl)

    if new_clients_data:
        db.commit()
        print(f"Seeded {len(new_clients_data)} additional unique client banking dossiers!")


def seed_database(db: Session):
    if db.query(Case).first():
        seed_extended_bank_dossiers(db)
        return

    print("Seeding initial BankDesk & Raiffeisen AI Copilot demo data (English)...")

    # =========================================================================
    # 1. CLIENTS FOR THE 3 CORE DEMO SCENARIOS
    # =========================================================================

    # Scenario 1: Cross-Check Discrepancy (Given name "John" vs "Jonathan" & Income €5,200 vs €5,700)
    client_john = Client(
        full_name="John Miller",
        national_id="1920514410023",
        email="john.miller@example.com",
        phone="+43 676 123 4567",
        address="14 George Enescu St, Sector 1, Vienna",
        employer="Tech Solutions Ltd",
        monthly_income=5200.0,
        existing_monthly_debts=200.0,
        id_card_series="ID 892011",
        id_card_expiry="2031-05-14",
        id_card_issuer="City Registry Authority",
        birth_date="14.05.1992",
        marital_status="Married",
        dependents_count=1,
        housing_status="Owner (No Mortgage)",
        employer_cui="ATU34928172",
        employment_contract_type="Permanent Full-Time",
        seniority_current_employer="2 years and 4 months",
        seniority_total="7 years",
        fico_score=715,
        credit_bureau_status="No delinquencies past 48 months (Class A)",
        credit_bureau_active_loans=1,
        pep_status="Negative (Non-PEP)",
        aml_status="Compliant — No Alerts",
        anaf_consent=True,
        anaf_income=5700.0,
        created_at=datetime.utcnow() - timedelta(days=5)
    )

    # Scenario 3: 100% Valid Clean Case (Green Flags & Debt-to-Income 17.8% < 40%)
    client_elena = Client(
        full_name="Elena Radu",
        national_id="2881120420015",
        email="elena.radu@example.com",
        phone="+43 660 987 6543",
        address="88 Union Blvd, Sector 3, Vienna",
        employer="Global Logistics Corp",
        monthly_income=6800.0,
        existing_monthly_debts=350.0,
        id_card_series="RX 441209",
        id_card_expiry="2032-11-20",
        id_card_issuer="District Registry Authority",
        birth_date="20.11.1988",
        marital_status="Married",
        dependents_count=2,
        housing_status="Owner",
        employer_cui="ATU18492019",
        employment_contract_type="Permanent Full-Time",
        seniority_current_employer="4 years",
        seniority_total="11 years",
        fico_score=745,
        credit_bureau_status="No delinquencies (Class A)",
        credit_bureau_active_loans=1,
        pep_status="Negative (Non-PEP)",
        aml_status="Compliant — No Alerts",
        anaf_consent=True,
        anaf_income=6800.0,
        created_at=datetime.utcnow() - timedelta(days=12)
    )

    # Scenario 2: Critical Edge Case (Expired ID Card + Utility Invoice Mismatch -> Automated SMS/Email)
    client_michael = Client(
        full_name="Michael Scott",
        national_id="1850315400089",
        email="michael.scott@example.com",
        phone="+43 699 555 1234",
        address="45 Victory St, Salzburg",
        employer="Nova Distribution GmbH",
        monthly_income=4500.0,
        existing_monthly_debts=400.0,
        id_card_series="SL 110294",
        id_card_expiry="2026-02-10",  # EXPIRED!
        id_card_issuer="Salzburg Registry",
        birth_date="15.03.1985",
        marital_status="Single",
        dependents_count=0,
        housing_status="Rented",
        employer_cui="ATU29481720",
        employment_contract_type="Permanent Full-Time",
        seniority_current_employer="1 year",
        seniority_total="6 years",
        fico_score=640,
        credit_bureau_status="No active delinquencies (1 minor historical delay < 30 days)",
        credit_bureau_active_loans=2,
        pep_status="Negative (Non-PEP)",
        aml_status="Compliant — No Alerts",
        anaf_consent=False,
        anaf_income=None,
        created_at=datetime.utcnow() - timedelta(days=20)
    )

    db.add_all([client_john, client_elena, client_michael])
    db.commit()

    # =========================================================================
    # 2. MAIN CASES (MATCHING SCREENSHOT #10482, #10479, #10475)
    # =========================================================================

    # Case #10482 - Loan Application (In Review) -> SCENARIO 1: Income & Name Discrepancy
    case_10482 = Case(
        case_number="10482",
        title="Personal Consumer Loan Application",
        case_type="Personal Consumer Loan",
        status="in_review",
        department="Retail Lending",
        branch="Central Plaza Branch",
        channel="Online Web Onboarding",
        priority="high",
        assigned_to="Consultant 024",
        requested_amount=45000.0,
        loan_term_months=60,
        interest_rate_annual=8.9,
        interest_type="Fixed (Promotional)",
        dae_percent=9.42,
        monthly_installment=932.14,
        dti_percent=19.86,
        currency="EUR",
        scenario_tag="discrepancy_case",
        notes="Online loan request. Supporting files submitted. Discrepancy noted between stated income (€5,200) vs verified certificate & bank statement (€5,700). Requires cross-check before final contract approval.",
        client_id=client_john.id,
        created_at=datetime.utcnow() - timedelta(hours=3),
        updated_at=datetime.utcnow() - timedelta(hours=1)
    )

    # Case #10479 - Customer Profile Update (Completed) -> SCENARIO 3: Valid Clean Case
    case_10479 = Case(
        case_number="10479",
        title="Customer Profile Update & Credit Limit Review",
        case_type="KYC Update & Credit Limit Review",
        status="completed",
        department="Client Operations",
        branch="Financial District Branch",
        channel="Direct Branch",
        priority="normal",
        assigned_to="Consultant 024",
        requested_amount=35000.0,
        loan_term_months=48,
        interest_rate_annual=8.5,
        interest_type="Variable (Euribor + 3.25%)",
        dae_percent=8.84,
        monthly_installment=862.40,
        dti_percent=17.83,
        currency="EUR",
        scenario_tag="valid_green_case",
        notes="All documents match 100%. Identity, residential address, and net income verified without inconsistencies. DTI is well within limits.",
        client_id=client_elena.id,
        created_at=datetime.utcnow() - timedelta(hours=18),
        updated_at=datetime.utcnow() - timedelta(hours=4)
    )

    # Case #10475 - Account Opening (Pending) -> SCENARIO 2: Edge Case (Expired ID)
    case_10475 = Case(
        case_number="10475",
        title="Current Account & Overdraft Facility",
        case_type="Current Account & Overdraft Facility",
        status="pending",
        department="Accounts & Payments",
        branch="West City Branch",
        channel="Online Web Onboarding",
        priority="urgent",
        assigned_to="Consultant 024",
        requested_amount=15000.0,
        loan_term_months=36,
        interest_rate_annual=9.5,
        interest_type="Fixed",
        dae_percent=10.15,
        monthly_installment=480.50,
        dti_percent=19.57,
        currency="EUR",
        scenario_tag="expired_id_case",
        notes="Critical compliance blocker identified: Customer ID card is expired and utility invoice location address differs. Requires renewed valid ID before processing.",
        client_id=client_michael.id,
        created_at=datetime.utcnow() - timedelta(days=1, hours=2),
        updated_at=datetime.utcnow() - timedelta(hours=8)
    )

    db.add_all([case_10482, case_10479, case_10475])
    db.commit()

    # =========================================================================
    # 3. DOCUMENTS FOR CASE #10482 (SCENARIO 1: INCOME & NAME DISCREPANCY)
    # =========================================================================
    docs_10482 = [
        Document(
            case_id=case_10482.id,
            doc_code="doc-1",
            file_name="Loan_Application_Form_10482.pdf",
            document_type="Application Form",
            file_size_kb=340,
            page_count=2,
            status="uploaded",
            content_text=(
                "Line 1: RAIFFEISEN BANK INTERNATIONAL - PERSONAL LOAN APPLICATION FORM\n"
                "Line 2: Case Registration Number: #10482 | Submission Date: 28.10.2026\n"
                "Line 3: ------------------------------------------------------------------\n"
                "Line 4: Applicant Name: John Miller\n"
                "Line 5: National ID Number: 1920514410023\n"
                "Line 6: Declared Residential Address: 14 George Enescu St, Sector 1, Vienna\n"
                "Line 7: Employer: Tech Solutions Ltd (Role: Software Engineer)\n"
                "Line 8: Declared Net Monthly Income: 5,200 EUR\n"
                "Line 9: Requested Loan Amount: 45,000 EUR | Loan Term: 60 Months\n"
                "Line 10: Other Monthly Debt Obligations: 0 EUR\n"
                "Line 11: Electronic Signature: VERIFIED (SMS OTP #99412)"
            ),
            created_at=datetime.utcnow() - timedelta(hours=3)
        ),
        Document(
            case_id=case_10482.id,
            doc_code="doc-2",
            file_name="Employer_Income_Certificate_TechSolutions_10482.pdf",
            document_type="Income Certificate",
            file_size_kb=215,
            page_count=1,
            status="flagged",
            content_text=(
                "Line 1: OFFICIAL SALARY & INCOME CERTIFICATE NO. 4481 / 25.10.2026\n"
                "Line 2: Issued by: Tech Solutions Ltd, Commercial Reg. FN38921104\n"
                "Line 3: ------------------------------------------------------------------\n"
                "Line 4: This is to certify that employee Jonathan Miller\n"
                "Line 5: National ID: 1920514410023, residing at 14 George Enescu St, Sector 1, Vienna\n"
                "Line 6: is employed under an open-ended permanent employment contract.\n"
                "Line 7: Net monthly salaries disbursed over the last 3 months:\n"
                "Line 8: - Month 1: 5,700 EUR | Month 2: 5,700 EUR | Month 3: 5,700 EUR\n"
                "Line 9: Certified Net Monthly Salary: 5,700 EUR\n"
                "Line 10: The employee has zero wage garnishments or salary deductions."
            ),
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=50)
        ),
        Document(
            case_id=case_10482.id,
            doc_code="doc-3",
            file_name="Bank_Statement_3Months_10482.pdf",
            document_type="Bank Statement",
            file_size_kb=512,
            page_count=3,
            status="uploaded",
            content_text=(
                "Line 1: OFFICIAL BANK STATEMENT - PERIOD 01.07.2026 - 30.09.2026\n"
                "Line 2: Account Holder: John Miller | National ID: 1920514410023\n"
                "Line 3: IBAN: AT49RZBR0000060019283741 | Currency: EUR\n"
                "Line 4: ------------------------------------------------------------------\n"
                "Line 5: 15.07.2026 | Salary Inflow: Tech Solutions Ltd | +5,700.00 EUR\n"
                "Line 6: 15.08.2026 | Salary Inflow: Tech Solutions Ltd | +5,700.00 EUR\n"
                "Line 7: 15.09.2026 | Salary Inflow: Tech Solutions Ltd | +5,700.00 EUR\n"
                "Line 8: Average Monthly Salary Inflow: 5,700 EUR\n"
                "Line 9: Existing monthly external loan debt debits: 0.00 EUR\n"
                "Line 10: Closing ledger balance at 30.09.2026: 14,280.50 EUR"
            ),
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=40)
        ),
        Document(
            case_id=case_10482.id,
            doc_code="doc-4",
            file_name="National_Identity_Card_John_Miller.pdf",
            document_type="ID Card Copy",
            file_size_kb=180,
            page_count=1,
            status="verified",
            content_text=(
                "Line 1: REPUBLIC OF AUSTRIA - NATIONAL IDENTITY CARD (OCR SCAN)\n"
                "Line 2: Document Number: ID 892011 | Issuing Authority: Vienna District 1\n"
                "Line 3: National ID: 1920514410023\n"
                "Line 4: Surname: Miller | Given Name: John\n"
                "Line 5: Nationality: Austrian | Place of Birth: Vienna\n"
                "Line 6: Permanent Residence: 14 George Enescu St, Sector 1, Vienna\n"
                "Line 7: Validity Period: 14.05.2021 - 14.05.2031"
            ),
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=30)
        ),
    ]

    # =========================================================================
    # 4. DOCUMENTS FOR CASE #10479 (SCENARIO 3: 100% VALID CASE)
    # =========================================================================
    docs_10479 = [
        Document(
            case_id=case_10479.id,
            doc_code="doc-1",
            file_name="Customer_Update_And_Limit_Application_10479.pdf",
            document_type="Application Form",
            file_size_kb=220,
            page_count=1,
            status="verified",
            content_text=(
                "Line 1: RAIFFEISEN BANK - CUSTOMER DATA UPDATE & CREDIT LIMIT APPLICATION\n"
                "Line 2: Case Number: #10479 | Date: 27.10.2026\n"
                "Line 3: Applicant Name: Elena Radu\n"
                "Line 4: National ID Number: 2881120420015\n"
                "Line 5: Residential Address: 88 Union Blvd, Sector 3, Vienna\n"
                "Line 6: Employer: Global Logistics Corp\n"
                "Line 7: Declared Net Monthly Income: 6,800 EUR\n"
                "Line 8: Existing Monthly Loan Repayments: 350 EUR\n"
                "Line 9: Requested Credit Limit: 35,000 EUR for 48 Months"
            ),
            created_at=datetime.utcnow() - timedelta(hours=17)
        ),
        Document(
            case_id=case_10479.id,
            doc_code="doc-2",
            file_name="National_Identity_Card_Elena_Radu.pdf",
            document_type="ID Card Copy",
            file_size_kb=175,
            page_count=1,
            status="verified",
            content_text=(
                "Line 1: NATIONAL IDENTITY CARD\n"
                "Line 2: Document Number: RX 441209\n"
                "Line 3: National ID: 2881120420015\n"
                "Line 4: Surname: Radu | Given Name: Elena\n"
                "Line 5: Permanent Residence: 88 Union Blvd, Sector 3, Vienna\n"
                "Line 6: Validity Period: 20.11.2022 - 20.11.2032"
            ),
            created_at=datetime.utcnow() - timedelta(hours=17)
        ),
        Document(
            case_id=case_10479.id,
            doc_code="doc-3",
            file_name="Employer_Certificate_GlobalLogistics_10479.pdf",
            document_type="Income Certificate",
            file_size_kb=205,
            page_count=1,
            status="verified",
            content_text=(
                "Line 1: CERTIFICATE OF EMPLOYMENT AND EARNINGS NO. 912\n"
                "Line 2: Employer: Global Logistics Corp\n"
                "Line 3: Employee: Elena Radu | National ID: 2881120420015\n"
                "Line 4: Permanent Residence: 88 Union Blvd, Sector 3, Vienna\n"
                "Line 5: Verified Net Monthly Income: 6,800 EUR\n"
                "Line 6: Permanent employment status; zero liens or garnishments."
            ),
            created_at=datetime.utcnow() - timedelta(hours=16)
        ),
    ]

    # =========================================================================
    # 5. DOCUMENTS FOR CASE #10475 (SCENARIO 2: EXPIRED ID CARD)
    # =========================================================================
    docs_10475 = [
        Document(
            case_id=case_10475.id,
            doc_code="doc-1",
            file_name="Account_And_Overdraft_Request_10475.pdf",
            document_type="Application Form",
            file_size_kb=195,
            page_count=1,
            status="uploaded",
            content_text=(
                "Line 1: PREMIUM CURRENT ACCOUNT & OVERDRAFT LINE APPLICATION\n"
                "Line 2: Case Reference: #10475 | Date: 27.10.2026\n"
                "Line 3: Applicant Name: Michael Scott | National ID: 1850315400089\n"
                "Line 4: Declared Residential Address: 45 Victory St, Salzburg\n"
                "Line 5: Net Monthly Income: 4,500 EUR | Employer: Nova Distribution GmbH\n"
                "Line 6: Requested Overdraft Line: 15,000 EUR (36 Months)"
            ),
            created_at=datetime.utcnow() - timedelta(days=1)
        ),
        Document(
            case_id=case_10475.id,
            doc_code="doc-2",
            file_name="Identity_Card_Michael_Scott.pdf",
            document_type="ID Card Copy",
            file_size_kb=190,
            page_count=1,
            status="expired",
            content_text=(
                "Line 1: NATIONAL IDENTITY CARD\n"
                "Line 2: Document Number: SL 110294\n"
                "Line 3: National ID: 1850315400089\n"
                "Line 4: Surname: Scott | Given Name: Michael\n"
                "Line 5: Permanent Residence: 45 Victory St, Salzburg\n"
                "Line 6: Issue Date: 10.02.2016\n"
                "Line 7: Validity Period: 10.02.2016 - 10.02.2026 [DOCUMENT EXPIRED]"
            ),
            created_at=datetime.utcnow() - timedelta(days=1)
        ),
        Document(
            case_id=case_10475.id,
            doc_code="doc-3",
            file_name="Electricity_Utility_Bill_Salzburg_10475.pdf",
            document_type="Utility Bill",
            file_size_kb=145,
            page_count=1,
            status="flagged",
            content_text=(
                "Line 1: RESIDENTIAL ELECTRICITY UTILITY BILL - OCTOBER 2026\n"
                "Line 2: Account Holder: Michael Scott\n"
                "Line 3: Customer Number: 99018273\n"
                "Line 4: Service Location Address:\n"
                "Line 5: 99 Mountain View Ave, Salzburg\n"
                "Line 6: Total Invoice Amount: 245.80 EUR"
            ),
            created_at=datetime.utcnow() - timedelta(hours=22)
        ),
    ]

    db.add_all(docs_10482 + docs_10479 + docs_10475)

    # Initial Tasks & History
    tasks = [
        Task(
            case_id=case_10482.id,
            title="Reconcile income discrepancy (€5,200 on application vs €5,700 on salary certificate)",
            status="in_progress",
            priority="high",
            assigned_to="Consultant 024",
            due_date=datetime.utcnow() + timedelta(days=1)
        ),
        Task(
            case_id=case_10482.id,
            title="Clarify given name discrepancy ('John' on ID vs 'Jonathan' on employer slip)",
            status="in_progress",
            priority="high",
            assigned_to="Consultant 024",
            due_date=datetime.utcnow() + timedelta(days=1)
        ),
        Task(
            case_id=case_10475.id,
            title="Await customer upload of renewed Identity Card for Michael Scott",
            status="pending",
            priority="urgent",
            assigned_to="Consultant 024",
            due_date=datetime.utcnow() + timedelta(days=2)
        ),
    ]

    logs = [
        AuditLog(
            case_id=case_10482.id,
            action="Loan Case Registered",
            performed_by="Raiffeisen Digital Onboarding Portal",
            details="Case #10482 created online with 4 supporting documents uploaded.",
            timestamp=datetime.utcnow() - timedelta(hours=3)
        ),
        AuditLog(
            case_id=case_10482.id,
            action="Officer Assigned",
            performed_by="Automated Case Routing",
            details="Case assigned to Consultant 024 (Retail Lending Department).",
            timestamp=datetime.utcnow() - timedelta(hours=1)
        ),
        AuditLog(
            case_id=case_10479.id,
            action="Case Fully Validated",
            performed_by="Consultant 024",
            details="All compliance checks and underwriting criteria verified successfully.",
            timestamp=datetime.utcnow() - timedelta(hours=4)
        ),
        AuditLog(
            case_id=case_10475.id,
            action="Initial Document Triage",
            performed_by="Automated System",
            details="Documents uploaded for current account and overdraft facility.",
            timestamp=datetime.utcnow() - timedelta(days=1)
        ),
    ]

    db.add_all(tasks + logs)
    db.commit()

    # Additional demo cases so dashboard metrics match:
    # "In Progress": 24
    # "To Verify": 7
    verification_cases_data = [
        ("10471", "Residential Mortgage Loan", "Mortgage Loan", "Sarah Jenkins", 320000.0),
        ("10468", "Debt Consolidation Facility", "Refinancing Loan", "Christian Evans", 75000.0),
        ("10464", "Gold Credit Card Application", "Credit Card", "Joanna Miller", 15000.0),
        ("10460", "Automotive Purchase Loan", "Auto Loan", "Daniel Green", 88000.0),
        ("10457", "Overdraft Facility Extension", "Overdraft", "Victor Vance", 12000.0),
        ("10451", "Consumer Express Loan", "Personal Consumer Loan", "Carmen Taylor", 30000.0),
    ]

    for idx, (c_num, title, c_type, cl_name, amount) in enumerate(verification_cases_data):
        cl = Client(
            full_name=cl_name,
            national_id=f"18{idx}01014100{idx}1",
            email=f"{cl_name.lower().replace(' ', '.')}@example.com",
            phone=f"+43 676 00{idx} 11{idx}",
            address=f"Vienna, Main Street {idx+10}",
            employer="Partner Enterprise Corp",
            monthly_income=5500.0 + idx * 450,
            existing_monthly_debts=200.0,
            id_card_series=f"RT 3301{idx}",
            id_card_expiry="2030-08-15"
        )
        db.add(cl)
        db.commit()

        c = Case(
            case_number=c_num,
            title=title,
            case_type=c_type,
            status="in_review",
            department="Retail Lending",
            branch=f"Metropolitan Branch {idx % 6 + 1}",
            channel="Direct Branch" if idx % 2 == 0 else "Online Web Onboarding",
            priority="normal",
            assigned_to="Consultant 024",
            requested_amount=amount,
            loan_term_months=60,
            interest_rate_annual=8.9,
            currency="EUR",
            scenario_tag="standard_case",
            notes="Complete documentation package pending compliance cross-check.",
            client_id=cl.id,
            created_at=datetime.utcnow() - timedelta(days=idx+1)
        )
        db.add(c)
        db.commit()

        d = Document(
            case_id=c.id,
            doc_code="doc-1",
            file_name=f"Loan_Application_{c_num}.pdf",
            document_type="Application Form",
            file_size_kb=245,
            status="uploaded",
            content_text=(
                f"Line 1: LOAN APPLICATION #{c_num}\n"
                f"Line 2: Applicant: {cl_name} | ID: {cl.national_id}\n"
                f"Line 3: Address: {cl.address}\n"
                f"Line 4: Declared Net Monthly Income: {cl.monthly_income:.0f} EUR\n"
                f"Line 5: Requested Amount: {amount:.0f} EUR"
            )
        )
        db.add(d)

    for i in range(1, 25):
        num_str = str(10450 - i)
        client_name = f"Retail Client {i}"
        cl = Client(
            full_name=client_name,
            national_id=f"19{i:02d}1104100{i:02d}",
            email=f"client.retail{i}@example.com",
            phone=f"+43 650 100 {i:03d}",
            address=f"Liberty Blvd No. {i}, Vienna",
            employer=f"National Corporation {i} Ltd",
            monthly_income=4800.0 + (i * 150),
            existing_monthly_debts=0.0,
            id_card_series=f"ID 550{i:02d}",
            id_card_expiry="2031-12-01",
            fico_score=680 + (i % 80)
        )
        db.add(cl)
        db.commit()

        c = Case(
            case_number=num_str,
            title=f"Banking Operation #{num_str}",
            case_type="Personal Consumer Loan" if i % 2 == 0 else "Account Services",
            status="in_progress",
            department="Retail Lending" if i % 2 == 0 else "Client Operations",
            branch="Central Plaza Branch" if i % 2 == 0 else "Financial District Branch",
            channel="Online Web Onboarding" if i % 3 == 0 else "Direct Branch",
            priority="urgent" if i % 5 == 0 else "normal",
            assigned_to="Consultant 024",
            requested_amount=25000.0 + (i * 1000),
            loan_term_months=48,
            interest_rate_annual=8.9,
            currency="EUR",
            scenario_tag="standard_case",
            notes=f"Operational case in progress for {client_name}.",
            client_id=cl.id,
            created_at=datetime.utcnow() - timedelta(days=i, hours=2)
        )
        db.add(c)
        db.commit()

        d = Document(
            case_id=c.id,
            doc_code="doc-1",
            file_name=f"Application_Form_{num_str}.pdf",
            document_type="Application Form",
            file_size_kb=150,
            status="uploaded",
            content_text=(
                f"Line 1: BANKING APPLICATION #{num_str}\n"
                f"Line 2: Applicant: {client_name} | ID: {cl.national_id}\n"
                f"Line 3: Net Monthly Income: {cl.monthly_income:.0f} EUR\n"
                f"Line 4: ID Card Validity: 01.12.2031"
            )
        )
        db.add(d)

    db.commit()
    seed_extended_bank_dossiers(db)
    print("Database successfully seeded with English BankDesk & AI Copilot demo data!")


if __name__ == "__main__":
    from .database import engine, Base, SessionLocal, initialize_database
    initialize_database()
    db = SessionLocal()
    try:
        seed_database(db)
        from .financial_seed import seed_financial_profiles
        seed_financial_profiles(db)
    finally:
        db.close()
