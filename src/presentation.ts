import type { DiffResult, RenderInput, RenderRow, Band } from './types';

type TitleOpts = { startDate?: string; locale?: string };

function monthYearFromStart(startDate?: string, locale = 'en-US'): string | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (Number.isNaN(+d)) return null;
  const m = d.toLocaleString(locale, { month: 'long' });
  const y = d.getUTCFullYear();
  return `${m} ${y}`;
}

function monthYearFromId(id: string, locale = 'en-US'): string {
  // id = YYYYMM
  const y = Number(id.slice(0, 4));
  const m = Number(id.slice(4, 6));
  const date = new Date(Date.UTC(y, m - 1, 1));
  const name = date.toLocaleString(locale, { month: 'long' });
  return `${name} ${y}`;
}

function bandOrder(a: Band, b: Band): number {
  const order: Band[] = ['Yokozuna', 'Ozeki', 'Sekiwake', 'Komusubi', 'Maegashira'];
  return order.indexOf(a) - order.indexOf(b);
}

/** Build renderer-agnostic DTO from a DiffResult. */
export function buildPresentation(
  diff: DiffResult,
  opts: TitleOpts = {}
): RenderInput {
  const locale = opts.locale ?? 'en-US';
  const titleMonth = monthYearFromStart(opts.startDate, locale) ?? monthYearFromId(diff.currentId, locale);
  const prevMonth = monthYearFromId(diff.prevId, locale);

  // rows already sorted by ordinal asc in DiffResult
  const rows: RenderRow[] = diff.rows.map(r => ({
    band: r.band,
    rankLabel: r.rankLabel,
    shikona: r.shikona,
    deltaLabel: r.deltaLabel
  }));

  // sanity: ensure band sequence is non-decreasing by hierarchy
  rows.sort((x, y) => bandOrder(x.band, y.band)); // no-op if already consistent

  return {
    title: `${titleMonth} Basho`,
    subtitle: `vs ${prevMonth}`,
    rows
  };
}
