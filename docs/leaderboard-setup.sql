-- Turbo Ascend leaderboard: run this once in Supabase → SQL Editor → New query → Run.
-- It makes one table and four small functions. Players can only change scores
-- through the functions (never the table directly), and only the game's own
-- random names ("Speedy Meteor 98") are accepted.

create table if not exists public.scores (
  player_id uuid not null,
  period text not null,                 -- 'day:2026-11-08' or 'week:2026-W45' (UTC)
  name text not null check (char_length(name) between 1 and 30),
  points integer not null default 0 check (points >= 0),
  updated_at timestamptz not null default now(),
  primary key (player_id, period)
);
create index if not exists scores_period_points on public.scores (period, points desc);

-- Lock the table: no direct reads or writes from the game.
alter table public.scores enable row level security;

-- Today's / this week's key, worked out by the server (so clocks can't cheat).
create or replace function public.period_key(kind text)
returns text language sql stable as $$
  select case when kind = 'week'
    then 'week:' || to_char(now() at time zone 'utc', 'IYYY-"W"IW')
    else 'day:' || to_char(now() at time zone 'utc', 'YYYY-MM-DD') end
$$;

-- Add points from a run to today's and this week's totals.
create or replace function public.add_score(p_player uuid, p_name text, p_points integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_points < 1 or p_points > 20000 then raise exception 'points out of range'; end if;
  if p_name !~ '^[A-Za-z]+ [A-Za-z]+ [0-9]{1,2}$' then raise exception 'not a game name'; end if;
  insert into scores (player_id, period, name, points) values
    (p_player, period_key('day'), p_name, p_points),
    (p_player, period_key('week'), p_name, p_points)
  on conflict (player_id, period) do update
    set points = scores.points + excluded.points, name = excluded.name, updated_at = now();
end $$;

-- Starting a new game: remove the old racer's scores.
create or replace function public.forget_player(p_player uuid)
returns void language sql security definer set search_path = public as $$
  delete from scores where player_id = p_player;
$$;

-- Top 20 for 'day' or 'week', plus your own position.
create or replace function public.leaderboard(p_kind text, p_player uuid)
returns json language sql stable security definer set search_path = public as $$
  with board as (
    select player_id, name, points,
           rank() over (order by points desc, updated_at asc) as pos
    from scores where period = period_key(p_kind)
  )
  select json_build_object(
    'top', coalesce((
      select json_agg(json_build_object('pos', pos, 'name', name, 'points', points, 'me', player_id = p_player) order by pos)
      from (select * from board order by pos limit 20) t), '[]'::json),
    'me', (select json_build_object('pos', pos, 'name', name, 'points', points) from board where player_id = p_player),
    'total', (select count(*) from board)
  )
$$;

grant execute on function public.add_score(uuid, text, integer) to anon;
grant execute on function public.forget_player(uuid) to anon;
grant execute on function public.leaderboard(text, uuid) to anon;
