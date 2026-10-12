"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function CreateHouseholdForm() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_household", {
      household_name: trimmed,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(`/households/${data as string}`);
  }

  return (
    <form
      onSubmit={create}
      className="rounded-2xl border border-line bg-surface p-5"
    >
      <h2 className="font-semibold">Start a new household</h2>
      <p className="mt-1 text-sm text-muted">
        The three core chores are set up automatically.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 10 Caxton Close"
          maxLength={60}
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-4 py-2.5 outline-none focus:border-pine"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="rounded-full bg-pine px-5 py-2.5 font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </form>
  );
}
