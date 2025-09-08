// src/webhook.ts
import type { Env } from './types';
import { toUnixSafe } from './time';
import { toHex, constantTimeEqualHex } from './http'; // removed unused json

export async function handleSumoWebhook(req: Request, env: Env): Promise<Response> {
  const sig = req.headers.get('X-Webhook-Signature') ?? '';
  const raw = await req.arrayBuffer();
  const enc = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(env.SUMO_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // HMAC over URL + body
  const urlBytes = enc.encode(req.url);
  const merged = new Uint8Array(urlBytes.length + raw.byteLength);
  merged.set(urlBytes, 0);
  merged.set(new Uint8Array(raw), urlBytes.length);

  const mac = await crypto.subtle.sign('HMAC', key, merged.buffer);
  const macHex = toHex(new Uint8Array(mac));
  if (!constantTimeEqualHex(macHex, sig)) return new Response('bad signature', { status: 401 });

  const payload = JSON.parse(new TextDecoder().decode(raw));

  if (env.DISCORD_WEBHOOK_URL) {
    await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatSumoMessage(payload))
    }).catch(() => {});
  }

  return new Response(null, { status: 204 });
}

export function formatSumoMessage(evt: any) {
  if (evt?.type === 'newBasho') {
    const p = evt.payload ?? {};
    const start = toUnixSafe(p.startDate);
    const end   = toUnixSafe(p.endDate);
    return {
      content:
        `**Banzuke released** for ${p.bashoId ?? 'unknown'}\n` +
        `Starts ${start != null ? `<t:${start}:D>` : ''}\n` +
        `Ends ${end != null ? `<t:${end}:D>` : 'N/A'}`
    };
  }
  if (evt?.type === 'endBasho') {
    const p = evt.payload ?? {};
    return { content: `**Basho finished** ${p.bashoId ?? 'unknown'} • Yūshō: ${p.yusho ?? 'TBD'}` };
  }
  return { content: `Sumo event: ${evt?.type ?? 'unknown'}` };
}
