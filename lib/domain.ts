export function isAllowedUrl(url: string, allowed: string[]): boolean {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    return allowed.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
  } catch { return false; }
}
