import { db } from '../../../lib/db'; import { notFound } from 'next/navigation'; import CrmForm from '../../../components/CrmForm';
export const dynamic = 'force-dynamic';
export default function P({ params }: { params: { id: string } }) {
  const c = db().prepare('SELECT * FROM crm_customers WHERE id=?').get(params.id) as any; if (!c) notFound();
  return <div className="space-y-4"><h1>Customer {c.id}</h1><CrmForm c={c} /></div>;
}
