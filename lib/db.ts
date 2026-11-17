import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export const DATA_DIR = path.resolve(process.env.PROOFRAIL_DATA_DIR || 'data/app');
export const EVIDENCE_DIR = path.join(DATA_DIR, 'evidence');
let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const d = new Database(path.join(DATA_DIR, 'proofrail.db'));
  d.pragma('journal_mode = WAL');
  d.exec(`
  CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY, created_at TEXT, source TEXT, prompt TEXT, parser TEXT, spec TEXT, plan TEXT, constraints TEXT);
  CREATE TABLE IF NOT EXISTS executions (id INTEGER PRIMARY KEY, task_id INTEGER, mode TEXT, status TEXT, started_at TEXT, finished_at TEXT, duration_ms INTEGER, agent_claim TEXT, error TEXT, log TEXT);
  CREATE TABLE IF NOT EXISTS verifications (id INTEGER PRIMARY KEY, task_id INTEGER, execution_id INTEGER, kind TEXT, status TEXT, created_at TEXT, checks TEXT, observed TEXT, summary TEXT);
  CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, task_id INTEGER, execution_id INTEGER, verification_id INTEGER, origin TEXT, type TEXT, label TEXT, content TEXT, created_at TEXT);
  CREATE TABLE IF NOT EXISTS rules (id INTEGER PRIMARY KEY, name TEXT, type TEXT, config TEXT, enabled INTEGER);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS crm_customers (id TEXT PRIMARY KEY, name TEXT, email TEXT, company TEXT, phone TEXT, updated_at TEXT);
  `);
  if ((d.prepare('SELECT COUNT(*) c FROM crm_customers').get() as any).c === 0) {
    const ins = d.prepare('INSERT INTO crm_customers VALUES (?,?,?,?,?,?)');
    const now = new Date().toISOString();
    ins.run('C-1001', 'Riya Sharma', 'riya@example.com', 'Sharma Traders', '+91-90000-00001', now);
    ins.run('C-1002', 'Arjun Mehta', 'arjun@example.com', 'Mehta Logistics', '+91-90000-00002', now);
    ins.run('C-1003', 'XYZ Corp Contact', 'contact@xyz.example', 'XYZ Pvt Ltd', '+91-90000-00003', now);
  }
  if ((d.prepare('SELECT COUNT(*) c FROM rules').get() as any).c === 0) {
    const ins = d.prepare('INSERT INTO rules (name,type,config,enabled) VALUES (?,?,?,1)');
    ins.run('Customer ID must match expected record', 'record_id_match', '{}');
    ins.run('Final URL must be on an approved domain', 'approved_domain', '{}');
    ins.run('Saved value must persist after fresh reload', 'persisted_after_reload', '{}');
    ins.run('No field outside approved scope modified', 'no_out_of_scope_changes', '{}');
    ins.run('Email must not be empty', 'required_not_empty', '{"field":"email"}');
  }
  const defaults: Record<string, string> = {
    allowed_domains: 'localhost,127.0.0.1',
    target_base_url: process.env.PROOFRAIL_TARGET_BASE || 'http://localhost:3100',
    crm_buggy_mode: 'off',
    llm_provider: 'openai-compatible',
    llm_base_url: 'https://api.openai.com/v1',
    llm_model: 'gpt-4o-mini',
  };
  const insS = d.prepare('INSERT OR IGNORE INTO settings VALUES (?,?)');
  for (const [k, v] of Object.entries(defaults)) insS.run(k, v);
  _db = d;
  return d;
}

export const getSetting = (k: string) => (db().prepare('SELECT value FROM settings WHERE key=?').get(k) as any)?.value as string | undefined;
export const setSetting = (k: string, v: string) => db().prepare('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k, v);
export const now = () => new Date().toISOString();
export const allowedDomains = () => (getSetting('allowed_domains') || '').split(',').map(s => s.trim()).filter(Boolean);
