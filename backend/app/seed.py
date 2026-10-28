from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Client, Case, Document, Task, AuditLog


def seed_database(db: Session):
    if db.query(Case).first():
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
        existing_monthly_debts=0.0,
        id_card_series="ID 892011",
        id_card_expiry="2031-05-14",
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
        title="Loan Application",
        case_type="Personal Consumer Loan",
        status="in_review",
        department="Retail Lending",
        priority="high",
        assigned_to="Consultant 024",
        requested_amount=45000.0,
        loan_term_months=60,
        interest_rate_annual=8.9,
        currency="EUR",
        scenario_tag="discrepancy_case",
        notes="Online loan request. Supporting files submitted. Requires three-way cross-check between Application Form, Salary Certificate, and Bank Statement.",
        client_id=client_john.id,
        created_at=datetime.utcnow() - timedelta(hours=3),
        updated_at=datetime.utcnow() - timedelta(hours=1)
    )

    # Case #10479 - Customer Profile Update (Completed) -> SCENARIO 3: Valid Clean Case
    case_10479 = Case(
        case_number="10479",
        title="Customer Profile Update",
        case_type="KYC Update & Credit Limit Review",
        status="completed",
        department="Client Operations",
        priority="normal",
        assigned_to="Consultant 024",
        requested_amount=35000.0,
        loan_term_months=48,
        interest_rate_annual=8.5,
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
        title="Account Opening",
        case_type="Current Account & Overdraft Facility",
        status="pending",
        department="Accounts & Payments",
        priority="urgent",
        assigned_to="Consultant 024",
        requested_amount=15000.0,
        loan_term_months=36,
        interest_rate_annual=9.5,
        currency="EUR",
        scenario_tag="expired_id_case",
        notes="Critical compliance blocker identified: Customer ID card is expired and utility invoice location address differs.",
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
            id_card_expiry="2031-12-01"
        )
        db.add(cl)
        db.commit()

        c = Case(
            case_number=num_str,
            title=f"Banking Operation #{num_str}",
            case_type="Personal Consumer Loan" if i % 2 == 0 else "Account Services",
            status="in_progress",
            department="Retail Lending" if i % 2 == 0 else "Client Operations",
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
