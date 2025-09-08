import type { Banzuke, DiffResult, DiffRow } from './types';
import { sortByOrdinal, bandOf, ladderIndex, computeBandMaxCounts } from './ranking';

function formatDelta(d: number): string {
  if (d === 0) return '0';
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(1)}`;
}

export function computeDiff(
  currentId: string,
  prevId: string,
  current: Banzuke,
  prevMakuuchi: Banzuke | null,
  prevJuryo: Banzuke | null
): DiffResult {
  const ordered = sortByOrdinal(current.rows); // visual order; any stable sort is fine
  const counts = computeBandMaxCounts(current, prevMakuuchi ?? undefined);

  // Build prev Makuuchi ladder indices with the SAME counts for consistency
  const prevMIndex = new Map<number, number>();
  if (prevMakuuchi) {
    for (const r of prevMakuuchi.rows) {
      prevMIndex.set(r.rikishiID, ladderIndex(r.rankValue, r.side, counts));
    }
  }

  // Presence check for Juryo
  const prevJSet = new Set<number>();
  if (prevJuryo) {
    for (const r of prevJuryo.rows) prevJSet.add(r.rikishiID);
  }

  const rows: DiffRow[] = ordered.map(r => {
    const currIdx = ladderIndex(r.rankValue, r.side, counts);
    const pm = prevMIndex.get(r.rikishiID);

    let delta: number | null = null;
    let deltaLabel: string;

    if (pm !== undefined) {
      delta = (pm - currIdx) / 2; // half-step units
      deltaLabel = formatDelta(delta);
    } else if (prevJSet.has(r.rikishiID)) {
      deltaLabel = '↑ from Juryo';
    } else {
      deltaLabel = 'NEW';
    }

    return {
      rikishiID: r.rikishiID,
      shikona: r.shikona,
      rankLabel: r.rankLabel,
      rankValue: r.rankValue,
      side: r.side,
      ordinal: currIdx,          // now the band-aware index
      band: bandOf(r.rankValue),
      delta,
      deltaLabel
    };
  });

  return { currentId, prevId, rows };
}
