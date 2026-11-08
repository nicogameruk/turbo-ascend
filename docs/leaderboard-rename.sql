-- Turbo Ascend: only certain racers may change their name (with the owner code).
-- Run in Supabase → SQL Editor → New query → Run, AFTER docs/leaderboard-owner.sql.
-- This script does NOT touch your secret owner code, so it's safe to run as is.

-- Racers allowed to change their name.
create table if not exists public.rename_names (name text primary key);
alter table public.rename_names enable row level security;
insert into public.rename_names (name) values ('Frosty Hamster 55'), ('Mighty Tiger 44') on conflict do nothing;

-- Racers that already renamed once (so they can rename again under the new name).
create table if not exists public.rename_players (player_id uuid primary key);
alter table public.rename_players enable row level security;

-- Nobody else can use these names.
insert into public.reserved_names (name) values ('Mighty Tiger 44') on conflict do nothing;

-- Change a racer's name, keeping their scores.
drop function if exists public.rename_player(uuid, text, text);
create or replace function public.rename_player(p_player uuid, p_old_name text, p_name text, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_owner(p_code) then raise exception 'not the owner'; end if;
  if not exists (select 1 from rename_players where player_id = p_player) then
    if not exists (select 1 from rename_names where lower(name) = lower(p_old_name)) then
      raise exception 'this racer cannot change name';
    end if;
    -- The old name must really be this racer's name on the board.
    if exists (select 1 from scores where player_id = p_player and lower(name) <> lower(p_old_name)) then
      raise exception 'name does not match';
    end if;
    insert into rename_players (player_id) values (p_player) on conflict do nothing;
  end if;
  if p_name !~ '^[A-Za-z0-9 _.!-]{1,20}$' then raise exception 'name not allowed'; end if;
  update scores set name = p_name where player_id = p_player;
end $$;

grant execute on function public.rename_player(uuid, text, text, text) to anon;
