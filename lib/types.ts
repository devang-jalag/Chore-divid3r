/** Database row types (mirrors supabase/migrations). */

export interface Profile {
  id: string;
  display_name: string;
}

export interface Household {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
}

export type MemberRole = "owner" | "member";

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: MemberRole;
  position: number;
  joined_at: string;
  profile: Profile | null;
}

export type ChoreKind = "core" | "extra";

export interface Chore {
  id: string;
  household_id: string;
  name: string;
  kind: ChoreKind;
  position: number;
}

export interface ChecklistItem {
  id: string;
  chore_id: string;
  text: string;
  position: number;
}

export interface SpecialCycle {
  id: string;
  household_id: string;
  name: string;
  target_date: string; // YYYY-MM-DD
  created_at: string;
  chores: SpecialCycleChore[];
}

export interface SpecialCycleChore {
  id: string;
  special_cycle_id: string;
  chore_id: string | null;
  chore_name: string;
  position: number;
  /** Optional manual assignee (auth user id). Null = use fair rotation. */
  manual_assignee: string | null;
}

export type CompletionKind = "chore" | "checklist_item";

export interface Completion {
  id: string;
  household_id: string;
  kind: CompletionKind;
  cycle_index: number;
  special_cycle_id: string | null;
  chore_id: string | null;
  chore_name: string;
  checklist_item_id: string | null;
  done_by: string | null;
  done_at: string;
}

export interface InviteInfo {
  household_id: string;
  household_name: string;
  valid: boolean;
}

export type SwapStatus = "pending" | "accepted" | "rejected" | "cancelled";

export interface ChoreSwap {
  id: string;
  household_id: string;
  chore_id: string | null;
  chore_name: string;
  cycle_index: number;
  special_cycle_id: string | null;
  requester_id: string;
  target_user_id: string;
  status: SwapStatus;
  created_at: string;
  updated_at: string;
}

export interface MemberLeave {
  id: string;
  household_id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  household_id: string;
  actor_id: string | null;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
  profile?: Profile | null;
}

export interface NotificationSettings {
  household_id: string;
  webhook_url: string | null;
  webhook_enabled: boolean;
  remind_days_before: number;
  updated_at: string;
}
