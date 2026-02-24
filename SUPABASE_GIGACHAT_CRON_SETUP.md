# Supabase: автообновление GigaChat токена каждые 30 минут + прокси чата

## 1) Подготовьте секреты
- `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API)
- `SUPABASE_ANON_KEY` (Project Settings → API)
- `GIGACHAT_BASIC` (`Basic ...` или base64 `client_id:client_secret`)
- `GIGACHAT_OAUTH_URL` (например `https://ngw.devices.sberbank.ru:9443/api/v2/oauth`)
- `GIGACHAT_API_BASE` (например `https://ngw.devices.sberbank.ru:9443`)

## 2) SQL: таблица и RPC
Выполните `supabase/sql/gigachat_tokens.sql` в SQL Editor.

## 3) Деплой Edge Functions
```bash
supabase login
supabase functions deploy refresh-gigachat-token --project-ref <PROJECT_REF>
supabase functions deploy proxy-gigachat-chat --project-ref <PROJECT_REF>
```

## 4) Environment Variables (Dashboard → Functions → Environment variables)
Для `refresh-gigachat-token`:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GIGACHAT_BASIC`
- `GIGACHAT_OAUTH_URL`

Для `proxy-gigachat-chat`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GIGACHAT_API_BASE`

## 5) Schedule
Dashboard → Functions → Schedules:
- Function: `refresh-gigachat-token`
- Method: `POST`
- Cron: `*/30 * * * *`

## 6) Проверка
```bash
# refresh
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/refresh-gigachat-token"

# proxy
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/proxy-gigachat-chat/v1/chat" \
  -H "Content-Type: application/json" \
  -d '{"input":"hello"}'
```

```sql
select * from public.gigachat_tokens;
```
