"""Deterministic synthetic financial profiles for the built-in demo clients."""
from datetime import date
from decimal import Decimal
from random import Random
from .models import Client, FinancialProfile, ClientExpense, ClientCredit


def seed_financial_profiles(db):
    examples = [
        ('1920514410023', 'single', 0, 5200, 0, 0, 0),
        ('2881120420015', 'married', 2, 6800, 12000, 350, 36),
        ('1850315400089', 'divorced', 1, 4500, 16000, 400, 48),
    ]
    for national_id, marital, children, salary, balance, payment, term in examples:
        client = db.query(Client).filter_by(national_id=national_id).first()
        if client is None or db.get(FinancialProfile, client.id) is not None:
            continue
        profile = FinancialProfile(
            client_id=client.id, monthly_salary=salary, other_monthly_income=0,
            currency='EUR', marital_status=marital, number_of_children=children,
            as_of_date=date(2026, 10, 28), is_demo=True,
        )
        profile.expenses = [
            ClientExpense(category=category, monthly_amount=amount, verification_status='declared',
                          evidence_note='Synthetic demo estimate; not extracted from documents.')
            for category, amount in [('housing', 1000), ('utilities', 220), ('food', 400 + children * 100), ('transport', 150)]
        ]
        if marital == 'divorced':
            profile.expenses.append(ClientExpense(
                category='sports_betting', monthly_amount=180, verification_status='suspected',
                evidence_note='Synthetic demo merchant-category signal; requires human verification.'))
        if balance:
            profile.credits = [ClientCredit(
                lender='Demo lender', credit_type='personal_loan', original_amount=20000,
                remaining_balance=balance, monthly_payment=payment,
                remaining_term_months=term, interest_rate_annual=8.5, status='active')]
        db.add(profile)
    # Only built-in seed IDs qualify; ordinary customer records stay untouched.
    demo_ids = {f"18{idx}01014100{idx}1" for idx in range(6)}
    demo_ids.update(f"19{i:02d}1104100{i:02d}" for i in range(1, 25))
    for client in db.query(Client).filter(Client.national_id.in_(demo_ids)).all():
        if db.get(FinancialProfile, client.id) is not None:
            continue
        rng = Random(client.national_id)
        salary = Decimal(str(client.monthly_income or 0)).quantize(Decimal('0.01'))
        marital = rng.choice(['single', 'married', 'married', 'divorced', 'widowed'])
        children = rng.choice([0, 0, 1, 2, 3])
        profile = FinancialProfile(
            client_id=client.id, monthly_salary=salary,
            other_monthly_income=rng.choice([0, 0, 0, 150, 250, 400]),
            currency='EUR', marital_status=marital, number_of_children=children,
            as_of_date=date(2026, 10, 28), is_demo=True,
        )
        def expense(category, amount, status='declared'):
            return ClientExpense(category=category, monthly_amount=amount,
                verification_status=status,
                evidence_note='Synthetic monthly estimate for demonstration; not a real transaction.')
        housing = (salary * Decimal(str(rng.choice([0.16, 0.20, 0.24, 0.28])))).quantize(Decimal('0.01'))
        profile.expenses = [
            expense('housing', housing),
            expense('utilities', rng.randrange(140, 281, 10) + children * 25),
            expense('food', rng.randrange(280, 501, 20) + children * 110),
            expense('transport', rng.randrange(80, 321, 20)),
            expense('healthcare', rng.randrange(30, 121, 10)),
            expense('insurance', rng.randrange(40, 151, 10)),
            expense('entertainment', rng.randrange(60, 241, 10)),
        ]
        if children:
            profile.expenses.extend([expense('education', children * rng.choice([45, 75, 110])),
                                     expense('childcare', children * rng.choice([80, 150, 220]))])
        if rng.random() < 0.25:
            profile.expenses.append(expense(rng.choice(['betting', 'sports_betting', 'gambling']),
                                           rng.choice([45, 90, 160, 280, 420]), 'suspected'))
        payment = Decimal(str(client.existing_monthly_debts or 0)).quantize(Decimal('0.01'))
        if payment > 0:
            months = rng.choice([12, 18, 24, 36, 48])
            annual_rate = Decimal(str(rng.choice([6.9, 8.5, 9.9, 11.5])))
            rate = annual_rate / Decimal('1200')
            # Present value of remaining instalments, rounded to cents.
            balance = (payment * (1 - (1 + rate) ** (-months)) / rate).quantize(Decimal('0.01'))
            original = (balance * Decimal('1.4')).quantize(Decimal('0.01'))
            profile.credits = [ClientCredit(
                lender=rng.choice(['Demo Retail Bank', 'Demo Consumer Finance', 'Demo Credit Union']),
                credit_type='personal_loan', original_amount=original,
                remaining_balance=balance, monthly_payment=payment,
                remaining_term_months=months, interest_rate_annual=annual_rate, status='active')]
        db.add(profile)
    db.commit()
