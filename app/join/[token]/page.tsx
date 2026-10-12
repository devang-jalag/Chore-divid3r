import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { InviteInfo } from "@/lib/types";
import JoinButton from "@/components/JoinButton";

export default async function JoinPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.rpc("get_invite_info", {
    invite_token: params.token,
  });
  const info = (data as InviteInfo[] | null)?.[0];

  if (error || !info || !info.valid) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <h1 className="text-2xl font-bold">Invite not valid</h1>
        <p className="mt-2 text-muted">
          This invite link is invalid, expired, or has been used up. Ask a
          housemate for a fresh one.
        </p>
        <Link
          href="/households"
          className="mt-6 rounded-full border border-line px-6 py-3 font-semibold"
        >
          Back to my households
        </Link>
      </main>
    );
  }

  if (!user) redirect(`/login?next=${encodeURIComponent(`/join/${params.token}`)}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-pine">
        Household invite
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        Join “{info.household_name}”
      </h1>
      <p className="mt-2 text-muted">
        You&apos;ll be added to the chore rotation and see the same live board
        as everyone else.
      </p>
      <JoinButton token={params.token} householdId={info.household_id} />
    </main>
  );
}
