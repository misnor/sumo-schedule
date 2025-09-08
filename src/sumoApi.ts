import type { Basho } from './types';
import { isUnsetIso } from './time';

export async function getBasho(id: string): Promise<Basho | null> {
  const r = await fetch(`https://www.sumo-api.com/api/basho/${id}`);
  if (!r.ok) throw new Error(`Sumo-API ${r.status}`);
  return r.json();
}

/**
 * Resolve target id.
 * If user supplied, return it.
 * Else try /api/basho/upcoming when it yields a real basho.
 * Else fallback to local odd-month heuristic.
 */
export async function resolveTargetId(supplied?: string): Promise<string> {
  if (supplied) return supplied;

  try {
    const r = await fetch('https://www.sumo-api.com/api/basho/upcoming');
    if (r.ok) {
      const b: Basho = await r.json();
      if (b?.bashoId && !bashoLooksMissing(b)) return b.bashoId;
    }
  } catch {}

  return computeUpcomingId(new Date());
}

// Current or next odd-month tournament ID (fallback only)
export function computeUpcomingId(now: Date): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const odd = [1, 3, 5, 7, 9, 11];
  if (odd.includes(m)) return `${y}${String(m).padStart(2, '0')}`;
  const next = m === 12 ? 1 : m + 1;
  const year = m === 12 ? y + 1 : y;
  return `${year}${String(next).padStart(2, '0')}`;
}

// Accept any YYYYMM; only reject bad format/range.
export function validateBashoId(id: string): string | null {
  if (!/^\d{6}$/.test(id)) return 'Invalid format. Use YYYYMM.';
  const y = Number(id.slice(0, 4));
  const m = Number(id.slice(4, 6));
  if (y < 1900 || y > 3000) return 'Year out of range.';
  if (m < 1 || m > 12) return 'Month must be 01–12.';
  return null;
}

export function bashoLooksMissing(b?: Basho | null): boolean {
  if (!b) return true;
  return isUnsetIso(b.startDate) || isUnsetIso(b.endDate);
}
