import {
  assignChore,
  currentCycleIndex,
  cycleDates,
  fmtShort,
} from "@/lib/cycles";
import type { Chore, HouseholdMember } from "@/lib/types";

export default function FairnessPreview({
  chores,
  members,
}: {
  chores: Chore[];
  members: HouseholdMember[];
}) {
  const core = chores
    .filter((c) => c.kind === "core")
    .sort((a, b) => a.position - b.position);
  const memberIds = members.map((m) => m.user_id);
  const nameOf = (userId: string | null) =>
    members.find((m) => m.user_id === userId)?.profile?.display_name?.trim() ||
    "—";

  if (members.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold tracking-tight">Fairness preview</h2>
        <p className="mt-0.5 text-sm text-muted">The next three biweekly rounds.</p>
        <div className="mt-4 rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          Assignments appear after you add the household.
        </div>
      </div>
    );
  }

  const now = currentCycleIndex();

  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight">Fairness preview</h2>
      <p className="mt-0.5 text-sm text-muted">The next three biweekly rounds.</p>
      <div className="mt-4">
        {[0, 1, 2].map((step) => {
          const d = cycleDates(now + step);
          return (
            <div
              key={step}
              className="grid grid-cols-[92px_repeat(3,minmax(0,1fr))] items-center gap-2 border-t border-line py-2.5 text-sm first:border-t-0"
            >
              <strong className="font-mono text-xs text-muted">
                {fmtShort(d.sat)}–{fmtShort(d.sun)}
              </strong>
              {core.map((c) => (
                <div
                  key={c.id}
                  className="truncate rounded-lg bg-surface2 px-2.5 py-2"
                  title={`${c.name}: ${nameOf(assignChore(c.position, now + step, memberIds))}`}
                >
                  {nameOf(assignChore(c.position, now + step, memberIds))}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl bg-infolt p-4 text-sm">
        <strong>Built-in fairness:</strong> nobody gets two core chores in one
        cycle; across the rotation, each person moves through every core chore.
        Extra chores continue from the same queue.
      </div>
    </div>
  );
}
