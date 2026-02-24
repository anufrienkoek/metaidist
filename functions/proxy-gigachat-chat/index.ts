const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'authorization',
]);

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildTargetPath(pathname: string): string {
  const prefix = '/proxy-gigachat-chat';
  if (pathname.startsWith(prefix)) {
    const rest = pathname.slice(prefix.length);
    return rest.length > 0 ? rest : '/';
  }
  return pathname;
}

Deno.serve(async (request: Request): Promise<Response> => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const apiBase = Deno.env.get('GIGACHAT_API_BASE');

    if (!supabaseUrl || !anonKey || !apiBase) {
      return jsonResponse(500, {
        error: 'misconfigured_env',
        details: 'SUPABASE_URL, SUPABASE_ANON_KEY, GIGACHAT_API_BASE are required',
      });
    }

    const tokenUrl = new URL('/rest/v1/gigachat_tokens', supabaseUrl);
    tokenUrl.searchParams.set('id', 'eq.current');
    tokenUrl.searchParams.set('select', 'access_token,expires_at');
    tokenUrl.searchParams.set('limit', '1');

    const tokenResp = await fetch(tokenUrl, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    });

    if (!tokenResp.ok) {
      const tokenErr = await tokenResp.text();
      return jsonResponse(502, { error: 'token_fetch_failed', status: tokenResp.status, details: tokenErr });
    }

    const rows = await tokenResp.json() as Array<{ access_token?: string; expires_at?: string | null }>;
    const row = rows[0];

    if (!row?.access_token) {
      return jsonResponse(503, { error: 'no_token' });
    }

    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now() + 30_000) {
      return jsonResponse(503, { error: 'token_expired' });
    }

    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(buildTargetPath(incomingUrl.pathname) + incomingUrl.search, apiBase);

    const forwardHeaders = new Headers();
    request.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        forwardHeaders.set(key, value);
      }
    });
    forwardHeaders.set('Authorization', `Bearer ${row.access_token}`);

    const upstreamResp = await fetch(upstreamUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    });

    const responseHeaders = new Headers();
    upstreamResp.headers.forEach((value, key) => {
      if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('proxy-gigachat-chat failed', error);
    return jsonResponse(500, {
      error: 'proxy_internal_error',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
