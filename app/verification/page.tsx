import Link from 'next/link'; import { db } from '../../lib/db'; import { Status, Empty } from '../../components/ui';
export const dynamic = 'force-dynamic';
export default function Page() {
  const v = db().prepare('SELECT v.*, t.spec FROM verifications v JOIN tasks t ON t.id=v.task_id ORDER BY v.id DESC').all() as any[];
  return (<div className="space-y-4"><h1>Verification</h1><p className="text-sm text-zinc-400">Every verification attempt (initial and re-verification) with its checks. VERIFIED requires all critical checks to pass on independently observed state plus screenshot evidence.</p>
    {!v.length ? <Empty t="No verifications yet." /> : <div className="card"><table><thead><tr><th>#</th><th>Task</th><th>Kind</th><th>Status</th><th>Checks (pass/fail/unknown)</th><th>Summary</th></tr></thead><tbody>
      {v.map(x => { const c = JSON.parse(x.checks); const n = (r: string) => c.filter((y: any) => y.result === r).length;
        return <tr key={x.id}><td>{x.id}</td><td><Link className="text-emerald-400" href={`/executions/${x.task_id}`}>#{x.task_id} {JSON.parse(x.spec).title}</Link></td><td>{x.kind}</td><td><Status s={x.status} /></td><td>{n('pass')}/{n('fail')}/{n('unknown')}</td><td className="text-xs text-zinc-400">{x.summary}</td></tr>; })}
    </tbody></table></div>}</div>);
}
