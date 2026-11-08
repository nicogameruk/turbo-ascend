-- Turbo Ascend: let ONLY the owner use a typed name on the leaderboard,
-- and reserve the owner's names (like "Frosty Hamster 55") so nobody else can use them.
-- Run once in Supabase → SQL Editor → New query → Run.
--
-- 1. Replace CHANGE-ME-TO-YOUR-SECRET-CODE below with your own secret code
--    (long and hard to guess, e.g. 4+ random words). Keep it private.
-- 2. Run the whole script.
-- Only a scrambled fingerprint (hash) of the code is stored, not the code itself.
-- To change the code later, edit it below and run the script again.

create table if not exists public.owner_code (
  id integer primary key default 1 check (id = 1),
  code_hash text not null
);
alter table public.owner_code enable row level security; -- nobody can read it directly

insert into public.owner_code (id, code_hash)
values (1, encode(sha256(convert_to('CHANGE-ME-TO-YOUR-SECRET-CODE', 'UTF8')), 'hex'))
on conflict (id) do update set code_hash = excluded.code_hash;

-- Names only the owner may use (even though they look like random game names).
create table if not exists public.reserved_names (name text primary key);
alter table public.reserved_names enable row level security;
insert into public.reserved_names (name) values ('Frosty Hamster 55') on conflict do nothing;

-- Is this the owner's code?
create or replace function public.check_owner(p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select p_code is not null and char_length(p_code) >= 8 and exists (
    select 1 from owner_code where code_hash = encode(sha256(convert_to(p_code, 'UTF8')), 'hex')
  )
$$;

-- add_score now also takes the owner code. Random game names work as before;
-- any other name is only accepted with the right code.
drop function if exists public.add_score(uuid, text, integer);
create or replace function public.add_score(p_player uuid, p_name text, p_points integer, p_code text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_points < 1 or p_points > 20000 then raise exception 'points out of range'; end if;
  if exists (select 1 from reserved_names r where lower(r.name) = lower(p_name)) and not check_owner(p_code) then
    raise exception 'name reserved';
  end if;
  if p_name !~ '^[A-Za-z]+ [A-Za-z]+ [0-9]{1,2}$' then
    if not check_owner(p_code) then raise exception 'not a game name'; end if;
    if p_name !~ '^[A-Za-z0-9 _.!-]{1,20}$' then raise exception 'name not allowed'; end if;
  end if;
  insert into scores (player_id, period, name, points) values
    (p_player, period_key('day'), p_name, p_points),
    (p_player, period_key('week'), p_name, p_points)
  on conflict (player_id, period) do update
    set points = scores.points + excluded.points, name = excluded.name, updated_at = now();
end $$;

-- Owner only: change your name, keeping your scores.
create or replace function public.rename_player(p_player uuid, p_name text, p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not check_owner(p_code) then raise exception 'not the owner'; end if;
  if p_name !~ '^[A-Za-z0-9 _.!-]{1,20}$' then raise exception 'name not allowed'; end if;
  update scores set name = p_name, updated_at = updated_at where player_id = p_player;
end $$;

grant execute on function public.check_owner(text) to anon;
grant execute on function public.rename_player(uuid, text, text) to anon;
grant execute on function public.add_score(uuid, text, integer, text) to anon;
