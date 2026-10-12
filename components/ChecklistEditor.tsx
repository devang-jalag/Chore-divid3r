"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createClient } from "@/lib/supabase/client";
import type { ChecklistItem } from "@/lib/types";

interface Row {
  key: string; // temp key for React
  id: string | null; // null = new row
  text: string;
}

export default function ChecklistEditor({
  choreId,
  choreName,
  items,
  onClose,
  onSaved,
}: {
  choreId: string;
  choreName: string;
  items: ChecklistItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(
    items.length
      ? items.map((i) => ({ key: i.id, id: i.id, text: i.text }))
      : [{ key: `new-0`, id: null, text: "" }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setText(key: string, text: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, text } : r)));
  }
  function removeRow(key: string) {
    setRows((rs) => rs.filter((r) => r.key !== key));
  }
  function moveRow(key: string, dir: -1 | 1) {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.key === key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const next = rs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function addRow() {
    setRows((rs) => [...rs, { key: `new-${Date.now()}`, id: null, text: "" }]);
  }

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const cleaned = rows
      .map((r) => ({ ...r, text: r.text.trim().slice(0, 80) }))
      .filter((r) => r.text);

    try {
      const originalIds = new Set(items.map((i) => i.id));
      const keptIds = new Set(
        cleaned.filter((r) => r.id).map((r) => r.id as string)
      );
      const toDelete = Array.from(originalIds).filter((id) => !keptIds.has(id));
      if (toDelete.length) {
        const { error } = await supabase
          .from("checklist_items")
          .delete()
          .in("id", toDelete);
        if (error) throw error;
      }
      for (let pos = 0; pos < cleaned.length; pos++) {
        const r = cleaned[pos];
        if (r.id) {
          const { error } = await supabase
            .from("checklist_items")
            .update({ text: r.text, position: pos })
            .eq("id", r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("checklist_items").insert({
            chore_id: choreId,
            text: r.text,
            position: pos,
          });
          if (error) throw error;
        }
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Could not save the checklist.");
    }
    setSaving(false);
  }

  return (
    <Modal eyebrow="Chore checklist" title={choreName} onClose={onClose}>
      <p className="text-sm text-muted">
        Add, rename, reorder, or remove the steps everyone should follow for
        this chore.
      </p>
      <div className="mt-4 grid gap-2">
        {rows.map((row, i) => (
          <div key={row.key} className="flex items-center gap-2">
            <input
              value={row.text}
              onChange={(e) => setText(row.key, e.target.value)}
              maxLength={80}
              placeholder="e.g. Wipe all surfaces"
              aria-label={`Checklist step ${i + 1}`}
              className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-pine"
            />
            <button
              onClick={() => moveRow(row.key, -1)}
              disabled={i === 0}
              aria-label="Move step up"
              className="grid h-10 w-9 place-items-center rounded-lg border border-line disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => moveRow(row.key, 1)}
              disabled={i === rows.length - 1}
              aria-label="Move step down"
              className="grid h-10 w-9 place-items-center rounded-lg border border-line disabled:opacity-30"
            >
              ↓
            </button>
            <button
              onClick={() => removeRow(row.key)}
              aria-label="Remove step"
              className="grid h-10 w-10 place-items-center rounded-lg border border-line text-lg text-danger"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addRow}
        className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
      >
        + Add step
      </button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-full px-5 py-2.5 font-semibold text-muted hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-pine px-6 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save checklist"}
        </button>
      </div>
    </Modal>
  );
}
