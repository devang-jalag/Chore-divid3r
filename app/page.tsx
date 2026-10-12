import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  let user = null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase env not configured yet — render the logged-out landing.
  }
  if (user) redirect("/households");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-pine">
        Chore Divider
      </p>
      <h1 className="mt-4 text-5xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
        Three chores.
        <br />
        One fair rotation.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Common spaces, kitchen, and bathroom rotate to a different housemate
        every two weeks — live and shared, so everyone sees the same board.
        Plan Diwali-style deep cleans as one-off special cycles.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-full bg-pine px-6 py-3 font-semibold text-white shadow-soft hover:opacity-90"
        >
          Sign in with email
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-line px-6 py-3 font-semibold hover:border-ink"
        >
          How it works
        </Link>
      </div>
      <ul className="mt-12 grid w-full gap-3 text-left sm:grid-cols-3">
        {[
          ["Biweekly weekends", "Every cycle targets a Saturday–Sunday, when everyone is free."],
          ["Fair by design", "Nobody gets two core chores in one cycle; everyone cycles through all three."],
          ["Live for the house", "One shared board — checklists, completions and swaps sync instantly."],
        ].map(([title, body]) => (
          <li key={title} className="rounded-2xl border border-line bg-surface p-5">
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
