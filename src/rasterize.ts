import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { createRequire } from 'node:module';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

let initialized = false;

const require = createRequire(import.meta.url);
const wasmPath = path.resolve(require.resolve('@resvg/resvg-wasm'), '../index_bg.wasm');

// Explicit font config used by both SVG and Resvg
const DEFAULT_FAMILY = 'DejaVu Sans';
const DEFAULT_FONT_PATH = 'assets/DejaVuSans.ttf';

async function ensureInit() {
  if (initialized) return;
  try {
    // Works in bundlers that expose the wasm URL
    // @ts-ignore
    const wasmUrl: string = (await import('@resvg/resvg-wasm/index_bg.wasm?url')).default;
    await initWasm(fetch(wasmUrl));
  } catch {
    // Node fallback: read the wasm file directly
    const wasmBuf = await fs.readFile(wasmPath);
    await initWasm(wasmBuf);
  }
  initialized = true;
}

async function ensureFontExists(p: string) {
  try {
    await fs.access(p);
  } catch {
    throw new Error(`Font file missing: ${p}`);
  }
}

/** Rasterize SVG string to PNG bytes. Throws if font is misconfigured. */
export async function svgToPng(svg: string, widthHint?: number): Promise<Uint8Array> {
  await ensureInit();
  await ensureFontExists(DEFAULT_FONT_PATH);

  // Hard checks so font issues fail fast instead of silently dropping text.
  if (!svg.includes('<text')) {
    throw new Error('SVG contains no <text> elements.');
  }
  const familyRefOk =
    /font-family=(['"])DejaVu Sans\1/.test(svg) || /font-family=DejaVu Sans\b/.test(svg);
  if (!familyRefOk) {
    throw new Error(`SVG does not reference expected font-family "${DEFAULT_FAMILY}". Ensure renderSVG uses exactly that family with weight 400.`);
  }

  const r = new Resvg(svg, {
    fitTo: widthHint ? { mode: 'width', value: widthHint } : undefined,
    background: 'transparent',
    font: {
      loadSystemFonts: false,
      defaultFontFamily: DEFAULT_FAMILY,
      // Resvg expects file paths here in Node
      fontFiles: [DEFAULT_FONT_PATH]
    }
  });

  return r.render().asPng();
}

/** Optional: override defaults if you ship a different TTF/family. Call before svgToPng. */
export function setDefaultFont(pathToTtf: string, family: string) {
  // No IO here on purpose; svgToPng will validate existence.
  (globalThis as any).__SUMO_FONT_PATH__ = pathToTtf;
  (globalThis as any).__SUMO_FONT_FAMILY__ = family;
}
