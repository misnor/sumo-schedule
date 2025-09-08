import { SENTINEL_ISO } from './constants';

export function isUnsetIso(iso?: string | null): boolean {
  if (!iso) return true;
  if (iso === SENTINEL_ISO) return true;
  const t = Date.parse(iso);
  return !Number.isFinite(t);
}

export function toUnixSafe(iso?: string | null): number | null {
  if (isUnsetIso(iso)) return null;
  const ms = Date.parse(iso!);
  return Math.trunc(ms / 1000);
}

export function isoMinusDaysUTC(iso: string, days: number): string {
  const d = new Date(iso);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() - days);
  return utc.toISOString();
}
