import { getToken, startTokenAutoRefresh } from './gigaChatToken';

const DEFAULT_PROXY_API_URL = '/gigachat-api/api/v1';
const SERVER_PROXY_URL = '/api/gigachat-chat';
const API_URL = (import.meta.env.VITE_GIGACHAT_API_BASE_URL as string | undefined)?.trim();

const buildPayload = (model: string, messages: any[]) => ({
  model,
  messages,
  temperature: 0.7,
  max_tokens: 2000,
});

export const generateGigaChatCompletion = async (model: string, messages: any[]) => {
  const payload = buildPayload(model, messages);

  // Explicit override from env (for custom backends)
  if (API_URL) {
    const directResp = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${await getToken()}` },
      body: JSON.stringify(payload),
    });

    if (!directResp.ok) {
      const errorText = await directResp.text();
      throw new Error(`GigaChat API Failed: ${directResp.status} - ${errorText}`);
    }

    return directResp.json();
  }

  // Prefer same-origin server proxy in production to avoid browser CORS issues.
  if (import.meta.env.PROD) {
    const serverResp = await fetch(SERVER_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!serverResp.ok) {
      const errorText = await serverResp.text();
      throw new Error(`GigaChat Proxy Failed: ${serverResp.status} - ${errorText}`);
    }

    return serverResp.json();
  }

  // Local dev via Vite proxy
  const token = await getToken();
  const devResp = await fetch(`${DEFAULT_PROXY_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!devResp.ok) {
    const errorText = await devResp.text();
    throw new Error(`GigaChat API Failed: ${devResp.status} - ${errorText}`);
  }

  return devResp.json();
};

export { startTokenAutoRefresh };
