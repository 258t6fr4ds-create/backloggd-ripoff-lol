-- GameVault cloud sync tables. Run in your existing Sidequest Supabase project's
-- SQL Editor; it creates *only* GameVault objects. Does not touch Sidequest.
-- Auth users/sign-in are shared by both apps, data is isolated by RLS.

begin;

create table if not exists public.gamevault_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (char_length(game_id) between 1 and 120),
  data jsonb not null default '{}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id),
  constraint gamevault_game_data_object check (
    jsonb_typeof(data) = 'object' and octet_length(data::text) < 200000
  )
);

alter table public.gamevault_games enable row level security;
revoke all on table public.gamevault_games from anon, authenticated;
grant select, insert, update on table public.gamevault_games to authenticated;

drop policy if exists "gamevault_read_own" on public.gamevault_games;
create policy "gamevault_read_own"
on public.gamevault_games for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "gamevault_insert_own" on public.gamevault_games;
create policy "gamevault_insert_own"
on public.gamevault_games for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "gamevault_update_own" on public.gamevault_games;
create policy "gamevault_update_own"
on public.gamevault_games for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Compare-and-swap: an out-of-date device can't overwrite a newer revision.
-- Returns NULL for a conflict; the browser asks the user what to keep.
create or replace function public.gamevault_write(
  p_game_id text, p_expected_revision integer, p_data jsonb, p_deleted boolean
) returns integer
language plpgsql security invoker set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  new_revision integer;
begin
  if actor is null then raise exception 'Sign in before syncing.'; end if;
  if p_game_id is null or char_length(p_game_id) < 1 or char_length(p_game_id) > 120
     or p_expected_revision is null or p_expected_revision < 0
     or p_data is null or jsonb_typeof(p_data) <> 'object'
     or octet_length(p_data::text) >= 200000 then
     raise exception 'Invalid sync entry.';
  end if;
  insert into public.gamevault_games(user_id,game_id,data,deleted,revision,updated_at)
  values(actor,p_game_id,p_data,coalesce(p_deleted,false),1,now())
  on conflict (user_id,game_id) do update
    set data = excluded.data,
        deleted = excluded.deleted,
        revision = public.gamevault_games.revision + 1,
        updated_at = now()
    where public.gamevault_games.revision = p_expected_revision
  returning revision into new_revision;
  return new_revision;
end;
$$;
revoke all on function public.gamevault_write(text,integer,jsonb,boolean) from public, anon;
grant execute on function public.gamevault_write(text,integer,jsonb,boolean) to authenticated;
commit;
