import { describe, it, expect } from 'vitest';
import { templateParse, buildPlan } from '../../lib/parser';
import { isAllowedUrl } from '../../lib/domain';
describe('templateParse', () => {
  it('parses English', () => {
    const r = templateParse('Update company name of customer C-1003 to Acme Technologies and verify.');
    expect(r.spec).toMatchObject({ customerId: 'C-1003', field: 'company', expectedValue: 'Acme Technologies' });
  });
  it('parses Hinglish', () => {
    const r = templateParse('customer c-1002 ka company name ko Acme Technologies mein update karo');
    expect(r.spec).toMatchObject({ customerId: 'C-1002', field: 'company', expectedValue: 'Acme Technologies' });
  });
  it('warns instead of guessing when ID missing', () => {
    const r = templateParse('update company to Foo for customer XYZ');
    expect(r.spec.customerId).toBeUndefined(); expect(r.warnings.length).toBeGreaterThan(0);
  });
  it('builds plan + constraints', () => {
    const p = buildPlan({ title: '', targetBaseUrl: 'http://localhost:1', customerId: 'C-1', field: 'company', expectedValue: 'A', allowedFields: ['company'] });
    expect(p.plan.length).toBe(7); expect(p.constraints.join(' ')).toContain('C-1');
  });
});
describe('isAllowedUrl', () => {
  it('allows listed hosts and subdomains only', () => {
    expect(isAllowedUrl('http://localhost:3100/x', ['localhost'])).toBe(true);
    expect(isAllowedUrl('https://a.example.com', ['example.com'])).toBe(true);
    expect(isAllowedUrl('https://evilexample.com', ['example.com'])).toBe(false);
    expect(isAllowedUrl('javascript:alert(1)', ['localhost'])).toBe(false);
    expect(isAllowedUrl('not a url', ['localhost'])).toBe(false);
  });
});
