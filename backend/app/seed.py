from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Client, Case, Document, Task, AuditLog


def seed_database(db: Session):
    if db.query(Case).first():
        return

    print("Seeding initial BankDesk & Raiffeisen AI Copilot demo data...")

    # =========================================================================
    # 1. CLIENTS FOR THE 3 CORE DEMO SCENARIOS
    # =========================================================================

    # Scenariul 1: Discrepanțe Cross-Check (Nume "Ion" vs "Ioan" & Venit 5.200 vs 5.700 RON)
    client_ion = Client(
        full_name="Ion Popescu",
        cnp="1920514410023",
        email="ion.popescu@exemplu.ro",
        phone="+40 722 345 678",
        address="Str. George Enescu nr. 14, Sector 1, București",
        employer="Tech Solutions SRL",
        monthly_income=5200.0,
        existing_monthly_debts=200.0,
        id_card_series="RK 892011",
        id_card_expiry="2031-05-14",
        id_card_issuer="SPCLEP Sector 1",
        birth_date="14.05.1992",
        marital_status="Căsătorit",
        dependents_count=1,
        housing_status="Proprietar (Fără ipotecă)",
        employer_cui="RO34928172",
        employment_contract_type="Perioadă nedeterminată (Normă întreagă)",
        seniority_current_employer="2 ani și 4 luni",
        seniority_total="7 ani",
        fico_score=715,
        credit_bureau_status="Fără restanțe în ultimele 48 luni (Clasa A)",
        credit_bureau_active_loans=1,
        pep_status="Nu (Negativ conform legii)",
        aml_status="Conform L129/2019 — Fără alerte sau interdicții",
        anaf_consent=True,
        anaf_income=5700.0,
        created_at=datetime.utcnow() - timedelta(days=5)
    )

    # Scenariul 3: Dosar 100% Valid (Green Flags & Grad de îndatorare 18.3% < 40%)
    client_elena = Client(
        full_name="Elena Radu",
        cnp="2881120420015",
        email="elena.radu@exemplu.ro",
        phone="+40 740 112 233",
        address="Bvd. Unirii nr. 88, Sector 3, București",
        employer="Global Logistica SA",
        monthly_income=6800.0,
        existing_monthly_debts=350.0,
        id_card_series="RX 441209",
        id_card_expiry="2032-11-20",
        id_card_issuer="SPCLEP Sector 3",
        birth_date="20.11.1988",
        marital_status="Căsătorită",
        dependents_count=2,
        housing_status="Proprietar",
        employer_cui="RO18492019",
        employment_contract_type="Perioadă nedeterminată",
        seniority_current_employer="4 ani",
        seniority_total="11 ani",
        fico_score=745,
        credit_bureau_status="Fără întârzieri (Clasa A)",
        credit_bureau_active_loans=1,
        pep_status="Nu (Negativ)",
        aml_status="Conform L129/2019 — Fără alerte",
        anaf_consent=True,
        anaf_income=6800.0,
        created_at=datetime.utcnow() - timedelta(days=12)
    )

    # Scenariul 2: Edge Case Critică (Buletin Expirat + Adresă factură diferită -> Auto-Remediere SMS/Email)
    client_mihai = Client(
        full_name="Mihai Dumitrescu",
        cnp="1850315400089",
        email="mihai.dumitrescu@exemplu.ro",
        phone="+40 733 998 877",
        address="Str. Victoriei nr. 45, Cluj-Napoca",
        employer="Nova Distribution SRL",
        monthly_income=4500.0,
        existing_monthly_debts=400.0,
        id_card_series="CJ 110294",
        id_card_expiry="2026-02-10",  # EXPIRAT!
        id_card_issuer="SPCLEP Cluj-Napoca",
        birth_date="15.03.1985",
        marital_status="Necăsătorit",
        dependents_count=0,
        housing_status="Chirie",
        employer_cui="RO29481720",
        employment_contract_type="Perioadă nedeterminată",
        seniority_current_employer="1 an",
        seniority_total="6 ani",
        fico_score=640,
        credit_bureau_status="Fără restanțe active (1 întârziere istorică < 30 zile)",
        credit_bureau_active_loans=2,
        pep_status="Nu (Negativ)",
        aml_status="Conform L129/2019 — Fără alerte",
        anaf_consent=False,
        anaf_income=None,
        created_at=datetime.utcnow() - timedelta(days=20)
    )

    db.add_all([client_ion, client_elena, client_mihai])
    db.commit()

    # =========================================================================
    # 2. MAIN CASES (MATCHING SCREENSHOT #10482, #10479, #10475)
    # =========================================================================

    # Dosar #10482 - Cerere de credit (În verificare) -> SCENARIUL 1: Discrepanțe Venit & Nume
    case_10482 = Case(
        case_number="10482",
        title="Cerere de credit de nevoi personale",
        case_type="Credit de Nevoi Personale Flexicredit",
        status="in_verificare",
        department="Credite Retail",
        branch="Agenția Piața Unirii București",
        channel="Online Web Onboarding",
        priority="ridicat",
        assigned_to="Consultant 024",
        requested_amount=45000.0,
        loan_term_months=60,
        interest_rate_annual=8.9,
        interest_type="Fixă (promoțională)",
        dae_percent=9.42,
        monthly_installment=932.14,
        dti_percent=19.86,
        currency="RON",
        scenario_tag="discrepancy_case",
        notes="Cerere de credit de nevoi personale depusă online. Solicitantul a declarat venit lunar de 5.200 RON, însă adeverința de venit și extrasul de cont atestă 5.700 RON. Verificare identitate: discrepanță minoră prenume între CI ('Ion') și adeverință ('Ioan'). Necesită validare ofițer înainte de emiterea contractului.",
        client_id=client_ion.id,
        created_at=datetime.utcnow() - timedelta(hours=3),
        updated_at=datetime.utcnow() - timedelta(hours=1)
    )

    # Dosar #10479 - Actualizare date client (Complet) -> SCENARIUL 3: Dosar Valid (Green Flags)
    case_10479 = Case(
        case_number="10479",
        title="Actualizare KYC & Majorare Plafon Credit",
        case_type="Actualizare KYC & Plafon Credit",
        status="complet",
        department="Operațiuni Clienți",
        branch="Agenția Calea Victoriei",
        channel="Sucursală Direct",
        priority="normal",
        assigned_to="Consultant 024",
        requested_amount=35000.0,
        loan_term_months=48,
        interest_rate_annual=8.5,
        interest_type="Variabilă (IRCC + 3.25%)",
        dae_percent=8.84,
        monthly_installment=862.40,
        dti_percent=17.83,
        currency="RON",
        scenario_tag="valid_green_case",
        notes="Dosar complet și conform normelor BNR. Venituri confirmate prin raport ANAF și adeverință de salariu. Fără discrepanțe de identificare. Eligibilitate confirmată pentru aprobare directă.",
        client_id=client_elena.id,
        created_at=datetime.utcnow() - timedelta(hours=18),
        updated_at=datetime.utcnow() - timedelta(hours=4)
    )

    # Dosar #10475 - Deschidere cont (În așteptare) -> SCENARIUL 2: Edge Case (Buletin Expirat)
    case_10475 = Case(
        case_number="10475",
        title="Deschidere cont curent & Linie overdraft",
        case_type="Cont Curent & Linie Overdraft",
        status="in_asteptare",
        department="Conturi & Plăți",
        branch="Agenția Cluj Central",
        channel="Online Onboarding",
        priority="urgent",
        assigned_to="Consultant 024",
        requested_amount=15000.0,
        loan_term_months=36,
        interest_rate_annual=9.5,
        interest_type="Fixă",
        dae_percent=10.15,
        monthly_installment=480.50,
        dti_percent=19.57,
        currency="RON",
        scenario_tag="expired_id_case",
        notes="Atenție: Cartea de identitate a expirat la 10.02.2026. Factura de utilități prezintă o adresă diferită de domiciliul din actul de identitate. Dosarul este blocat la verificarea de conformitate până la prezentarea unui act de identitate valabil.",
        client_id=client_mihai.id,
        created_at=datetime.utcnow() - timedelta(days=1, hours=2),
        updated_at=datetime.utcnow() - timedelta(hours=8)
    )

    db.add_all([case_10482, case_10479, case_10475])
    db.commit()

    # =========================================================================
    # 3. DOCUMENTS FOR DOSAR #10482 (SCENARIUL 1: DISCREPANȚE VENIT & NUME)
    # =========================================================================
    docs_10482 = [
        Document(
            case_id=case_10482.id,
            doc_code="doc-1",
            file_name="Formular_Cerere_Credit_10482.pdf",
            document_type="Formular cerere",
            file_size_kb=340,
            page_count=2,
            status="uploaded",
            content_text=(
                "Rândul 1: RAIFFEISEN BANK S.A. - FORMULAR CERERE DE CREDIT NEVOI PERSONALE\n"
                "Rândul 2: Număr înregistrare dosar: #10482 | Data depunerii: 28.10.2026\n"
                "Rândul 3: ------------------------------------------------------------------\n"
                "Rândul 4: Nume și prenume solicitant: Ion Popescu\n"
                "Rândul 5: Cod Numeric Personal (CNP): 1920514410023\n"
                "Rândul 6: Adresă domiciliu declarat: Str. George Enescu nr. 14, Sector 1, București\n"
                "Rândul 7: Angajator declarat: Tech Solutions SRL (Funcție: Inginer Software)\n"
                "Rândul 8: Venit lunar net declarat de solicitant: 5.200 RON\n"
                "Rândul 9: Suma solicitată: 45.000 RON | Perioada de creditare: 60 luni\n"
                "Rândul 10: Alte rate sau obligații lunare declarate: 0 RON\n"
                "Rândul 11: Semnătură electronică calificată: VALIDĂ (OTP #99412)"
            ),
            created_at=datetime.utcnow() - timedelta(hours=3)
        ),
        Document(
            case_id=case_10482.id,
            doc_code="doc-2",
            file_name="Adeverinta_Venit_TechSolutions_10482.pdf",
            document_type="Adeverință venit",
            file_size_kb=215,
            page_count=1,
            status="flagged",
            content_text=(
                "Rândul 1: ADEVERINȚĂ DE VENIT NR. 4481 / 25.10.2026\n"
                "Rândul 2: Emisă de: S.C. Tech Solutions S.R.L., CUI RO38921104, J40/8821/2018\n"
                "Rândul 3: ------------------------------------------------------------------\n"
                "Rândul 4: Se adeverește prin prezenta că domnul Ioan Popescu\n"
                "Rândul 5: având CNP 1920514410023, domiciliat în Str. George Enescu nr. 14, Sector 1, București\n"
                "Rândul 6: este angajat cu contract individual de muncă pe perioadă nedeterminată.\n"
                "Rândul 7: Venituri salariale nete încasate în ultimele 3 luni:\n"
                "Rândul 8: - Iulie 2026: 5.700 RON | August 2026: 5.700 RON | Septembrie 2026: 5.700 RON\n"
                "Rândul 9: Venit lunar net mediu realizat: 5.700 RON\n"
                "Rândul 10: Salariatul nu înregistrează popriri sau rețineri salariale."
            ),
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=50)
        ),
        Document(
            case_id=case_10482.id,
            doc_code="doc-3",
            file_name="Extras_Cont_Bancar_3Luni_10482.pdf",
            document_type="Extras financiar",
            file_size_kb=512,
            page_count=3,
            status="uploaded",
            content_text=(
                "Rândul 1: EXTRAS DE CONT BANCAR - PERIOADA 01.07.2026 - 30.09.2026\n"
                "Rândul 2: Titular cont: Ion Popescu | CNP: 1920514410023\n"
                "Rândul 3: Cont IBAN: RO49RZBR0000060019283741 | Monedă: RON\n"
                "Rândul 4: ------------------------------------------------------------------\n"
                "Rândul 5: 15.07.2026 | Încasare salariu Tech Solutions SRL | +5.700,00 RON\n"
                "Rândul 6: 15.08.2026 | Încasare salariu Tech Solutions SRL | +5.700,00 RON\n"
                "Rândul 7: 15.09.2026 | Încasare salariu Tech Solutions SRL | +5.700,00 RON\n"
                "Rândul 8: Media încasărilor salariale lunare: 5.700 RON\n"
                "Rândul 9: Debite automate alte credite / popriri: 0,00 RON\n"
                "Rândul 10: Sold final disponibil la 30.09.2026: 14.280,50 RON"
            ),
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=40)
        ),
        Document(
            case_id=case_10482.id,
            doc_code="doc-4",
            file_name="Carte_Identitate_CI_Ion_Popescu.pdf",
            document_type="Copie CI",
            file_size_kb=180,
            page_count=1,
            status="verified",
            content_text=(
                "Rândul 1: ROMÂNIA - CARTE DE IDENTITATE (DOCUMENT SCANAT OCR)\n"
                "Rândul 2: Seria RK Nr. 892011 | Emisă de SPCLEP Sector 1\n"
                "Rândul 3: CNP: 1920514410023\n"
                "Rândul 4: Nume: Popescu | Prenume: Ion\n"
                "Rândul 5: Loc naștere: Mun. București, Sector 1\n"
                "Rândul 6: Domiciliu: Str. George Enescu nr. 14, Sector 1, București\n"
                "Rândul 7: Valabilitate: 14.05.2021 - 14.05.2031"
            ),
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=30)
        ),
    ]

    # =========================================================================
    # 4. DOCUMENTS FOR DOSAR #10479 (SCENARIUL 3: DOSAR 100% VALID - GREEN FLAGS)
    # =========================================================================
    docs_10479 = [
        Document(
            case_id=case_10479.id,
            doc_code="doc-1",
            file_name="Formular_Actualizare_Si_Plafon_10479.pdf",
            document_type="Formular cerere",
            file_size_kb=220,
            page_count=1,
            status="verified",
            content_text=(
                "Rândul 1: RAIFFEISEN BANK - FORMULAR ACTUALIZARE DATE & PLAFON CREDIT\n"
                "Rândul 2: Număr dosar: #10479 | Data: 27.10.2026\n"
                "Rândul 3: Nume și prenume solicitant: Elena Radu\n"
                "Rândul 4: CNP: 2881120420015\n"
                "Rândul 5: Adresă domiciliu: Bvd. Unirii nr. 88, Sector 3, București\n"
                "Rândul 6: Angajator: Global Logistica SA\n"
                "Rândul 7: Venit lunar net declarat: 6.800 RON\n"
                "Rândul 8: Obligații lunare existente (card cumpărături): 350 RON\n"
                "Rândul 9: Plafon solicitat: 35.000 RON pe 48 luni"
            ),
            created_at=datetime.utcnow() - timedelta(hours=17)
        ),
        Document(
            case_id=case_10479.id,
            doc_code="doc-2",
            file_name="Carte_Identitate_CI_Elena_Radu.pdf",
            document_type="Copie CI",
            file_size_kb=175,
            page_count=1,
            status="verified",
            content_text=(
                "Rândul 1: ROMÂNIA - CARTE DE IDENTITATE\n"
                "Rândul 2: Seria RX Nr. 441209 | SPCLEP Sector 3\n"
                "Rândul 3: CNP: 2881120420015\n"
                "Rândul 4: Nume: Radu | Prenume: Elena\n"
                "Rândul 5: Domiciliu: Bvd. Unirii nr. 88, Sector 3, București\n"
                "Rândul 6: Valabilitate: 20.11.2022 - 20.11.2032"
            ),
            created_at=datetime.utcnow() - timedelta(hours=17)
        ),
        Document(
            case_id=case_10479.id,
            doc_code="doc-3",
            file_name="Adeverinta_Venit_GlobalLogistica_10479.pdf",
            document_type="Adeverință venit",
            file_size_kb=205,
            page_count=1,
            status="verified",
            content_text=(
                "Rândul 1: ADEVERINȚĂ DE VENIT NR. 912 / 26.10.2026\n"
                "Rândul 2: Angajator: Global Logistica S.A.\n"
                "Rândul 3: Salariat: Elena Radu | CNP: 2881120420015\n"
                "Rândul 4: Domiciliu: Bvd. Unirii nr. 88, Sector 3, București\n"
                "Rândul 5: Venit lunar net confirmat: 6.800 RON\n"
                "Rândul 6: Contract pe perioadă nedeterminată, fără popriri."
            ),
            created_at=datetime.utcnow() - timedelta(hours=16)
        ),
    ]

    # =========================================================================
    # 5. DOCUMENTS FOR DOSAR #10475 (SCENARIUL 2: EDGE CASE BULETIN EXPIRAT)
    # =========================================================================
    docs_10475 = [
        Document(
            case_id=case_10475.id,
            doc_code="doc-1",
            file_name="Cerere_Cont_Si_Overdraft_10475.pdf",
            document_type="Formular cerere",
            file_size_kb=195,
            page_count=1,
            status="uploaded",
            content_text=(
                "Rândul 1: CERERE DESCHIDERE CONT CURENT PREMIUM & LINIE OVERDRAFT\n"
                "Rândul 2: Număr dosar: #10475 | Data: 27.10.2026\n"
                "Rândul 3: Solicitant: Mihai Dumitrescu | CNP: 1850315400089\n"
                "Rândul 4: Adresă declarată: Str. Victoriei nr. 45, Cluj-Napoca\n"
                "Rândul 5: Venit lunar net: 4.500 RON | Angajator: Nova Distribution SRL\n"
                "Rândul 6: Plafon Overdraft solicitat: 15.000 RON (36 luni)"
            ),
            created_at=datetime.utcnow() - timedelta(days=1)
        ),
        Document(
            case_id=case_10475.id,
            doc_code="doc-2",
            file_name="Carte_Identitate_CI_Mihai_Dumitrescu.pdf",
            document_type="Copie CI",
            file_size_kb=190,
            page_count=1,
            status="expired",
            content_text=(
                "Rândul 1: ROMÂNIA - CARTE DE IDENTITATE\n"
                "Rândul 2: Seria CJ Nr. 110294 | SPCLEP Cluj-Napoca\n"
                "Rândul 3: CNP: 1850315400089\n"
                "Rândul 4: Nume: Dumitrescu | Prenume: Mihai\n"
                "Rândul 5: Domiciliu: Str. Victoriei nr. 45, Cluj-Napoca\n"
                "Rândul 6: Data emiterii: 10.02.2016\n"
                "Rândul 7: Valabilitate: 10.02.2016 - 10.02.2026 [DOCUMENT EXPIRAT]"
            ),
            created_at=datetime.utcnow() - timedelta(days=1)
        ),
        Document(
            case_id=case_10475.id,
            doc_code="doc-3",
            file_name="Factura_Utilitati_Electrica_10475.pdf",
            document_type="Factură utilități",
            file_size_kb=145,
            page_count=1,
            status="flagged",
            content_text=(
                "Rândul 1: FACTURĂ ENERGIE ELECTRICĂ - OCTOMBRIE 2026\n"
                "Rândul 2: Titular contract: Mihai Dumitrescu\n"
                "Rândul 3: Cod client: 99018273\n"
                "Rândul 4: Adresă corespondență și loc de consum:\n"
                "Rândul 5: Str. Avram Iancu nr. 99, Ap. 12, Cluj-Napoca\n"
                "Rândul 6: Total de plată: 245,80 RON"
            ),
            created_at=datetime.utcnow() - timedelta(hours=22)
        ),
    ]

    db.add_all(docs_10482 + docs_10479 + docs_10475)

    # Tasks & History logs
    tasks = [
        Task(
            case_id=case_10482.id,
            title="Verificare discrepanță venit (5.200 RON în cerere vs 5.700 RON în adeverință)",
            status="in_lucru",
            priority="ridicat",
            assigned_to="Consultant 024",
            due_date=datetime.utcnow() + timedelta(days=1)
        ),
        Task(
            case_id=case_10482.id,
            title="Clarificare neconcordanță prenume ('Ion' în CI vs 'Ioan' în adeverința de venit)",
            status="in_lucru",
            priority="ridicat",
            assigned_to="Consultant 024",
            due_date=datetime.utcnow() + timedelta(days=1)
        ),
        Task(
            case_id=case_10475.id,
            title="Așteptare reîncărcare Carte de Identitate valabilă de la clientul Mihai Dumitrescu",
            status="in_asteptare",
            priority="urgent",
            assigned_to="Consultant 024",
            due_date=datetime.utcnow() + timedelta(days=2)
        ),
    ]

    logs = [
        AuditLog(
            case_id=case_10482.id,
            action="Înregistrare dosar credit",
            performed_by="Portal Onboarding Raiffeisen",
            details="Dosarul #10482 a fost creat și 4 documente justificative au fost atașate.",
            timestamp=datetime.utcnow() - timedelta(hours=3)
        ),
        AuditLog(
            case_id=case_10482.id,
            action="Alocare ofițer credite",
            performed_by="Sistem Distribuție Automată",
            details="Dosar alocat către Consultant 024 (Departament Credite Retail).",
            timestamp=datetime.utcnow() - timedelta(hours=1)
        ),
        AuditLog(
            case_id=case_10479.id,
            action="Validare completă dosar #10479",
            performed_by="Consultant 024",
            details="Toate documentele și criteriile de eligibilitate au fost verificate cu succes.",
            timestamp=datetime.utcnow() - timedelta(hours=4)
        ),
        AuditLog(
            case_id=case_10475.id,
            action="Triaj inițial documente #10475",
            performed_by="Sistem Portal Online",
            details="Documente încărcate pentru deschidere cont și linie overdraft.",
            timestamp=datetime.utcnow() - timedelta(days=1)
        ),
    ]

    db.add_all(tasks + logs)
    db.commit()

    # Additional cases so dashboard metrics equal EXACTLY:
    # "În lucru": 24
    # "De verificat": 7
    verification_cases_data = [
        ("10471", "Cerere credit ipotecar", "Credit Ipotecar", "Simona Vasile", 320000.0),
        ("10468", "Refinanțare credit", "Refinanțare", "Cristian Enache", 75000.0),
        ("10464", "Card de credit Gold", "Card de Credit", "Ioana Marin", 15000.0),
        ("10460", "Credit auto nou", "Credit Auto", "Dan Gheorghiu", 88000.0),
        ("10457", "Majorare limită descoperit", "Overdraft", "Victor Stanciu", 12000.0),
        ("10451", "Cerere credit consum", "Credit de Nevoi Personale", "Carmen Tudor", 30000.0),
    ]

    for idx, (c_num, title, c_type, cl_name, amount) in enumerate(verification_cases_data):
        cl = Client(
            full_name=cl_name,
            cnp=f"18{idx}01014100{idx}1",
            email=f"{cl_name.lower().replace(' ', '.')}@exemplu.ro",
            phone=f"+40 721 00{idx} 11{idx}",
            address=f"București, Str. Principală nr. {idx+10}",
            employer="Companie Parteneră SA",
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
            status="in_verificare",
            department="Credite Retail",
            branch=f"Sucursala Sector {idx % 6 + 1}",
            channel="Sucursală Direct" if idx % 2 == 0 else "Online Onboarding",
            priority="normal",
            assigned_to="Consultant 024",
            requested_amount=amount,
            loan_term_months=60,
            interest_rate_annual=8.9,
            currency="RON",
            scenario_tag="standard_case",
            notes="Documentație completă, în așteptarea verificării de conformitate.",
            client_id=cl.id,
            created_at=datetime.utcnow() - timedelta(days=idx+1)
        )
        db.add(c)
        db.commit()

        d = Document(
            case_id=c.id,
            doc_code="doc-1",
            file_name=f"Formular_Cerere_{c_num}.pdf",
            document_type="Formular cerere",
            file_size_kb=245,
            status="uploaded",
            content_text=(
                f"Rândul 1: CERERE DE CREDIT #{c_num}\n"
                f"Rândul 2: Solicitant: {cl_name} | CNP: {cl.cnp}\n"
                f"Rândul 3: Adresă: {cl.address}\n"
                f"Rândul 4: Venit lunar net declarat: {cl.monthly_income:.0f} RON\n"
                f"Rândul 5: Suma solicitată: {amount:.0f} RON"
            )
        )
        db.add(d)

    for i in range(1, 25):
        num_str = str(10450 - i)
        client_name = f"Client Retail {i}"
        cl = Client(
            full_name=client_name,
            cnp=f"19{i:02d}1104100{i:02d}",
            email=f"client.retail{i}@exemplu.ro",
            phone=f"+40 720 100 {i:03d}",
            address=f"Str. Libertății nr. {i}, București",
            employer=f"Compania Națională {i} SRL",
            monthly_income=4800.0 + (i * 150),
            existing_monthly_debts=0.0,
            id_card_series=f"RK 550{i:02d}",
            id_card_expiry="2031-12-01",
            fico_score=680 + (i % 80)
        )
        db.add(cl)
        db.commit()

        c = Case(
            case_number=num_str,
            title=f"Dosar operațional #{num_str}",
            case_type="Credit de Nevoi Personale" if i % 2 == 0 else "Servicii Cont Bancar",
            status="in_lucru",
            department="Credite Retail" if i % 2 == 0 else "Operațiuni Clienți",
            branch="Agenția Unirii București" if i % 2 == 0 else "Agenția Victoriei",
            channel="Online Onboarding" if i % 3 == 0 else "Sucursală",
            priority="urgent" if i % 5 == 0 else "normal",
            assigned_to="Consultant 024",
            requested_amount=25000.0 + (i * 1000),
            loan_term_months=48,
            interest_rate_annual=8.9,
            currency="RON",
            scenario_tag="standard_case",
            notes=f"Dosar în lucru pentru {client_name}.",
            client_id=cl.id,
            created_at=datetime.utcnow() - timedelta(days=i, hours=2)
        )
        db.add(c)
        db.commit()

        d = Document(
            case_id=c.id,
            doc_code="doc-1",
            file_name=f"Formular_Cerere_{num_str}.pdf",
            document_type="Formular cerere",
            file_size_kb=150,
            status="uploaded",
            content_text=(
                f"Rândul 1: FORMULAR OPERAȚIUNE BANCARĂ #{num_str}\n"
                f"Rândul 2: Titular: {client_name} | CNP: {cl.cnp}\n"
                f"Rândul 3: Venit lunar net: {cl.monthly_income:.0f} RON\n"
                f"Rândul 4: Valabilitate CI: 01.12.2031"
            )
        )
        db.add(d)

    db.commit()
    print("Database successfully seeded with all 3 Raiffeisen AI Copilot demo scenarios!")
