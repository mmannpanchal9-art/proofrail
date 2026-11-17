import { db } from '../../../lib/db';
import { Status, Origin } from '../../../components/ui';
import Reverify from '../../../components/Reverify';
import { notFound } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default function Page({ params }: { params: { id: string } }) {
  const t = db().prepare('SELECT * FROM tasks WHERE id=?').get(Number(params.id)) as any; if (!t) notFound();
  const spec = JSON.parse(t.spec);
  const execs = db().prepare('SELECT * FROM executions WHERE task_id=? ORDER BY id').all(t.id) as any[];
  const vers = db().prepare('SELECT * FROM verifications WHERE task_id=? ORDER BY id DESC').all(t.id) as any[];
  const ev = db().prepare('SELECT * FROM evidence WHERE task_id=? ORDER BY created_at').all(t.id) as any[];
  return (<div className="space-y-5">
    <div className="flex items-center gap-3"><h1>#{t.id} {spec.title}</h1>{vers[0] && <Status s={vers[0].status} />}</div>
    <div className="text-sm text-zinc-400">Source: {t.source} · Parser: {t.parser} · Target: {spec.targetBaseUrl} · Expected {spec.field} = “{spec.expectedValue}”</div>
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card"><div className="font-medium mb-2">Plan</div><ol className="list-decimal ml-5 text-sm space-y-1">{JSON.parse(t.plan).map((p: string, i: number) => <li key={i}>{p}</li>)}</ol></div>
      <div className="card"><div className="font-medium mb-2">Constraints</div><ul className="list-disc ml-5 text-sm space-y-1">{JSON.parse(t.constraints).map((p: string, i: number) => <li key={i}>{p}</li>)}</ul></div>
    </div>
    <div className="card"><div className="flex justify-between mb-3"><div className="font-medium">Verification history (each attempt preserved)</div><Reverify taskId={t.id} /></div>
      {vers.map(v => <div key={v.id} className="border border-zinc-800 rounded-lg p-3 mb-3" data-testid="verification">
        <div className="flex gap-3 items-center mb-2"><Status s={v.status} /><span className="text-xs text-zinc-400">#{v.id} · {v.kind} · {v.created_at}</span>
          <a className="btn2 ml-auto" href={`/api/receipts/${v.id}?format=json`}>Receipt JSON</a><a className="btn2" href={`/api/receipts/${v.id}?format=pdf`}>Receipt PDF</a></div>
        <div className="text-sm mb-2" data-testid="summary">{v.summary}</div>
        <table><thead><tr><th>Result</th><th>Check</th><th>Expected</th><th>Actual</th><th>Detail</th></tr></thead><tbody>
          {JSON.parse(v.checks).map((c: any) => <tr key={c.id}><td className={c.result === 'pass' ? 'text-emerald-400' : c.result === 'fail' ? 'text-red-400' : 'text-amber-400'}>{c.result}{c.critical ? '*' : ''}</td><td>{c.name}</td><td>{c.expected ?? '-'}</td><td>{c.actual ?? '-'}</td><td className="text-xs text-zinc-400">{c.detail}</td></tr>)}
        </tbody></table></div>)}
    </div>
    <div className="card"><div className="font-medium mb-2">Executions</div>
      {execs.map(e => <div key={e.id} className="text-sm mb-3"><div>#{e.id} · {e.mode} · <b>{e.status}</b> · {e.duration_ms} ms {e.error && <span className="text-red-400">· {e.error}</span>}</div>
        <div className="text-xs text-fuchsia-300">Agent/app claim: {e.agent_claim || '—'}</div>
        <pre className="text-[11px] bg-zinc-950 p-2 rounded mt-1 whitespace-pre-wrap">{e.log}</pre></div>)}</div>
    <div className="card"><div className="font-medium mb-2">Evidence</div><div className="grid md:grid-cols-2 gap-3">
      {ev.map(e => <div key={e.id} className="border border-zinc-800 rounded-lg p-2 text-xs"><div className="flex gap-2 items-center mb-1"><Origin o={e.origin} /><span className="text-zinc-500">{e.id}</span></div>
        <div className="mb-1">{e.label}</div>
        {e.type === 'screenshot' ? <a href={`/api/evidence/${e.content}`} target="_blank"><img src={`/api/evidence/${e.content}`} alt={e.label} className="rounded max-h-48" /></a>
          : <pre className="whitespace-pre-wrap break-all text-zinc-400 max-h-40 overflow-auto">{e.type === 'observed_values' ? JSON.stringify(JSON.parse(e.content).values ?? JSON.parse(e.content)) : e.content}</pre>}</div>)}</div></div>
  </div>);
}
