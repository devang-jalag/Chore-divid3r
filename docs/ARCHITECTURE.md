# Chore Divider — System Architecture & Technical Specification

## 1. Executive Summary & Core Invariants

Chore Divider is a multi-tenant household task scheduling platform designed to eliminate roommate friction around domestic duties. Unlike traditional task managers, Chore Divider relies on **deterministic mathematical rotation** rather than ad-hoc assignment or gamified point economies.

### Core System Invariants
1. **No Concurrent Core Overlap:** In a household with $\ge 3$ members, no member is ever assigned more than one of the 3 primary core chores (*Common Space*, *Kitchen*, *Bathroom*) during the same 14-day cycle.
2. **Complete Roster Cycling:** Across $N$ consecutive biweekly rounds (where $N = |Members|$), every member will cycle through every core chore exactly once.
3. **Strict Tenancy Isolation:** Row Level Security (RLS) policies at the PostgreSQL engine level enforce that no user can query or mutate household data outside their verified memberships.
4. **Deterministic Reproducibility:** Cycle assignments are calculated as pure functions of calendar time and roster position:
   $$\text{Assignee Index} = (Position_{chore} + CycleIndex) \pmod N$$

---

## 2. High-Level System Architecture

```mermaid
graph TD
    subgraph Client["Next.js 14 Client Layer (App Router)"]
        UI[Tailwind UI & Components]
        PWA[Service Worker & Manifest]
        RTC[Realtime Client Subscription]
        UI --> RTC
    end

    subgraph AuthLayer["Supabase Auth Engine"]
        MagicLink[Email OTP / Magic Link Exchange]
        Session[HTTP-only Cookie Session @supabase/ssr]
    end

    subgraph Database["PostgreSQL 15 (Supabase Database)"]
        RLS["Row Level Security (is_household_member)"]
        Tables["Core Tables (households, chores, completions)"]
        ExtTables["Feature Tables (chore_swaps, member_leaves, activity_logs)"]
        RPC["Stored Procedures (create_household, join_household_via_invite)"]
        WAL["Postgres Write-Ahead Log"]
    end

    subgraph RealtimePubSub["Supabase Realtime Engine"]
        PubSub[WebSocket Broadcasting Channel]
    end

    subgraph Integrations["Notification Engine"]
        WebhookDispatch[Discord / Slack Webhook Dispatcher]
        EdgeCron[Scheduled Reminder Trigger]
    end

    Client --> Session
    Session --> AuthLayer
    Client -->|Direct Queries & RPCs| RLS
    RLS --> Tables
    RLS --> ExtTables
    Tables --> WAL
    ExtTables --> WAL
    WAL --> PubSub
    PubSub -->|Realtime Events| RTC
    EdgeCron --> WebhookDispatch
```

---

## 3. Data Flow & Real-Time Sync Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor RoommateA as Roommate A
    actor RoommateB as Roommate B
    participant BrowserA as Roommate A Browser
    participant BrowserB as Roommate B Browser
    participant NextServer as Next.js Server / Middleware
    participant SupabaseDB as Supabase PostgreSQL
    participant Realtime as Supabase Realtime (WebSocket)

    Note over RoommateA,BrowserA: Marking Chore Complete
    RoommateA->>BrowserA: Clicks "Mark Done" on Kitchen
    BrowserA->>BrowserA: Triggers Confetti Animation (Optimistic Feedback)
    BrowserA->>SupabaseDB: INSERT into public.completions
    SupabaseDB->>SupabaseDB: Validate RLS (is_household_member(hid))
    SupabaseDB->>SupabaseDB: Trigger public.activity_logs INSERT
    SupabaseDB-->>BrowserA: 201 Created (Success Toast)

    Note over SupabaseDB,Realtime: Write-Ahead Log (WAL) Broadcast
    SupabaseDB->>Realtime: Broadcast table change (completions, activity_logs)
    Realtime->>BrowserB: WebSocket event (INSERT completions)
    BrowserB->>BrowserB: Debounced Refresh (400ms)
    BrowserB-->>RoommateB: Kitchen card flips to "Completed by Roommate A"
```

---

## 4. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    profiles ||--o{ household_members : "belongs to"
    households ||--|{ household_members : "contains"
    households ||--o{ household_invites : "generates"
    households ||--|{ chores : "defines"
    chores ||--o{ checklist_items : "sub-tasks"
    households ||--o{ special_cycles : "schedules"
    special_cycles ||--|{ special_cycle_chores : "snapshots"
    households ||--o{ completions : "tracks"
    households ||--o{ chore_swaps : "logs"
    households ||--o{ member_leaves : "manages"
    households ||--o{ activity_logs : "audits"
    households ||--o| notification_settings : "configures"

    households {
        uuid id PK
        text name
        uuid created_by FK
        timestamptz created_at
    }

    household_members {
        uuid id PK
        uuid household_id FK
        uuid user_id FK
        text role "owner | member"
        int position "0-indexed rotation queue"
        timestamptz joined_at
    }

    chores {
        uuid id PK
        uuid household_id FK
        text name
        text kind "core | extra"
        int position
        timestamptz created_at
    }

    checklist_items {
        uuid id PK
        uuid chore_id FK
        text text
        int position
        timestamptz created_at
    }

    completions {
        uuid id PK
        uuid household_id FK
        text kind "chore | checklist_item"
        int cycle_index
        uuid special_cycle_id FK
        uuid chore_id FK
        uuid checklist_item_id FK
        uuid done_by FK
        timestamptz done_at
    }

    chore_swaps {
        uuid id PK
        uuid household_id FK
        uuid chore_id FK
        int cycle_index
        uuid requester_id FK
        uuid target_user_id FK
        text status "pending | accepted | rejected | cancelled"
        timestamptz updated_at
    }

    member_leaves {
        uuid id PK
        uuid household_id FK
        uuid user_id FK
        date start_date
        date end_date
        text reason
    }

    activity_logs {
        uuid id PK
        uuid household_id FK
        uuid actor_id FK
        text action
        jsonb metadata
        timestamptz created_at
    }

    notification_settings {
        uuid household_id PK, FK
        text webhook_url
        boolean webhook_enabled
        int remind_days_before
        timestamptz updated_at
    }
```

---

## 5. Chore Trade & Swap State Machine

```mermaid
stateDiagram-v2
    [*] --> Pending : Requester creates swap request
    Pending --> Accepted : Target roommate approves
    Pending --> Rejected : Target roommate declines
    Pending --> Cancelled : Requester withdraws request

    Accepted --> EffectiveAssignment : Effective Assignee Resolver updates Board
    Rejected --> NaturalAssignment : Natural algorithmic assignee preserved
    Cancelled --> NaturalAssignment : Natural algorithmic assignee preserved

    state EffectiveAssignment {
        [*] --> BoardUpdated : Badge "Swapped" rendered
    }
    state NaturalAssignment {
        [*] --> NaturalRender : Standard rotation displayed
    }
```

---

## 6. Automated Notification & Reminder Flow

```mermaid
graph TD
    Cron[Edge Cron Job / Scheduled Check] --> FetchActive[Query notification_settings WHERE webhook_enabled = true]
    FetchActive --> CheckDate{Current Date == Weekend - LeadDays?}
    CheckDate -- No --> Sleep[No Dispatch]
    CheckDate -- Yes --> CalcAssignments[Compute Current Cycle Index & Assignees]
    CalcAssignments --> FormatPayload[Construct Markdown / Embed Message]
    FormatPayload --> SendWebhook[POST to Discord / Slack / Webhook URL]
    SendWebhook --> LogActivity[INSERT activity_logs: reminder_dispatched]
```

---

## 7. Mathematical Rotation Algorithm Specification

### Parameters
* **Epoch Anchor ($T_0$):** Monday, October 5, 2026 (`2026-10-05T00:00:00.000Z`).
* **Cycle Duration ($\Delta$):** 14 standard calendar days (1,209,600,000 ms).
* **Roster ($M$):** Ordered sequence of member user IDs: $[m_0, m_1, \dots, m_{N-1}]$.

### Calculation
Given any UTC timestamp $T$:
$$\text{Days Elapsed} = \lfloor \frac{T - T_0}{86,400,000} \rfloor$$
$$\text{Cycle Index } (C) = \lfloor \frac{\text{Days Elapsed}}{14} \rfloor$$

Target cleaning weekend dates for cycle $C$:
$$\text{Saturday Date} = T_0 + (C \times 14) + 12 \text{ days}$$
$$\text{Sunday Date} = T_0 + (C \times 14) + 13 \text{ days}$$

For chore $k$ at zero-based queue position $P_k$:
$$\text{Natural Assignee Index} = (((P_k + C) \pmod N) + N) \pmod N$$
$$\text{Natural Assignee} = M[\text{Natural Assignee Index}]$$

### Swap Resolution Override
Let $S$ be the set of accepted swaps for cycle $C$.
$$\text{Effective Assignee} = 
\begin{cases} 
s.target\_user\_id & \text{if } \exists s \in S \text{ where } s.chore\_id = k \land s.status = \text{'accepted'} \\
\text{Natural Assignee} & \text{otherwise}
\end{cases}$$

---

## 8. Security & Row-Level Security (RLS) Verification Matrix

| Table | Operation | Policy Rule | Enforcing Predicate |
| :--- | :--- | :--- | :--- |
| `households` | SELECT | Members only | `is_household_member(id)` |
| `household_members` | SELECT | Co-members only | `is_household_member(household_id)` |
| `chores` | ALL | Members only | `is_household_member(household_id)` |
| `completions` | ALL | Members only | `is_household_member(household_id)` |
| `chore_swaps` | ALL | Members only | `is_household_member(household_id)` |
| `member_leaves` | ALL | Members only | `is_household_member(household_id)` |
| `activity_logs` | SELECT / INSERT | Members only | `is_household_member(household_id)` |
| `notification_settings` | ALL | Members only | `is_household_member(household_id)` |
