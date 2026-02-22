type TokenResp = {
  access_token: string;
  expires_at: number;
};

const AUTH_PROXY_URL = '/gigachat-auth/api/v2/oauth';

let currentToken: string | null = null;
let tokenExpiresAt = 0;
let refreshTimer: number | null = null;
let tokenPromise: Promise<string> | null = null;

async function fetchToken(): Promise<TokenResp> {
  let authKey = import.meta.env.VITE_GIGACHAT_AUTH_KEY as string | undefined;

  if (!authKey) {
    throw new Error('VITE_GIGACHAT_AUTH_KEY is not set');
  }

  authKey = authKey.replace(/^Basic\s+/i, '').trim();

  const res = await fetch(AUTH_PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      RqUID: crypto.randomUUID(),
      Authorization: `Basic ${authKey}`,
    },
    body: 'scope=GIGACHAT_API_PERS',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token fetch failed: ${res.status} - ${text}`);
  }

  return (await res.json()) as TokenResp;
}

function scheduleRefresh(expiresAt: number) {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  const refreshDelay = Math.max(1000, expiresAt - Date.now() - 60_000);

  refreshTimer = window.setTimeout(async () => {
    try {
      const tokenResp = await fetchToken();
      currentToken = tokenResp.access_token;
      tokenExpiresAt = tokenResp.expires_at;
      scheduleRefresh(tokenExpiresAt);
      console.info('GigaChat token refreshed');
    } catch (err) {
      console.error('Failed to refresh GigaChat token', err);
      refreshTimer = window.setTimeout(() => {
        void getToken();
      }, 30_000);
    }
  }, refreshDelay);
}

export async function getToken(): Promise<string> {
  if (currentToken && Date.now() < tokenExpiresAt - 5000) {
    return currentToken;
  }

  if (tokenPromise) {
    return tokenPromise;
  }

  tokenPromise = (async () => {
    try {
      const tokenResp = await fetchToken();
      currentToken = tokenResp.access_token;
      tokenExpiresAt = tokenResp.expires_at;
      scheduleRefresh(tokenExpiresAt);
      return currentToken;
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
}

export function startTokenAutoRefresh() {
  void getToken().catch((err) => console.error('Initial token fetch failed', err));
}
