import type { Check, RecordSnapshot, Rule, Status, TaskSpec } from './types';
import { isAllowedUrl } from './domain';

export interface EvalInput {
  spec: TaskSpec;
  before: RecordSnapshot | null;  // independent baseline (null if unavailable, e.g. external claim w/o baseline)
  after: RecordSnapshot | null;   // independent re-read in fresh context
  rules: Rule[];
  allowedDomains: string[];
  agentClaimedSuccess?: boolean;   // recorded, NEVER used to pass a check
}

/** Pure, deterministic verification. The agent's claim is never an input to any passing check. */
export function evaluate(i: EvalInput): { status: Status; checks: Check[]; summary: string } {
  const checks: Check[] = [];
  const { spec, before, after } = i;
  const shot = after?.screenshot ? [after.screenshot] : [];

  if (!after || !after.found) {
    checks.push({ id: 'record_readable', name: 'Target record could be independently re-read', result: 'fail', critical: true,
      detail: after?.error || 'Verifier could not load the record', evidence: shot });
    return { status: 'INCOMPLETE', checks, summary: 'Verification could not observe the final state.' };
  }

  const actual = after.values[spec.field];
  checks.push({ id: 'expected_value', name: `"${spec.field}" equals expected value exactly`, result: actual === spec.expectedValue ? 'pass' : 'fail',
    critical: true, expected: spec.expectedValue, actual: actual ?? '(missing)', detail: 'Compared against value read in a fresh browser context', evidence: shot });

  for (const r of i.rules.filter(r => r.enabled)) {
    switch (r.type) {
      case 'record_id_match': {
        const got = after.values['id'];
        checks.push({ id: `rule_${r.id}`, name: r.name, result: got === spec.customerId ? 'pass' : 'fail', critical: true, expected: spec.customerId, actual: got, detail: 'ID shown on re-read record page', evidence: shot });
        break; }
      case 'approved_domain': {
        const ok = isAllowedUrl(after.url, i.allowedDomains);
        checks.push({ id: `rule_${r.id}`, name: r.name, result: ok ? 'pass' : 'fail', critical: true, actual: after.url, detail: `Allowlist: ${i.allowedDomains.join(', ')}`, evidence: shot });
        break; }
      case 'persisted_after_reload': {
        checks.push({ id: `rule_${r.id}`, name: r.name, result: actual === spec.expectedValue ? 'pass' : 'fail', critical: true, expected: spec.expectedValue, actual,
          detail: 'Fresh context = new cookies/cache; value must come from the server', evidence: shot });
        break; }
      case 'no_out_of_scope_changes': {
        if (!before || !before.found) {
          checks.push({ id: `rule_${r.id}`, name: r.name, result: 'unknown', critical: true, detail: 'No independent baseline snapshot available, cannot prove other fields unchanged', evidence: shot });
        } else {
          const changed = Object.keys({ ...before.values, ...after.values }).filter(k => k !== 'updated_at' && before.values[k] !== after.values[k] && !i.spec.allowedFields.includes(k));
          checks.push({ id: `rule_${r.id}`, name: r.name, result: changed.length ? 'fail' : 'pass', critical: true, actual: changed.length ? `changed: ${changed.join(', ')}` : 'none',
            detail: `Allowed: ${i.spec.allowedFields.join(', ')}`, evidence: [...(before.screenshot ? [before.screenshot] : []), ...shot] });
        }
        break; }
      case 'required_not_empty': {
        const f = r.config.field; const v = after.values[f];
        checks.push({ id: `rule_${r.id}`, name: r.name, result: v && v.trim() ? 'pass' : 'fail', critical: false, actual: v ?? '(missing)', detail: `Field ${f}`, evidence: shot });
        break; }
      case 'field_matches_regex': {
        const f = r.config.field; const v = after.values[f] ?? '';
        let ok: boolean | null = null; try { ok = new RegExp(r.config.pattern).test(v); } catch { ok = null; }
        checks.push({ id: `rule_${r.id}`, name: r.name, result: ok === null ? 'unknown' : ok ? 'pass' : 'fail', critical: false, actual: v, detail: `Pattern ${r.config.pattern}`, evidence: shot });
        break; }
    }
  }

  if (i.agentClaimedSuccess !== undefined) {
    checks.push({ id: 'agent_claim', name: 'Agent claim (informational, never used to pass)', result: 'unknown', critical: false,
      actual: i.agentClaimedSuccess ? 'agent claimed success' : 'agent reported failure', detail: 'Claims are recorded for audit only', evidence: [] });
  }
  const scored = checks.filter(c => c.id !== 'agent_claim');
  const critFail = scored.filter(c => c.critical && c.result === 'fail');
  const anyFail = scored.filter(c => c.result === 'fail');
  const unknown = scored.filter(c => c.result === 'unknown');
  let status: Status;
  if (critFail.length) status = 'FAILED';
  else if (unknown.length || anyFail.length || shot.length === 0) status = 'NEEDS_REVIEW';
  else status = 'VERIFIED';
  const conflict = i.agentClaimedSuccess === true && status === 'FAILED' ? ' Agent claimed success but outcome contradicts it.' : '';
  const summary = status === 'VERIFIED' ? 'All checks passed against independently observed state.'
    : status === 'FAILED' ? `Failed: ${critFail.map(c => c.name).join('; ')}.${conflict}`
    : `Needs review: ${[...unknown, ...anyFail].map(c => c.name).join('; ') || 'no screenshot evidence'}.`;
  return { status, checks, summary };
}
