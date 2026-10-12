-- Enable Supabase Realtime on household-scoped tables so every member's
-- board updates live. Run after 0002_rls.sql.
-- (Realtime honors RLS: users only receive rows they can read.)

alter publication supabase_realtime add table public.households;
alter publication supabase_realtime add table public.household_members;
alter publication supabase_realtime add table public.household_invites;
alter publication supabase_realtime add table public.chores;
alter publication supabase_realtime add table public.checklist_items;
alter publication supabase_realtime add table public.special_cycles;
alter publication supabase_realtime add table public.special_cycle_chores;
alter publication supabase_realtime add table public.completions;
