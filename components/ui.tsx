export function Status({ s }: { s: string }) {
  const c: Record<string, string> = { VERIFIED: 'bg-emerald-900 text-emerald-300', FAILED: 'bg-red-900 text-red-300', NEEDS_REVIEW: 'bg-amber-900 text-amber-300', INCOMPLETE: 'bg-zinc-700 text-zinc-300' };
  return <span data-testid="status" className={`text-xs font-semibold px-2 py-0.5 rounded ${c[s] || 'bg-zinc-800'}`}>{s}</span>;
}
export function Origin({ o }: { o: string }) {
  return o === 'real' ? <span className="text-[10px] px-1.5 rounded bg-sky-900 text-sky-300">REAL · captured by PROOFRAIL</span>
    : <span className="text-[10px] px-1.5 rounded bg-fuchsia-900 text-fuchsia-300">AGENT CLAIM · not proof</span>;
}
export const Empty = ({ t }: { t: string }) => <div className="card text-zinc-500 text-sm">{t}</div>;
