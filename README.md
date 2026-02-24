<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/09039c99-02ff-4c92-9025-31fee7efb9a5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_GIGACHAT_AUTH_KEY` in [.env.local](.env.local)
3. Run the app:
   `npm run dev`


> Если OAuth прокси недоступен и вы получили готовый access token, добавьте `VITE_GIGACHAT_ACCESS_TOKEN` в `.env.local` — приложение будет использовать его напрямую.



### Vercel (production)

Для продакшна запросы к GigaChat идут через serverless endpoint `/api/gigachat-chat`, чтобы обойти CORS браузера.

Нужно задать секреты в Vercel Project Settings → Environment Variables:
- `GIGACHAT_BASIC` (или `GIGACHAT_ACCESS_TOKEN`)
- Совместимость: если у вас уже заведены `VITE_GIGACHAT_AUTH_KEY` / `VITE_GIGACHAT_ACCESS_TOKEN`, serverless proxy тоже их прочитает.

Не задавайте `VITE_GIGACHAT_API_BASE_URL` в проде, иначе фронтенд попробует ходить в GigaChat напрямую и упрётся в CORS.
