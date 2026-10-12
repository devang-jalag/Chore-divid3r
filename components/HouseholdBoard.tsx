"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  assignChore,
  currentCycleIndex,
  cycleDates,
  fmtLong,
  fmtShort,
} from "@/lib/cycles";
import type {
  ChecklistItem,
  Chore,
  Completion,
  HouseholdMember,
  SpecialCycle,
} from "@/lib/types";
import ChoreCard, { type CardChecklistItem } from "./ChoreCard";
import ChecklistEditor from "./ChecklistEditor";
import MembersPanel from "./MembersPanel";
import InviteDialog from "./InviteDialog";
import SpecialCyclesPanel from "./SpecialCyclesPanel";
import ExtrasPanel from "./ExtrasPanel";
import FairnessPreview from "./FairnessPreview";
import SignOutButton from "./SignOutButton";

/**
 * Completions belonging to special cycles always use cycle_index 0;
 * uniqueness comes from special_cycle_id (+ chore).
 */
const SPECIAL_CYCLE_INDEX = 0;

export default function HouseholdBoard({
  householdId,
  householdName,
  userId,
  initialMembers,
  initialChores,
  initialItems,
  initialSpecials,
}: {
  householdId: string;
  householdName: string;
  userId: string;
  isOwner: boolean;
  initialMembers: HouseholdMember[];
  initialChores: Chore[];
  initialItems: ChecklistItem[];
  initialSpecials: SpecialCycle[];
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [chores, setChores] = useState(initialChores);
  const [items, setItems] = useState(initialItems);
  const [specials, setSpecials] = useState(initialSpecials);
  const [completions, setCompletions] = useState<Completion[]>([]);

  const [cycleOffset, setCycleOffset] = useState(0);
  const [view, setView] = useState<"regular" | "special">("regular");
  const [specialId, setSpecialId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<{
    choreId: string;
    choreName: string;
  } | null>(null);

  const viewCycleIndex = currentCycleIndex() + cycleOffset;
  const stateRef = useRef({ view, cycleOffset, specialId });
  stateRef.current = { view, cycleOffset, specialId };

  const memberIds = members.map((m) => m.user_id);
  const memberName = (userId: string | null) =>
    members.find((m) => m.user_id === userId)?.profile?.display_name?.trim() ||
    null;

  // ---------- data loading ----------

  const refreshAll = useCallback(async () => {
    const supabase = createClient();

    const { data: memberRows } = await supabase
      .from("household_members")
      .select(
        "id, household_id, user_id, role, position, joined_at, profiles(id, display_name)"
      )
      .eq("household_id", householdId)
      .order("position", { ascending: true });
    const mapped: HouseholdMember[] = ((memberRows ?? []) as any[]).map(
      (m) => ({
        id: m.id,
        household_id: m.household_id,
        user_id: m.user_id,
        role: m.role,
        position: m.position,
        joined_at: m.joined_at,
        profile: m.profiles ?? null,
      })
    );
    if (!mapped.some((m) => m.user_id === userId)) {
      router.push("/households"); // removed from household
      return;
    }
    setMembers(mapped);

    const { data: choreRows } = await supabase
      .from("chores")
      .select("id, household_id, name, kind, position")
      .eq("household_id", householdId)
      .order("position", { ascending: true });
    const choreList = (choreRows ?? []) as Chore[];
    setChores(choreList);

    const ids = choreList.map((c) => c.id);
    const { data: itemRows } = ids.length
      ? await supabase
          .from("checklist_items")
          .select("id, chore_id, text, position")
          .in("chore_id", ids)
          .order("position", { ascending: true })
      : { data: [] as ChecklistItem[] };
    setItems((itemRows ?? []) as ChecklistItem[]);

    const { data: specialRows } = await supabase
      .from("special_cycles")
      .select(
        "id, household_id, name, target_date, created_at, special_cycle_chores(id, special_cycle_id, chore_id, chore_name, position, manual_assignee)"
      )
      .eq("household_id", householdId)
      .order("created_at", { ascending: true });
    setSpecials(
      ((specialRows ?? []) as any[]).map((s) => ({
        id: s.id,
        household_id: s.household_id,
        name: s.name,
        target_date: s.target_date,
        created_at: s.created_at,
        chores: ((s.special_cycle_chores ?? []) as any[])
          .slice()
          .sort((a, b) => a.position - b.position),
      }))
    );
  }, [householdId, router, userId]);

  const refreshCompletions = useCallback(async () => {
    const { view: v, cycleOffset: off, specialId: sid } = stateRef.current;
    const supabase = createClient();
    let query = supabase
      .from("completions")
      .select(
        "id, household_id, kind, cycle_index, special_cycle_id, chore_id, chore_name, checklist_item_id, done_by, done_at"
      )
      .eq("household_id", householdId);
    if (v === "regular") {
      query = query
        .eq("cycle_index", currentCycleIndex() + off)
        .is("special_cycle_id", null);
    } else if (sid) {
      query = query.eq("special_cycle_id", sid);
    } else {
      setCompletions([]);
      return;
    }
    const { data } = await query;
    setCompletions((data ?? []) as Completion[]);
  }, [householdId]);

  // Reload completions when the viewed cycle/special changes.
  useEffect(() => {
    refreshCompletions();
  }, [view, cycleOffset, specialId, refreshCompletions]);

  // ---------- realtime ----------

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefreshRef = useRef(() => {});
  scheduleRefreshRef.current = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refreshAll();
      refreshCompletions();
    }, 500);
  };

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`household-${householdId}`);
    const subs: { table: string; filter?: string }[] = [
      { table: "household_members", filter: `household_id=eq.${householdId}` },
      { table: "households", filter: `id=eq.${householdId}` },
      { table: "chores", filter: `household_id=eq.${householdId}` },
      { table: "checklist_items" }, // no household_id; refresh is cheap
      { table: "special_cycles", filter: `household_id=eq.${householdId}` },
      { table: "special_cycle_chores" },
      { table: "completions", filter: `household_id=eq.${householdId}` },
      { table: "household_invites", filter: `household_id=eq.${householdId}` },
    ];
    subs.forEach(({ table, filter }) => {
      const config: {
        event: "*";
        schema: string;
        table: string;
        filter?: string;
      } = { event: "*", schema: "public", table };
      if (filter) config.filter = filter;
      channel.on("postgres_changes", config, () => scheduleRefreshRef.current());
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, refreshAll, refreshCompletions]);

  // ---------- mutations ----------

  async function toggleChore(opts: {
    cycleIndex: number;
    specialCycleId: string | null;
    choreId: string | null;
    choreName: string;
  }) {
    const supabase = createClient();
    const existing = completions.find(
      (c) =>
        c.kind === "chore" &&
        c.cycle_index === opts.cycleIndex &&
        (c.special_cycle_id ?? null) === (opts.specialCycleId ?? null) &&
        (opts.specialCycleId
          ? c.chore_name === opts.choreName
          : (c.chore_id ?? null) === (opts.choreId ?? null))
    );
    if (existing) {
      await supabase.from("completions").delete().eq("id", existing.id);
    } else {
      await supabase.from("completions").insert({
        household_id: householdId,
        kind: "chore",
        cycle_index: opts.cycleIndex,
        special_cycle_id: opts.specialCycleId,
        chore_id: opts.choreId,
        chore_name: opts.choreName,
        done_by: userId,
      });
    }
    refreshCompletions();
  }

  async function toggleItem(opts: {
    cycleIndex: number;
    specialCycleId: string | null;
    choreId: string | null;
    choreName: string;
    itemId: string;
    checked: boolean;
  }) {
    const supabase = createClient();
    const existing = completions.find(
      (c) =>
        c.kind === "checklist_item" &&
        c.cycle_index === opts.cycleIndex &&
        (c.special_cycle_id ?? null) === (opts.specialCycleId ?? null) &&
        (c.checklist_item_id ?? null) === opts.itemId
    );
    if (opts.checked && !existing) {
      await supabase.from("completions").insert({
        household_id: householdId,
        kind: "checklist_item",
        cycle_index: opts.cycleIndex,
        special_cycle_id: opts.specialCycleId,
        chore_id: opts.choreId,
        chore_name: opts.choreName,
        checklist_item_id: opts.itemId,
        done_by: userId,
      });
    } else if (!opts.checked && existing) {
      await supabase.from("completions").delete().eq("id", existing.id);
    }
    refreshCompletions();
  }

  // ---------- derived view model ----------

  const dates = cycleDates(viewCycleIndex);
  const activeSpecial =
    view === "special"
      ? specials.find((s) => s.id === specialId) ?? specials[0] ?? null
      : null;

  interface BoardChore {
    key: string;
    title: string;
    badge: string;
    assignee: string | null;
    done: boolean;
    items: CardChecklistItem[];
    checklistChoreId: string | null;
    onToggleDone: () => void;
    onToggleItem: (itemId: string, checked: boolean) => void;
  }

  let boardChores: BoardChore[] = [];
  let boardTitle = "";
  let boardSub = "";

  if (view === "special" && activeSpecial) {
    const seed =
      specials.indexOf(activeSpecial) + currentCycleIndex();
    boardTitle = activeSpecial.name;
    boardSub = `Target ${fmtLong(new Date(activeSpecial.target_date + "T12:00:00"))}`;
    boardChores = activeSpecial.chores.map((sc) => {
      const assigneeUserId =
        sc.manual_assignee ?? assignChore(sc.position, seed, memberIds);
      const choreItems = sc.chore_id
        ? items.filter((it) => it.chore_id === sc.chore_id)
        : [];
      return {
        key: sc.id,
        title: sc.chore_name,
        badge: sc.manual_assignee ? "MANUAL" : "SPECIAL",
        assignee: memberName(assigneeUserId),
        done: completions.some(
          (c) =>
            c.kind === "chore" &&
            c.special_cycle_id === activeSpecial.id &&
            c.chore_name === sc.chore_name
        ),
        items: choreItems.map((it) => ({
          id: it.id,
          text: it.text,
          checked: completions.some(
            (c) =>
              c.kind === "checklist_item" &&
              c.special_cycle_id === activeSpecial.id &&
              c.checklist_item_id === it.id
          ),
        })),
        checklistChoreId: sc.chore_id,
        onToggleDone: () =>
          toggleChore({
            cycleIndex: SPECIAL_CYCLE_INDEX,
            specialCycleId: activeSpecial.id,
            choreId: sc.chore_id,
            choreName: sc.chore_name,
          }),
        onToggleItem: (itemId, checked) =>
          toggleItem({
            cycleIndex: SPECIAL_CYCLE_INDEX,
            specialCycleId: activeSpecial.id,
            choreId: sc.chore_id,
            choreName: sc.chore_name,
            itemId,
            checked,
          }),
      };
    });
  } else {
    boardTitle =
      cycleOffset === 0
        ? "This cycle"
        : cycleOffset < 0
          ? "Previous cycle"
          : "Next cycle";
    boardSub = `Assignments for ${fmtShort(dates.sat)}–${fmtShort(dates.sun)}`;
    const ordered = chores.slice().sort((a, b) => a.position - b.position);
    boardChores = ordered.map((chore) => {
      const assigneeUserId = assignChore(chore.position, viewCycleIndex, memberIds);
      const choreItems = items.filter((it) => it.chore_id === chore.id);
      return {
        key: chore.id,
        title: chore.name,
        badge:
          chore.kind === "core"
            ? `CORE ${String(chore.position + 1).padStart(2, "0")}`
            : "EXTRA",
        assignee: memberName(assigneeUserId),
        done: completions.some(
          (c) =>
            c.kind === "chore" &&
            c.cycle_index === viewCycleIndex &&
            !c.special_cycle_id &&
            c.chore_id === chore.id
        ),
        items: choreItems.map((it) => ({
          id: it.id,
          text: it.text,
          checked: completions.some(
            (c) =>
              c.kind === "checklist_item" &&
              c.cycle_index === viewCycleIndex &&
              !c.special_cycle_id &&
              c.checklist_item_id === it.id
          ),
        })),
        checklistChoreId: chore.id,
        onToggleDone: () =>
          toggleChore({
            cycleIndex: viewCycleIndex,
            specialCycleId: null,
            choreId: chore.id,
            choreName: chore.name,
          }),
        onToggleItem: (itemId, checked) =>
          toggleItem({
            cycleIndex: viewCycleIndex,
            specialCycleId: null,
            choreId: chore.id,
            choreName: chore.name,
            itemId,
            checked,
          }),
      };
    });
  }

  function viewSpecial(id: string) {
    setView("special");
    setSpecialId(id);
    document.getElementById("board")?.scrollIntoView({ behavior: "smooth" });
  }

  // ---------- render ----------

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-6">
      {/* top bar */}
      <div className="mb-6 flex items-center justify-between gap-4 text-sm text-muted">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 rounded-full bg-pine" />
          <Link href="/households" className="hover:text-ink">
            ← Households
          </Link>
          <strong className="text-ink">{householdName}</strong>
        </div>
        <SignOutButton />
      </div>

      {/* hero */}
      <section className="grid gap-4 md:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-3xl border border-line bg-surface p-8 shadow-soft">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pine">
            {cycleOffset === 0
              ? "Current biweekly cycle"
              : cycleOffset < 0
                ? "Past cycle"
                : "Upcoming cycle"}{" "}
            · {fmtShort(dates.start)} — {fmtLong(dates.sun)}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-[0.95] tracking-tight sm:text-5xl">
            Three chores.
            <br />
            One fair rotation.
          </h1>
          <p className="mt-4 max-w-xl text-muted">
            Common spaces, kitchen, and bathroom move to a different person
            every two weeks. Extra jobs join the rotation without upsetting the
            core three. Everyone here sees this board live.
          </p>
        </div>
        <aside className="flex min-h-[220px] flex-col justify-between rounded-3xl bg-ink p-6 text-bg">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] opacity-70">
              Target cleaning weekend
            </p>
            <p className="mt-4 text-3xl font-bold leading-tight tracking-tight">
              {fmtShort(dates.sat)}
              <br />— {fmtShort(dates.sun)}
            </p>
            <p className="mt-2 text-sm opacity-70">
              Finish by Sunday evening ·{" "}
              {dates.sun.toLocaleDateString(undefined, { weekday: "long" })}
            </p>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setCycleOffset((o) => o - 1)}
              className="flex-1 rounded-full border border-current px-3 py-2.5 text-sm font-semibold"
            >
              ← Prev
            </button>
            <button
              onClick={() => {
                setCycleOffset(0);
                setView("regular");
              }}
              className="flex-1 rounded-full border border-current px-3 py-2.5 text-sm font-semibold"
            >
              Today
            </button>
            <button
              onClick={() => setCycleOffset((o) => o + 1)}
              className="flex-1 rounded-full border border-current px-3 py-2.5 text-sm font-semibold"
            >
              Next →
            </button>
          </div>
        </aside>
      </section>

      {members.length < 3 && (
        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-amberx/60 bg-amberlt p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong className="block">Add at least three people to start the rotation</strong>
            <span className="text-sm text-muted">
              The three core chores always go to different people. Invite
              housemates with a link — they join instantly.
            </span>
          </div>
          <button
            onClick={() => setInviteOpen(true)}
            className="shrink-0 rounded-full bg-pine px-6 py-3 font-semibold text-white hover:opacity-90"
          >
            Invite housemates
          </button>
        </div>
      )}

      {/* board */}
      <section id="board" className="mt-10 scroll-mt-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{boardTitle}</h2>
            <p className="mt-0.5 text-sm text-muted">{boardSub}</p>
          </div>
          <div className="flex gap-1 rounded-full bg-surface2 p-1">
            {(["regular", "special"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setView(t)}
                aria-selected={view === t}
                className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                  view === t ? "bg-surface text-ink shadow" : "text-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {view === "special" && !activeSpecial ? (
          <div className="rounded-2xl border border-dashed border-line p-10 text-center">
            <p className="font-semibold">No special cycle yet.</p>
            <p className="mt-1 text-sm text-muted">
              Create a one-off clean for a holiday, move, or gathering.
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {boardChores.map((c) => (
              <ChoreCard
                key={c.key}
                title={c.title}
                badge={c.badge}
                assigneeName={c.assignee}
                done={c.done}
                statusText={c.done ? "Completed" : "Assigned this round"}
                items={c.items}
                onToggleDone={c.onToggleDone}
                onToggleItem={c.onToggleItem}
                onEditChecklist={
                  c.checklistChoreId
                    ? () =>
                        setEditingChecklist({
                          choreId: c.checklistChoreId as string,
                          choreName: c.title,
                        })
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* household + fairness */}
      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-6">
          <MembersPanel
            householdId={householdId}
            userId={userId}
            members={members}
            onChanged={refreshAll}
            onInvite={() => setInviteOpen(true)}
          />
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6">
          <FairnessPreview chores={chores} members={members} />
        </div>
      </section>

      {/* specials + extras */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-6">
          <SpecialCyclesPanel
            householdId={householdId}
            chores={chores}
            members={members}
            specials={specials}
            onChanged={() => {
              refreshAll();
              refreshCompletions();
            }}
            onView={viewSpecial}
          />
        </div>
        <div className="rounded-3xl border border-line bg-surface p-6">
          <ExtrasPanel
            householdId={householdId}
            chores={chores}
            onChanged={refreshAll}
          />
        </div>
      </section>

      <p className="mt-8 text-center text-sm text-muted">
        Changes sync live to every member of “{householdName}”. Invite links
        live under <strong>+ Invite</strong> in the Household panel.
      </p>

      {inviteOpen && (
        <InviteDialog
          householdId={householdId}
          householdName={householdName}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {editingChecklist && (
        <ChecklistEditor
          choreId={editingChecklist.choreId}
          choreName={editingChecklist.choreName}
          items={items.filter((i) => i.chore_id === editingChecklist.choreId)}
          onClose={() => setEditingChecklist(null)}
          onSaved={refreshAll}
        />
      )}
    </main>
  );
}
