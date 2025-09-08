import type { Banzuke, RankedEntry } from './types';
import { ordinalOfRow } from './ranking';

export function mapById(b: Banzuke): Map<number, RankedEntry> {
  const m = new Map<number, RankedEntry>();
  for (const r of b.rows) {
    m.set(r.rikishiID, {
      rikishiID: r.rikishiID,
      ordinal: ordinalOfRow(r),
      rankValue: r.rankValue,
      side: r.side,
      rankLabel: r.rankLabel,
      shikona: r.shikona
    });
  }
  return m;
}