import type { Env } from './types';
import { handleDiscord } from './discord';
import { handleSumoWebhook } from './webhook';

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/interactions') {
      return handleDiscord(request, env, ctx);
    }

    if (request.method === 'POST' && url.pathname === '/webhooks/sumo') {
      return handleSumoWebhook(request, env);
    }

    return new Response('ok');
  }
};
