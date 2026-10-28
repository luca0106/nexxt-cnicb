import unittest
from datetime import date
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from pydantic import ValidationError
from app.database import Base
from app.models import Client, FinancialProfile
from app.financial_schemas import FinancialProfileInput, FinancialProfileOut
from app.financial_seed import seed_financial_profiles
from app.routers.clients import replace_financial_profile, get_financial_profile


class FinancialProfilesTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine('sqlite://')
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.client = Client(full_name='Demo', national_id='1920514410023')
        self.db.add(self.client)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def test_round_trip_and_replacement(self):
        data = dict(monthly_salary='5200.25', as_of_date=date.today(), marital_status='married',
                    number_of_children=2, expenses=[dict(category='sports_betting', monthly_amount='100.20',
                    verification_status='suspected', evidence_note='Unverified merchant signal')],
                    credits=[dict(lender='Example', credit_type='personal_loan', original_amount='10000',
                    remaining_balance='4000.50', monthly_payment='200')])
        replace_financial_profile(self.client.id, FinancialProfileInput(**data), self.db)
        self.db.expire_all()
        profile = get_financial_profile(self.client.id, self.db)
        self.assertEqual(profile.credits[0].remaining_balance, Decimal('4000.50'))
        self.assertEqual(profile.expenses[0].verification_status, 'suspected')
        FinancialProfileOut.model_validate(profile)
        data['expenses'] = []
        replace_financial_profile(self.client.id, FinancialProfileInput(**data), self.db)
        self.assertEqual(self.db.get(FinancialProfile, self.client.id).expenses, [])
        seed_financial_profiles(self.db)
        self.assertFalse(profile.is_demo)
        self.assertEqual(profile.monthly_salary, Decimal('5200.25'))

    def test_demo_seed_is_idempotent(self):
        seed_financial_profiles(self.db)
        seed_financial_profiles(self.db)
        self.assertEqual(self.db.query(FinancialProfile).count(), 1)
        self.assertTrue(self.db.get(FinancialProfile, self.client.id).is_demo)

    def test_all_demo_profiles_are_populated_consistently(self):
        from app.models import ClientExpense, ClientCredit
        for i in range(6):
            self.db.add(Client(full_name=f'Demo {i}', national_id=f"18{i}01014100{i}1",
                               monthly_income=5500 + i * 450, existing_monthly_debts=200))
        self.db.commit()
        seed_financial_profiles(self.db)
        count = self.db.query(ClientExpense).count()
        seed_financial_profiles(self.db)
        self.assertEqual(self.db.query(ClientExpense).count(), count)
        self.assertEqual(self.db.query(FinancialProfile).count(), 7)
        for profile in self.db.query(FinancialProfile):
            FinancialProfileOut.model_validate(profile)
            self.assertTrue(profile.is_demo)
            if profile.credits:
                credit = profile.credits[0]
                self.assertEqual(credit.monthly_payment, Decimal('200.00'))
                self.assertLess(credit.remaining_balance, credit.monthly_payment * credit.remaining_term_months)
        self.assertEqual(self.db.query(ClientCredit).count(), 6)

    def test_invalid_values(self):
        for invalid in [dict(monthly_salary=-1), dict(number_of_children=-1), dict(marital_status='invalid'),
                        dict(monthly_salary='NaN'), dict(expenses=[dict(category='betting', monthly_amount=-5)])]:
            with self.assertRaises(ValidationError):
                FinancialProfileInput(**(dict(monthly_salary=100, as_of_date=date.today()) | invalid))
