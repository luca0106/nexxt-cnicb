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
    from .models import Case, Task

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
