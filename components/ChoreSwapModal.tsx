"use client";

import { useState } from "react";
import Modal from "./Modal";
import { ArrowLeftRight, Check, X, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./Toast";
import type { ChoreSwap, HouseholdMember } from "@/lib/types";

export default function ChoreSwapModal({
  isOpen,
  onClose,
  householdId,
  currentUserId,
  members,
  cycleIndex,
  choreId,
  choreName,
  existingSwaps,
  onSwapChanged,
}: {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  currentUserId: string;
  members: HouseholdMember[];
  cycleIndex: number;
  choreId: string | null;
  choreName: string;
  existingSwaps: ChoreSwap[];
  onSwapChanged: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [targetUserId, setTargetUserId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const eligibleMembers = members.filter((m) => m.user_id !== currentUserId);

  // Relevant swaps for this specific chore and cycle
  const activeSwapsForChore = existingSwaps.filter(
    (s) =>
      s.cycle_index === cycleIndex &&
      ((choreId && s.chore_id === choreId) || s.chore_name === choreName)
  );

  async function handleRequestSwap(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserId) return;

    setSubmitting(true);
    const supabase = createClient();

    const { error } = await supabase.from("chore_swaps").insert({
      household_id: householdId,
      chore_id: choreId,
      chore_name: choreName,
      cycle_index: cycleIndex,
      requester_id: currentUserId,
      target_user_id: targetUserId,
      status: "pending",
    });

    if (error) {
      toastError(error.message);
      setSubmitting(false);
      return;
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      household_id: householdId,
      actor_id: currentUserId,
      action: "swap_requested",
      metadata: {
        chore_name: choreName,
        cycle_index: cycleIndex,
        target_user_id: targetUserId,
      },
    });

    setSubmitting(false);
    setTargetUserId("");
    success(`Swap request sent for ${choreName}`);
    onSwapChanged();
  }

  async function updateSwapStatus(swapId: string, newStatus: "accepted" | "rejected" | "cancelled") {
    const supabase = createClient();
    const { error } = await supabase
      .from("chore_swaps")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", swapId);

    if (error) {
      toastError(error.message);
      return;
    }

    await supabase.from("activity_logs").insert({
      household_id: householdId,
      actor_id: currentUserId,
      action: `swap_${newStatus}`,
      metadata: { swap_id: swapId, chore_name: choreName },
    });

    success(`Swap request ${newStatus}`);
    onSwapChanged();
  }

  const nameOf = (uid: string) =>
    members.find((m) => m.user_id === uid)?.profile?.display_name?.trim() || "Housemate";

  return (
    <Modal open={isOpen} onClose={onClose} title={`Trade / Cover: ${choreName}`}>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted">
            Request a housemate to cover or swap this chore for the current rotation cycle.
          </p>
        </div>

        {/* Existing Swaps */}
        {activeSwapsForChore.length > 0 && (
          <div className="rounded-xl border border-line bg-surface2 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">
              Active Requests
            </h4>
            {activeSwapsForChore.map((swap) => {
              const isRequester = swap.requester_id === currentUserId;
              const isTarget = swap.target_user_id === currentUserId;

              return (
                <div
                  key={swap.id}
                  className="flex items-center justify-between gap-3 text-sm rounded-lg bg-surface p-3 border border-line"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>{nameOf(swap.requester_id)}</span>
                      <ArrowLeftRight className="h-3.5 w-3.5 text-muted" />
                      <span>{nameOf(swap.target_user_id)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span className="capitalize">{swap.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {swap.status === "pending" && isTarget && (
                      <>
                        <button
                          onClick={() => updateSwapStatus(swap.id, "accepted")}
                          className="flex items-center gap-1 rounded-md bg-pine px-2.5 py-1 text-xs font-semibold text-white hover:opacity-90"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept
                        </button>
                        <button
                          onClick={() => updateSwapStatus(swap.id, "rejected")}
                          className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-danger hover:border-danger"
                        >
                          <X className="h-3.5 w-3.5" /> Decline
                        </button>
                      </>
                    )}
                    {swap.status === "pending" && isRequester && (
                      <button
                        onClick={() => updateSwapStatus(swap.id, "cancelled")}
                        className="rounded-md border border-line px-2.5 py-1 text-xs text-muted hover:text-danger hover:border-danger"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* New Swap Request Form */}
        <form onSubmit={handleRequestSwap} className="space-y-4">
          <label className="block">
            <span className="block text-sm font-semibold mb-1">
              Select Housemate to Trade With
            </span>
            <select
              required
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-pine"
            >
              <option value="">Choose a housemate...</option>
              {eligibleMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.display_name?.trim() || "Housemate"}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting || !targetUserId}
              className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Trade Request"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
