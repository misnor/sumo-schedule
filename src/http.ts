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
