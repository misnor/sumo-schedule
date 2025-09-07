import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';

type Env = {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_WEBHOOK_URL: string;
  SUMO_WEBHOOK_SECRET: string;
  TZ: string;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/interactions') {
      return handleDiscord(request, env);
    }
    if (request.method === 'POST' && url.pathname === '/webhooks/sumo') {
      return handleSumoWebhook(request, env);
    }
    return new Response('ok');
  }
};

async function handleDiscord(req: Request, env: Env): Promise<Response> {
  // Verify Discord signature (Ed25519)
  const sig = req.headers.get('X-Signature-Ed25519') ?? '';
  const ts  = req.headers.get('X-Signature-Timestamp') ?? '';
  const body = await req.clone().arrayBuffer(); // raw body
  const valid = await verifyKey(new Uint8Array(body), sig, ts, env.DISCORD_PUBLIC_KEY);
  if (!valid) return new Response('bad signature', { status: 401 });

  const msg = await req.json();
  if (msg.type === InteractionType.PING) {
    return json({ type: InteractionResponseType.PONG }); // Discord URL check
  }

  if (msg.type === InteractionType.APPLICATION_COMMAND) {
    const name = msg.data?.name;
    if (name === 'basho') {
      const yyyymm = msg.data?.options?.find((o: any) => o.name === 'yyyymm')?.value as string | undefined;
      const bashoId = yyyymm ?? computeLatestBashoId(new Date());
      try {
        const apiRes = await fetch(`https://www.sumo-api.com/api/basho/${bashoId}`);
        if (!apiRes.ok) throw new Error(`${apiRes.status}`);
        const data = await apiRes.json();
        const start = fmtLocal(data.startDate, env.TZ);
        const end   = fmtLocal(data.endDate, env.TZ);
        const desc = [
          `**Start:** ${start}`,
          `**End:** ${end}`,
          data.city ? `**City:** ${data.city}` : null,
          data.venue ? `**Venue:** ${data.venue}` : null
        ].filter(Boolean).join('\n');

        return json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            embeds: [{ title: `Basho ${data.bashoId ?? bashoId}`, description: desc, footer: { text: `Times in ${env.TZ}` } }]
          }
        });
      } catch (e: any) {
        return json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `Failed to fetch basho ${bashoId}: ${e.message}`, flags: 64 }
        });
      }
    }
  }

  return new Response('no-op');
}

function computeLatestBashoId(now: Date): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const odd = [1,3,5,7,9,11];
  if (odd.includes(m)) return `${y}${String(m).padStart(2,'0')}`;
  const next = m === 12 ? 1 : m + 1;
  const year = m === 12 ? y + 1 : y;
  return `${year}${String(next).padStart(2,'0')}`;
}

function fmtLocal(iso: string, tz: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: 'short', day: '2-digit',
    weekday: 'short'
  }).format(d);
}

function concatToBuffer(chunks: Uint8Array[]): ArrayBuffer {
  const len = chunks.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; }
  return out.buffer; // already an ArrayBuffer covering full range
}

// Sumo-API webhook: verify HMAC-SHA256(secret, url + body) == X-Webhook-Signature
async function handleSumoWebhook(req: Request, env: Env): Promise<Response> {
  const signature = req.headers.get('X-Webhook-Signature') ?? '';
  const raw = await req.arrayBuffer();
  const enc = new TextEncoder();
  const toSign = concat([enc.encode(new URL(req.url).pathname), new Uint8Array(raw)]);
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(env.SUMO_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const toSignBuf = concatToBuffer([enc.encode(new URL(req.url).pathname), new Uint8Array(raw)]);
  const mac = await crypto.subtle.sign('HMAC', key, toSignBuf);
  const hex = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2,'0')).join('');
  if (hex !== signature) return new Response('bad signature', { status: 401 });

  const payload = JSON.parse(new TextDecoder().decode(raw));
  // Minimal relay using channel webhook URL
  await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formatSumoMessage(payload))
  });

  return new Response(null, { status: 204 }); // acknowledge per docs
}

function formatSumoMessage(evt: any) {
  if (evt.type === 'newBasho') {
    const p = evt.payload ?? {};
    return { content: `**Banzuke released** for ${p.bashoId}. Starts ${p.startDate}. Ends ${p.endDate}.` };
  }
  if (evt.type === 'endBasho') {
    const p = evt.payload ?? {};
    return { content: `**Basho finished** ${p.bashoId}. Yūshō: ${p.yusho ?? 'TBD'}` };
  }
  return { content: `Sumo event: ${evt.type}` };
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((a,c)=>a+c.length,0);
  const out = new Uint8Array(len);
  let o=0; for (const c of chunks){ out.set(c,o); o+=c.length; }
  return out;
}

function json(obj: unknown): Response {
  return new Response(JSON.stringify(obj), { headers: { 'Content-Type':'application/json' } });
}
