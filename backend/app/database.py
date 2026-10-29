from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

database_url = settings.DATABASE_URL
connect_args = {}

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine = create_engine(database_url, connect_args=connect_args)
else:
    engine = create_engine(database_url, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



def initialize_database():
    """Upgrade legacy names and statuses while preserving existing records."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if inspector.has_table('clients'):
        columns = {column['name'] for column in inspector.get_columns('clients')}
        if 'cnp' in columns and 'national_id' not in columns:
            with engine.begin() as connection:
                connection.execute(text('ALTER TABLE clients RENAME COLUMN cnp TO national_id'))
    Base.metadata.create_all(bind=engine)
    from .models import Case, Document, Task

    legacy_statuses = {
        'in_lucru': 'in_progress',
        'in_verificare': 'in_review',
        'in_asteptare': 'pending',
    }
    with engine.begin() as connection:
        for model in (Case, Task):
            for old_status, new_status in legacy_statuses.items():
                values = {'status': new_status}
                if model is Case:
                    values['updated_at'] = Case.updated_at
                connection.execute(
                    model.__table__.update()
                    .where(model.status == old_status)
                    .values(**values)
                )

        legacy_case_labels = {
            'case_type': {
                'Credit de Nevoi Personale': 'Personal Consumer Loan',
                'Actualizare KYC & Plafon Credit': 'KYC Update & Credit Limit Review',
                'Cont Curent & Linie Overdraft': 'Current Account & Overdraft Facility',
                'Credit Ipotecar': 'Mortgage Loan',
                'Refinanțare': 'Refinancing Loan',
                'Card de Credit': 'Credit Card',
                'Credit Auto': 'Auto Loan',
                'Servicii Cont Bancar': 'Account Services',
            },
            'title': {
                'Cerere de credit': 'Loan Application',
                'Actualizare date client': 'Client Data Update',
                'Deschidere cont': 'Account Opening',
                'Cerere credit ipotecar': 'Residential Mortgage Loan Application',
                'Refinanțare credit': 'Loan Refinancing',
                'Card de credit Gold': 'Gold Credit Card Application',
                'Credit auto nou': 'New Auto Loan',
                'Majorare limită descoperit': 'Overdraft Limit Increase',
                'Cerere credit consum': 'Consumer Loan Application',
            },
        }
        for field, translations in legacy_case_labels.items():
            for old_label, new_label in translations.items():
                connection.execute(
                    Case.__table__.update()
                    .where(getattr(Case, field) == old_label)
                    .values(**{field: new_label, 'updated_at': Case.updated_at})
                )
        connection.execute(
            Case.__table__.update()
            .where(Case.title == 'Dosar operațional #' + Case.case_number)
            .values(title='Operational Case #' + Case.case_number, updated_at=Case.updated_at)
        )
        legacy_document_types = {
            'Formular cerere': 'Application Form',
            'Adeverință venit': 'Income Certificate',
            'Copie CI': 'ID Card Copy',
            'Extras financiar': 'Bank Statement',
            'Factură utilități': 'Utility Bill',
        }
        for old_label, new_label in legacy_document_types.items():
            connection.execute(
                Document.__table__.update()
                .where(Document.document_type == old_label)
                .values(document_type=new_label)
            )
