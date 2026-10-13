create schema if not exists nanba_private;
revoke all on schema nanba_private from public;
grant usage on schema nanba_private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  slot smallint not null unique check (slot in (1,2)),
  username text not null check (username ~ '^[a-z0-9_.-]{2,50}$'),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  avatar_path text,
  status_text text not null default 'Available' check (char_length(status_text) <= 160),
  last_seen timestamptz,
  preferences jsonb not null default '{"read_receipts":true,"last_seen":true,"notification_preview":true,"notifications":true}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_username_lower on public.profiles(lower(username));
alter table public.profiles enable row level security;

-- This internal authorization helper deliberately bypasses profile RLS to avoid
-- recursive policies. It never returns another user's data and requires auth.uid().
create function nanba_private.approved() returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid());
$$;
revoke all on function nanba_private.approved() from public;
grant execute on function nanba_private.approved() to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (nanba_private.approved());
create policy profiles_own_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,avatar_path,status_text,last_seen,preferences) on public.profiles to authenticated;

create function nanba_private.touch_profile() returns trigger language plpgsql set search_path='' as $$
begin
  if new.id is distinct from old.id or new.slot is distinct from old.slot or new.username is distinct from old.username or new.created_at is distinct from old.created_at then
    raise exception 'Profile identity cannot change';
  end if;
  new.updated_at=now();
  return new;
end $$;
create trigger profile_identity before update on public.profiles for each row execute function nanba_private.touch_profile();

-- Provision only the two existing user-created identities. Passwords stay in Auth.
insert into public.profiles(id,slot,username,display_name)
select id,case email when 'karupu@nanba.internal' then 1 else 2 end,
split_part(email,'@',1),case email when 'karupu@nanba.internal' then 'Karupu' else 'Sai' end
from auth.users where email in ('karupu@nanba.internal','sai@nanba.internal');
