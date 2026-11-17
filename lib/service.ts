import crypto from 'crypto';
import { db, now, allowedDomains, getSetting } from './db';
import { buildPlan } from './parser';
import { evaluate } from './evaluate';
import { executeUpdate, readRecord } from './browser';
import type { RecordSnapshot, Rule, TaskSpec } from './types';

const evId = () => 'ev_' + crypto.randomBytes(6).toString('hex');
export function addEvidence(e: { task_id: number; execution_id?: number | null; verification_id?: number | null; origin: string; type: string; label: string; content: string }) {
  const id = evId();
  db().prepare('INSERT INTO evidence VALUES (?,?,?,?,?,?,?,?,?)').run(id, e.task_id, e.execution_id ?? null, e.verification_id ?? null, e.origin, e.type, e.label, e.content, now());
  return id;
}
export const listRules = (): Rule[] => (db().prepare('SELECT * FROM rules').all() as any[]).map(r => ({ ...r, config: JSON.parse(r.config), enabled: !!r.enabled }));

export function validateSpec(s: Partial<TaskSpec>): string[] {
  const e: string[] = [];
  if (!s.customerId) e.push('customerId required');
  if (!s.field || !['company', 'email', 'phone', 'name'].includes(s.field)) e.push('field must be one of company,email,phone,name');
  if (s.expectedValue === undefined || s.expectedValue === '') e.push('expectedValue required');
  if (!s.targetBaseUrl) e.push('targetBaseUrl required');
  return e;
}

export function createTask(spec: TaskSpec, source: string, prompt: string, parser: string) {
  const { plan, constraints } = buildPlan(spec);
  const r = db().prepare('INSERT INTO tasks (created_at,source,prompt,parser,spec,plan,constraints) VALUES (?,?,?,?,?,?,?)')
    .run(now(), source, prompt, parser, JSON.stringify(spec), JSON.stringify(plan), JSON.stringify(constraints));
  return Number(r.lastInsertRowid);
}

function storeSnapshot(taskId: number, execId: number | null, verId: number | null, s: RecordSnapshot, label: string) {
  const ids: string[] = [];
  if (s.screenshot) ids.push(addEvidence({ task_id: taskId, execution_id: execId, verification_id: verId, origin: 'real', type: 'screenshot', label, content: s.screenshot }));
  ids.push(addEvidence({ task_id: taskId, execution_id: execId, verification_id: verId, origin: 'real', type: 'observed_values', label: `${label} (values @ ${s.url})`, content: JSON.stringify(s) }));
  return ids;
}

export async function verify(taskId: number, execId: number | null, spec: TaskSpec, kind: 'initial' | 'reverification', before: RecordSnapshot | null, claimed?: boolean) {
  const allowed = allowedDomains();
  const after = await readRecord(spec.targetBaseUrl, spec.customerId, allowed, 'verify');
  const res = evaluate({ spec, before, after, rules: listRules(), allowedDomains: allowed, agentClaimedSuccess: claimed });
  const r = db().prepare('INSERT INTO verifications (task_id,execution_id,kind,status,created_at,checks,observed,summary) VALUES (?,?,?,?,?,?,?,?)')
    .run(taskId, execId, kind, res.status, now(), JSON.stringify(res.checks), JSON.stringify({ before, after }), res.summary);
  const vid = Number(r.lastInsertRowid);
  storeSnapshot(taskId, execId, vid, after, 'Verifier fresh-context re-read');
  return { verificationId: vid, ...res };
}

/** Full pipeline: baseline (verifier) -> execute (Playwright) -> independent verification. */
export async function runTask(taskId: number) {
  const t = db().prepare('SELECT * FROM tasks WHERE id=?').get(taskId) as any;
  if (!t) throw new Error('task not found');
  const spec: TaskSpec = JSON.parse(t.spec);
  const allowed = allowedDomains();
  const start = Date.now();
  const ex = db().prepare('INSERT INTO executions (task_id,mode,status,started_at) VALUES (?,?,?,?)').run(taskId, 'playwright (real browser)', 'running', now());
  const execId = Number(ex.lastInsertRowid);
  const before = await readRecord(spec.targetBaseUrl, spec.customerId, allowed, 'baseline');
  storeSnapshot(taskId, execId, null, before, 'Verifier baseline before execution');
  const r = await executeUpdate(spec, allowed);
  for (const s of r.screenshots) addEvidence({ task_id: taskId, execution_id: execId, origin: 'real', type: 'screenshot', label: s.label, content: s.file });
  addEvidence({ task_id: taskId, execution_id: execId, origin: 'real', type: 'urls', label: 'Visited URLs', content: JSON.stringify(r.urls) });
  addEvidence({ task_id: taskId, execution_id: execId, origin: 'real', type: 'log', label: 'Execution log', content: r.log.join('\n') });
  if (r.claim) addEvidence({ task_id: taskId, execution_id: execId, origin: 'agent_claim', type: 'claim', label: 'Executor/app success message (claim, not proof)', content: r.claim });
  db().prepare('UPDATE executions SET status=?, finished_at=?, duration_ms=?, agent_claim=?, error=?, log=? WHERE id=?')
    .run(r.status, now(), Date.now() - start, r.claim, r.error ?? null, r.log.join('\n'), execId);
  if (r.status !== 'completed') {
    const v = db().prepare('INSERT INTO verifications (task_id,execution_id,kind,status,created_at,checks,observed,summary) VALUES (?,?,?,?,?,?,?,?)')
      .run(taskId, execId, 'initial', 'INCOMPLETE', now(), JSON.stringify([{ id: 'execution', name: 'Execution reached verifiable state', result: 'fail', critical: true, detail: r.error, evidence: [] }]), JSON.stringify({ before }), `Execution ${r.status}: ${r.error}`);
    return { executionId: execId, verificationId: Number(v.lastInsertRowid), status: 'INCOMPLETE' };
  }
  const v = await verify(taskId, execId, spec, 'initial', before, /success|saved/i.test(r.claim));
  return { executionId: execId, ...v };
}

/** External agent submits a claim; PROOFRAIL verifies it against live state. */
export async function verifyExternalClaim(body: any) {
  const spec: TaskSpec = { title: body.title || `External claim: ${body.field} of ${body.customerId}`, targetBaseUrl: body.targetBaseUrl || getSetting('target_base_url')!,
    customerId: body.customerId, field: body.field, expectedValue: body.expectedValue, allowedFields: body.allowedFields || [body.field] };
  const errs = validateSpec(spec); if (errs.length) return { error: errs };
  const taskId = createTask(spec, `external:${String(body.agent || 'unknown').slice(0, 60)}`, '', 'n/a (structured claim)');
  const ex = db().prepare('INSERT INTO executions (task_id,mode,status,started_at,finished_at,duration_ms,agent_claim,log) VALUES (?,?,?,?,?,?,?,?)')
    .run(taskId, 'external agent (not observed by PROOFRAIL)', 'claimed', now(), now(), 0, String(body.claim || ''), 'Execution performed outside PROOFRAIL; only the claim was received.');
  const execId = Number(ex.lastInsertRowid);
  addEvidence({ task_id: taskId, execution_id: execId, origin: 'agent_claim', type: 'claim', label: 'External agent claim', content: JSON.stringify({ claim: body.claim, claimedSuccess: body.claimedSuccess }) });
  let before: RecordSnapshot | null = null;
  if (body.baseline && typeof body.baseline === 'object') {
    before = { found: true, url: 'agent-supplied', values: body.baseline, observedAt: now() };
    addEvidence({ task_id: taskId, execution_id: execId, origin: 'agent_claim', type: 'observed_values', label: 'Agent-supplied baseline (unverified)', content: JSON.stringify(body.baseline) });
  }
  const v = await verify(taskId, execId, spec, 'initial', before, !!body.claimedSuccess);
  return { taskId, executionId: execId, ...v };
}

export async function reverify(taskId: number) {
  const t = db().prepare('SELECT * FROM tasks WHERE id=?').get(taskId) as any;
  if (!t) throw new Error('task not found');
  const first = db().prepare("SELECT observed FROM verifications WHERE task_id=? ORDER BY id LIMIT 1").get(taskId) as any;
  const before = first ? JSON.parse(first.observed).before ?? null : null;
  const lastExec = db().prepare('SELECT id FROM executions WHERE task_id=? ORDER BY id DESC LIMIT 1').get(taskId) as any;
  return verify(taskId, lastExec?.id ?? null, JSON.parse(t.spec), 'reverification', before);
}
