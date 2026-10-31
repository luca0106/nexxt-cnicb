import json
import unittest
from datetime import datetime
from unittest.mock import patch

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base, initialize_database
from app.models import AIAnalysis, Case, Client, Document, Task


class StatusMigrationTest(unittest.TestCase):
    def test_copy_translation_preserves_evidence_and_is_idempotent(self):
        engine = create_engine('sqlite://')
        self.addCleanup(engine.dispose)
        Base.metadata.create_all(engine)
        timestamp = datetime(2025, 1, 1)
        content = 'Rândul 1: CERERE DE CREDIT #1\nRândul 2: Suma solicitată: 5.200 RON'
        with Session(engine) as db:
            client = Client(full_name='Ion Popescu', national_id='1920514410023',
                            address='Str. Libertății nr. 1, București')
            db.add(client)
            db.flush()
            db.add(Case(id=1, client_id=client.id, case_number='1', title='Custom title',
                        department='Operațiuni Clienți', interest_type='Fixă',
                        notes='Dosar în lucru pentru Ion Popescu.\nCustom note',
                        requested_amount=5200, updated_at=timestamp))
            db.add(Document(id=1, case_id=1, file_name='Formular_Cerere.pdf',
                            document_type='Formular cerere', content_text=content))
            db.add(AIAnalysis(case_id=1, analysis_uid='translation-test', human_decision='pending',
                              findings_json=json.dumps([{'quote': content.splitlines()[1],
                                  'lineNumber': 2, 'documentName': 'Formular_Cerere.pdf',
                                  'documentType': 'Formular cerere', 'amount': 5200,
                                  'verification_status': 'suspected'}])))
            db.commit()
        with patch('app.database.engine', engine):
            initialize_database()
        with engine.connect() as connection:
            first = {table.name: connection.execute(table.select()).all()
                     for table in Base.metadata.sorted_tables}
        with patch('app.database.engine', engine):
            initialize_database()
        with engine.connect() as connection:
            second = {table.name: connection.execute(table.select()).all()
                      for table in Base.metadata.sorted_tables}
        self.assertEqual(first, second, 'Translation must be idempotent')
        with Session(engine) as db:
            case = db.get(Case, 1)
            self.assertEqual(case.department, 'Client Operations')
            self.assertEqual(case.interest_type, 'Fixed')
            self.assertEqual(case.title, 'Custom title')
            self.assertEqual(case.notes, 'Case in progress for Ion Popescu.\nCustom note')
            self.assertEqual(case.updated_at, timestamp)
            self.assertEqual(case.requested_amount, 5200)
            self.assertEqual(case.client.address, 'Str. Libertății nr. 1, București')
            document = db.get(Document, 1)
            self.assertEqual(document.document_type, 'Application Form')
            self.assertEqual(len(document.content_text.splitlines()), 2)
            analysis = db.query(AIAnalysis).one()
            finding = json.loads(analysis.findings_json)[0]
            self.assertEqual(finding['quote'], document.content_text.splitlines()[1])
            self.assertEqual(finding['documentName'], document.file_name)
            self.assertEqual(finding['documentType'], document.document_type)
            self.assertEqual(finding['amount'], 5200)
            self.assertEqual(finding['verification_status'], 'suspected')
            self.assertEqual(finding['lineNumber'], 2)
            self.assertEqual(analysis.human_decision, 'pending')

    def test_legacy_case_labels_are_translated_without_overwriting_custom_titles(self):
        engine = create_engine('sqlite://')
        self.addCleanup(engine.dispose)
        Base.metadata.create_all(engine)
        timestamp = datetime(2025, 1, 1)
        records = [
            ('Cerere de credit', 'Credit de Nevoi Personale'),
            ('Dosar operațional #2', 'Servicii Cont Bancar'),
            ('Custom title', 'Personal Consumer Loan'),
            ('Dosar operațional #custom', 'Custom product'),
        ]
        with Session(engine) as db:
            client = Client(full_name='Demo', national_id='demo-label-migration')
            db.add(client)
            db.flush()
            for index, (title, case_type) in enumerate(records, 1):
                db.add(Case(id=index, client_id=client.id, case_number=str(index),
                            title=title, case_type=case_type, notes='Keep notes',
                            updated_at=timestamp))
            db.commit()

        with patch('app.database.engine', engine):
            initialize_database()
            initialize_database()

        with Session(engine) as db:
            cases = db.query(Case).order_by(Case.id).all()
            self.assertEqual([(case.title, case.case_type) for case in cases], [
                ('Loan Application', 'Personal Consumer Loan'),
                ('Operational Case #2', 'Account Services'),
                records[2],
                records[3],
            ])
            self.assertTrue(all(case.notes == 'Keep notes' for case in cases))
            self.assertTrue(all(case.updated_at == timestamp for case in cases))

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
