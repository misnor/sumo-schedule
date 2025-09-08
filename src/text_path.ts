// text_path.ts
import * as opentype from 'opentype.js';

/** Cross-env base64 → Uint8Array */
function b64ToUint8(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

export type OTFont = opentype.Font;

/** Parse a TTF from base64 (works in Node and Workers). */
export function parseFontFromB64(ttfBase64: string): OTFont {
  const u8 = b64ToUint8(ttfBase64);
  return opentype.parse(u8.buffer);
}

/** Approx baseline y to emulate dominant-baseline="middle". */
function middleBaselineY(font: OTFont, yCenter: number, fontPx: number): number {
  const upm = font.unitsPerEm || 1000;
  const asc = font.ascender ?? 0;
  const desc = font.descender ?? 0; // negative
  const centerOffset = ((asc + desc) / 2) / upm * fontPx; // desc is negative
  return yCenter - centerOffset;
}

/**
 * Convert a text run into a single SVG path string.
 * - anchor: 'start' | 'middle' | 'end'
 * - centerY: if true, y is vertical center; else y is baseline.
 * Returns { d, xUsed } where d is path data.
 */
export function textToPath(
  font: OTFont,
  text: string,
  x: number,
  y: number,
  fontPx: number,
  opts: { anchor?: 'start'|'middle'|'end'; centerY?: boolean } = {}
): { d: string; xUsed: number } {
  const anchor = opts.anchor ?? 'start';
  const yBase = opts.centerY ? middleBaselineY(font, y, fontPx) : y;

  // Measure advance width
  const unitsPerEm = font.unitsPerEm || 1000;
  const advUnits = font.getAdvanceWidth(text, fontPx, { kerning: true }) / (fontPx / unitsPerEm); // back to units
  const advPx = advUnits * (fontPx / unitsPerEm);

  let xStart = x;
  if (anchor === 'end') xStart = x - advPx;
  else if (anchor === 'middle') xStart = x - advPx / 2;

  const p = font.getPath(text, xStart, yBase, fontPx, { kerning: true });
  return { d: p.toPathData(2), xUsed: xStart };
}
