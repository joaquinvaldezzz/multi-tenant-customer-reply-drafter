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

The primary value proposition of this application is providing accurate, company-aligned customer replies while preventing hallucinations and enforcing multi-tenant SaaS business limits. This plan implements a streaming server-side endpoint powered by the Vercel AI SDK (`ai` and `@ai-sdk/anthropic`, ADR 0002). It enforces strict context grounding (with a guaranteed fallback if facts are missing, ADR 0001) and atomically checks and increments the workspace's monthly draft quota via Postgres RPC before streaming begins (ADR 0003).

## Current state

- Plan 001 set up `workspace_usage` (`draft_count`, `monthly_limit`, `billing_period`) and `kb_entries`.
- Plan 002 provided CRUD management for knowledge base items.
- The AI SDK packages are not yet installed in `package.json`.
- No LLM endpoint exists under `app/api/`.

## Commands you will need

| Purpose   | Command                        | Expected on success |
| --------- | ------------------------------ | ------------------- |
| Install   | `bun add ai @ai-sdk/anthropic` | exit 0              |
| Typecheck | `bun x tsc --noEmit`           | exit 0, no errors   |

## Scope

**In scope**:

- `package.json` (add `ai`, `@ai-sdk/anthropic`)
- `lib/ai/client.ts` (server-side model client initialization via Vercel AI SDK)
- `lib/ai/prompts.ts` (system prompt engineering for strict grounding and "not enough info" fallback)
- `lib/usage/quota.ts` (server-side quota verification and atomic increment function via Postgres RPC)
- `app/api/draft/route.ts` (POST streaming route handler with session auth and rate/quota check)

**Out of scope**:

- Embeddings or vector database search (all KB entries for the workspace are injected directly into context per ADR 0001)
- Client UI drafting form (handled in Plan 004)
- Exposing `ANTHROPIC_API_KEY` to client browser code (strictly server-side in `app/api/` and `lib/ai/`)

## Git workflow

- Branch: `advisor/003-grounded-llm-drafter`
- Commit convention: Conventional Commits (e.g. `feat: add grounded streaming draft endpoint and quota enforcement`)

## Steps

### Step 1: Install Vercel AI SDK and Anthropic provider

Install `ai` and `@ai-sdk/anthropic`.

```bash
bun add ai @ai-sdk/anthropic
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 2: Implement server-side AI client and prompt builder

Create `lib/ai/client.ts`:

- Initialize Anthropic provider using `@ai-sdk/anthropic`.
- Validate that `ANTHROPIC_API_KEY` exists; throw a clear configuration error if missing in server runtime.

Create `lib/ai/prompts.ts`:

- Build prompt template containing:
  - Role: You are a professional customer support assistant for a business.
  - Context: All active FAQ and policy entries for the current workspace (capped at 50 entries, 1,000 characters each per ADR 0001).
  - Strict Grounding Rule: "Answer the customer's inquiry using ONLY the provided FAQ and policy entries. If the provided entries do not contain sufficient information to answer the inquiry accurately and completely, you must prepend '[INSUFFICIENT_KNOWLEDGE]' followed by a polite explanation that company policies do not cover this topic and it has been escalated."
  - Customer Inquiry: The incoming message text.
  - Optional Tone Instruction: e.g. "Professional", "Friendly", "Concise".

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 3: Implement atomic monthly quota check and increment via Postgres RPC

Create `lib/usage/quota.ts`:

- Function `checkAndIncrementDraftQuota(supabase, workspaceId)`:
  1. Call Postgres RPC `increment_workspace_draft_usage(workspace_id, billing_period, monthly_limit)`.
  2. If the RPC indicates quota exceeded, return `{ allowed: false, remaining: 0, limit: monthly_limit }`.
  3. Otherwise, return `{ allowed: true, remaining: result.remaining, limit: monthly_limit }`.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 4: Implement `/api/draft` streaming route handler

Create `app/api/draft/route.ts`:

- Explicit Node.js runtime: `export const runtime = 'nodejs'`.
- Route: `POST /api/draft`
- Authenticate request using Supabase server client (`@supabase/ssr`); return 401 if unauthorized.
- Validate request body containing `{ workspaceId: string, customerMessage: string, tone?: string }`.
- Verify user membership in `workspaceId` via Supabase RLS.
- Run `checkAndIncrementDraftQuota`. If not allowed, return 429 Too Many Requests with JSON payload `{ error: "Monthly draft limit reached. Upgrade plan to continue." }`.
- Fetch all active `kb_entries` for `workspaceId` (up to 50 entries).
- Call `streamText` from `ai` with `anthropic("claude-3-5-sonnet-latest")` and constructed prompt.
- Return `result.toDataStreamResponse()`. Draft bodies remain strictly ephemeral (ADR 0004).

**Verify**: `bun x tsc --noEmit` → exit 0

## Test plan

- Test route handler rejects unauthenticated requests with 401.
- Test route handler returns 429 when `draft_count >= monthly_limit`.
- Test fallback behavior: when KB entries are empty, response prepends `[INSUFFICIENT_KNOWLEDGE]`.
- Verification: `bun x tsc --noEmit` → exit 0.

## Done criteria

- [ ] `ai` and `@ai-sdk/anthropic` installed
- [ ] `lib/ai/client.ts` and `lib/ai/prompts.ts` implemented
- [ ] `lib/usage/quota.ts` checks and increments usage atomically via Postgres RPC
- [ ] `app/api/draft/route.ts` provides authenticated streaming responses with `export const runtime = 'nodejs'`
- [ ] Fallback sentinel `[INSUFFICIENT_KNOWLEDGE]` emitted on unknown inquiries
- [ ] Zero client-side references to `ANTHROPIC_API_KEY`
- [ ] `bun x tsc --noEmit` exits 0 with zero errors
- [ ] `plans/README.md` status row updated

## STOP conditions

- If user specifies an alternative LLM provider (e.g. OpenAI), adjust client initialization to OpenAI SDK while keeping identical prompt grounding and quota logic.
- If streaming breaks in Edge runtime, ensure route config exports `export const runtime = 'nodejs'`.

## Maintenance notes

- Model string is set to `claude-3-5-haiku-20241022` or `claude-3-5-sonnet-20241022`; update if Anthropic releases newer models.
- If workspaces accumulate over 50 KB entries, prompt token usage will increase; document prompt truncation or future vector indexing as a post-MVP roadmap item.
