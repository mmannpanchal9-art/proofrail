export type Status = 'VERIFIED' | 'FAILED' | 'NEEDS_REVIEW' | 'INCOMPLETE';
export type CheckResult = 'pass' | 'fail' | 'unknown';
export interface TaskSpec {
  title: string;
  targetBaseUrl: string;
  customerId: string;
  field: string;            // field to update, e.g. "company"
  expectedValue: string;
  allowedFields: string[];  // fields allowed to change
}
export interface RecordSnapshot {
  found: boolean; url: string; values: Record<string, string>;
  screenshot?: string; observedAt: string; error?: string;
}
export interface Check {
  id: string; name: string; result: CheckResult; critical: boolean;
  expected?: string; actual?: string; detail: string; evidence: string[];
}
export interface Rule { id: number; name: string; type: string; config: Record<string, string>; enabled: boolean; }
