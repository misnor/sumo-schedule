import { fetchBanzuke } from './sumoApi.js';
import { loadPrevContext } from './context.js';
import { computeDiff } from './diff.js';
import { buildPresentation } from './presentation.js';
import { renderSVG } from './render_svg.js';
import { svgToPng } from './rasterize.js';
import { writeFileSync, readFileSync } from 'node:fs';

async function main() {
  const currentId = process.argv[2] || '202509';
  const prevHint  = process.argv[3];

  const current = await fetchBanzuke(currentId, 'Makuuchi');
  const prev = await loadPrevContext(currentId, prevHint);
  const diff = computeDiff(currentId, prev.prevId, current, prev.prevMakuuchi, prev.prevJuryo);
  const pres = buildPresentation(diff, { startDate: undefined });

  const family = 'DejaVu Sans';
  const fontDataB64 = readFileSync('assets/DejaVuSans.ttf').toString('base64');

  const svg = renderSVG(pres, {}, { family, dataBase64: fontDataB64 });

  // sanity: write SVG and show checks
  writeFileSync('out.svg', svg);
  console.log('svg ok?', svg.includes('<text'), 'family?', /font-family=(["\'])DejaVu Sans\1/.test(svg));

  const png = await svgToPng(svg, 1200);
  writeFileSync(`banzuke-${currentId}.png`, png);
  console.log('Wrote PNG');
}

main().catch(e => { console.error(e); process.exit(1); });
