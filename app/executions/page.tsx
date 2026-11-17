import Link from 'next/link';
import { latestPerTask } from '../../lib/queries';
import { Status, Empty } from '../../components/ui';
export const dynamic = 'force-dynamic';
export default function Page() {
  const rows = latestPerTask();
  return (<div className="space-y-4"><h1>Executions</h1>
    {!rows.length ? <Empty t="No executions recorded yet." /> : <div className="card overflow-x-auto"><table><thead><tr><th>Task</th><th>Created</th><th>Mode</th><th>Exec status</th><th>Duration</th><th>Verification</th><th>Detail</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.id}><td><Link className="text-emerald-400" href={`/executions/${r.id}`}>#{r.id} {JSON.parse(r.spec).title}</Link></td><td className="text-zinc-400">{r.created_at}</td><td>{r.mode}</td><td>{r.exec_status}</td><td>{r.duration_ms ?? '-'} ms</td><td><Status s={r.vstatus || 'INCOMPLETE'} /></td><td className="text-xs text-zinc-400">{r.vsummary}</td></tr>)}
    </tbody></table></div>}</div>);
}
