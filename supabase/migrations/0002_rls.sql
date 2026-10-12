-- Row Level Security: members can read/write their own household's rows only.
-- Run after 0001_schema.sql.

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.chores enable row level security;
alter table public.checklist_items enable row level security;
alter table public.special_cycles enable row level security;
alter table public.special_cycle_chores enable row level security;
alter table public.completions enable row level security;

-- ---------------------------------------------------------------- profiles
-- Readable by self + anyone sharing a household with you (names on the board).
create policy "profiles readable by household peers"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.household_members m1
      join public.household_members m2 on m1.household_id = m2.household_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );
create policy "users insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());
create policy "users update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- --------------------------------------------------------------- households
-- Created only via the create_household() RPC (no direct insert policy).
create policy "members read their households"
  on public.households for select
  using (public.is_household_member(id));
create policy "owners update their household"
  on public.households for update
  using (
    exists (
      select 1 from public.household_members
      where household_id = households.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );
create policy "owners delete their household"
  on public.households for delete
  using (
    exists (
      select 1 from public.household_members
      where household_id = households.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  );

-- -------------------------------------------------------- household_members
-- Membership rows are written only via RPCs (create_household,
-- join_household_via_invite); members can read/reorder/remove within their
-- own household.
create policy "members read household roster"
  on public.household_members for select
  using (public.is_household_member(household_id));
create policy "members update household roster"
  on public.household_members for update
  using (public.is_household_member(household_id));
create policy "members remove from household roster"
  on public.household_members for delete
  using (public.is_household_member(household_id));

-- -------------------------------------------------------- household_invites
create policy "members manage invites"
  on public.household_invites for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ------------------------------------------------------------------- chores
create policy "members manage chores"
  on public.chores for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ------------------------------------------------------------ checklist_items
create policy "members manage checklist items"
  on public.checklist_items for all
  using (
    exists (
      select 1 from public.chores c
      where c.id = checklist_items.chore_id
        and public.is_household_member(c.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.chores c
      where c.id = checklist_items.chore_id
        and public.is_household_member(c.household_id)
    )
  );

-- ------------------------------------------------------------ special_cycles
create policy "members manage special cycles"
  on public.special_cycles for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ------------------------------------------------------- special_cycle_chores
create policy "members manage special cycle chores"
  on public.special_cycle_chores for all
  using (
    exists (
      select 1 from public.special_cycles s
      where s.id = special_cycle_chores.special_cycle_id
        and public.is_household_member(s.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.special_cycles s
      where s.id = special_cycle_chores.special_cycle_id
        and public.is_household_member(s.household_id)
    )
  );

-- --------------------------------------------------------------- completions
create policy "members manage completions"
  on public.completions for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
