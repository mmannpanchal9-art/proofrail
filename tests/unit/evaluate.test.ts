import { describe, it, expect } from 'vitest';
import { evaluate } from '../../lib/evaluate';
import type { Rule, TaskSpec, RecordSnapshot } from '../../lib/types';
const spec: TaskSpec = { title: 't', targetBaseUrl: 'http://localhost:3100', customerId: 'C-1003', field: 'company', expectedValue: 'Acme Technologies', allowedFields: ['company'] };
const rules: Rule[] = [
  { id: 1, name: 'id', type: 'record_id_match', config: {}, enabled: true },
  { id: 2, name: 'domain', type: 'approved_domain', config: {}, enabled: true },
  { id: 3, name: 'persist', type: 'persisted_after_reload', config: {}, enabled: true },
  { id: 4, name: 'scope', type: 'no_out_of_scope_changes', config: {}, enabled: true },
  { id: 5, name: 'email', type: 'required_not_empty', config: { field: 'email' }, enabled: true },
];
const snap = (v: Partial<Record<string, string>>, url = 'http://localhost:3100/crm/C-1003'): RecordSnapshot =>
  ({ found: true, url, observedAt: '', screenshot: 's.png', values: { id: 'C-1003', name: 'X', email: 'a@b.c', company: 'XYZ Pvt Ltd', phone: '1', ...v } as any });
const base = { spec, rules, allowedDomains: ['localhost'] };

describe('evaluate', () => {
  it('VERIFIED when state matches and nothing else changed', () => {
    expect(evaluate({ ...base, before: snap({}), after: snap({ company: 'Acme Technologies' }) }).status).toBe('VERIFIED');
  });
  it('FAILED when agent claims success but value not saved', () => {
    const r = evaluate({ ...base, before: snap({}), after: snap({}), agentClaimedSuccess: true });
    expect(r.status).toBe('FAILED'); expect(r.summary).toMatch(/Agent claimed success/);
  });
  it('FAILED when an out-of-scope field changed', () => {
    const r = evaluate({ ...base, before: snap({}), after: snap({ company: 'Acme Technologies', phone: '999' }) });
    expect(r.status).toBe('FAILED'); expect(r.checks.find(c => c.id === 'rule_4')!.actual).toContain('phone');
  });
  it('FAILED on off-allowlist final URL', () => {
    expect(evaluate({ ...base, before: snap({}), after: snap({ company: 'Acme Technologies' }, 'https://evil.example/crm/C-1003') }).status).toBe('FAILED');
  });
  it('NEEDS_REVIEW when no baseline exists (cannot prove scope)', () => {
    expect(evaluate({ ...base, before: null, after: snap({ company: 'Acme Technologies' }) }).status).toBe('NEEDS_REVIEW');
  });
  it('NEEDS_REVIEW when no screenshot evidence', () => {
    const a = snap({ company: 'Acme Technologies' }); delete a.screenshot;
    expect(evaluate({ ...base, before: snap({}), after: a }).status).toBe('NEEDS_REVIEW');
  });
  it('INCOMPLETE when record cannot be re-read', () => {
    expect(evaluate({ ...base, before: null, after: { found: false, url: '', values: {}, observedAt: '' } }).status).toBe('INCOMPLETE');
  });
  it('agent claim never makes a task VERIFIED and is informational', () => {
    const r = evaluate({ ...base, before: snap({}), after: snap({ company: 'Wrong' }), agentClaimedSuccess: true });
    expect(r.status).not.toBe('VERIFIED');
    expect(r.checks.find(c => c.id === 'agent_claim')!.result).toBe('unknown');
  });
  it('non-critical rule failure -> NEEDS_REVIEW', () => {
    expect(evaluate({ ...base, before: snap({ email: '' }), after: snap({ company: 'Acme Technologies', email: '' }) }).status).toBe('NEEDS_REVIEW');
  });
});
