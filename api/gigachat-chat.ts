import type { VercelRequest, VercelResponse } from '@vercel/node';

const OAUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const CHAT_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';

type ChatPayload = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
};

const setCors = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
};

const getAccessToken = async (): Promise<string> => {
  const staticToken = process.env.GIGACHAT_ACCESS_TOKEN?.trim();
  if (staticToken) return staticToken;

  const basic = process.env.GIGACHAT_BASIC?.trim();
  if (!basic) {
    throw new Error('Server secret GIGACHAT_BASIC is not configured');
  }

  const authHeader = basic.startsWith('Basic ') ? basic : `Basic ${basic}`;

  const tokenResp = await fetch(OAUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      RqUID: crypto.randomUUID(),
      Authorization: authHeader,
    },
    body: 'scope=GIGACHAT_API_PERS',
  });

  const tokenText = await tokenResp.text();
  if (!tokenResp.ok) {
    throw new Error(`OAuth failed: ${tokenResp.status} - ${tokenText}`);
  }

  const tokenJson = JSON.parse(tokenText) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error('OAuth response missing access_token');
  }

  return tokenJson.access_token;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const payload = req.body as ChatPayload;

    if (!payload?.model || !Array.isArray(payload?.messages)) {
      return res.status(400).json({ ok: false, error: 'Invalid payload: model/messages required' });
    }

    const token = await getAccessToken();

    const chatResp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        temperature: payload.temperature ?? 0.7,
        max_tokens: payload.max_tokens ?? 2000,
      }),
    });

    const chatText = await chatResp.text();

    if (!chatResp.ok) {
      return res.status(chatResp.status).send(chatText);
    }

    return res.status(200).send(chatText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({ ok: false, error: message });
  }
}
