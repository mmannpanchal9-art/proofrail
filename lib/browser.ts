import { chromium, Browser, Page } from 'playwright';
import path from 'path';
import crypto from 'crypto';
import { EVIDENCE_DIR } from './db';
import { isAllowedUrl } from './domain';
import type { RecordSnapshot, TaskSpec } from './types';

const FIELDS = ['id', 'name', 'email', 'company', 'phone'];

async function shot(page: Page, tag: string) {
  const f = `${tag}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.png`;
  await page.screenshot({ path: path.join(EVIDENCE_DIR, f), fullPage: true });
  return f;
}

/** Independent read: brand-new browser + context each time (no shared cookies/cache with executor). */
export async function readRecord(baseUrl: string, customerId: string, allowed: string[], tag: string): Promise<RecordSnapshot> {
  const url = `${baseUrl}/crm/${encodeURIComponent(customerId)}`;
  const observedAt = new Date().toISOString();
  if (!isAllowedUrl(url, allowed)) return { found: false, url, values: {}, observedAt, error: 'URL not on approved domain list' };
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const page = await (await browser.newContext()).newPage();
    const resp = await page.goto(url, { waitUntil: 'networkidle' });
    const screenshot = await shot(page, tag);
    if (!resp || resp.status() >= 400 || !(await page.locator('[data-testid=record-form]').count()))
      return { found: false, url: page.url(), values: {}, screenshot, observedAt, error: `Record not found (HTTP ${resp?.status()})` };
    const values: Record<string, string> = {};
    for (const f of FIELDS) values[f] = await page.locator(`[name=${f}]`).inputValue();
    return { found: true, url: page.url(), values, screenshot, observedAt };
  } catch (e: any) {
    return { found: false, url, values: {}, observedAt, error: `Browser error: ${e.message}` };
  } finally { await browser?.close(); }
}

export interface ExecResult { status: 'completed' | 'stopped' | 'blocked' | 'error'; claim: string; log: string[]; screenshots: { file: string; label: string }[]; urls: string[]; error?: string; }

/** Executor: performs the actions like an agent would. Its output is treated as a CLAIM only. */
export async function executeUpdate(spec: TaskSpec, allowed: string[]): Promise<ExecResult> {
  const log: string[] = []; const screenshots: ExecResult['screenshots'] = []; const urls: string[] = [];
  const L = (m: string) => log.push(`${new Date().toISOString()} ${m}`);
  const listUrl = `${spec.targetBaseUrl}/crm`;
  if (!isAllowedUrl(listUrl, allowed)) { L(`BLOCKED: ${listUrl} not in allowlist`); return { status: 'blocked', claim: '', log, screenshots, urls, error: 'Domain not approved' }; }
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const page = await (await browser.newContext()).newPage();
    page.on('framenavigated', f => { if (f === page.mainFrame()) { urls.push(f.url()); if (!isAllowedUrl(f.url(), allowed)) L(`WARNING navigated off-allowlist: ${f.url()}`); } });
    L(`open ${listUrl}`); await page.goto(listUrl, { waitUntil: 'networkidle' });
    screenshots.push({ file: await shot(page, 'exec-list'), label: 'Customer list' });
    const row = page.locator(`[data-customer-id="${spec.customerId}"]`);
    if (!(await row.count())) { L(`customer ${spec.customerId} not found -> stop (constraint)`); return { status: 'stopped', claim: '', log, screenshots, urls, error: 'Customer not found' }; }
    L(`found ${spec.customerId}`); await row.locator('a').click(); await page.waitForSelector('[data-testid=record-form]');
    L(`existing ${spec.field} = "${await page.locator(`[name=${spec.field}]`).inputValue()}"`);
    await page.locator(`[name=${spec.field}]`).fill(spec.expectedValue); L(`filled ${spec.field}`);
    await page.getByRole('button', { name: 'Save' }).click(); L('clicked Save');
    const msg = page.locator('[data-testid=save-message]'); await msg.waitFor({ timeout: 10000 });
    const claim = (await msg.textContent()) || ''; L(`app message: "${claim}"`);
    screenshots.push({ file: await shot(page, 'exec-after-save'), label: 'After clicking Save (executor view)' });
    return { status: 'completed', claim, log, screenshots, urls };
  } catch (e: any) { L(`error ${e.message}`); return { status: 'error', claim: '', log, screenshots, urls, error: e.message };
  } finally { await browser?.close(); }
}
