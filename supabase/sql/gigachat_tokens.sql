-- Enable helper extensions if available (safe if already enabled)
create extension if not exists pgcrypto;

create table if not exists public.gigachat_tokens (
  id serial primary key,
  access_token text,
  expires_at timestamptz,
  last_fetched_at timestamptz default now(),
  raw_response jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.upsert_gigachat_token(
  p_access_token text,
  p_expires_at timestamptz,
  p_raw jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.gigachat_tokens (id, access_token, expires_at, last_fetched_at, raw_response, updated_at)
  values (1, p_access_token, p_expires_at, now(), p_raw, now())
  on conflict (id)
  do update
    set access_token = excluded.access_token,
        expires_at = excluded.expires_at,
        last_fetched_at = now(),
        raw_response = excluded.raw_response,
        updated_at = now();
end;
$$;

comment on function public.upsert_gigachat_token(text, timestamptz, jsonb)
  is 'Insert/update the latest GigaChat token row (id=1).';
