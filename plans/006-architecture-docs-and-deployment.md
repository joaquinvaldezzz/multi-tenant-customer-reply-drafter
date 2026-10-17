# Plan 006: Architecture Documentation, Demo Credentials, and Production Deployment Setup

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a742e28..HEAD -- README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-supabase-schema-and-rls.md, plans/003-grounded-llm-drafter-and-quota.md, plans/004-interactive-drafter-dashboard-ui.md, plans/005-playwright-e2e-docker-ci.md
- **Category**: docs
- **Planned at**: commit `a742e28`, 2026-10-17

## Why this matters

GitHub review is the primary gatekeeper for the target role ("no link means no review"). Reviewers spend 2–3 minutes skimming the README and live demo before deciding on an interview. A production-grade README featuring a clear Mermaid architecture diagram, an honest defense of deliberate engineering tradeoffs (direct context injection vs vector search), test instructions, and ready-to-test demo credentials turns a standard repository into an immediate pass.

## Current state

- Existing `README.md` is the generic `create-next-app` boilerplate:
  ```markdown
  This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
  ...
  ```
- No architecture documentation or demo credentials exist.

## Commands you will need

| Purpose   | Command              | Expected on success |
| --------- | -------------------- | ------------------- |
| Typecheck | `bun x tsc --noEmit` | exit 0, no errors   |

## Scope

**In scope**:

- `README.md` (complete replacement with architecture, tradeoffs, demo credentials, and setup)
- `scripts/seed-demo.ts` (database seed script creating a turnkey demo tenant with populated FAQs and sample usage)
- `.env.example` (documented environment variables without real secrets)
- `vercel.json` or `netlify.toml` (deployment configuration)

**Out of scope**:

- Committing real API keys or production database secrets (never store real credentials in Git)
- Modifying underlying Next.js runtime code

## Git workflow

- Branch: `advisor/006-architecture-docs-deployment`
- Commit convention: Conventional Commits (e.g. `docs: write production readme with architecture diagram and demo guide`)

## Steps

### Step 1: Create Environment Example File

Create `.env.example`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Anthropic LLM (Server-side only)
ANTHROPIC_API_KEY=sk-ant-api03-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Verify**: Confirm `.env.example` contains only placeholder values.

### Step 2: Implement Turnkey Demo Seed Script

Create `scripts/seed-demo.ts`:

- Seeds a demo user: `demo@replydrafter.example` (password: `Demo1234!`).
- Creates a demo workspace: `Acme E-Commerce Support`.
- Creates 5 realistic FAQ/policy entries:
  1. 30-Day Money-Back Guarantee
  2. Free Domestic Shipping over $50
  3. International Customs and Duties Policy
  4. Damaged Item Replacement Workflow
  5. Subscription Cancellation Window
- Sets monthly draft usage to `12 / 50` so reviewers can see the usage meter in action.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 3: Rewrite README.md

Replace `README.md` with:

1. Project title & 1-line elevator pitch: "Multi-tenant AI customer reply drafter for small businesses, grounded strictly in workspace knowledge base policies."
2. Key Features list (Tenant isolation with Postgres RLS, streamed grounded replies via Claude 3.5, atomic monthly quotas, automated Playwright E2E suite).
3. Live Demo URL & Test Credentials (`demo@replydrafter.example` / `Demo1234!`).
4. Architecture Diagram (Mermaid):
   ```mermaid
   flowchart TD
     Client["Next.js 16 Web Client\n(React 19 / Tailwind CSS v4)"]
     Proxy["Next.js Route Handler\n(/api/draft)"]
     Auth["Supabase Auth & Session"]
     DB[("PostgreSQL\n(Multi-Tenant RLS)")]
     LLM["Anthropic Claude 3.5\n(Grounded Context Stream)"]

     Client -->|1. Authenticate| Auth
     Client -->|2. POST Inquiry & Tenant ID| Proxy
     Proxy -->|3. Validate RLS & Atomic Quota| DB
     Proxy -->|4. Fetch Workspace FAQs| DB
     Proxy -->|5. Stream Grounded Prompt| LLM
     LLM -->|6. SSE Token Stream| Proxy
     Proxy -->|7. Stream to Browser| Client
   ```
5. Architecture Decision Record (ADR): **Direct Context Injection vs. Vector DB / RAG**:
   - Explicitly explains why direct injection was chosen for SMBs: small businesses have 10–100 core policies. Injecting them directly fits comfortably within Claude's 200k context window, achieves 100% retrieval recall, avoids chunking boundary loss, eliminates vector database operational overhead and embedding latency, and guarantees deterministic grounding.
6. Security Posture: Row-Level Security, zero client-exposed keys, prompt injection defenses.
7. Local Development & Testing Guide:
   ```bash
   bun install
   bun run dev
   bun run test:e2e
   docker build -t reply-drafter .
   ```

**Verify**: Verify Markdown formatting and Mermaid diagram syntax.

## Test plan

- Review Markdown in a viewer to ensure all links and Mermaid blocks render cleanly.
- Confirm zero secrets or real credentials exist in `.env.example` and `README.md`.
- Verification: `bun x tsc --noEmit` → exit 0.

## Done criteria

- [ ] `.env.example` created with all necessary environment variable templates
- [ ] `scripts/seed-demo.ts` implemented and typechecked
- [ ] `README.md` rewritten with architecture diagram, ADR section, and demo credentials
- [ ] `bun x tsc --noEmit` exits 0 with zero errors
- [ ] `plans/README.md` status row updated

## STOP conditions

- If demo database credentials expire or change, update credentials in `README.md` and seed script.

## Maintenance notes

- Keep the live demo URL updated in the README header once deployed to Vercel/Netlify.
