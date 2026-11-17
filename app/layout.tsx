import './globals.css';
import Link from 'next/link';
const NAV = [['/', 'Overview'], ['/tasks/new', 'New Task'], ['/executions', 'Executions'], ['/verification', 'Verification'], ['/receipts', 'Receipts'], ['/monitoring', 'Monitoring'], ['/rules', 'Rules'], ['/settings', 'Settings']];
export const metadata = { title: 'PROOFRAIL' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="md:w-56 border-b md:border-b-0 md:border-r border-zinc-800 p-4 bg-zinc-950">
        <div className="font-bold tracking-widest text-emerald-400 mb-1">PROOFRAIL</div>
        <div className="text-[11px] text-zinc-500 mb-5">Don&apos;t trust the action. Verify the outcome.</div>
        <nav className="flex md:flex-col gap-1 flex-wrap">{NAV.map(([h, l]) => <Link key={h} href={h} className="text-sm px-3 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-300">{l}</Link>)}
          <a href="/crm" className="text-sm px-3 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 md:mt-4">Demo CRM (target) ↗</a></nav>
      </aside>
      <main className="flex-1 p-6 max-w-6xl">{children}</main>
    </div></body></html>);
}
