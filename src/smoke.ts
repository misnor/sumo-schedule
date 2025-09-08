import { fetchBanzuke } from './sumoApi';
import { loadPrevContext } from './context';
import { computeDiff } from './diff';
import { buildPresentation } from './presentation';
import { renderText } from './render_text';

async function main() {
  const currentId = process.argv[2] || '202509';
  const prevHint  = process.argv[3];

  const current = await fetchBanzuke(currentId, 'Makuuchi');
  const prev = await loadPrevContext(currentId, prevHint);
  const diff = computeDiff(currentId, prev.prevId, current, prev.prevMakuuchi, prev.prevJuryo);
  const pres = buildPresentation(diff, { startDate: undefined });

  console.log(renderText(pres));
}

main().catch(e => { console.error(e); process.exit(1); });
