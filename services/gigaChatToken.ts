import { v4 as uuidv4 } from 'uuid';

type TokenResp = {
  access_token: string;
  expires_at: number; // GigaChat returns expires_at in ms
};

const AUTH_PROXY_URL = '/gigachat-auth/api/v2/oauth';

// Initialize with the token provided by the user
// Expires at 1771759823097 (approx 20 mins from now)
let currentToken: string | null = "eyJjdHkiOiJqd3QiLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiYWxnIjoiUlNBLU9BRVAtMjU2In0.DFSaY7EY308biG7r8wUPwIg5IqbN0GvF5Ga6_N7PhZMHOxnvtIUS64KmywdVKFZdrCB8mRgeDjEUQghjm0WicIhKDDpOrLCFqwAQbRRHLBJ7fd7Q1a8y_A9RS12PMLblMcRhfedkmXyggyozVHQ_iryOR9sX4v2Oifbn9qxl0QUt7bM8ExVYUWiy5wooATt-CCbR3d_V1EJDTGZ-4Iyh4cy4BFxO6sXE3bE3zyCyJveHNL4hnXgbtAfc7nAHCNHXJxvg3O0BAgkXhr42dwWXNZz4Qu-38OKZHRUHuOXgZxagYQpfA04wP7gbyfEUlMuYIRz_ufp0ZEjjmMT2DpmPCQ.xuthKFpAVvBboLiBSSGaBQ.8FJj7IL8kA7CVkt_lVL70AnLrtDpSH33O8J2JFFkz_fIucxBYw8FtxST7K_xMiCFOe40Ic_v6E9yLPDm3vcL8NqtxyZlrsANa2XJbn4XYO3L-oGxp9gofTB7hSJ-BkMHrtiIE2b-eayHZ5YZsd_QYqhrHVbQhwQSpsdL-qTrKByg_CmuorLkaTP3k4oK5PfQJQ3EkzEIZPr5dquvuaQrjekRr5uL1F_28zs8hnFDeu_dbYzAQBakwo-9wIX9Q3fRc6_3pQ3h_SbV2SH2cBhxh1QuelvjA9oU7U029vt37YGRsJ70dxtSeVsq5nggvn8nngn63PSgGp9jmoWkMBhakJS1PEdNzZAUlyAHIKTNBo-Auqmjv9dz5Mj4VGD4t7qOAYIKIVAwO4pKRPggp_1NlZ7QE5JV-uwpBJHUEFsHeXx86uus32Wy5wP95xn0tlLyj8Ye14ywyOvZDrVF4MUy47Ka0nPNG2sV7UrZxAAqpaNQyhRvofbK3Q_CYOJeLNXg0lH2kDZC7A_1MIQnOTERKm0wkW7YjnhXRiy4r_-xmeGz1l5ZV4Ukg6Dz2LFIxq07q9CCYPZ-RRPzYGNGr0CjK-G5v0uNvxVpIN6Qtf_vkD3SOkVT8T_4FEBu0I_e4a1s_JT9ViUKXBqSrZ0IHVUcNra3Zun1_w-fu9y70zXGtfVZN017CVbYRBkPtYLpJaNa24Eqc5QBOH55bXe0_fM6eUHfvz_xyEB9DLND4C-Ra3s.6f-sIxe8ZG__VHFua3ZSWf9rhElexbjWJ-erncLFCOY";
let tokenExpiresAt = 1771759823097;
let refreshTimer: number | null = null;

async function fetchToken(): Promise<TokenResp> {
  // Use the key provided by user or from env
  let authKey = import.meta.env.VITE_GIGACHAT_AUTH_KEY;
  
  // Hardcoded correct key provided by user
  const CORRECT_KEY = 'MDE5YzZmZDMtNzg4Ni03YWE1LTkwYmEtZmIyNGNmNTI1YmU4OjFjZjA3OTMzLTYxZTctNDlkOC1iMDViLTFiNjVkMGFjZDI5NA==';

  // Always use the correct key if the env var is missing or different/placeholder
  if (!authKey || authKey !== CORRECT_KEY) {
      authKey = CORRECT_KEY;
  }

  // Sanitize key: remove "Basic " prefix if present, and trim whitespace
  if (authKey) {
      authKey = authKey.replace(/^Basic\s+/i, '').trim();
  }

  const rquid = crypto.randomUUID();

  console.log("Refreshing GigaChat Token...");

  const res = await fetch(AUTH_PROXY_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rquid,
        'Authorization': `Basic ${authKey}`
    },
    body: 'scope=GIGACHAT_API_PERS'
  });

  if (!res.ok) {
      const text = await res.text();
      console.error("Token Fetch Error Body:", text);
      throw new Error(`Token fetch failed: ${res.status} - ${text}`);
  }
  
  const json = await res.json();
  return json as TokenResp;
}

let tokenPromise: Promise<string> | null = null;

export async function getToken(): Promise<string> {
  const now = Date.now();
  if (currentToken && now < tokenExpiresAt - 5000) { // 5s buffer
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
        
        // Calculate seconds until expiration for scheduling
        const expiresInSeconds = (tokenResp.expires_at - Date.now()) / 1000;
        scheduleRefresh(expiresInSeconds);

        return currentToken!;
      } finally {
          tokenPromise = null;
      }
  })();

  return tokenPromise;
}

function scheduleRefresh(expiresInSeconds: number) {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  // Refresh 60s before expiry, but at least wait REFRESH_MS if expiry is far away? 
  // Actually, the user's logic was: Math.max( (expiresInSeconds - 60) * 1000, REFRESH_MS )
  // But REFRESH_MS is 25 mins. If token expires in 30 mins, we wait 29 mins?
  // Let's just refresh 60s before expiry.
  
  const refreshDelay = Math.max(0, (expiresInSeconds - 60) * 1000);
  
  // If the token is valid for less than REFRESH_MS (e.g. 30 mins), we might want to refresh sooner?
  // The user's snippet logic: Math.max( (expiresInSeconds - 60) * 1000, REFRESH_MS );
  // If expiresInSeconds is 1800 (30m), (1800-60)*1000 = 29m. REFRESH_MS = 25m. Max is 29m.
  // This seems to delay refresh until 29m.
  // If expiresInSeconds is 600 (10m), (600-60)*1000 = 9m. REFRESH_MS = 25m. Max is 25m.
  // This would wait 25m, which is PAST expiration.
  // I think the user meant Math.min or just using the expiration time.
  // I will use (expiresInSeconds - 60) * 1000 to refresh 1 minute before expiration.
  
  const safeRefreshDelay = Math.max(1000, refreshDelay); // Ensure at least 1s

  refreshTimer = window.setTimeout(async () => {
    try {
      const tokenResp = await fetchToken();
      currentToken = tokenResp.access_token;
      tokenExpiresAt = tokenResp.expires_at;
      
      const newExpiresIn = (tokenResp.expires_at - Date.now()) / 1000;
      scheduleRefresh(newExpiresIn);
      
      console.info('GigaChat token refreshed');
    } catch (err) {
      console.error('Failed to refresh GigaChat token', err);
      // Retry in 30s
      refreshTimer = window.setTimeout(() => void scheduleRefresh(expiresInSeconds), 30_000);
    }
  }, safeRefreshDelay);
}

export function startTokenAutoRefresh() {
  void getToken().catch(err => console.error('Initial token fetch failed', err));
}
