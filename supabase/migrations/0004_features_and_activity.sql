-- 0004_features_and_activity.sql
-- Production extensions: Chore swaps, Member leaves (vacation mode), Activity audit logs, and Notification preferences.

-- ---------------------------------------------------------------- chore_swaps
-- Allows a member to trade or cover a chore assignment for a specific cycle.
create table if not exists public.chore_swaps (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  chore_id uuid references public.chores(id) on delete cascade,
  chore_name text not null default '',
  cycle_index int not null,
  special_cycle_id uuid references public.special_cycles(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chore_swaps_lookup_idx 
  on public.chore_swaps(household_id, cycle_index, status);

-- --------------------------------------------------------------- member_leaves
-- Vacation / away periods where a housemate should be skipped or excused.
create table if not exists public.member_leaves (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists member_leaves_household_idx 
  on public.member_leaves(household_id, user_id);

-- -------------------------------------------------------------- activity_logs
-- Chronological audit trail of household events (completions, swaps, membership changes).
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_household_created_idx 
  on public.activity_logs(household_id, created_at desc);

-- ------------------------------------------------------ notification_settings
-- Webhook alerts (Discord, Slack) or automated schedule reminder configs.
create table if not exists public.notification_settings (
  household_id uuid primary key references public.households(id) on delete cascade,
  webhook_url text,
  webhook_enabled boolean not null default false,
  remind_days_before int not null default 1,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------- Enable RLS Policies
alter table public.chore_swaps enable row level security;
alter table public.member_leaves enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notification_settings enable row level security;

-- chore_swaps: Household members can view and manage swaps
create policy "members manage chore swaps"
  on public.chore_swaps for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- member_leaves: Household members can view and manage leave schedules
create policy "members manage member leaves"
  on public.member_leaves for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- activity_logs: Household members can read logs; write logs
create policy "members read activity logs"
  on public.activity_logs for select
  using (public.is_household_member(household_id));

create policy "members insert activity logs"
  on public.activity_logs for insert
  with check (public.is_household_member(household_id));

-- notification_settings: Household members can manage notifications
create policy "members manage notifications"
  on public.notification_settings for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ------------------------------------------------------- Realtime Publication
alter publication supabase_realtime add table public.chore_swaps;
alter publication supabase_realtime add table public.member_leaves;
alter publication supabase_realtime add table public.activity_logs;
