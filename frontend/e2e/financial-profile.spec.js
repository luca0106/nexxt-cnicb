import { test, expect } from '@playwright/test';

async function newClient(request) {
  const response = await request.post('/api/clients', { data: {
    full_name: 'E2E Financial Client', national_id: `E2E${Date.now()}${Math.floor(Math.random() * 1000)}`,
  } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test('all seeded profiles are readable; PUT/GET, conflicts and validation are safe', async ({ request }) => {
  const response = await request.get('/api/clients?limit=100');
  const clients = await response.json();
  expect(clients.length).toBeGreaterThanOrEqual(33);
  for (const client of clients.filter(item => !item.national_id.startsWith('E2E'))) {
    const result = await request.get(`/api/clients/${client.id}/financial-profile`);
    expect(result.ok()).toBeTruthy();
    expect((await result.json()).source_kind).toBe('synthetic');
  }
  const client = await newClient(request);
  const url = `/api/clients/${client.id}/financial-profile`;
  expect((await request.get(url)).status()).toBe(404);
  const data = { monthly_salary: '5200.25', currency: 'EUR', as_of_date: '2026-10-28', expected_version: 0 };
  const created = await request.put(url, { data });
  expect(created.ok()).toBeTruthy();
  const profile = await created.json();
  expect(profile.monthly_salary).toBe('5200.25');
  expect((await request.get(url)).ok()).toBeTruthy();
  expect((await request.put(url, { data })).status()).toBe(409);
  expect((await request.put(url, { data: { ...data, expected_version: profile.version, currency: 'RON' } })).status()).toBe(409);
  expect((await request.put(url, { data: { ...data, monthly_salary: '-1' } })).status()).toBe(422);
  expect((await request.put('/api/clients/999999/financial-profile', { data })).status()).toBe(404);
});

test('create, edit, save, reload and empty lists on desktop and mobile', async ({ page, request }, testInfo) => {
  const client = await newClient(request);
  await page.goto(`/clients/${client.id}/finances`);
  await page.getByLabel('Currency (all amounts)').fill('EUR');
  await page.getByLabel('Net monthly salary').fill('5200.25');
  await page.getByLabel('Number of children').fill('2');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('housing');
  await page.getByLabel('Monthly amount (EUR)').fill('1000');
  await page.getByRole('button', { name: 'Add expense' }).click();
  await page.getByLabel('Category', { exact: true }).nth(1).selectOption('sports_betting');
  await page.getByLabel('Monthly amount (EUR)').nth(1).fill('180');
  await page.getByLabel('Verification status').nth(1).selectOption('suspected');
  await page.getByRole('button', { name: 'Add loan' }).click();
  await page.getByLabel('Lender', { exact: true }).fill('E2E Demo lender');
  await page.getByLabel('Original amount (EUR)').fill('20000');
  await page.getByLabel('Remaining balance (EUR)').fill('12000');
  await page.getByLabel('Monthly payment (EUR)').fill('350');
  const outgoings = page.locator('div.rounded-2xl').filter({ has: page.getByText('Monthly outgoings', { exact: true }) }).first();
  await expect(outgoings).toContainText('1,350.00 EUR');
  await page.getByRole('button', { name: 'Save financial profile' }).click();
  await expect(page.getByText('Financial profile saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Net monthly salary')).toHaveValue('5200.25');
  await expect(page.getByLabel('Number of children')).toHaveValue('2');
  await expect(page.getByLabel('Currency (all amounts)')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Verification status').nth(1)).toHaveValue('suspected');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('financial-profile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Remove expense 2' }).click();
  await page.getByRole('button', { name: 'Remove expense 1' }).click();
  await page.getByRole('button', { name: 'Remove loan 1' }).click();
  await page.getByRole('button', { name: 'Save financial profile' }).click();
  await expect(page.getByText('Financial profile saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('No loans recorded.')).toBeVisible();
  await expect(page.getByText('No expenses recorded. Add an expense to start.')).toBeVisible();
});

test('sidebar and browser Back retain edits until discard is confirmed', async ({ page, request }, testInfo) => {
  const client = await newClient(request);
  await page.goto('/clients');
  await page.getByRole('link', { name: 'Financial profile', exact: true }).first().click();
  await page.getByLabel('Net monthly salary').fill('7777');
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Open Navigation Menu' }).click();
  // The mobile overlay also renders its navigation offscreen on desktop.
  await page.locator('a[href="/"]').filter({ hasText: 'Dashboard' }).filter({ visible: true }).click();
  await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Stay on page' }).click();
  await expect(page.getByLabel('Net monthly salary')).toHaveValue('7777');
  let reloadWarning = false;
  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('beforeunload');
    reloadWarning = true;
    await dialog.dismiss();
  });
  await page.reload({ timeout: 2000, waitUntil: 'commit' }).catch(() => {}); // Cancellation has no navigation commit.
  expect(reloadWarning).toBeTruthy();
  await expect(page.getByLabel('Net monthly salary')).toHaveValue('7777');
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible();
  await page.getByRole('button', { name: 'Discard and leave' }).click();
  await expect(page).toHaveURL('/clients');
});

test('save errors keep edits and offer retry', async ({ page, request }) => {
  const client = await newClient(request);
  await page.goto(`/clients/${client.id}/finances`);
  await page.getByLabel('Currency (all amounts)').fill('EUR');
  await page.getByLabel('Net monthly salary').fill('5000');
  await page.route('**/financial-profile', async route => {
    if (route.request().method() === 'PUT') await route.fulfill({ status: 401, json: { detail: 'Expired' } });
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Save financial profile' }).click();
  await expect(page.getByRole('alert')).toContainText('session expired');
  await expect(page.getByLabel('Net monthly salary')).toHaveValue('5000');
  await page.unroute('**/financial-profile');
  await page.getByRole('button', { name: 'Save financial profile' }).click();
  await expect(page.getByText('Financial profile saved.')).toBeVisible();
});

test('stale edits and network errors preserve the form; reload fetches the current version', async ({ page, request }) => {
  const client = await newClient(request);
  const url = `/api/clients/${client.id}/financial-profile`;
  await request.put(url, { data: { monthly_salary: '5000', currency: 'EUR', as_of_date: '2026-10-28' } });
  await page.goto(`/clients/${client.id}/finances`);
  await page.getByLabel('Net monthly salary').fill('5500');
  const current = await (await request.get(url)).json();
  await request.put(url, { data: { ...current, monthly_salary: '6000', expected_version: current.version } });
  await page.getByRole('button', { name: 'Save financial profile' }).click();
  await expect(page.getByRole('alert')).toContainText('changed elsewhere');
  await expect(page.getByLabel('Net monthly salary')).toHaveValue('5500');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Reload profile' }).click();
  await expect(page.getByLabel('Net monthly salary')).toHaveValue('6000.00');
  await page.getByLabel('Net monthly salary').fill('6500');
  await page.route('**/financial-profile', route => route.request().method() === 'PUT' ? route.abort('failed') : route.continue());
  await page.getByRole('button', { name: 'Save financial profile' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Net monthly salary')).toHaveValue('6500');
  await page.unroute('**/financial-profile');
  await page.getByRole('button', { name: 'Save financial profile' }).click();
  await expect(page.getByText('Financial profile saved.')).toBeVisible();
});
