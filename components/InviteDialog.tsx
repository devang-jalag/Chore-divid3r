"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { createClient } from "@/lib/supabase/client";

interface Invite {
  id: string;
  token: string;
  created_at: string;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
}

export default function InviteDialog({
  householdId,
  householdName,
  onClose,
}: {
  householdId: string;
  householdName: string;
  onClose: () => void;
}) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("household_invites")
      .select("id, token, created_at, expires_at, max_uses, used_count")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });
    setInvites((data as Invite[]) ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createInvite() {
    setCreating(true);
    const supabase = createClient();
    await supabase.from("household_invites").insert({ household_id: householdId });
    await load();
    setCreating(false);
  }

  async function revoke(id: string) {
    const supabase = createClient();
    await supabase.from("household_invites").delete().eq("id", id);
    await load();
  }

  function linkFor(token: string) {
    return `${window.location.origin}/join/${token}`;
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(linkFor(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  function shareText(token: string) {
    return `Join my household "${householdName}" on Chore Divider and split the chores fairly: ${linkFor(token)}`;
  }

  return (
    <Modal eyebrow="Household invite" title="Invite housemates" onClose={onClose}>
      <p className="text-sm text-muted">
        Anyone with the link signs in and joins the rotation instantly — they
        see and can edit the same live board.
      </p>
      <button
        onClick={createInvite}
        disabled={creating}
        className="mt-4 rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {creating ? "Creating…" : "+ New invite link"}
      </button>

      <div className="mt-4 grid gap-3">
        {invites.map((inv) => (
          <div
            key={inv.id}
            className="rounded-xl border border-line bg-bg p-4"
          >
            <p className="truncate font-mono text-xs text-muted">
              {linkFor(inv.token)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Used {inv.used_count}
              {inv.max_uses ? ` of ${inv.max_uses}` : ""} times
              {inv.expires_at
                ? ` · expires ${new Date(inv.expires_at).toLocaleDateString()}`
                : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => copy(inv.token)}
                className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold hover:border-ink"
              >
                {copied === inv.token ? "Copied ✓" : "Copy link"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText(inv.token))}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold hover:border-ink"
              >
                WhatsApp
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(`Join "${householdName}" on Chore Divider`)}&body=${encodeURIComponent(shareText(inv.token))}`}
                className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold hover:border-ink"
              >
                Email
              </a>
              <button
                onClick={() => revoke(inv.id)}
                className="rounded-full border border-line bg-surface px-4 py-1.5 text-sm font-semibold text-danger hover:border-danger"
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
        {invites.length === 0 && (
          <p className="text-sm text-muted">
            No invite links yet — create one above.
          </p>
        )}
      </div>
    </Modal>
  );
}
