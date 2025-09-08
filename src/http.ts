export function json(obj: unknown): Response {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } });
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

export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
