# Plan 003: Grounded LLM Reply Drafter Endpoint and Monthly Quota Enforcement

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a742e28..HEAD -- app/api/ lib/ package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-supabase-schema-and-rls.md, plans/002-workspace-and-kb-crud.md
- **Category**: direction
- **Planned at**: commit `a742e28`, 2026-10-17

## Why this matters

The primary value proposition of this application is providing accurate, company-aligned customer replies while preventing hallucinations and enforcing multi-tenant SaaS business limits. This plan implements a streaming server-side endpoint powered by the official `@anthropic-ai/sdk`. It enforces strict context grounding (with a guaranteed fallback if facts are missing) and atomically checks and increments the workspace's monthly draft quota before streaming begins.

## Current state

- Plan 001 set up `workspace_usage` (`draft_count`, `monthly_limit`, `billing_period`) and `kb_entries`.
- Plan 002 provided CRUD management for knowledge base items.
- The Anthropic SDK is not yet installed in `package.json`.
- No LLM endpoint exists under `app/api/`.

## Commands you will need

| Purpose   | Command                     | Expected on success |
| --------- | --------------------------- | ------------------- |
| Install   | `bun add @anthropic-ai/sdk` | exit 0              |
| Typecheck | `bun x tsc --noEmit`        | exit 0, no errors   |

## Scope

**In scope**:

- `package.json` (add `@anthropic-ai/sdk`)
- `lib/ai/anthropic.ts` (server-side Anthropic client initialization)
- `lib/ai/prompts.ts` (system prompt engineering for strict grounding and "not enough info" fallback)
- `lib/usage/quota.ts` (server-side quota verification and atomic increment function)
- `app/api/draft/route.ts` (POST streaming route handler with session auth and rate/quota check)

**Out of scope**:

- Embeddings or vector database search (all KB entries for the workspace are injected directly into context per the deliberate architecture trade-off)
- Client UI drafting form (handled in Plan 004)
- Exposing `ANTHROPIC_API_KEY` to client browser code (strictly server-side in `app/api/` and `lib/ai/`)

## Git workflow

- Branch: `advisor/003-grounded-llm-drafter`
- Commit convention: Conventional Commits (e.g. `feat: add grounded streaming draft endpoint and quota enforcement`)

## Steps

### Step 1: Install Anthropic SDK

Install `@anthropic-ai/sdk`.

```bash
bun add @anthropic-ai/sdk
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 2: Implement server-side Anthropic client and prompt builder

Create `lib/ai/anthropic.ts`:

- Initialize Anthropic client using `process.env.ANTHROPIC_API_KEY`.
- Validate that the key exists; throw a clear configuration error if missing in server runtime.

Create `lib/ai/prompts.ts`:

- Build prompt template containing:
  - Role: You are a professional customer support assistant for a business.
  - Context: All active FAQ and policy entries for the current workspace.
  - Strict Grounding Rule: "Answer the customer's inquiry using ONLY the provided FAQ and policy entries. If the provided entries do not contain sufficient information to answer the inquiry accurately and completely, you must respond with: 'I do not have enough information in our company policies to answer this inquiry. Please escalate this request to a team supervisor.'"
  - Customer Inquiry: The incoming message text.
  - Optional Tone Instruction: e.g. "Professional", "Friendly", "Concise".

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 3: Implement atomic monthly quota check and increment

Create `lib/usage/quota.ts`:

- Function `checkAndIncrementDraftQuota(supabase, workspaceId)`:
  1. Determine current billing period (e.g. `2026-10`).
  2. Query `workspace_usage` for `(workspace_id, billing_period)`.
  3. If no row exists, insert one with `draft_count = 0, monthly_limit = 50`.
  4. If `draft_count >= monthly_limit`, return `{ allowed: false, remaining: 0, limit: monthly_limit }`.
  5. Otherwise, increment `draft_count = draft_count + 1` and return `{ allowed: true, remaining: monthly_limit - (draft_count + 1), limit: monthly_limit }`.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 4: Implement `/api/draft` streaming route handler

Create `app/api/draft/route.ts`:

- Route: `POST /api/draft`
- Authenticate request using Supabase server client; return 401 if unauthorized.
- Validate request body containing `{ workspaceId: string, customerMessage: string, tone?: string }`.
- Verify user membership in `workspaceId` via Supabase RLS.
- Run `checkAndIncrementDraftQuota`. If not allowed, return 429 Too Many Requests with JSON payload `{ error: "Monthly draft limit reached. Upgrade plan to continue." }`.
- Fetch all `kb_entries` for `workspaceId`.
- Call `anthropic.messages.stream` with `model: "claude-3-5-sonnet-20241022"` or `"claude-3-5-haiku-20241022"` and constructed grounded prompt.
- Convert stream into a standard Web `Response` with SSE / `text/event-stream` or `ReadableStream`.

**Verify**: `bun x tsc --noEmit` → exit 0

## Test plan

- Test route handler rejects unauthenticated requests with 401.
- Test route handler returns 429 when `draft_count >= monthly_limit`.
- Test fallback behavior: when KB entries are empty, Claude outputs the exact "not enough information" fallback text.
- Verification: `bun x tsc --noEmit` → exit 0.

## Done criteria

- [ ] `@anthropic-ai/sdk` installed
- [ ] `lib/ai/anthropic.ts` and `lib/ai/prompts.ts` implemented
- [ ] `lib/usage/quota.ts` checks and increments usage atomically
- [ ] `app/api/draft/route.ts` provides authenticated streaming responses with 429 limit guard
- [ ] Zero client-side references to `ANTHROPIC_API_KEY`
- [ ] `bun x tsc --noEmit` exits 0 with zero errors
- [ ] `plans/README.md` status row updated

## STOP conditions

- If user specifies an alternative LLM provider (e.g. OpenAI), adjust client initialization to OpenAI SDK while keeping identical prompt grounding and quota logic.
- If streaming breaks in Edge runtime, ensure route config exports `export const runtime = 'nodejs'`.

## Maintenance notes

- Model string is set to `claude-3-5-haiku-20241022` or `claude-3-5-sonnet-20241022`; update if Anthropic releases newer models.
- If workspaces accumulate over 50 KB entries, prompt token usage will increase; document prompt truncation or future vector indexing as a post-MVP roadmap item.
