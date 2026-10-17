# Plan 004: Interactive Drafter Dashboard and Workspace Switcher UI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a742e28..HEAD -- app/ components/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/002-workspace-and-kb-crud.md, plans/003-grounded-llm-drafter-and-quota.md
- **Category**: direction
- **Planned at**: commit `a742e28`, 2026-10-17

## Why this matters

The user experience depends on a fast, responsive interface where support agents can paste customer tickets, select a tone, and observe streaming AI drafts grounded in their policies. It also surfaces transparency around SaaS usage limits (e.g. "23 / 50 drafts used this month") so users know their quota status before drafting.

## Current state

- Existing UI components in `components/ui/` provide cards, buttons, badges, alerts, progress bars, textareas, and selects.
- Plan 003 exposes `POST /api/draft` streaming endpoint and enforces monthly quota.
- Dashboard shell and layout were created in Plan 002.

## Commands you will need

| Purpose   | Command              | Expected on success |
| --------- | -------------------- | ------------------- |
| Typecheck | `bun x tsc --noEmit` | exit 0, no errors   |

## Scope

**In scope**:

- `app/(dashboard)/drafter/page.tsx` (main drafter workspace page)
- `components/drafter/reply-composer.tsx` (customer ticket input, tone selector, submit button)
- `components/drafter/stream-output.tsx` (markdown/text streaming display, copy button, copy feedback)
- `components/drafter/usage-meter.tsx` (monthly draft progress bar and quota warning)
- `components/navigation/workspace-switcher.tsx` (dropdown to switch active workspace)
- `components/navigation/sidebar.tsx` (navigation linking to Drafter, Knowledge Base, and Settings)

**Out of scope**:

- Stripe billing portal integration (stretch goal; placeholder alert for upgrading quota)
- Vector similarity search (deliberate trade-off)

## Git workflow

- Branch: `advisor/004-drafter-dashboard-ui`
- Commit convention: Conventional Commits (e.g. `feat: implement interactive reply drafter workbench and usage meter`)

## Steps

### Step 1: Create Workspace Switcher Component

Create `components/navigation/workspace-switcher.tsx`:

- Accepts list of user's workspaces and currently active workspace ID.
- Displays dropdown menu using `components/ui/select.tsx` or `components/ui/menu.tsx`.
- Selecting a workspace triggers `switchActiveWorkspace` server action or reloads dashboard with selected tenant context.
- Includes a "+ New Workspace" action at bottom of menu.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 2: Implement Usage Meter Component

Create `components/drafter/usage-meter.tsx`:

- Displays progress bar using `components/ui/progress.tsx`.
- Calculates percentage: `(draftCount / monthlyLimit) * 100`.
- Renders text: `"{draftCount} of {monthlyLimit} drafts used this month"`.
- Highlights in destructive/amber color when usage exceeds 80%.
- Displays upgrade callout alert if usage reaches 100%.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 3: Implement Stream Output Component

Create `components/drafter/stream-output.tsx`:

- Displays generated reply text with blinking streaming cursor when active.
- Includes "Copy to Clipboard" button with toast notification or checkmark icon state.
- Detects fallback message: if output contains "I do not have enough information", displays an amber warning badge stating "Ungrounded inquiry: Missing policy context".
- Includes character and word count indicator.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 4: Implement Main Drafter Page and Composer

Create `components/drafter/reply-composer.tsx`:

- Customer inquiry textarea with placeholder: "Paste customer question or complaint here...".
- Tone selector radio/select group: "Professional", "Friendly", "Direct & Concise", "Empathetic".
- "Generate Reply" button with loading spinner when request is in flight.
- Handles `fetch('/api/draft', ...)` using `ReadableStream` reader to update streaming output chunk by chunk.
- Displays error alert if 429 quota reached or 401 unauthenticated.

Assemble in `app/(dashboard)/drafter/page.tsx`:

- Two-column responsive layout: Left column = Input composer + Usage meter; Right column = Live streamed output.

**Verify**: `bun x tsc --noEmit` → exit 0

## Test plan

- Test streaming client consumes chunks incrementally without crashing.
- Test copy-to-clipboard action copies generated draft string to clipboard.
- Test 429 error state disables generation button and displays quota limit alert.
- Verification: `bun x tsc --noEmit` → exit 0.

## Done criteria

- [ ] Workspace switcher component functional in dashboard header/sidebar
- [ ] Usage meter accurately reflects current month's drafts vs quota
- [ ] Stream reader displays real-time tokens from `/api/draft`
- [ ] One-click copy with visual feedback
- [ ] `bun x tsc --noEmit` exits 0 with zero errors
- [ ] `plans/README.md` status row updated

## STOP conditions

- If stream reading fails on mobile browsers, verify fallback text buffer handling.
- If user requests saving draft history, log as separate stretch feature (not in core MVP scope).

## Maintenance notes

- Any future tone addition should be added to `components/drafter/reply-composer.tsx` and validated in `lib/ai/prompts.ts`.
