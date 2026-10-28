from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

Money = Annotated[Decimal, Field(ge=0, max_digits=14, decimal_places=2, allow_inf_nan=False)]


class ExpenseInput(BaseModel):
    category: Literal['housing', 'utilities', 'food', 'transport', 'healthcare', 'education', 'childcare', 'insurance', 'entertainment', 'betting', 'sports_betting', 'gambling', 'other']
    monthly_amount: Money
    verification_status: Literal['declared', 'suspected', 'confirmed', 'dismissed'] = 'declared'
    evidence_note: str | None = Field(default=None, max_length=2000)
    model_config = ConfigDict(from_attributes=True)


class CreditInput(BaseModel):
    lender: str = Field(min_length=1, max_length=150)
    credit_type: Literal['mortgage', 'personal_loan', 'auto_loan', 'credit_card', 'overdraft', 'other']
    original_amount: Money
    # Balance may exceed original principal because of interest/fees.
    remaining_balance: Money
    monthly_payment: Money
    interest_rate_annual: Decimal | None = Field(default=None, ge=0, le=100, max_digits=7, decimal_places=4)
    remaining_term_months: int | None = Field(default=None, ge=0)
    status: Literal['active', 'paid_off', 'overdue'] = 'active'
    @model_validator(mode='after')
    def paid_off_has_no_obligations(self):
        if self.status == 'paid_off' and (self.remaining_balance != 0 or self.monthly_payment != 0 or self.remaining_term_months not in (None, 0)):
            raise ValueError('Paid-off credit must have zero remaining balance, monthly payment and remaining term.')
        return self

    model_config = ConfigDict(from_attributes=True)


class FinancialProfileInput(BaseModel):
    monthly_salary: Money
    other_monthly_income: Money = Decimal('0')
    currency: str = Field(default='EUR', pattern=r'^[A-Z]{3}$')
    marital_status: Literal['unknown', 'single', 'married', 'divorced', 'widowed', 'separated'] = 'unknown'
    number_of_children: int = Field(default=0, ge=0)
    as_of_date: date
    expected_version: int | None = Field(default=None, ge=0, exclude=True)
    expenses: list[ExpenseInput] = Field(default_factory=list)
    credits: list[CreditInput] = Field(default_factory=list)


class FinancialProfileOut(FinancialProfileInput):
    client_id: int
    source_kind: Literal["synthetic", "user_supplied", "imported", "unknown"]
    version: int
    is_demo: bool
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
