# Chore Divider — full-stack edition

Split household chores fairly, Splitwise-style. Biweekly weekend rotations of
the three core chores (**Common space cleaning**, **Kitchen**, **Bathroom**),
extra rotating chores, one-off special cycles (Diwali deep-clean, move-out,
guests), editable per-chore checklists, and one shared live board per
household that every member can view and edit.

This is the multi-user rebuild of the original single-page Chore Divider.
Instead of state packed into a share link, every household gets a live,
synced board backed by Supabase (Postgres + Auth + Realtime).

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Supabase**: Postgres (tables + Row Level Security), Auth (email magic
  links), Realtime (live board sync)

## Architecture

```
app/
  page.tsx                    Landing (redirects to /households when signed in)
  login/page.tsx              Email magic-link sign-in
  auth/callback/route.ts      Magic-link session exchange
  join/[token]/page.tsx       Accept a household invite link
  households/page.tsx         Your households + create new
  households/[id]/page.tsx    The board (server loads initial data, client goes live)
components/
  HouseholdBoard.tsx          Board shell: hero, cycle nav, tabs, realtime wiring
  ChoreCard.tsx               Chore card with done toggle + checklist check-offs
  ChecklistEditor.tsx         Add / rename / reorder / remove checklist steps
  MembersPanel.tsx            Roster, rotation order, remove
  InviteDialog.tsx            Create invite links; share via copy / WhatsApp / email
  SpecialCyclesPanel.tsx      One-off cycles, incl. per-chore manual assignment
  ExtrasPanel.tsx             Extra rotating chores
  FairnessPreview.tsx         Next 3 rounds preview
lib/
  cycles.ts                   Cycle math + fair rotation (ported from the original page)
  types.ts                    DB row types
  supabase/{client,server}.ts Browser / server Supabase clients
supabase/migrations/
  0001_schema.sql             Tables, helpers, RPCs
  0002_rls.sql                Row Level Security policies
  0003_realtime.sql           Realtime publication
```

### Data model

- `households` — one row per household (a tenancy).
- `household_members` — auth users ↔ households, with `role` and `position`
  (rotation order).
- `household_invites` — shareable tokens (`/join/<token>`).
- `chores` — `kind = 'core'` (the big three, positions 0–2, seeded on creation)
  or `'extra'` (position 3+, same rotation queue).
- `checklist_items` — ordered steps per chore.
- `special_cycles` + `special_cycle_chores` — one-off events; each chore row
  snapshots the chore name and may carry a `manual_assignee` override.
- `completions` — one row per completed cell (chore or checklist step), keyed
  by `(household, kind, cycle_index, special_cycle_id, chore, item)`.
- `profiles` — display names, auto-created on signup.

### Rotation & fairness

Ported 1:1 from the original page (`lib/cycles.ts`):

- Anchor: **Monday Oct 5, 2026**. Cycle index = `floor(days since anchor / 14)`.
  Each cycle's target weekend is the Saturday–Sunday at its end
  (`anchor + 12/13 days`).
- Assignment: `members[(chorePosition + cycleIndex) mod memberCount]`.
  Requires ≥ 3 members; the core three always land on different people, and
  everyone cycles through every chore over successive rounds. Extras continue
  the same queue from position 3.
- Special cycles use `specialPosition + currentCycleIndex` as their seed, so
  assignments stay deterministic yet rotate.

### Multi-tenancy & invites

- A user can belong to many households; RLS guarantees a member only ever
  reads/writes rows of **their own** households (`is_household_member()`).
- **Invite links**: any member opens *Invite* → *New invite link* and shares it
  via copy, WhatsApp (`wa.me`), or email (`mailto:`). The recipient signs in
  (magic link) and lands on `/join/<token>`, which calls the
  `join_household_via_invite()` RPC — the join is atomic and validated
  server-side (expiry / max-uses supported).
- **Invite via email**: the dialog's Email button opens a prefilled email with
  the link. True server-sent emails would need SMTP configured in Supabase
  (Auth → SMTP settings) plus an edge function; the `mailto:` flow works with
  zero config.

### Auth

Supabase Auth with **email magic links** — no passwords. Sessions are cookie
based (`@supabase/ssr`); `middleware.ts` refreshes them. Household pages gate
on membership server-side.

## Setup

### 1. Create a free Supabase project

1. Go to <https://supabase.com> → New project (free tier is fine).
2. Wait for provisioning, then open **SQL Editor**.

### 2. Run the migrations

In the SQL Editor, run the files in order (paste each file's contents):

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_realtime.sql`

Or with the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 3. Configure auth redirect URLs

Supabase Dashboard → **Authentication → URL Configuration**, add:

- `http://localhost:3000/auth/callback` (dev)
- `https://<your-domain>/auth/callback` (prod)

### 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in from Supabase Dashboard → **Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> The anon key is safe to expose in the browser — RLS enforces all access.
> Never commit `.env.local`.

### 5. Install & run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, sign in with your email, create a household,
and invite housemates.

### 6. Deploy (optional)

Works on Vercel out of the box: import the repo, set the two env vars, and
add the production `/auth/callback` URL in Supabase as above.

## Scripts

| Command           | What it does              |
| ----------------- | ------------------------- |
| `npm run dev`     | Start dev server          |
| `npm run build`   | Production build          |
| `npm start`       | Serve production build    |
| `npm run typecheck` | `tsc --noEmit`          |

## Differences from the original single page

- **Members are real accounts**, not typed-in names. The old "add person by
  name" became invite links (magic-link sign-in). Rotation order is still
  adjustable (↓ button swaps positions).
- **State lives in Postgres**, not in the URL. The old "share the link after
  every edit" flow is gone — edits sync live to all members via Realtime.
- **Manual assignment** is now supported per chore inside special cycles
  ("Assign to → Auto (fair rotation)" dropdown).
- Checklist editing keeps item identity, so per-step completion history
  survives renames/reorders.

## Roadmap ideas

- Push/email reminders before the target weekend (Supabase Edge Function +
  cron).
- Swap requests between members.
- Fairness ledger (who did how much, Splitwise-style balance).
- Household-scoped chore templates (e.g. "Diwali" preset).
