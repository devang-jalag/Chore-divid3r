"use client";

import { useState } from "react";
import Modal from "./Modal";
import { fmtLong } from "@/lib/cycles";
import { createClient } from "@/lib/supabase/client";
import type { Chore, HouseholdMember, SpecialCycle } from "@/lib/types";

export default function SpecialCyclesPanel({
  householdId,
  chores,
  members,
  specials,
  onChanged,
  onView,
}: {
  householdId: string;
  chores: Chore[];
  members: HouseholdMember[];
  specials: SpecialCycle[];
  onChanged: () => void;
  onView: (id: string) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  async function removeSpecial(id: string) {
    if (!confirm("Delete this special cycle?")) return;
    const supabase = createClient();
    await supabase.from("special_cycles").delete().eq("id", id);
    onChanged();
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Special cycles</h2>
          <p className="mt-0.5 text-sm text-muted">
            Diwali deep-clean, move-out, guests — pick only what matters.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
        >
          + Special cycle
        </button>
      </div>

      {specials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No one-off cycles planned.
        </div>
      ) : (
        <div className="grid gap-2">
          {specials.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface2 p-3.5"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{s.name}</p>
                <p className="text-xs text-muted">
                  {fmtLong(new Date(s.target_date + "T12:00:00"))} ·{" "}
                  {s.chores.length} chore{s.chores.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => onView(s.id)}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold hover:border-ink"
                >
                  View
                </button>
                <button
                  onClick={() => removeSpecial(s.id)}
                  className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-danger hover:border-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <CreateSpecialDialog
          householdId={householdId}
          chores={chores}
          members={members}
          onClose={() => setDialogOpen(false)}
          onCreated={(id) => {
            setDialogOpen(false);
            onChanged();
            onView(id);
          }}
        />
      )}
    </div>
  );
}

function CreateSpecialDialog({
  householdId,
  chores,
  members,
  onClose,
  onCreated,
}: {
  householdId: string;
  chores: Chore[];
  members: HouseholdMember[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(chores.filter((c) => c.kind === "core").map((c) => [c.id, true]))
  );
  const [manual, setManual] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleChore(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function create() {
    const chosen = chores.filter((c) => selected[c.id]);
    if (!name.trim() || !date || chosen.length === 0) {
      setError("Give it a name, a date, and at least one chore.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    try {
      const { data: special, error: e1 } = await supabase
        .from("special_cycles")
        .insert({ household_id: householdId, name: name.trim(), target_date: date })
        .select("id")
        .single();
      if (e1) throw e1;
      const rows = chosen.map((c, i) => ({
        special_cycle_id: special.id,
        chore_id: c.id,
        chore_name: c.name,
        position: i,
        manual_assignee: manual[c.id] || null,
      }));
      const { error: e2 } = await supabase.from("special_cycle_chores").insert(rows);
      if (e2) throw e2;
      onCreated(special.id);
    } catch (e: any) {
      setError(e.message ?? "Could not create the special cycle.");
    }
    setSaving(false);
  }

  const memberName = (userId: string) =>
    members.find((m) => m.user_id === userId)?.profile?.display_name?.trim() || "Housemate";

  return (
    <Modal eyebrow="One-off plan" title="Create a special cycle" onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Occasion</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={42}
              placeholder="e.g. Diwali deep-clean"
              className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-pine"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Target date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-pine"
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold">Include chores</p>
          <div className="grid gap-2">
            {chores.map((c) => (
              <div key={c.id} className="rounded-xl border border-line p-3">
                <label className="flex cursor-pointer items-center gap-2.5 font-medium">
                  <input
                    type="checkbox"
                    checked={!!selected[c.id]}
                    onChange={() => toggleChore(c.id)}
                    className="h-[18px] w-[18px] accent-[#167a4a]"
                  />
                  {c.name}
                  <span className="ml-auto font-mono text-xs text-muted">
                    {c.kind === "core" ? "CORE" : "EXTRA"}
                  </span>
                </label>
                {selected[c.id] && members.length > 0 && (
                  <label className="mt-2 flex items-center gap-2 text-sm text-muted">
                    <span className="w-24 shrink-0">Assign to</span>
                    <select
                      value={manual[c.id] ?? ""}
                      onChange={(e) =>
                        setManual((m) => ({ ...m, [c.id]: e.target.value }))
                      }
                      className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-ink"
                    >
                      <option value="">Auto (fair rotation)</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {memberName(m.user_id)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
            ))}
            {chores.length === 0 && (
              <p className="text-sm text-muted">No chores exist yet.</p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2.5 font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={create}
            disabled={saving}
            className="rounded-full bg-pine px-6 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create cycle"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
