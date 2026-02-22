import { getToken, startTokenAutoRefresh } from './gigaChatToken';

const API_URL = '/gigachat-api/api/v1';

// Start auto-refresh when this module is loaded (or called from App)
// We can export it to call it explicitly in App.tsx as requested, 
// but calling it here ensures it starts if the service is imported.
// However, the user asked to call it in App.tsx. I will export it.

export const generateGigaChatCompletion = async (model: string, messages: any[]) => {
    const token = await getToken();
    console.log("Using GigaChat Token:", token ? token.substring(0, 10) + "..." : "null");
    console.log("Model:", model);

    const response = await fetch(`${API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("GigaChat API Error:", response.status, errorText);
        throw new Error(`GigaChat API Failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
};

export { startTokenAutoRefresh };
