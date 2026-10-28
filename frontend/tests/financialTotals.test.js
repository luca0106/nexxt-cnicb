import test from 'node:test';
import assert from 'node:assert/strict';
import { financialTotals } from '../src/utils/financialTotals.js';

test('totals distinguish unverified expenses and paid-off loans, using cents', () => {
  const profile = {
    monthly_salary: '5200.10', other_monthly_income: '0.20',
    expenses: [
      { monthly_amount: '100.10', verification_status: 'declared' },
      { monthly_amount: '200.20', verification_status: 'confirmed' },
      { monthly_amount: '50.00', verification_status: 'suspected' },
      { monthly_amount: '700.00', verification_status: 'dismissed' },
    ],
    credits: [
      { monthly_payment: '100.25', remaining_balance: '1200.50', status: 'active' },
      { monthly_payment: '80.50', remaining_balance: '1000', status: 'overdue' },
      { monthly_payment: '999', remaining_balance: '999', status: 'paid_off' },
    ],
  };
  assert.deepEqual(financialTotals(profile), {
    income: 520030, expenses: 30030, suspected: 5000, repayments: 18075, balance: 220050, loanCount: 2,
  });
});
