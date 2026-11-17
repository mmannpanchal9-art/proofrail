import PDFDocument from 'pdfkit';
import { db } from './db';

export function buildReceipt(vid: number) {
  const v = db().prepare('SELECT * FROM verifications WHERE id=?').get(vid) as any;
  if (!v) return null;
  const t = db().prepare('SELECT * FROM tasks WHERE id=?').get(v.task_id) as any;
  const e = v.execution_id ? db().prepare('SELECT * FROM executions WHERE id=?').get(v.execution_id) as any : null;
  const ev = db().prepare(`SELECT id,origin,type,label,created_at, CASE WHEN type='screenshot' THEN content ELSE NULL END AS file FROM evidence WHERE task_id=? AND (verification_id=? OR (verification_id IS NULL AND execution_id IS ?))`).all(v.task_id, vid, v.execution_id);
  const spec = JSON.parse(t.spec);
  const observed = JSON.parse(v.observed || '{}');
  return {
    receipt_version: '1', generated_at: new Date().toISOString(),
    verification: { id: v.id, kind: v.kind, status: v.status, summary: v.summary, verified_at: v.created_at },
    task: { id: t.id, title: spec.title, source: t.source, parser: t.parser, prompt: t.prompt, created_at: t.created_at, spec, plan: JSON.parse(t.plan), constraints: JSON.parse(t.constraints) },
    execution: e ? { id: e.id, mode: e.mode, status: e.status, started_at: e.started_at, finished_at: e.finished_at, duration_ms: e.duration_ms, agent_claim: e.agent_claim, error: e.error } : null,
    expected: { [spec.field]: spec.expectedValue },
    actual_observed: observed.after?.values ?? null,
    checks: JSON.parse(v.checks),
    evidence: ev,
    disclaimer: 'Evidence origin "real" = captured by PROOFRAIL; "agent_claim" = reported by the agent, not proof. Status is derived only from independently observed state.',
  };
}

export function receiptPdf(r: NonNullable<ReturnType<typeof buildReceipt>>): Promise<Buffer> {
  return new Promise(res => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = []; doc.on('data', c => chunks.push(c)); doc.on('end', () => res(Buffer.concat(chunks)));
    doc.fontSize(20).text('PROOFRAIL Verification Receipt');
    doc.fontSize(9).fillColor('#555').text(`Generated ${r.generated_at}  |  Verification #${r.verification.id} (${r.verification.kind})`).moveDown();
    doc.fillColor(r.verification.status === 'VERIFIED' ? '#0a7a3b' : r.verification.status === 'FAILED' ? '#b00020' : '#a06000').fontSize(16).text(`STATUS: ${r.verification.status}`);
    doc.fillColor('#000').fontSize(10).text(r.verification.summary).moveDown();
    doc.fontSize(12).text('Task'); doc.fontSize(10).text(`#${r.task.id} ${r.task.title}\nSource: ${r.task.source}   Parser: ${r.task.parser}\nTarget: ${r.task.spec.targetBaseUrl}  Customer: ${r.task.spec.customerId}`).moveDown();
    doc.fontSize(12).text('Expected vs Observed'); doc.fontSize(10).text(`Expected: ${JSON.stringify(r.expected)}\nObserved: ${JSON.stringify(r.actual_observed)}`).moveDown();
    if (r.execution) { doc.fontSize(12).text('Execution'); doc.fontSize(10).text(`Mode: ${r.execution.mode}  Status: ${r.execution.status}  Duration: ${r.execution.duration_ms} ms\nAgent claim (not proof): ${r.execution.agent_claim || '-'}`).moveDown(); }
    doc.fontSize(12).text('Checks');
    for (const c of r.checks) doc.fontSize(10).fillColor(c.result === 'pass' ? '#0a7a3b' : c.result === 'fail' ? '#b00020' : '#a06000')
      .text(`[${c.result.toUpperCase()}]${c.critical ? ' (critical)' : ''} ${c.name}`).fillColor('#333').fontSize(9).text(`   expected=${c.expected ?? '-'} actual=${c.actual ?? '-'} — ${c.detail}`);
    doc.moveDown().fillColor('#000').fontSize(12).text('Evidence references');
    for (const e of r.evidence as any[]) doc.fontSize(9).text(`${e.id} [${e.origin}] ${e.type}: ${e.label}${e.file ? ' (' + e.file + ')' : ''} @ ${e.created_at}`);
    doc.moveDown().fontSize(8).fillColor('#555').text(r.disclaimer);
    doc.end();
  });
}
