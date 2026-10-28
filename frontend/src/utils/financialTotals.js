// Monetary strings are converted to integer cents before addition.
export function cents(value) {
  if (!/^\d+(\.\d{0,2})?$/.test(String(value))) return 0;
  const [whole, fraction = ''] = String(value).split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function financialTotals(profile) {
  const sum = (rows, field) => rows.reduce((value, row) => value + cents(row[field]), 0);
  const loans = profile.credits.filter(row => ['active', 'overdue'].includes(row.status));
  return {
    income: cents(profile.monthly_salary) + cents(profile.other_monthly_income),
    expenses: sum(profile.expenses.filter(row => ['declared', 'confirmed'].includes(row.verification_status)), 'monthly_amount'),
    suspected: sum(profile.expenses.filter(row => row.verification_status === 'suspected'), 'monthly_amount'),
    repayments: sum(loans, 'monthly_payment'), balance: sum(loans, 'remaining_balance'), loanCount: loans.length,
  };
}
