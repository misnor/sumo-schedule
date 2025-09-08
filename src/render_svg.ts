import type { RenderInput, RenderRow, Band } from './types';

const ORDER: Band[] = ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi', 'Maegashira'];
const CENTER_BUFFER = 50; // px of spacing between names and the center rank token

type SvgOpts = {
  width?: number;
  rowHeight?: number;
  pad?: number;
  fontFamily?: string;
};

type FontEmbed = { family: string; dataBase64: string };

export function renderSVG(md: RenderInput, opts: SvgOpts = {}, font?: FontEmbed): string {
  const width = opts.width ?? 1200;
  const rowH = opts.rowHeight ?? 36;
  const pad = opts.pad ?? 24;
  const fontFamily = font ? font.family : (opts.fontFamily ?? 'DejaVu Sans');

  const groups = groupEw(md.rows);
  const bandList = ORDER.filter(b => groups.get(b)?.size);

  const headerH = 64, subH = 28;
  let y = pad + headerH + subH + pad;
  let rowsCount = 0;
  for (const b of bandList) {
    rowsCount += 1;
    rowsCount += (groups.get(b)?.size ?? 0);
  }
  const height = y + rowsCount * rowH + pad + 24;

  const lines: string[] = [];
  lines.push(rect(0, 0, width, height, '#0b0c10'));

  lines.push(txt(md.title, pad, pad + 32, 32, fontFamily, '#ffffff', '400', 'start', true));
  lines.push(txt(md.subtitle, pad, pad + 58, 18, fontFamily, '#c0c0c0', '400', 'start', true));

  const cols = layoutCols(width);

  for (const band of bandList) {
    lines.push(rect(0, y, width, rowH, '#141722'));
    lines.push(txt(band, cols.center.x, y + rowH / 2, 16, fontFamily, '#ffd479', '400', 'middle', true));
    y += rowH;

    let stripe = false;
    const ranks = Array.from(groups.get(band)!.keys()).sort((a, b) => a - b);
    for (const n of ranks) {
      const pair = groups.get(band)!.get(n)!;
      const bg = stripe ? '#0f1220' : '#10131f';
      lines.push(rect(0, y, width, rowH, bg));

      // East: right-aligned with buffer
      if (pair.east) {
        lines.push(txt(
          formatNameDelta(pair.east.shikona, pair.east.deltaLabel),
          cols.center.x - CENTER_BUFFER, y + rowH / 2, 16, fontFamily,
          colorForDelta(pair.east.deltaLabel), '400', 'end', true
        ));
      }

      // Center rank marker
      lines.push(txt(`${abbrBand(band)}${n}`, cols.center.x, y + rowH / 2, 16, fontFamily, '#e4e7ee', '400', 'middle', true));

      // West: left-aligned with buffer
      if (pair.west) {
        lines.push(txt(
          formatNameDelta(pair.west.shikona, pair.west.deltaLabel),
          cols.center.x + CENTER_BUFFER, y + rowH / 2, 16, fontFamily,
          colorForDelta(pair.west.deltaLabel), '400', 'start', true
        ));
      }

      y += rowH;
      stripe = !stripe;
    }
  }

  lines.push(txt('Δ vs previous banzuke. East/West = ±0.5.', pad, height - pad, 14, fontFamily, '#8a8f98', '400', 'start', true));

  const fontCss = font
    ? `@font-face{font-family:${font.family};src:url(data:font/ttf;base64,${font.dataBase64}) format('truetype');font-weight:400;font-style:normal;}`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs><style>${fontCss}</style></defs>
  ${lines.join('\n')}
</svg>`;
}

// --- helpers ---

function groupEw(rows: RenderRow[]): Map<Band, Map<number, { east?: RenderRow; west?: RenderRow }>> {
  const out = new Map<Band, Map<number, { east?: RenderRow; west?: RenderRow }>>();
  for (const b of ORDER) out.set(b, new Map());
  for (const r of rows) {
    const m = out.get(r.band)!;
    const n = r.rankNum;
    const slot = m.get(n) ?? {};
    if (r.side === 'East') slot.east = r; else slot.west = r;
    m.set(n, slot);
  }
  return out;
}

function layoutCols(width: number) {
  return { center: { x: Math.floor(width / 2) } };
}

function rect(x: number, y: number, w: number, h: number, fill: string) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
}

function txt(
  s: string, x: number, y: number, size: number, fontFamily: string,
  fill = '#fff', weight: '400'|'500'|'600'|'700' = '400',
  anchor: 'start'|'end'|'middle' = 'start', center = false
) {
  const esc = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const baseline = center ? ` dominant-baseline="middle"` : '';
  return `<text x="${x}" y="${y}" font-family="${fontFamily}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}"${baseline}>${esc}</text>`;
}

function abbrBand(b: Band): string {
  if (b === 'Yokozuna') return 'Y';
  if (b === 'Ozeki') return 'O';
  if (b === 'Sekiwake') return 'S';
  if (b === 'Komusubi') return 'K';
  return 'M';
}

function formatNameDelta(name: string, delta: string): string {
  if (delta === '0') return `${name} (0)`;
  const m = /^([+\-]?)(\d+(?:\.\d+)?)$/.exec(delta);
  if (m) {
    const sign = m[1] || (Number(m[2]) >= 0 ? '+' : '');
    const val = Number(m[2]).toFixed(1);
    return `${name} (${sign}${val})`;
  }
  return `${name} (${delta})`;
}

function colorForDelta(delta: string): string {
  if (delta.startsWith('+')) return '#30d158';
  if (delta.startsWith('-')) return '#ff453a';
  if (delta.includes('Juryo')) return '#5ac8fa';
  return '#e4e7ee';
}
