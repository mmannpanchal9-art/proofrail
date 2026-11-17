import { test, expect } from '@playwright/test';
test.beforeEach(async ({ request }) => { await request.post('/api/crm/reset'); });

async function runTask(page: any, value: string) {
  await page.goto('/tasks/new');
  await page.fill('[name=spec-customerId]', 'C-1003');
  await page.selectOption('[name=spec-field]', 'company');
  await page.fill('[name=spec-expectedValue]', value);
  await page.check('[name=authorize]');
  await page.getByRole('button', { name: 'Execute & verify' }).click();
  await page.waitForURL(/\/executions\/\d+/, { timeout: 90000 });
}

test('VERIFIED: real Playwright execution + independent verification + receipt', async ({ page, request }) => {
  await request.post('/api/settings', { data: { crm_buggy_mode: 'off' } });
  await runTask(page, 'Acme Technologies');
  await expect(page.getByTestId('status').first()).toHaveText('VERIFIED');
  await expect(page.getByText('REAL · captured by PROOFRAIL').first()).toBeVisible();
  const dl = page.waitForEvent('download'); await page.getByText('Receipt PDF').first().click();
  expect((await dl).suggestedFilename()).toMatch(/\.pdf$/);
  await page.getByRole('button', { name: 'Re-verify on fresh state' }).click();
  await expect(page.getByTestId('verification')).toHaveCount(2);
});

test('FAILED: buggy CRM shows "Saved successfully" but did not save', async ({ page, request }) => {
  await request.post('/api/settings', { data: { crm_buggy_mode: 'on' } });
  await runTask(page, 'Acme Technologies');
  await expect(page.getByTestId('status').first()).toHaveText('FAILED');
  await expect(page.getByTestId('summary').first()).toContainText('Agent claimed success');
  await expect(page.getByText('Agent/app claim: Saved successfully')).toBeVisible();
  await request.post('/api/settings', { data: { crm_buggy_mode: 'off' } });
  await page.goto('/monitoring');
  await expect(page.getByTestId('metrics')).toContainText('Failed');
});
