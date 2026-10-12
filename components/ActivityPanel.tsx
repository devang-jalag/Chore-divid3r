"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ArrowLeftRight, UserPlus, Calendar, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ActivityLog, HouseholdMember } from "@/lib/types";

export default function ActivityPanel({
  householdId,
  members,
  refreshKey = 0,
}: {
  householdId: string;
  members: HouseholdMember[];
  refreshKey?: number;
}) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      const supabase = createClient();
      const { data } = await supabase
        .from("activity_logs")
        .select("id, household_id, actor_id, action, metadata, created_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false })
        .limit(20);

      setLogs((data ?? []) as ActivityLog[]);
      setLoading(false);
    }

    loadLogs();
  }, [householdId, refreshKey]);

  const nameOf = (uid: string | null) => {
    if (!uid) return "System";
    return members.find((m) => m.user_id === uid)?.profile?.display_name?.trim() || "Housemate";
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  };

  const getActionDetails = (log: ActivityLog) => {
    const actor = nameOf(log.actor_id);
    switch (log.action) {
      case "chore_completed":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-pine shrink-0" />,
          text: `${actor} marked "${log.metadata.chore_name}" as complete.`,
        };
      case "chore_uncompleted":
        return {
          icon: <Activity className="h-4 w-4 text-muted shrink-0" />,
          text: `${actor} reopened "${log.metadata.chore_name}".`,
        };
      case "swap_requested":
        return {
          icon: <ArrowLeftRight className="h-4 w-4 text-info shrink-0" />,
          text: `${actor} requested a trade for "${log.metadata.chore_name}".`,
        };
      case "swap_accepted":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-pine shrink-0" />,
          text: `${actor} accepted a chore trade.`,
        };
      case "swap_rejected":
        return {
          icon: <Activity className="h-4 w-4 text-danger shrink-0" />,
          text: `${actor} declined a chore trade.`,
        };
      case "member_joined":
        return {
          icon: <UserPlus className="h-4 w-4 text-info shrink-0" />,
          text: `${actor} joined the household roster.`,
        };
      case "leave_added":
        return {
          icon: <Calendar className="h-4 w-4 text-amber-500 shrink-0" />,
          text: `${actor} scheduled away/vacation dates.`,
        };
      default:
        return {
          icon: <Activity className="h-4 w-4 text-muted shrink-0" />,
          text: `${actor} updated ${log.action.replace(/_/g, " ")}.`,
        };
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold tracking-tight">Activity Log</h2>
        <p className="mt-0.5 text-sm text-muted">
          Recent live actions across the household.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading activity...</p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          No activity recorded yet for this household.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {logs.map((log) => {
            const { icon, text } = getActionDetails(log);
            return (
              <div key={log.id} className="flex items-start gap-3 py-3 text-sm">
                <div className="mt-0.5">{icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{text}</p>
                  <p className="text-xs text-muted mt-0.5">{formatTime(log.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
