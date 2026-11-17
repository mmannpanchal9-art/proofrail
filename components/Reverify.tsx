'use client';
import { useState } from 'react'; import { useRouter } from 'next/navigation';
export default function Reverify({ taskId }: { taskId: number }) {
  const [b, setB] = useState(false); const r = useRouter();
  return <button className="btn2" disabled={b} onClick={async () => { setB(true); await fetch(`/api/tasks/${taskId}/reverify`, { method: 'POST' }); setB(false); r.refresh(); }}>{b ? 'Re-verifying…' : 'Re-verify on fresh state'}</button>;
}
