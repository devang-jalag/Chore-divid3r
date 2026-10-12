import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HouseholdBoard from "@/components/HouseholdBoard";
import type {
  Chore,
  ChecklistItem,
  HouseholdMember,
  SpecialCycle,
} from "@/lib/types";

export default async function HouseholdPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const householdId = params.id;

  // Membership gate: only members may see this household.
  const { data: membership } = await supabase
    .from("household_members")
    .select("id, role")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) redirect("/households");

  const { data: household } = await supabase
    .from("households")
    .select("id, name, created_at")
    .eq("id", householdId)
    .single();
  if (!household) notFound();

  const { data: memberRows } = await supabase
    .from("household_members")
    .select("id, household_id, user_id, role, position, joined_at, profiles(id, display_name)")
    .eq("household_id", householdId)
    .order("position", { ascending: true });

  const { data: choreRows } = await supabase
    .from("chores")
    .select("id, household_id, name, kind, position")
    .eq("household_id", householdId)
    .order("position", { ascending: true });

  const choreIds = (choreRows ?? []).map((c: Chore) => c.id);
  const { data: itemRows } = choreIds.length
    ? await supabase
        .from("checklist_items")
        .select("id, chore_id, text, position")
        .in("chore_id", choreIds)
        .order("position", { ascending: true })
    : { data: [] as ChecklistItem[] };

  const { data: specialRows } = await supabase
    .from("special_cycles")
    .select(
      "id, household_id, name, target_date, created_at, special_cycle_chores(id, special_cycle_id, chore_id, chore_name, position, manual_assignee)"
    )
    .eq("household_id", householdId)
    .order("created_at", { ascending: true });

  const members: HouseholdMember[] = (memberRows ?? []).map((m: any) => ({
    id: m.id,
    household_id: m.household_id,
    user_id: m.user_id,
    role: m.role,
    position: m.position,
    joined_at: m.joined_at,
    profile: m.profiles ?? null,
  }));

  const specials: SpecialCycle[] = (specialRows ?? []).map((s: any) => ({
    id: s.id,
    household_id: s.household_id,
    name: s.name,
    target_date: s.target_date,
    created_at: s.created_at,
    chores: (s.special_cycle_chores ?? [])
      .slice()
      .sort((a: any, b: any) => a.position - b.position),
  }));

  return (
    <HouseholdBoard
      householdId={householdId}
      householdName={household.name}
      userId={user.id}
      isOwner={membership.role === "owner"}
      initialMembers={members}
      initialChores={(choreRows ?? []) as Chore[]}
      initialItems={(itemRows ?? []) as ChecklistItem[]}
      initialSpecials={specials}
    />
  );
}
