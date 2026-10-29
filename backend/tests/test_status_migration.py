import unittest
from datetime import datetime
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base, initialize_database
from app.models import Case, Client, Task


class StatusMigrationTest(unittest.TestCase):
    def test_legacy_statuses_are_migrated_without_changing_other_data(self):
        engine = create_engine('sqlite://')
        self.addCleanup(engine.dispose)
        Base.metadata.create_all(engine)
        statuses = ['in_lucru', 'in_verificare', 'in_asteptare', 'completed', 'rejected']
        expected = ['in_progress', 'in_review', 'pending', 'completed', 'rejected']
        timestamp = datetime(2025, 1, 1)
        with Session(engine) as db:
            client = Client(full_name='Demo', national_id='demo-status-migration')
            db.add(client)
            db.flush()
            for index, status in enumerate(statuses, 1):
                db.add(Case(id=index, client_id=client.id, case_number=str(index),
                            title='Demo case', status=status, notes='Keep notes',
                            updated_at=timestamp))
                db.add(Task(id=index, case_id=index, title='Demo task', status=status))
            db.commit()

        with patch('app.database.engine', engine):
            initialize_database()
            initialize_database()

        with Session(engine) as db:
            cases = db.query(Case).order_by(Case.id).all()
            tasks = db.query(Task).order_by(Task.id).all()
            self.assertEqual([case.status for case in cases], expected)
            self.assertEqual([task.status for task in tasks], expected)
            self.assertEqual([case.id for case in cases], list(range(1, 6)))
            self.assertTrue(all(case.notes == 'Keep notes' for case in cases))
            self.assertTrue(all(case.updated_at == timestamp for case in cases))
            self.assertEqual([task.case_id for task in tasks], list(range(1, 6)))
