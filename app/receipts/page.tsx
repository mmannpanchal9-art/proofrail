import { db } from '../../lib/db'; import { Status, Empty } from '../../components/ui';
export const dynamic = 'force-dynamic';
export default function Page() {
  const v = db().prepare('SELECT v.id, v.status, v.kind, v.created_at, t.spec FROM verifications v JOIN tasks t ON t.id=v.task_id ORDER BY v.id DESC').all() as any[];
  return (<div className="space-y-4"><h1>Receipts</h1>
    {!v.length ? <Empty t="No receipts yet. Receipts are generated per verification attempt." /> : <div className="card"><table><thead><tr><th>Receipt</th><th>Task</th><th>Status</th><th>Created</th><th>Export</th></tr></thead><tbody>
      {v.map(x => <tr key={x.id}><td>R-{x.id} ({x.kind})</td><td>{JSON.parse(x.spec).title}</td><td><Status s={x.status} /></td><td className="text-zinc-400">{x.created_at}</td>
        <td className="space-x-2"><a className="btn2" href={`/api/receipts/${x.id}?format=json`}>JSON</a><a className="btn2" href={`/api/receipts/${x.id}?format=pdf`}>PDF</a></td></tr>)}
    </tbody></table></div>}</div>);
}
