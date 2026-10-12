/**
 * Biweekly cycle math + fair rotation assignment.
 *
 * Ported from the original static Chore Divider page. Each cycle is 14 days
 * and closes on the second weekend (Saturday–Sunday), which is when the
 * cleaning is meant to happen.
 */

// Anchor: Monday Oct 5, 2026 (local time). Cycle 0 runs Oct 5 → Oct 18, 2026,
// with its target weekend Oct 17–18.
const ANCHOR = new Date(2026, 9, 5);
ANCHOR.setHours(0, 0, 0, 0);

export const CORE_CHORES = [
  "Common space cleaning",
  "Kitchen",
  "Bathroom",
] as const;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** 0-based biweekly cycle index for a date, plus an optional offset. */
export function cycleIndexFor(date: Date, offset = 0): number {
  const today = startOfDay(date);
  const days = Math.floor((today.getTime() - ANCHOR.getTime()) / 86400000);
  return Math.floor(days / 14) + offset;
}

export function currentCycleIndex(): number {
  return cycleIndexFor(new Date(), 0);
}

export interface CycleDates {
  index: number;
  start: Date;
  sat: Date;
  sun: Date;
}

/** Monday start + target weekend (Sat/Sun) for a cycle index. */
export function cycleDates(index: number): CycleDates {
  const start = addDays(ANCHOR, index * 14);
  return { index, start, sat: addDays(start, 12), sun: addDays(start, 13) };
}

/**
 * Fair rotation assignment, ported 1:1 from the original page.
 *
 * `chorePosition` is the chore's 0-based position in the rotation order
 * (core chores are positions 0–2, extras continue from 3).
 * `memberIds` must be in rotation order.
 *
 * Returns the assigned member id, or null when there are fewer than 3
 * members (the core three must always go to different people).
 */
export function assignChore(
  chorePosition: number,
  cycleIndex: number,
  memberIds: string[]
): string | null {
  if (memberIds.length < 3) return null;
  const n = memberIds.length;
  // Positive modulo so past cycles (negative indexes) still resolve cleanly.
  return memberIds[(((chorePosition + cycleIndex) % n) + n) % n];
}

/**
 * Resolves the final assignee taking accepted chore swaps into account.
 */
export function resolveEffectiveAssignee(
  chorePosition: number,
  cycleIndex: number,
  memberIds: string[],
  activeSwaps?: {
    choreId: string | null;
    choreName?: string;
    cycleIndex: number;
    targetUserId: string;
    status: string;
  }[],
  choreId?: string | null,
  choreName?: string
): { userId: string | null; isSwapped: boolean } {
  const naturalAssignee = assignChore(chorePosition, cycleIndex, memberIds);
  if (!naturalAssignee) return { userId: null, isSwapped: false };

  if (activeSwaps && activeSwaps.length > 0) {
    const swap = activeSwaps.find(
      (s) =>
        s.status === "accepted" &&
        s.cycleIndex === cycleIndex &&
        ((choreId && s.choreId === choreId) || (choreName && s.choreName === choreName))
    );
    if (swap) {
      return { userId: swap.targetUserId, isSwapped: true };
    }
  }

  return { userId: naturalAssignee, isSwapped: false };
}

/** Short date like "Oct 17". */
export function fmtShort(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Like "Oct 17, 2026". */
export function fmtLong(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format date as YYYY-MM-DD */
export function fmtIsoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Initials for the avatar circle, e.g. "Aisha Khan" → "AK". */
export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  );
}

/** Check if a member has a scheduled leave during a cycle weekend. */
export function isMemberAway(
  userId: string | null,
  cycleSat: Date,
  cycleSun: Date,
  leaves: { user_id: string; start_date: string; end_date: string; reason?: string }[]
): { isAway: boolean; reason: string } {
  if (!userId || !leaves || leaves.length === 0) return { isAway: false, reason: "" };

  const satStr = fmtIsoDate(cycleSat);
  const sunStr = fmtIsoDate(cycleSun);

  const activeLeave = leaves.find(
    (l) => l.user_id === userId && l.start_date <= sunStr && l.end_date >= satStr
  );

  if (activeLeave) {
    return { isAway: true, reason: activeLeave.reason || "Away" };
  }

  return { isAway: false, reason: "" };
}
