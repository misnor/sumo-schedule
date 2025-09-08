import type { RenderInput, RenderRow, Band } from './types';

const ORDER: Band[] = ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi', 'Maegashira'];

function groupByBand(rows: RenderRow[]): Map<Band, RenderRow[]> {
  const m = new Map<Band, RenderRow[]>();
  for (const b of ORDER) m.set(b, []);
  for (const r of rows) m.get(r.band)!.push(r);
  return m;
}

/** Build a compact Markdown block listing rows by bands. */
export function renderText(md: RenderInput): string {
  const lines: string[] = [];
  lines.push(`**${md.title}**`);
  lines.push(`_${md.subtitle}_`);
  lines.push('');

  const groups = groupByBand(md.rows);
  for (const band of ORDER) {
    const rows = groups.get(band)!;
    if (!rows.length) continue;
    lines.push(`**${band}**`);
    for (const r of rows) {
      lines.push(`${pad(r.rankLabel, 20)}  ${pad(r.shikona, 16)}  ${r.deltaLabel}`);
    }
    lines.push('');
  }

  lines.push('_Δ vs previous banzuke. East/West = ±0.5._');
  return lines.join('\n');
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s;
  return s + ' '.repeat(n - s.length);
}
