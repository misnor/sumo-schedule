import type { Division, Banzuke } from './types';
import { fetchBanzuke, pickPreviousId } from './sumoApi';

export type PrevContext = {
  prevId: string;
  prevMakuuchi: Banzuke | null;
  prevJuryo: Banzuke | null;
};

export async function loadPrevContext(currentId: string, prevHint?: string): Promise<PrevContext> {
  const prevId = prevHint && /^\d{6}$/.test(prevHint) ? prevHint : pickPreviousId(currentId);

  let prevMakuuchi: Banzuke | null = null;
  let prevJuryo: Banzuke | null = null;

  try {
    prevMakuuchi = await fetchBanzuke(prevId, 'Makuuchi');
  } catch {
    prevMakuuchi = null;
  }

  try {
    prevJuryo = await fetchBanzuke(prevId, 'Juryo');
  } catch {
    prevJuryo = null;
  }

  return { prevId, prevMakuuchi, prevJuryo };
}
