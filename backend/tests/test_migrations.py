import unittest
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import Session
from app.database import Base, initialize_database
from db_support import test_engine
from app.models import Client, FinancialProfile
from app.migrations import DETAIL_COLUMNS
from app.financial_seed import seed_financial_profiles
from app.financial_schemas import FinancialProfileOut


class MigrationTest(unittest.TestCase):
    def test_legacy_database_keeps_financial_values(self):
        engine, cleanup = test_engine()
        self.addCleanup(engine.dispose)
        self.addCleanup(cleanup)
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            db.add(Client(full_name='Demo', national_id='1920514410023'))
            db.commit()
            seed_financial_profiles(db)
        with engine.begin() as connection:
            connection.execute(text('ALTER TABLE clients RENAME COLUMN national_id TO cnp'))
            connection.execute(text('ALTER TABLE financial_profiles DROP COLUMN source_kind'))
            connection.execute(text('ALTER TABLE financial_profiles DROP COLUMN version'))
            for table, columns in DETAIL_COLUMNS.items():
                for column in columns:
                    connection.execute(text(f'ALTER TABLE {table} DROP COLUMN {column}'))
            before = connection.execute(text('SELECT monthly_salary, currency FROM financial_profiles')).one()
        initialize_database(engine)
        initialize_database(engine)
        with engine.connect() as connection:
            self.assertEqual(before, connection.execute(text('SELECT monthly_salary, currency FROM financial_profiles')).one())
            self.assertEqual(connection.execute(text('SELECT COUNT(*) FROM schema_migrations')).scalar(), 3)
        with Session(engine) as db:
            profile = db.query(FinancialProfile).one()
            self.assertEqual(profile.source_kind, 'synthetic')
            self.assertEqual(profile.version, 1)
            self.assertIsNone(db.query(Client).one().fico_score)
            FinancialProfileOut.model_validate(profile)
            self.assertEqual(db.query(Client).one().national_id, '1920514410023')
        engine.dispose()
