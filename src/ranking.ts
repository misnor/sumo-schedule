import type { Band, BanzukeRow, Banzuke } from './types';

export function ordinalOfRow(r: BanzukeRow): number {
  // kept if you still need the simple sort; not used for deltas anymore
  return r.rankValue * 2 + (r.side === 'East' ? 0 : 1);
}

export function bandOf(rankValue: number): Band {
  const b = Math.trunc(rankValue / 100);
  if (b === 1) return 'Yokozuna';
  if (b === 2) return 'Ozeki';
  if (b === 3) return 'Sekiwake';
  if (b === 4) return 'Komusubi';
  return 'Maegashira';
}

export function sortByOrdinal(rows: BanzukeRow[]): BanzukeRow[] {
  return [...rows].sort((a, b) => {
    const ao = ordinalOfRow(a);
    const bo = ordinalOfRow(b);
    return ao - bo;
  });
}

// ---------- NEW: band-aware half-step ladder ----------

export type BandCounts = Record<Band, number>;

const ORDER: Band[] = ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi', 'Maegashira'];

export function parseNumber(rankValue: number): number {
  return rankValue % 100; // 1..20
}

export function computeBandMaxCounts(current: Banzuke, prev?: Banzuke | null): BandCounts {
  const counts: BandCounts = { Yokozuna: 0, Ozeki: 0, Sekiwake: 0, Komusubi: 0, Maegashira: 20 };
  for (const src of [current, prev].filter(Boolean) as Banzuke[]) {
    for (const r of src.rows) {
      const band = bandOf(r.rankValue);
      const n = parseNumber(r.rankValue);
      if (band !== 'Maegashira') counts[band] = Math.max(counts[band], n);
      else counts.Maegashira = Math.max(counts.Maegashira, n);
    }
  }
  // Ensure minima for bands that might be absent
  if (counts.Yokozuna === 0) counts.Yokozuna = 1;
  if (counts.Ozeki === 0) counts.Ozeki = 1;
  if (counts.Sekiwake === 0) counts.Sekiwake = 1;
  if (counts.Komusubi === 0) counts.Komusubi = 1;
  if (counts.Maegashira === 0) counts.Maegashira = 20;
  return counts;
}

/** Continuous half-step index across Y/O/S/K/M using shared band maxima. */
export function ladderIndex(rankValue: number, side: 'East' | 'West', counts: BandCounts): number {
  const band = bandOf(rankValue);
  const num = parseNumber(rankValue); // 1-based
  const sideIdx = side === 'East' ? 0 : 1;

  let base = 0;
  for (const b of ORDER) {
    if (b === band) break;
    base += counts[b] * 2; // two half-steps per numbered slot (E/W)
  }
  // within-band offset
  return base + (num - 1) * 2 + sideIdx;
}
