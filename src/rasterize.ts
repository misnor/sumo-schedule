import { Resvg, initWasm } from '@resvg/resvg-wasm';
import wasm from '@resvg/resvg-wasm/index_bg.wasm';

let initialized = false;
export async function ensureResvgInit() {
  if (initialized) return;
  await initWasm(wasm);
  initialized = true;
}

export async function svgToPng(svg: string, widthHint?: number): Promise<Uint8Array> {
  await ensureResvgInit();
  if (!(/<path\b|<rect\b|<circle\b|<line\b|<polygon\b/).test(svg)) throw new Error('SVG appears empty.');
  const r = new Resvg(svg, {
    fitTo: widthHint ? { mode: 'width', value: widthHint } : undefined,
    background: 'transparent',
    font: { loadSystemFonts: false }
  });
  return r.render().asPng();
}
