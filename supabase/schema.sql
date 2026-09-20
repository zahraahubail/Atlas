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

-- A learning day is earned when an account memorizes at least one new country.
-- Keep this history even if the country is later unmarked.
create table if not exists public.learning_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  learned_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, learned_on)
);

alter table public.learning_days enable row level security;
revoke all on table public.learning_days from anon, authenticated;
grant select, insert on table public.learning_days to authenticated;

drop policy if exists "Read own learning days" on public.learning_days;
create policy "Read own learning days" on public.learning_days
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Add own learning days" on public.learning_days;
create policy "Add own learning days" on public.learning_days
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- Both inserts succeed together, so a memorized country cannot be saved without
-- its learning day. Re-running this schema preserves existing progress.
create or replace function public.memorize_country(p_country_code text, p_local_day date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null or p_country_code !~ '^[A-Z]{2}$' or p_local_day is null then
    raise exception 'Invalid memorized country request';
  end if;

  insert into public.memorized_countries (user_id, country_code)
  values (auth.uid(), p_country_code)
  on conflict do nothing;

  if found then
    insert into public.learning_days (user_id, learned_on)
    values (auth.uid(), p_local_day)
    on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.memorize_country(text, date) from public, anon;
grant execute on function public.memorize_country(text, date) to authenticated;
