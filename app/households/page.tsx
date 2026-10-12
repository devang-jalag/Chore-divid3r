import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CreateHouseholdForm from "@/components/CreateHouseholdForm";
import DisplayNameForm from "@/components/DisplayNameForm";
import SignOutButton from "@/components/SignOutButton";

export default async function HouseholdsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("household_members")
    .select("household_id, role, households(id, name)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const needsName =
    !profile?.display_name || !profile.display_name.trim();

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-pine">
            Chore Divider
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Your households
          </h1>
          <p className="mt-1 text-muted">
            Each household is its own world — members, chores and history never
            mix.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-6 grid gap-4">
        {needsName && <DisplayNameForm initial="" />}

        {memberships && memberships.length > 0 ? (
          <div className="grid gap-3">
            {memberships.map((m: any) => (
              <Link
                key={m.household_id}
                href={`/households/${m.household_id}`}
                className="flex items-center justify-between rounded-2xl border border-line bg-surface p-5 shadow-soft transition hover:border-ink"
              >
                <div>
                  <p className="text-lg font-semibold">
                    {m.households?.name ?? "Untitled household"}
                  </p>
                  <p className="text-sm text-muted">
                    {m.role === "owner" ? "Owner" : "Member"} · Open the board →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            No households yet. Create one below, or join with an invite link
            from a housemate.
          </div>
        )}

        <CreateHouseholdForm />
      </div>
    </main>
  );
}
