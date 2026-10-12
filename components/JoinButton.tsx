"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinButton({
  token,
  householdId,
}: {
  token: string;
  householdId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function join() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("join_household_via_invite", {
      invite_token: token,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(`/households/${householdId}`);
  }

  return (
    <div className="mt-6">
      <button
        onClick={join}
        disabled={loading}
        className="w-full rounded-full bg-pine px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Joining…" : "Join household"}
      </button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
