import { db } from './db';
export function latestPerTask() {
  return db().prepare(`SELECT t.id, t.created_at, t.source, t.spec, e.id exec_id, e.status exec_status, e.mode, e.duration_ms,
    (SELECT status FROM verifications v WHERE v.task_id=t.id ORDER BY id DESC LIMIT 1) vstatus,
    (SELECT summary FROM verifications v WHERE v.task_id=t.id ORDER BY id DESC LIMIT 1) vsummary
    FROM tasks t LEFT JOIN executions e ON e.id=(SELECT MAX(id) FROM executions WHERE task_id=t.id) ORDER BY t.id DESC`).all() as any[];
}
export function metrics() {
  const rows = db().prepare(`SELECT v.status, v.checks FROM verifications v WHERE v.kind='initial'`).all() as any[];
  const total = (db().prepare('SELECT COUNT(*) c FROM tasks').get() as any).c as number;
  const by = (s: string) => rows.filter(r => r.status === s).length;
  const avg = (db().prepare("SELECT AVG(duration_ms) a, COUNT(*) c FROM executions WHERE mode LIKE 'playwright%' AND finished_at IS NOT NULL").get() as any);
  const reasons: Record<string, number> = {};
  for (const r of rows) for (const c of JSON.parse(r.checks)) if (c.result === 'fail') reasons[c.name] = (reasons[c.name] || 0) + 1;
  return { total, verifications: rows.length, verified: by('VERIFIED'), failed: by('FAILED'), review: by('NEEDS_REVIEW'), incomplete: by('INCOMPLETE'),
    rate: rows.length ? by('VERIFIED') / rows.length : null, avgMs: avg.c ? Math.round(avg.a) : null, reasons: Object.entries(reasons).sort((a, b) => b[1] - a[1]) };
}
