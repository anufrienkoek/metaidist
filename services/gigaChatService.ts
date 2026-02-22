import { getToken, startTokenAutoRefresh } from './gigaChatToken';

const DEFAULT_PROXY_API_URL = '/gigachat-api/api/v1';
const DIRECT_API_URL = 'https://gigachat.devices.sberbank.ru/api/v1';
const API_URL = (import.meta.env.VITE_GIGACHAT_API_BASE_URL as string | undefined)?.trim() || DEFAULT_PROXY_API_URL;

const buildPayload = (model: string, messages: any[]) => ({
  model,
  messages,
  temperature: 0.7,
  max_tokens: 2000,
});

async function callGigaChat(urlBase: string, token: string, model: string, messages: any[]) {
  return fetch(`${urlBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildPayload(model, messages)),
  });
}

export const generateGigaChatCompletion = async (model: string, messages: any[]) => {
  const token = await getToken();

  let response = await callGigaChat(API_URL, token, model, messages);

  // Fallback for environments without Vite dev proxy (e.g. static preview/prod)
  if (!response.ok && response.status === 404 && API_URL.startsWith('/')) {
    response = await callGigaChat(DIRECT_API_URL, token, model, messages);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GigaChat API Failed: ${response.status} - ${errorText}`);
  }

  return response.json();
};

export { startTokenAutoRefresh };
