-- Run once in the Supabase SQL Editor. Each user can access only their own rows.
create table if not exists public.memorized_countries (
  user_id uuid not null references auth.users(id) on delete cascade,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, country_code)
);

alter table public.memorized_countries enable row level security;
revoke all on table public.memorized_countries from anon, authenticated;
grant select, insert, delete on table public.memorized_countries to authenticated;

drop policy if exists "Read own progress" on public.memorized_countries;
create policy "Read own progress" on public.memorized_countries
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Add own progress" on public.memorized_countries;
create policy "Add own progress" on public.memorized_countries
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Remove own progress" on public.memorized_countries;
create policy "Remove own progress" on public.memorized_countries
  for delete to authenticated using ((select auth.uid()) = user_id);
