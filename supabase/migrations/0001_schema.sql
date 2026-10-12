-- Chore Divider schema: multi-tenant households with fair chore rotation.
-- Run in order: 0001_schema.sql, 0002_rls.sql, 0003_realtime.sql.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles
-- One row per auth user; display name shown to housemates.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- households
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------ household_members
-- Rotation order is `position` (0-based). Members are auth users.
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  position int not null default 0,
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);
create index household_members_household_idx on public.household_members(household_id);
create index household_members_user_idx on public.household_members(user_id);

-- ------------------------------------------------------ household_invites
-- Shareable invite tokens, e.g. /join/<token>.
create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  max_uses int,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);
create index household_invites_household_idx on public.household_invites(household_id);

-- ----------------------------------------------------------------- chores
-- kind='core' rows are seeded on household creation (positions 0-2);
-- kind='extra' rows continue the rotation from position 3+.
create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  kind text not null default 'extra' check (kind in ('core','extra')),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index chores_household_idx on public.chores(household_id);

-- ---------------------------------------------------------- checklist_items
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  text text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index checklist_items_chore_idx on public.checklist_items(chore_id);

-- ---------------------------------------------------------- special_cycles
-- One-off events (Diwali deep-clean, move-out, guests…).
create table public.special_cycles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  target_date date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index special_cycles_household_idx on public.special_cycles(household_id);

-- ----------------------------------------------------- special_cycle_chores
-- Snapshot of the chores included in a special cycle. chore_id links back to
-- the live chore (so its checklist shows); chore_name is the frozen label.
create table public.special_cycle_chores (
  id uuid primary key default gen_random_uuid(),
  special_cycle_id uuid not null references public.special_cycles(id) on delete cascade,
  chore_id uuid references public.chores(id) on delete set null,
  chore_name text not null,
  position int not null default 0,
  manual_assignee uuid references auth.users(id) on delete set null
);
create index special_cycle_chores_special_idx on public.special_cycle_chores(special_cycle_id);

-- ------------------------------------------------------------- completions
-- One row per completed cell. Toggle = insert/delete.
-- Regular cycles: cycle_index = biweekly index, special_cycle_id IS NULL.
-- Special cycles: cycle_index = 0, special_cycle_id set.
create table public.completions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind text not null check (kind in ('chore','checklist_item')),
  cycle_index int not null,
  special_cycle_id uuid references public.special_cycles(id) on delete cascade,
  chore_id uuid references public.chores(id) on delete cascade,
  chore_name text not null default '',
  checklist_item_id uuid references public.checklist_items(id) on delete cascade,
  done_by uuid references auth.users(id) on delete set null,
  done_at timestamptz not null default now()
);
create index completions_household_idx on public.completions(household_id);
create index completions_lookup_idx on public.completions(household_id, cycle_index, special_cycle_id);
-- NULLs never conflict in a plain UNIQUE, so coalesce them for toggle safety.
create unique index completions_unique_cell on public.completions (
  household_id,
  kind,
  cycle_index,
  coalesce(special_cycle_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(chore_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(checklist_item_id, '00000000-0000-0000-0000-000000000000')
);

-- ---------------------------------------------------------------- helpers

-- Is the current user a member of this household? SECURITY DEFINER so it can
-- be used inside RLS policies without recursion issues.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create a household + owner membership + the three core chores, atomically.
create or replace function public.create_household(household_name text)
returns uuid
language plpgsql
security definer
as $$
declare hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if household_name is null or length(trim(household_name)) = 0 then
    raise exception 'household name is required';
  end if;

  insert into public.households (name, created_by)
  values (trim(household_name), auth.uid())
  returning id into hid;

  insert into public.household_members (household_id, user_id, role, position)
  values (hid, auth.uid(), 'owner', 0);

  insert into public.chores (household_id, name, kind, position) values
    (hid, 'Common space cleaning', 'core', 0),
    (hid, 'Kitchen',               'core', 1),
    (hid, 'Bathroom',              'core', 2);

  return hid;
end;
$$;

-- Public (token-based) invite lookup for the /join page. Reveals nothing
-- except the household name for a valid, unused, unexpired token.
create or replace function public.get_invite_info(invite_token text)
returns table (household_id uuid, household_name text, valid boolean)
language plpgsql
security definer
stable
as $$
declare inv record;
begin
  select * into inv from public.household_invites i where i.token = invite_token;
  if not found then
    return query select null::uuid, null::text, false;
    return;
  end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    return query select inv.household_id, null::text, false;
    return;
  end if;
  if inv.max_uses is not null and inv.used_count >= inv.max_uses then
    return query select inv.household_id, null::text, false;
    return;
  end if;
  return query select
    inv.household_id,
    (select h.name from public.households h where h.id = inv.household_id),
    true;
end;
$$;

-- Join a household via invite token. Idempotent for existing members.
create or replace function public.join_household_via_invite(invite_token text)
returns uuid
language plpgsql
security definer
as $$
declare inv record; hid uuid; pos int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into inv
  from public.household_invites i
  where i.token = invite_token
  for update;

  if not found then raise exception 'invite not found'; end if;
  if inv.expires_at is not null and inv.expires_at < now() then
    raise exception 'invite expired';
  end if;
  if inv.max_uses is not null and inv.used_count >= inv.max_uses then
    raise exception 'invite has been fully used';
  end if;

  hid := inv.household_id;

  if exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  ) then
    return hid; -- already a member
  end if;

  select coalesce(max(position), -1) + 1 into pos
  from public.household_members where household_id = hid;

  insert into public.household_members (household_id, user_id, role, position)
  values (hid, auth.uid(), 'member', pos);

  update public.household_invites
  set used_count = used_count + 1
  where id = inv.id;

  return hid;
end;
$$;

-- RPCs must be callable by anon (invite lookup) and authenticated users.
grant execute on function public.is_household_member(uuid) to anon, authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.get_invite_info(text) to anon, authenticated;
grant execute on function public.join_household_via_invite(text) to authenticated;
