# Supabase: автообновление GigaChat токена каждые 25 минут

## 1) Что нужно подставить вручную
- `<PROJECT_REF>`
- `<SERVICE_ROLE_KEY>` (не публикуйте его в логах)
- секрет `GIGACHAT_BASIC` (формат: `Basic base64(client_id:client_secret)` или просто base64)

## 2) SQL для таблицы и RPC
Выполните `supabase/sql/gigachat_tokens.sql` в SQL Editor.

## 3) Секрет и деплой функции
```bash
supabase secrets set GIGACHAT_BASIC="<YOUR_BASIC_OR_BASE64>" --project-ref <PROJECT_REF>
supabase functions deploy refresh-gigachat-token --project-ref <PROJECT_REF>
```

## 4) Тест функции
```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/refresh-gigachat-token" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by":"manual"}'
```

## 5) Cron через SQL (если есть pg_cron + pg_net)
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('gigachat-refresh')
where exists (select 1 from cron.job where jobname = 'gigachat-refresh');

select cron.schedule(
  'gigachat-refresh',
  '*/25 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/refresh-gigachat-token',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );
  $$
);
```

## 6) Если pg_net недоступен
В Dashboard → Integrations → Cron создайте HTTP job:
- Method: `POST`
- URL: `https://<PROJECT_REF>.supabase.co/functions/v1/refresh-gigachat-token`
- Headers:
  - `Authorization: Bearer <SERVICE_ROLE_KEY>`
  - `Content-Type: application/json`
- Body: `{"triggered_by":"cron"}`
- Schedule: `*/25 * * * *`

## 7) Проверка данных
```sql
select * from public.gigachat_tokens order by updated_at desc limit 5;
```
