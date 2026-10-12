"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DisplayNameForm({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("id", user.id);
      setSaved(true);
    }
    setLoading(false);
  }

  if (saved) return null;

  return (
    <form
      onSubmit={save}
      className="rounded-2xl border border-amberx/60 bg-amberlt p-5"
    >
      <h2 className="font-semibold">What should housemates call you?</h2>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={32}
          className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 outline-none focus:border-pine"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-full bg-ink px-5 py-2.5 font-semibold text-bg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
