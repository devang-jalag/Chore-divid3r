"use client";

import { useState } from "react";
import Modal from "./Modal";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./Toast";
import type { MemberLeave, HouseholdMember } from "@/lib/types";

export default function VacationModal({
  isOpen,
  onClose,
  householdId,
  currentUserId,
  leaves,
  members,
  onLeavesChanged,
}: {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  currentUserId: string;
  leaves: MemberLeave[];
  members: HouseholdMember[];
  onLeavesChanged: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) return;

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("member_leaves").insert({
      household_id: householdId,
      user_id: currentUserId,
      start_date: startDate,
      end_date: endDate,
      reason: reason.trim(),
    });

    if (error) {
      toastError(error.message);
      setSubmitting(false);
      return;
    }

    await supabase.from("activity_logs").insert({
      household_id: householdId,
      actor_id: currentUserId,
      action: "leave_added",
      metadata: { start_date: startDate, end_date: endDate, reason },
    });

    setSubmitting(false);
    setStartDate("");
    setEndDate("");
    setReason("");
    success("Away dates recorded");
    onLeavesChanged();
    onClose();
  }

  async function removeLeave(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("member_leaves").delete().eq("id", id);
    if (error) {
      toastError(error.message);
      return;
    }
    success("Away schedule removed");
    onLeavesChanged();
  }

  const nameOf = (uid: string) =>
    members.find((m) => m.user_id === uid)?.profile?.display_name?.trim() || "Housemate";

  return (
    <Modal open={isOpen} onClose={onClose} title="Away / Vacation Schedule">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted">
            Mark upcoming travel or away dates so roommates know your availability.
          </p>
        </div>

        {leaves.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Scheduled Away Dates
            </h4>
            <div className="divide-y divide-line rounded-xl border border-line bg-surface2 p-3">
              {leaves.map((l) => (
                <div key={l.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
                  <div>
                    <p className="font-semibold">{nameOf(l.user_id)}</p>
                    <p className="text-xs text-muted">
                      {l.start_date} → {l.end_date} {l.reason ? `(${l.reason})` : ""}
                    </p>
                  </div>
                  {l.user_id === currentUserId && (
                    <button
                      onClick={() => removeLeave(l.id)}
                      className="text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-semibold mb-1">Start Date</span>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-pine"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold mb-1">End Date</span>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-pine"
              />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs font-semibold mb-1">Reason / Note (optional)</span>
            <input
              type="text"
              placeholder="e.g. Visiting family, travel..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-pine"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Schedule"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
