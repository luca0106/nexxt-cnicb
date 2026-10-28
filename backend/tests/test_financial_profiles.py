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
from db_support import test_engine
from app.routers.clients import replace_financial_profile, get_financial_profile


class FinancialProfilesTest(unittest.TestCase):
    def setUp(self):
        self.engine, self.cleanup = test_engine()
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.client = Client(full_name='Demo', national_id='1920514410023')
        self.db.add(self.client)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.cleanup()
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
        data['expected_version'] = profile.version
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


class FinancialSafetyTest(unittest.TestCase):
    setUp = FinancialProfilesTest.setUp
    tearDown = FinancialProfilesTest.tearDown

    def test_origin_history_and_concurrent_edit(self):
        from app.models import FinancialProfileRevision
        from fastapi import HTTPException
        seed_financial_profiles(self.db)
        profile = get_financial_profile(self.client.id, self.db)
        initial_version = profile.version
        data = dict(monthly_salary='6000', currency='EUR', as_of_date=date.today(), expected_version=initial_version)
        saved = replace_financial_profile(self.client.id, FinancialProfileInput(**data), self.db)
        self.assertEqual(saved.source_kind, 'synthetic')
        self.assertFalse(saved.is_demo)
        self.assertEqual(saved.version, initial_version + 1)
        self.assertEqual(self.db.query(FinancialProfileRevision).count(), 2)
        with self.assertRaises(HTTPException) as missing_version:
            replace_financial_profile(self.client.id, FinancialProfileInput(monthly_salary=6000, as_of_date=date.today()), self.db)
        self.assertEqual(missing_version.exception.status_code, 428)
        with self.assertRaises(HTTPException) as error:
            replace_financial_profile(self.client.id, FinancialProfileInput(**data), self.db)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(get_financial_profile(self.client.id, self.db).monthly_salary, Decimal('6000'))

    def test_no_implicit_currency_conversion(self):
        from fastapi import HTTPException
        seed_financial_profiles(self.db)
        with self.assertRaises(HTTPException) as error:
            replace_financial_profile(self.client.id, FinancialProfileInput(monthly_salary=5000, currency='RON', as_of_date=date.today()), self.db)
        self.assertEqual(error.exception.status_code, 409)
        self.assertEqual(get_financial_profile(self.client.id, self.db).currency, 'EUR')

    def test_paid_off_rules_and_canonical_statuses(self):
        from app.financial_schemas import CreditInput, ExpenseInput
        credit = dict(lender='Demo', credit_type='personal_loan', original_amount=1000,
                      remaining_balance=0, monthly_payment=0, remaining_term_months=0, status='paid_off')
        CreditInput(**credit)
        for field in ['remaining_balance', 'monthly_payment', 'remaining_term_months']:
            with self.assertRaises(ValidationError):
                CreditInput(**(credit | {field: 1}))
        for status in ['declared', 'suspected', 'confirmed', 'dismissed']:
            ExpenseInput(category='food', monthly_amount=100, verification_status=status)
        with self.assertRaises(ValidationError):
            ExpenseInput(category='food', monthly_amount=100, verification_status='verified')
