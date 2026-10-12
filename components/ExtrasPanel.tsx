"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createClient } from "@/lib/supabase/client";
import type { Chore } from "@/lib/types";

export default function ExtrasPanel({
  householdId,
  chores,
  onChanged,
}: {
  householdId: string;
  chores: Chore[];
  onChanged: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const extras = chores
    .filter((c) => c.kind === "extra")
    .sort((a, b) => a.position - b.position);

  async function removeExtra(id: string) {
    if (!confirm("Remove this extra chore from the rotation?")) return;
    const supabase = createClient();
    await supabase.from("chores").delete().eq("id", id);
    onChanged();
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Extra chores</h2>
          <p className="mt-0.5 text-sm text-muted">
            Optional jobs rotate after the core three.
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
        >
          + Chore
        </button>
      </div>

      {extras.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          The core three are ready. Add bins, laundry, balcony — anything else
          your home needs.
        </div>
      ) : (
        <div className="grid gap-2">
          {extras.map((x) => (
            <div
              key={x.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface2 p-3.5"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{x.name}</p>
                <p className="text-xs text-muted">
                  Included in every biweekly rotation
                </p>
              </div>
              <button
                onClick={() => removeExtra(x.id)}
                className="shrink-0 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-semibold text-danger hover:border-danger"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {dialogOpen && (
        <AddExtraDialog
          householdId={householdId}
          nextPosition={
            extras.length ? Math.max(...extras.map((e) => e.position)) + 1 : 3
          }
          onClose={() => setDialogOpen(false)}
          onAdded={() => {
            setDialogOpen(false);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function AddExtraDialog({
  householdId,
  nextPosition,
  onClose,
  onAdded,
}: {
  householdId: string;
  nextPosition: number;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const trimmed = name.trim().slice(0, 42);
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("chores").insert({
      household_id: householdId,
      name: trimmed,
      kind: "extra",
      position: nextPosition,
    });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    onAdded();
  }

  return (
    <Modal eyebrow="Extra job" title="Add a rotating chore" onClose={onClose}>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Chore name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={42}
          placeholder="e.g. Take bins out"
          className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-pine"
        />
      </label>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-full px-5 py-2.5 font-semibold text-muted hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={add}
          disabled={saving || !name.trim()}
          className="rounded-full bg-pine px-6 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add chore"}
        </button>
      </div>
    </Modal>
  );
}
