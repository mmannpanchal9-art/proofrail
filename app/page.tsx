import Link from 'next/link';
import { latestPerTask, metrics } from '../lib/queries';
import { Status, Empty } from '../components/ui';
export const dynamic = 'force-dynamic';
export default function Overview() {
  const m = metrics(); const rows = latestPerTask().slice(0, 8);
  return (<div className="space-y-6">
    <div><h1>Overview</h1><p className="text-zinc-400 text-sm">Execution and verification are separate engines. A task is VERIFIED only from independently re-read state, never from an agent&apos;s success message.</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[['Tasks', m.total], ['Verified', m.verified], ['Failed', m.failed], ['Needs review', m.review]].map(([l, v]) => <div key={l} className="card"><div className="text-xs text-zinc-400">{l}</div><div className="text-2xl font-semibold">{v}</div></div>)}
    </div>
    <div className="flex gap-2"><Link className="btn" href="/tasks/new">+ New verified task</Link><Link className="btn2" href="/monitoring">Monitoring</Link></div>
    {rows.length === 0 ? <Empty t="No tasks yet. Create one from New Task — all numbers here come from the database only." /> :
      <div className="card"><table><thead><tr><th>#</th><th>Task</th><th>Source</th><th>Status</th></tr></thead><tbody>
        {rows.map(r => { const s = JSON.parse(r.spec); return <tr key={r.id}><td>{r.id}</td><td><Link className="text-emerald-400" href={`/executions/${r.id}`}>{s.title}</Link></td><td className="text-zinc-400">{r.source}</td><td><Status s={r.vstatus || 'INCOMPLETE'} /></td></tr>; })}
      </tbody></table></div>}
  </div>);
}
