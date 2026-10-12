"use client";

import { useRouter } from "next/navigation";
import { initials } from "@/lib/cycles";
import { createClient } from "@/lib/supabase/client";
import type { HouseholdMember } from "@/lib/types";

export default function MembersPanel({
  householdId,
  userId,
  members,
  onChanged,
  onInvite,
}: {
  householdId: string;
  userId: string;
  members: HouseholdMember[];
  onChanged: () => void;
  onInvite: () => void;
}) {
  const router = useRouter();

  async function moveDown(index: number) {
    if (members.length < 2) return;
    const supabase = createClient();
    const a = members[index];
    const b = members[(index + 1) % members.length];
    await supabase.from("household_members").update({ position: b.position }).eq("id", a.id);
    await supabase.from("household_members").update({ position: a.position }).eq("id", b.id);
    onChanged();
  }

  async function removeMember(member: HouseholdMember) {
    if (!confirm(`Remove ${member.profile?.display_name || "this member"} from the rotation?`)) return;
    const supabase = createClient();
    await supabase.from("household_members").delete().eq("id", member.id);
    if (member.user_id === userId) {
      router.push("/households");
      return;
    }
    onChanged();
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Household</h2>
          <p className="mt-0.5 text-sm text-muted">
            Everyone below shares the same live board.
          </p>
        </div>
        <button
          onClick={onInvite}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
        >
          + Invite
        </button>
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No one is in the rotation yet.
        </div>
      ) : (
        <div className="grid gap-2">
          {members.map((m, i) => {
            const name = m.profile?.display_name?.trim() || "Housemate";
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 border-t border-line pt-3 first:border-t-0 first:pt-0"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-infolt font-bold text-info">
                  {initials(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {name}
                    {m.user_id === userId && (
                      <span className="ml-2 text-xs font-normal text-muted">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    Rotation position {i + 1}
                    {m.role === "owner" ? " · Owner" : ""}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => moveDown(i)}
                    aria-label={`Move ${name} later in rotation`}
                    title="Move later in rotation"
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm hover:border-ink"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeMember(m)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-danger hover:border-danger"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-muted">
        Rotation order decides who gets which chore — use ↓ to shift someone
        later in the queue.
      </p>
    </div>
  );
}
