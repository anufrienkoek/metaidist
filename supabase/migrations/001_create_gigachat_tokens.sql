create extension if not exists pgcrypto;

create table if not exists public.gigachat_tokens (
  id text primary key default 'current',
  access_token text not null,
  expires_at timestamptz not null,
  raw_response jsonb,
  updated_at timestamptz not null default now()
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
  insert into public.gigachat_tokens (id, access_token, expires_at, raw_response, updated_at)
  values ('current', p_access_token, p_expires_at, p_raw, now())
  on conflict (id)
  do update
    set access_token = excluded.access_token,
        expires_at = excluded.expires_at,
        raw_response = excluded.raw_response,
        updated_at = now();
end;
$$;

revoke all on table public.gigachat_tokens from public;
grant select on table public.gigachat_tokens to authenticated;

comment on function public.upsert_gigachat_token(text, timestamptz, jsonb)
  is 'Upsert the latest GigaChat token row (id=current).';
