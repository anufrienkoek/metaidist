-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Programs Table (Stores the current state of programs)
create table if not exists public.programs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  name text,
  content jsonb, -- Stores the full program structure (sections, formatting, etc.)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for Programs
alter table public.programs enable row level security;

create policy "Users can view their own programs"
  on public.programs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own programs"
  on public.programs for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own programs"
  on public.programs for update
  using (auth.uid() = user_id);

create policy "Users can delete their own programs"
  on public.programs for delete
  using (auth.uid() = user_id);

-- Generation History Table (Logs every generation attempt)
create table if not exists public.generation_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users not null,
  program_id uuid references public.programs(id),
  model_name text,
  tokens_total int,
  prompt_tokens int,
  completion_tokens int,
  input_params jsonb, -- The metadata used for generation
  output_sections jsonb, -- The generated content
  created_at timestamptz default now()
);

-- RLS for Generation Logs
alter table public.generation_logs enable row level security;

create policy "Users can view their own generation logs"
  on public.generation_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own generation logs"
  on public.generation_logs for insert
  with check (auth.uid() = user_id);
