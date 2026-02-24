#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   PROJECT_REF=your_project_ref \
#   SUPABASE_ACCESS_TOKEN=... \
#   SUPABASE_DB_PASSWORD=... \
#   SUPABASE_SERVICE_ROLE_KEY=... \
#   GIGACHAT_BASIC=... \
#   bash scripts/setup_gigachat_refresh.sh

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

required_vars=(PROJECT_REF SUPABASE_SERVICE_ROLE_KEY GIGACHAT_BASIC)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: $var is required" >&2
    exit 1
  fi
done

if ! command -v supabase >/dev/null 2>&1; then
  echo "ERROR: supabase CLI is not installed. Install it first: https://supabase.com/docs/guides/cli" >&2
  exit 1
fi

log "Ensuring function source exists"
test -f functions/refresh-gigachat-token/index.ts

log "Applying SQL schema (table + RPC function) via Supabase SQL API"
# Requires access token and DB password for non-interactive execution.
if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" || -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  log "WARNING: SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD missing; skipping remote db push."
  log "Run manually: supabase link --project-ref \"$PROJECT_REF\" && supabase db push"
else
  export SUPABASE_ACCESS_TOKEN
  supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"

  mkdir -p supabase/migrations
  MIGRATION_FILE="supabase/migrations/$(date +%Y%m%d%H%M%S)_gigachat_tokens.sql"
  cp supabase/sql/gigachat_tokens.sql "$MIGRATION_FILE"

  supabase db push
fi

log "Setting Edge Function secret GIGACHAT_BASIC (value hidden)"
supabase secrets set GIGACHAT_BASIC="$GIGACHAT_BASIC" --project-ref "$PROJECT_REF"

log "Deploying function refresh-gigachat-token"
supabase functions deploy refresh-gigachat-token --project-ref "$PROJECT_REF"

FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/refresh-gigachat-token"

log "Triggering function with curl (service-role key hidden)"
HTTP_AND_BODY=$(curl -sS -w "\nHTTP_STATUS:%{http_code}\n" -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"triggered_by":"manual-script"}')

echo "$HTTP_AND_BODY"

log "Trying to schedule pg_cron job via SQL"
CRON_SQL=$(cat <<SQL
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.unschedule('gigachat-refresh')
where exists (select 1 from cron.job where jobname = 'gigachat-refresh');

select cron.schedule(
  'gigachat-refresh',
  '*/25 * * * *',
  $$
  select net.http_post(
    url := 'https://${PROJECT_REF}.supabase.co/functions/v1/refresh-gigachat-token',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  );
  $$
);
SQL
)

if [[ -n "${SUPABASE_ACCESS_TOKEN:-}" && -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  TMP_SQL="/tmp/gigachat_cron.sql"
  printf "%s\n" "$CRON_SQL" > "$TMP_SQL"
  # Fallback: execute through psql tunnel via supabase db remote commit pattern not available in all versions.
  log "INFO: Apply this SQL in Supabase SQL editor if CLI query command is unavailable:"
  cat "$TMP_SQL"
else
  log "Supabase SQL API credentials unavailable; print manual SQL below:"
  echo "$CRON_SQL"
fi

log "Verification SQL (run in SQL editor or via cli query tool):"
echo "select * from public.gigachat_tokens order by updated_at desc limit 5;"

log "Done"
