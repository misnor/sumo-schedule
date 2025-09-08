// src/http.ts

export function json(obj: unknown): Response {
  return new Response(JSON.stringify(obj), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export function field(name: string, value: string, inline = true) {
  return { name, value, inline };
}

export function followupEndpoint(appId: string, token: string) {
  return `https://discord.com/api/v10/webhooks/${appId}/${token}`;
}

export async function postFollowup(url: string, body: unknown) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/**
 * Send a follow-up with a file (multipart/form-data).
 * Works in Node 18+/22+ and Cloudflare Workers (uses global FormData/Blob/File).
 */
export async function postFollowupFile(
  url: string,
  payload: Record<string, unknown>,
  bytes: ArrayBuffer | Uint8Array,   // accept common cases
  filename: string,
  mime = 'image/png'
) {
  const form = new FormData();
  form.append('payload_json', JSON.stringify(payload));

  // Normalize to a brand-new ArrayBuffer (never SharedArrayBuffer-backed)
  const ab: ArrayBuffer = toPlainArrayBuffer(bytes);

  form.append('files[0]', new Blob([ab], { type: mime }), filename);
  await fetch(url, { method: 'POST', body: form });
}

/** Ensure we hand Blob a plain ArrayBuffer, not SAB-backed segments. */
function toPlainArrayBuffer(src: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (src instanceof Uint8Array) {
    const copy = new Uint8Array(src.byteLength);
    copy.set(src);
    return copy.buffer; // plain ArrayBuffer
  }
  // src is ArrayBuffer
  const view = new Uint8Array(src);
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer; // plain ArrayBuffer
}

/** Convenience for PNG follow-ups with no extra content. */
export async function postFollowupImage(url: string, png: Uint8Array, filename = 'banzuke.png') {
  const fd = new FormData();
  fd.append('payload_json', JSON.stringify({}));
  fd.append('files[0]', new File([toPlainArrayBuffer(png)], filename, { type: 'image/png' }));
  await fetch(url, { method: 'POST', body: fd });
}
