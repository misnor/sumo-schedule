// src/render_svg.ts
import type { RenderInput, RenderRow, Band } from './types';
import { parseFontFromB64, textToPath, type OTFont } from './text_path';

const ORDER: Band[] = ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi', 'Maegashira'];
const CENTER_BUFFER = 50;

type SvgOpts = { width?: number; rowHeight?: number; pad?: number; fontFamily?: string };
type FontEmbed = { family: string; dataBase64: string };

export async function renderSVG(
  md: RenderInput,
  opts: SvgOpts = {},
  font?: FontEmbed
): Promise<string> {
  const width = opts.width ?? Math.round(1200 * 0.6);
  const rowH = opts.rowHeight ?? 36;
  const pad = opts.pad ?? 24;

  if (!font?.dataBase64) throw new Error('FontEmbed with base64 TTF required.');
  const ot: OTFont = parseFontFromB64(font.dataBase64);

  const groups = groupEw(md.rows);
  const bandList = ORDER.filter(b => groups.get(b)?.size);

  const headerH = 64, subH = 28;
  let y = pad + headerH + subH + pad;

  let rowsCount = 0;
  for (const b of bandList) { rowsCount += 1; rowsCount += (groups.get(b)?.size ?? 0); }
  const height = y + rowsCount * rowH + pad + 24;
  const centerX = Math.floor(width / 2);

  const lines: string[] = [];
  lines.push(rect(0, 0, width, height, '#0b0c10'));

  lines.push(pathTxt(ot, md.title, pad, pad + 32, 32, '#ffffff', 'start', true));
  lines.push(pathTxt(ot, md.subtitle, pad, pad + 58, 18, '#c0c0c0', 'start', true));

  lines.push(pathTxt(ot, 'East', centerX - CENTER_BUFFER, y - rowH / 2, 14, '#8a8f98', 'end', true));
  lines.push(pathTxt(ot, 'West', centerX + CENTER_BUFFER, y - rowH / 2, 14, '#8a8f98', 'start', true));

  for (const band of bandList) {
    lines.push(rect(0, y, width, rowH, '#141722'));
    lines.push(pathTxt(ot, band, centerX, y + rowH / 2, 16, '#ffd479', 'middle', true));
    y += rowH;

    let stripe = false;
    const ranks = Array.from(groups.get(band)!.keys()).sort((a, b) => a - b);
    for (const n of ranks) {
      const pair = groups.get(band)!.get(n)!;
      lines.push(rect(0, y, width, rowH, stripe ? '#0f1220' : '#10131f'));

      if (pair.east) {
        lines.push(pathTxt(
          ot, formatNameDelta(pair.east.shikona, pair.east.deltaLabel),
          centerX - CENTER_BUFFER, y + rowH / 2, 16, colorForDelta(pair.east.deltaLabel), 'end', true
        ));
      }

      lines.push(pathTxt(ot, `${abbrBand(band)}${n}`, centerX, y + rowH / 2, 16, '#e4e7ee', 'middle', true));

      if (pair.west) {
        lines.push(pathTxt(
          ot, formatNameDelta(pair.west.shikona, pair.west.deltaLabel),
          centerX + CENTER_BUFFER, y + rowH / 2, 16, colorForDelta(pair.west.deltaLabel), 'start', true
        ));
      }

      y += rowH;
      stripe = !stripe;
    }
  }

  lines.push(pathTxt(ot, 'Δ vs previous banzuke. East/West = ±0.5.', pad, height - pad, 14, '#8a8f98', 'start', false));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
${lines.join('\n')}
</svg>`;
}

// helpers

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

function rect(x: number, y: number, w: number, h: number, fill: string) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
}

function pathTxt(
  font: OTFont,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  anchor: 'start'|'middle'|'end',
  centerY: boolean
): string {
  const { d } = textToPath(font, text, x, y, size, { anchor, centerY });
  return `<path d="${d}" fill="${fill}"/>`;
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
