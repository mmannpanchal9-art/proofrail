import Link from 'next/link'; import { db } from '../../lib/db';
export const dynamic = 'force-dynamic';
export default function Crm() {
  const c = db().prepare('SELECT * FROM crm_customers ORDER BY id').all() as any[];
  return (<div className="space-y-4"><h1>Demo CRM <span className="text-sm text-zinc-500">(bundled target app, not part of PROOFRAIL)</span></h1>
    <div className="card"><table><thead><tr><th>ID</th><th>Name</th><th>Company</th><th></th></tr></thead><tbody>
      {c.map(x => <tr key={x.id} data-customer-id={x.id}><td>{x.id}</td><td>{x.name}</td><td>{x.company}</td><td><Link className="text-emerald-400" href={`/crm/${x.id}`}>Edit</Link></td></tr>)}</tbody></table></div></div>);
}
