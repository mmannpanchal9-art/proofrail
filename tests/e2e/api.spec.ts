import { test, expect } from '@playwright/test';
test.beforeEach(async ({ request }) => {
  await request.post('/api/crm/reset'); await request.post('/api/settings', { data: { crm_buggy_mode: 'off' } });
});
test('parse endpoint uses template parser without key', async ({ request }) => {
  const j = await (await request.post('/api/parse', { data: { prompt: 'Update company name of customer C-1001 to Acme Technologies.' } })).json();
  expect(j.parser).toContain('template'); expect(j.spec.customerId).toBe('C-1001');
});
test('tasks API rejects unauthorized and invalid specs', async ({ request }) => {
  expect((await request.post('/api/tasks', { data: { spec: { customerId: 'C-1001', field: 'company', expectedValue: 'X' } } })).status()).toBe(403);
  expect((await request.post('/api/tasks', { data: { spec: { field: 'company' }, authorized: true } })).status()).toBe(400);
});
test('external false claim -> FAILED; true claim with baseline -> VERIFIED', async ({ request }) => {
  const bad = await (await request.post('/api/claims', { data: { agent: 'test-agent', customerId: 'C-1002', field: 'company', expectedValue: 'Acme Technologies', claimedSuccess: true, claim: 'Done!' } })).json();
  expect(bad.status).toBe('FAILED');
  const baseline = { id: 'C-1002', name: 'Arjun Mehta', email: 'arjun@example.com', company: 'Mehta Logistics', phone: '+91-90000-00002' };
  await request.post('/api/crm/C-1002', { data: { ...baseline, company: 'Acme Technologies' } }); // the "external agent" does real work
  const good = await (await request.post('/api/claims', { data: { agent: 'test-agent', customerId: 'C-1002', field: 'company', expectedValue: 'Acme Technologies', claimedSuccess: true, baseline } })).json();
  expect(good.status).toBe('VERIFIED');
  const noBase = await (await request.post('/api/claims', { data: { agent: 'test-agent', customerId: 'C-1002', field: 'company', expectedValue: 'Acme Technologies', claimedSuccess: true } })).json();
  expect(noBase.status).toBe('NEEDS_REVIEW');
});
test('claim on non-allowlisted domain -> INCOMPLETE, never VERIFIED', async ({ request }) => {
  const j = await (await request.post('/api/claims', { data: { customerId: 'C-1001', field: 'company', expectedValue: 'X', claimedSuccess: true, targetBaseUrl: 'https://evil.example' } })).json();
  expect(j.status).toBe('INCOMPLETE');
});
test('receipts export JSON and PDF; rules CRUD validation', async ({ request }) => {
  const c = await (await request.post('/api/claims', { data: { customerId: 'C-1001', field: 'company', expectedValue: 'Nope', claimedSuccess: true } })).json();
  const rj = await request.get(`/api/receipts/${c.verificationId}?format=json`);
  const body = await rj.json(); expect(body.verification.status).toBe('FAILED'); expect(body.checks.length).toBeGreaterThan(2);
  const rp = await request.get(`/api/receipts/${c.verificationId}?format=pdf`);
  expect(rp.headers()['content-type']).toBe('application/pdf'); expect((await rp.body()).subarray(0, 4).toString()).toBe('%PDF');
  expect((await request.post('/api/rules', { data: { name: 'x', type: 'bogus' } })).status()).toBe(400);
  expect((await request.post('/api/rules', { data: { name: 'x', type: 'field_matches_regex', config: { field: 'phone', pattern: '(' } } })).status()).toBe(400);
  const ok = await request.post('/api/rules', { data: { name: 'Phone format', type: 'field_matches_regex', config: { field: 'phone', pattern: '^\\+91' } } });
  expect(ok.status()).toBe(200);
});
