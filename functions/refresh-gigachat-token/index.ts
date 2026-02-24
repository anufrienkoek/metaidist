import { createClient } from 'npm:@supabase/supabase-js@2.28.0';

const OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';

function toIsoTimestamp(expiresAt: unknown): string | null {
  if (typeof expiresAt === 'number') {
    const ms = expiresAt > 9_999_999_999 ? expiresAt : expiresAt * 1000;
    return new Date(ms).toISOString();
  }

  if (typeof expiresAt === 'string') {
    const asNumber = Number(expiresAt);
    if (!Number.isNaN(asNumber)) {
      const ms = asNumber > 9_999_999_999 ? asNumber : asNumber * 1000;
      return new Date(ms).toISOString();
    }

    const date = new Date(expiresAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

Deno.serve(async (request: Request): Promise<Response> => {
  const reqId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const basicSecretRaw = Deno.env.get('GIGACHAT_BASIC');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are not configured');
    }

    if (!basicSecretRaw) {
      throw new Error('GIGACHAT_BASIC secret is not configured');
    }

    const authorization = basicSecretRaw.startsWith('Basic ')
      ? basicSecretRaw
      : `Basic ${basicSecretRaw}`;

    console.info(`[${reqId}] Requesting new GigaChat token`);

    const oauthResp = await fetch(OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        RqUID: reqId,
        Authorization: authorization,
      },
      body: 'scope=GIGACHAT_API_PERS',
    });

    const rawText = await oauthResp.text();
    let rawJson: Record<string, unknown> = {};

    try {
      rawJson = rawText ? JSON.parse(rawText) : {};
    } catch {
      rawJson = { parse_error: true, raw_text: rawText };
    }

    if (!oauthResp.ok) {
      console.error(`[${reqId}] OAuth request failed`, {
        status: oauthResp.status,
        body: rawJson,
      });

      return new Response(
        JSON.stringify({ ok: false, status: oauthResp.status, error: rawJson }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const accessToken = typeof rawJson.access_token === 'string' ? rawJson.access_token : null;
    const expiresAtIso = toIsoTimestamp(rawJson.expires_at);

    if (!accessToken || !expiresAtIso) {
      throw new Error('OAuth response missing access_token and/or expires_at');
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { error: upsertError } = await admin.rpc('upsert_gigachat_token', {
      p_access_token: accessToken,
      p_expires_at: expiresAtIso,
      p_raw: rawJson,
    });

    if (upsertError) {
      console.error(`[${reqId}] Failed to persist token`, upsertError);
      throw new Error(`DB upsert failed: ${upsertError.message}`);
    }

    console.info(`[${reqId}] Token refreshed and persisted successfully`, {
      expires_at: expiresAtIso,
      duration_ms: Date.now() - startedAt,
    });

    return new Response(
      JSON.stringify({ ok: true, expires_at: expiresAtIso, request_id: reqId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error(`[${reqId}] refresh-gigachat-token failed`, error);

    return new Response(
      JSON.stringify({
        ok: false,
        request_id: reqId,
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
