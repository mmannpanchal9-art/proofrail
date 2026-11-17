import NewTaskForm from '../../../components/NewTaskForm';
import { getSetting } from '../../../lib/db';
export const dynamic = 'force-dynamic';
export default function Page() {
  return (<div className="space-y-4"><h1>New Task</h1>
    <p className="text-sm text-zinc-400">Describe the task or fill the structured form. Execution uses a real Playwright Chromium browser against approved domains only.</p>
    <NewTaskForm defaultBase={getSetting('target_base_url')!} llm={!!process.env.PROOFRAIL_LLM_API_KEY} buggy={getSetting('crm_buggy_mode') === 'on'} /></div>);
}
