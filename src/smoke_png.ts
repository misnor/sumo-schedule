import { fetchBanzuke } from './sumoApi.js';
import { loadPrevContext } from './context.js';
import { computeDiff } from './diff.js';
import { buildPresentation } from './presentation.js';
import { renderSVG } from './render_svg.js';
import { svgToPng } from './rasterize.js';
import { readFileSync, writeFileSync } from 'node:fs';

async function main() {
  const currentId = process.argv[2] || '202509';
  const prevHint  = process.argv[3];

  const current = await fetchBanzuke(currentId, 'Makuuchi');
  const prev    = await loadPrevContext(currentId, prevHint);
  const diff    = computeDiff(currentId, prev.prevId, current, prev.prevMakuuchi, prev.prevJuryo);
  const pres    = buildPresentation(diff, { startDate: undefined });

  const fontB64 = readFileSync('assets/DejaVuSans.ttf').toString('base64');

  // renderSVG is async now (path-based)
  const svg = await renderSVG(pres, { width: 720 }, { family: 'DejaVu Sans', dataBase64: fontB64 });
  writeFileSync('out.svg', svg);

  // New sanity checks for path-based text
  console.log('svg has paths?', /<path\b/.test(svg), 'has rects?', /<rect\b/.test(svg));

  const png = await svgToPng(svg, 720);
  const out = `banzuke-${currentId}-diff.png`;
  writeFileSync(out, png);
  console.log('wrote', out, png.byteLength, 'bytes');
}

main().catch(e => { console.error(e); process.exit(1); });
