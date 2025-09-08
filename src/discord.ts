import {
  verifyKey,
  InteractionType,
  InteractionResponseType
} from 'discord-interactions';

import type { Env, Basho } from './types';
import { GOLD } from './constants';
import { toUnixSafe, isoMinusDaysUTC } from './time';
import {
  getBasho,
  resolveTargetId,
  validateBashoId,
  bashoLooksMissing,
  computeUpcomingId
} from './sumoApi';
import { json, field, followupEndpoint, postFollowup } from './http';

export async function handleDiscord(req: Request, env: Env, ctx: any): Promise<Response> {
  const sig = req.headers.get('X-Signature-Ed25519') ?? '';
  const ts  = req.headers.get('X-Signature-Timestamp') ?? '';

  const raw = await req.arrayBuffer();
  const ok  = await verifyKey(new Uint8Array(raw), sig, ts, env.DISCORD_PUBLIC_KEY);
  if (!ok) return new Response('bad signature', { status: 401 });

  const msg = JSON.parse(new TextDecoder().decode(raw));

  if (msg.type === InteractionType.PING) {
    return json({ type: InteractionResponseType.PONG });
  }

  if (msg.type === InteractionType.APPLICATION_COMMAND && msg.data?.name === 'basho') {
    const ack = json({ type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });

    ctx.waitUntil((async () => {
      const followupUrl = followupEndpoint(msg.application_id, msg.token);

      try {
        const supplied = msg.data.options?.find((o: any) => o.name === 'yyyymm')?.value as string | undefined;

        if (supplied) {
          const v = validateBashoId(supplied);
          if (v) { await postFollowup(followupUrl, { content: v, flags: 64 }); return; }

          const b = await getBasho(supplied);
          if (bashoLooksMissing(b)) {
            await postFollowup(followupUrl, {
              content: `Basho not found for ${supplied}. Valid months: 01, 03, 05, 07, 09, 11.`,
              flags: 64
            });
            return;
          }

          await postFollowup(followupUrl, { embeds: [buildBashoEmbed(b!, { includeCountdown: false })] });
          return;
        }

        const targetId = await resolveTargetId(undefined);
        let b = await getBasho(targetId);

        if (bashoLooksMissing(b)) {
          const fallbackId = computeUpcomingId(new Date());
          if (fallbackId !== targetId) b = await getBasho(fallbackId);
        }

        if (bashoLooksMissing(b)) {
          await postFollowup(followupUrl, {
            content: `Basho not found for ${targetId}. Valid months: 01, 03, 05, 07, 09, 11.`,
            flags: 64
          });
          return;
        }

        await postFollowup(followupUrl, { embeds: [buildBashoEmbed(b!, { includeCountdown: true })] });

      } catch (e: any) {
        await postFollowup(followupUrl, {
          content: `Failed to fetch basho: ${e?.message ?? String(e)}`,
          flags: 64
        });
      }
    })());

    return ack;
  }

  return new Response('no-op');
}

// ---------- Builders ----------

function buildBashoEmbed(basho: Basho, opts: { includeCountdown: boolean }) {
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  const startUnix = toUnixSafe(basho.startDate);
  const endUnix   = toUnixSafe(basho.endDate);

  const banzukeUnix = startUnix != null && basho.startDate
    ? toUnixSafe(isoMinusDaysUTC(basho.startDate, 7))
    : null;

  if (banzukeUnix != null) fields.push(field('Banzuke release', `<t:${banzukeUnix}:D> • <t:${banzukeUnix}:R>`));
  if (startUnix   != null) fields.push(field('Start',            `<t:${startUnix}:D> • <t:${startUnix}:R>`));
  if (endUnix     != null) fields.push(field('End',              `<t:${endUnix}:D>`));
  if (opts.includeCountdown && startUnix != null) fields.push(field('Starts in', `<t:${startUnix}:R>`));

  const descLines = [
    basho.city  ? `**City:** ${basho.city}`   : null,
    basho.venue ? `**Venue:** ${basho.venue}` : null
  ].filter(Boolean);

  // Title: "Month Basho"
  let title = 'Basho N/A';
  if (basho.startDate) {
    const d = new Date(basho.startDate);
    const monthName = d.toLocaleString('en-US', { month: 'long' });
    title = `${monthName} Basho`;
  } else if (basho.bashoId) {
    const month = basho.bashoId.slice(4, 6);
    const year = basho.bashoId.slice(0, 4);
    const monthName = monthFromNumber(month);
    if (monthName) title = `${monthName} ${year} Basho`;
  }

  return {
    title,
    description: descLines.length ? descLines.join('\n') : undefined,
    color: GOLD,
    fields,
    footer: { text: 'Times shown via Discord timestamps' }
  };
}

function monthFromNumber(mm: string): string | null {
  const names: Record<string, string> = {
    '01': 'January',
    '03': 'March',
    '05': 'May',
    '07': 'July',
    '09': 'September',
    '11': 'November'
  };
  return names[mm] ?? null;
}