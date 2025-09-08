import type { Basho } from './types';
import { isUnsetIso } from './time';

import type {
  Division,
  BanzukeApi,
  BanzukeApiRow,
  Banzuke,
  BanzukeRow
} from './types';

export async function getBasho(id: string): Promise<Basho | null> {
  const r = await fetch(`https://www.sumo-api.com/api/basho/${id}`);
  if (!r.ok) throw new Error(`Sumo-API ${r.status}`);
  const data = (await r.json()) as Basho | null;
  if (data && !data.bashoId) data.bashoId = id;
  return data;
}

export async function fetchBanzuke(id: string, division: Division): Promise<Banzuke> {
  const url = `https://www.sumo-api.com/api/basho/${id}/banzuke/${division}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Sumo-API ${r.status} for ${division} banzuke ${id}`);
  const api = (await r.json()) as BanzukeApi;

  if (!api || !api.bashoId || api.division !== division) {
    throw new Error(`Unexpected banzuke payload for ${division} ${id}`);
  }

  const rows: BanzukeRow[] = [
    ...normalizeSide(api.east),
    ...normalizeSide(api.west)
  ];

  if (rows.length === 0) {
    throw new Error(`Empty banzuke for ${division} ${id}`);
  }

  return { bashoId: api.bashoId, division: api.division, rows };
}

function normalizeSide(items: BanzukeApiRow[]): BanzukeRow[] {
  return (items ?? []).map((r) => ({
    rikishiID: r.rikishiID,
    shikona: r.shikonaEn,
    side: r.side,
    rankValue: r.rankValue,
    rankLabel: r.rank
  }));
}

export function pickPreviousId(currentId: string): string {
  // expects YYYYMM
  if (!/^\d{6}$/.test(currentId)) return currentId;
  const y = Number(currentId.slice(0, 4));
  const m = Number(currentId.slice(4, 6));
  // basho months are 01,03,05,07,09,11 → go to previous odd month
  const prevMonth = m === 1 ? 11 : m - 2;
  const prevYear = m === 1 ? y - 1 : y;
  const mm = String(prevMonth).padStart(2, '0');
  return `${prevYear}${mm}`;
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
