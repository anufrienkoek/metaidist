import { createClient } from 'npm:@supabase/supabase-js@2.28.0';

const DEFAULT_OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const DEFAULT_SCOPE = 'GIGACHAT_API_PERS';

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

function fallbackExpiresAt(): string {
  return new Date(Date.now() + 29 * 60 * 1000).toISOString();
}

Deno.serve(async (request: Request): Promise<Response> => {
  const reqId = crypto.randomUUID();

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
    const oauthUrl = Deno.env.get('GIGACHAT_OAUTH_URL') || DEFAULT_OAUTH_URL;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY are not configured');
    }

    if (!basicSecretRaw) {
      throw new Error('GIGACHAT_BASIC secret is not configured');
    }

    const authorization = basicSecretRaw.startsWith('Basic ')
      ? basicSecretRaw
      : `Basic ${basicSecretRaw}`;

    const oauthResp = await fetch(oauthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        RqUID: reqId,
        Authorization: authorization,
      },
      body: `scope=${encodeURIComponent(DEFAULT_SCOPE)}`,
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
    const expiresAtIso = toIsoTimestamp(rawJson.expires_at) ?? fallbackExpiresAt();

    if (!accessToken) {
      throw new Error('OAuth response missing access_token');
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
