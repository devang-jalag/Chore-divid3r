"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
          <p className="text-muted">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/households";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const configured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!configured) {
    return (
      <>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Sign in</h1>
        <div className="mt-6 rounded-2xl border border-amberx/60 bg-amberlt p-5">
          <p className="font-semibold">Supabase isn&apos;t configured yet</p>
          <p className="mt-1 text-sm text-muted">
            Copy <code>.env.example</code> to <code>.env.local</code> and fill
            in your Supabase URL and anon key, then restart the dev server. See
            the README for the full setup.
          </p>
        </div>
      </>
    );
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="font-mono text-xs uppercase tracking-[0.14em] text-pine">
        ← Chore Divider
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Sign in</h1>
      <p className="mt-2 text-muted">
        We&apos;ll email you a magic link — no password to remember.
      </p>

      {sent ? (
        <div className="mt-6 rounded-2xl border border-line bg-pinelt p-5">
          <p className="font-semibold">Check your inbox</p>
          <p className="mt-1 text-sm text-muted">
            A sign-in link is on its way to <strong>{email}</strong>. It expires
            in an hour.
          </p>
        </div>
      ) : (
        <form onSubmit={sendMagicLink} className="mt-6 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-pine"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-pine px-6 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Email me a sign-in link"}
          </button>
        </form>
      )}
    </main>
  );
}
