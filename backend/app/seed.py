from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import Client, Case, Document, Task, AuditLog

def seed_database(db: Session):
    # Check if data already exists
    if db.query(Case).first():
        return

    print("Seeding initial BankDesk banking data...")

    # 1. Create primary clients
    client_alex = Client(
        full_name="Alexandru Ionescu",
        cnp="1920514410023",
        email="alexandru.ionescu@exemplu.ro",
        phone="+40 722 345 678",
        address="Str. George Enescu nr. 14, București, Sector 1",
        employer="Tech Solutions SRL",
        monthly_income=5200.0,
        created_at=datetime.utcnow() - timedelta(days=5)
    )

    client_elena = Client(
        full_name="Elena Radu",
        cnp="2881120420015",
        email="elena.radu@exemplu.ro",
        phone="+40 740 112 233",
        address="Bvd. Unirii nr. 88, București, Sector 3",
        employer="Global Logistica SA",
        monthly_income=6800.0,
        created_at=datetime.utcnow() - timedelta(days=12)
    )

    client_mihai = Client(
        full_name="Mihai Dumitrescu",
        cnp="1850315400089",
        email="mihai.dumitrescu@exemplu.ro",
        phone="+40 733 998 877",
        address="Str. Victoriei nr. 45, Cluj-Napoca",
        employer="Nova Distribution SRL",
        monthly_income=4500.0,
        created_at=datetime.utcnow() - timedelta(days=20)
    )

    client_andreea = Client(
        full_name="Andreea Popa",
        cnp="2950711120034",
        email="andreea.popa@exemplu.ro",
        phone="+40 755 443 322",
        address="Str. Republicii nr. 12, Timișoara",
        employer="FinTech Corp",
        monthly_income=7200.0,
        created_at=datetime.utcnow() - timedelta(days=2)
    )

    db.add_all([client_alex, client_elena, client_mihai, client_andreea])
    db.commit()

    # 2. Main cases from screenshot
    # Dosar #10482 - Cerere de credit (În verificare)
    case_10482 = Case(
        case_number="10482",
        title="Cerere de credit",
        case_type="Credit de Nevoi Personale",
        status="in_verificare",
        department="Credite Retail",
        priority="ridicat",
        assigned_to="Consultant 024",
        requested_amount=45000.0,
        currency="RON",
        notes="Dosar depus online. Documente justificative atașate. Solicitare verificare venituri și scoring intern.",
        client_id=client_alex.id,
        created_at=datetime.utcnow() - timedelta(hours=3),
        updated_at=datetime.utcnow() - timedelta(hours=1)
    )

    # Dosar #10479 - Actualizare date client (Complet)
    case_10479 = Case(
        case_number="10479",
        title="Actualizare date client",
        case_type="Actualizare Date KYC",
        status="complet",
        department="Operațiuni Clienți",
        priority="normal",
        assigned_to="Consultant 024",
        requested_amount=None,
        currency="RON",
        notes="Clientul a furnizat noua adresă de domiciliu și cartea de identitate reînnoită. Validat.",
        client_id=client_elena.id,
        created_at=datetime.utcnow() - timedelta(hours=18),
        updated_at=datetime.utcnow() - timedelta(hours=4)
    )

    # Dosar #10475 - Deschidere cont (În așteptare)
    case_10475 = Case(
        case_number="10475",
        title="Deschidere cont",
        case_type="Pachet Cont Curent Premium",
        status="in_asteptare",
        department="Conturi & Plăți",
        priority="normal",
        assigned_to="Consultant 024",
        requested_amount=None,
        currency="RON",
        notes="Așteaptă confirmarea specimenului de semnătură în sucursală sau flux video identitate.",
        client_id=client_mihai.id,
        created_at=datetime.utcnow() - timedelta(days=1, hours=2),
        updated_at=datetime.utcnow() - timedelta(hours=8)
    )

    db.add_all([case_10482, case_10479, case_10475])
    db.commit()

    # Documents for Case 10482 (Prepared for future AI review per PDF instructions)
    doc1 = Document(
        case_id=case_10482.id,
        file_name="Formular_Cerere_Credit_10482.pdf",
        document_type="Formular cerere",
        file_size_kb=340,
        status="uploaded",
        content_text="""BANCA RAIFFEISEN - CERERE DE CREDIT DE NEVOI PERSONALE
Număr dosar: #10482
Data depunerii: 2026-10-28
Solicitant: Alexandru Ionescu | CNP: 1920514410023
Suma solicitată: 45.000 RON pe 60 de luni
Angajator declarat: Tech Solutions SRL
Funcție: Inginer Software
Venit lunar net declarat: 5.200 RON
Alte credite în derulare: Nu
Semnătură solicitant: Electronic semnat (OTP SMS)""",
        created_at=datetime.utcnow() - timedelta(hours=3)
    )

    doc2 = Document(
        case_id=case_10482.id,
        file_name="Adeverinta_Venit_Angajator_TechSolutions.pdf",
        document_type="Adeverință venit",
        file_size_kb=215,
        status="uploaded",
        content_text="""ADEVERINȚĂ DE VENIT
Nr. 4481 / 25.10.2026
Societatea Tech Solutions SRL, CUI RO38921104
Confirmă că salariatul Alexandru Ionescu, având CNP 1920514410023, este angajat cu contract individual de muncă pe perioadă nedeterminată.
Venit net lunar realizat în ultimele 3 luni:
- Luna 1: 5.700 RON
- Luna 2: 5.700 RON
- Luna 3: 5.700 RON
Media venitului lunar net: 5.700 RON
Nu are popriri sau rețineri salariale.""",
        created_at=datetime.utcnow() - timedelta(hours=3)
    )

    doc3 = Document(
        case_id=case_10482.id,
        file_name="Extras_Cont_Bancar_3Luni.pdf",
        document_type="Extras financiar",
        file_size_kb=512,
        status="uploaded",
        content_text="""EXTRAS DE CONT BANCAR
Titular: Alexandru Ionescu
Perioada: 01.07.2026 - 30.09.2026
Încasări salariale periodice:
- 15.07.2026: Virament salariu Tech Solutions SRL +5.700 RON
- 15.08.2026: Virament salariu Tech Solutions SRL +5.700 RON
- 15.09.2026: Virament salariu Tech Solutions SRL +5.700 RON
Rulaj mediu lunar: 5.700 RON
Sold disponibil: 12.450 RON""",
        created_at=datetime.utcnow() - timedelta(hours=2, minutes=45)
    )

    doc4 = Document(
        case_id=case_10482.id,
        file_name="Carte_Identitate_Alexandru_Ionescu.pdf",
        document_type="Copie CI",
        file_size_kb=180,
        status="uploaded",
        content_text="""REPUBLICA ROMÂNIA - CARTE DE IDENTITATE
Seria RK Nr. 892011
CNP: 1920514410023
Nume: Ionescu
Prenume: Alexandru
Cetățenie: Română
Loc naștere: Mun. București
Domiciliu: Str. George Enescu nr. 14, Sector 1, București
Valabilitate: 14.05.2020 - 14.05.2030""",
        created_at=datetime.utcnow() - timedelta(hours=2, minutes=30)
    )

    # Documents for Case 10479
    doc_kyc = Document(
        case_id=case_10479.id,
        file_name="Declaratie_KYC_Elena_Radu.pdf",
        document_type="Formular actualizare",
        file_size_kb=160,
        status="verified",
        content_text="Formular actualizare date personale KYC completat și semnat de titular Elena Radu.",
        created_at=datetime.utcnow() - timedelta(hours=17)
    )

    # Documents for Case 10475
    doc_account = Document(
        case_id=case_10475.id,
        file_name="Cerere_Deschidere_Cont_Premium.pdf",
        document_type="Cerere cont",
        file_size_kb=195,
        status="uploaded",
        content_text="Cerere deschidere cont curent în RON și card de debit atașat.",
        created_at=datetime.utcnow() - timedelta(days=1)
    )

    db.add_all([doc1, doc2, doc3, doc4, doc_kyc, doc_account])

    # Tasks for Case 10482
    task1 = Task(
        case_id=case_10482.id,
        title="Verificare adeverință venit vs cerere de credit",
        status="in_lucru",
        priority="ridicat",
        assigned_to="Consultant 024",
        due_date=datetime.utcnow() + timedelta(days=1)
    )
    task2 = Task(
        case_id=case_10482.id,
        title="Calcul grad de îndatorare și verificare Biroul de Credit",
        status="in_asteptare",
        priority="normal",
        assigned_to="Consultant 024",
        due_date=datetime.utcnow() + timedelta(days=2)
    )

    # History logs for Case 10482
    log1 = AuditLog(
        case_id=case_10482.id,
        action="Creare dosar credit",
        performed_by="Sistem Portal Online",
        details="Dosarul a fost inițiat prin platforma de onboarding clienți.",
        timestamp=datetime.utcnow() - timedelta(hours=3)
    )
    log2 = AuditLog(
        case_id=case_10482.id,
        action="Încărcare documente justificative",
        performed_by="Client Alexandru Ionescu",
        details="Atașat 4 documente (formular, adeverință, extras, CI).",
        timestamp=datetime.utcnow() - timedelta(hours=2, minutes=30)
    )
    log3 = AuditLog(
        case_id=case_10482.id,
        action="Preluare în verificare",
        performed_by="Consultant 024",
        details="Dosar preluat în analiză de către Consultant 024 din departamentul Credite Retail.",
        timestamp=datetime.utcnow() - timedelta(hours=1)
    )

    db.add_all([task1, task2, log1, log2, log3])
    db.commit()

    # Now let's create additional cases so that the dashboard stats exactly match:
    # "În lucru": 24
    # "De verificat": 7
    # Currently:
    # case_10482 is "in_verificare" (1)
    # case_10479 is "complet"
    # case_10475 is "in_asteptare"

    # We need 6 more "in_verificare" cases (to reach 7 "De verificat"):
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
            address=f"București, Str. Test {idx+1}",
            employer="Companie Parteneră",
            monthly_income=5000.0 + idx * 400
        )
        db.add(cl)
        db.commit()

        c = Case(
            case_number=c_num,
            title=title,
            case_type=c_type,
            status="in_verificare",
            department="Credite Retail",
            priority="normal",
            assigned_to="Consultant 024",
            requested_amount=amount,
            currency="RON",
            notes="Documentație completă, necesită verificare conformitate.",
            client_id=cl.id,
            created_at=datetime.utcnow() - timedelta(days=idx+1)
        )
        db.add(c)
        db.commit()

        # Add sample document
        d = Document(
            case_id=c.id,
            file_name=f"Documentatie_dosar_{c_num}.pdf",
            document_type="Dosar credit",
            file_size_kb=245,
            status="uploaded",
            content_text=f"Documentație dosar #{c_num} pentru {cl_name}. Suma: {amount} RON."
        )
        db.add(d)

    # We need 24 "in_lucru" cases (to reach 24 "În lucru" on dashboard):
    for i in range(1, 25):
        num_str = str(10450 - i)
        client_name = f"Client Test {i}"
        cl = Client(
            full_name=client_name,
            cnp=f"19{i:02d}1104100{i:02d}",
            email=f"client{i}@exemplu.ro",
            phone=f"+40 720 100 {i:03d}",
            address=f"Str. Libertății nr. {i}, București",
            employer=f"Compania {i} SA",
            monthly_income=4200.0 + (i * 150)
        )
        db.add(cl)
        db.commit()

        c = Case(
            case_number=num_str,
            title=f"Operațiune #{num_str} - Verificare dosar",
            case_type="Credit de Nevoi Personale" if i % 2 == 0 else "Servicii Cont Bancar",
            status="in_lucru",
            department="Credite Retail" if i % 2 == 0 else "Operațiuni Clienți",
            priority="urgent" if i % 5 == 0 else "normal",
            assigned_to="Consultant 024",
            requested_amount=25000.0 + (i * 1000),
            currency="RON",
            notes=f"Dosar operațional în curs de procesare pentru {client_name}.",
            client_id=cl.id,
            created_at=datetime.utcnow() - timedelta(days=i, hours=2)
        )
        db.add(c)
        db.commit()

        d = Document(
            case_id=c.id,
            file_name=f"Formular_cerere_{num_str}.pdf",
            document_type="Formular cerere",
            file_size_kb=150,
            status="uploaded",
            content_text=f"Formular cerere înregistrat pentru dosarul {num_str}."
        )
        db.add(d)

    db.commit()
    print("Database successfully seeded with BankDesk demo data!")

