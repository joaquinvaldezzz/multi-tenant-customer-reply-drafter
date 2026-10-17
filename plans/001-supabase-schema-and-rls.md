# Plan 001: Supabase Multi-Tenant Schema, Row-Level Security, and Authentication Setup

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a742e28..HEAD -- package.json lib/ app/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `a742e28`, 2026-10-17

## Why this matters

A multi-tenant SaaS application requires strict tenant isolation at the database layer before any feature code is written. Without row-level security (RLS) in Postgres, cross-tenant data leaks are common application bugs. This plan establishes the Supabase database migrations, role-based access policies (`owner` vs `member`), authentication helpers for Next.js App Router, and base tenant resolution.

## Current state

- The repository is a Next.js 16 (App Router) project with React 19, TypeScript 5, and Tailwind CSS v4.
- `package.json` contains UI dependencies (`@base-ui/react`, `lucide-react`) but no database or Supabase client libraries:
  ```json
  "dependencies": {
    "@base-ui/react": "^1.9.0",
    "@daypicker/react": "^10.0.2",
    "class-variance-authority": "^0.7.1",
    "cn": "^0.5.0",
    "lucide-react": "^1.59.0",
    "next": "16.4.2",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  }
  ```
- Package manager is `bun` (`bun.lock` exists).
- Verification command for TypeScript is `bun x tsc --noEmit`.

## Commands you will need

| Purpose   | Command                                       | Expected on success |
| --------- | --------------------------------------------- | ------------------- |
| Install   | `bun add @supabase/supabase-js @supabase/ssr` | exit 0              |
| Typecheck | `bun x tsc --noEmit`                          | exit 0, no errors   |

## Scope

**In scope**:

- `package.json` (add `@supabase/supabase-js`, `@supabase/ssr`)
- `supabase/migrations/20261017000000_init_multi_tenant_schema.sql` (schema and RLS policies)
- `lib/supabase/client.ts` (browser Supabase client)
- `lib/supabase/server.ts` (server-side Supabase client for Server Components / Actions / Routes)
- `lib/supabase/middleware.ts` (session refresh helper)
- `middleware.ts` (Next.js middleware refreshing auth tokens and resolving active tenant)
- `types/database.ts` (generated/manual TypeScript types for database schema)

**Out of scope**:

- FAQ/Policy UI management (handled in Plan 002)
- Anthropic LLM API integration (handled in Plan 003)
- Vector database / pgvector extensions (explicit architecture tradeoff: direct prompt grounding)

## Git workflow

- Branch: `advisor/001-supabase-schema-rls`
- Commit convention: Conventional Commits (e.g. `feat: setup supabase schema and multi-tenant rls`)

## Steps

### Step 1: Install Supabase dependencies

Install `@supabase/supabase-js` and `@supabase/ssr`.

```bash
bun add @supabase/supabase-js @supabase/ssr
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 2: Create initial Postgres migration with multi-tenant schema and RLS

Create `supabase/migrations/20261017000000_init_multi_tenant_schema.sql` with:

1. `profiles`: `id` (references `auth.users`), `email`, `full_name`, `created_at`.
2. `workspaces`: `id` (UUID), `name`, `slug` (unique), `created_at`.
3. `workspace_members`: `id`, `workspace_id` (references `workspaces.id`), `user_id` (references `auth.users`), `role` (`'owner' | 'member'`), `created_at`, unique on `(workspace_id, user_id)`.
4. `kb_entries`: `id`, `workspace_id`, `title`, `content`, `category` (`'faq' | 'policy'`), `created_at`, `updated_at`.
5. `workspace_usage`: `id`, `workspace_id`, `billing_period` (YYYY-MM), `draft_count` (int, default 0), `monthly_limit` (int, default 50), `updated_at`.
6. Enable RLS on all tables.
7. Add RLS helper function `is_workspace_member(ws_id uuid)` returning boolean:
   ```sql
   CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
   RETURNS boolean AS $$
     SELECT EXISTS (
       SELECT 1 FROM public.workspace_members
       WHERE workspace_id = ws_id AND user_id = auth.uid()
     );
   $$ LANGUAGE sql SECURITY DEFINER STABLE;
   ```
8. Policies:
   - `workspaces`: select if member of workspace; insert allowed for authenticated users.
   - `workspace_members`: select if member of workspace; insert/update/delete only if workspace owner.
   - `kb_entries`: select/insert/update/delete only if `is_workspace_member(workspace_id)`.
   - `workspace_usage`: select if `is_workspace_member(workspace_id)`.

**Verify**: Check migration file exists and contains syntax-valid SQL with all 5 tables and RLS policies.

### Step 3: Implement Supabase client and server utilities

Create:

- `lib/supabase/client.ts` using `createBrowserClient` from `@supabase/ssr`.
- `lib/supabase/server.ts` using `createServerClient` from `@supabase/ssr` with Next.js `cookies()` helper.
- `types/database.ts` defining strict TypeScript interfaces matching `profiles`, `workspaces`, `workspace_members`, `kb_entries`, and `workspace_usage`.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 4: Implement auth session and tenant resolution middleware

Create:

- `lib/supabase/middleware.ts` to refresh expired auth cookies.
- `middleware.ts` invoking the session updater and ensuring protected routes (`/dashboard/*`, `/api/*`) require authenticated sessions, redirecting unauthenticated users to `/login`.

**Verify**: `bun x tsc --noEmit` → exit 0

## Test plan

- Test type declarations match database table schemas without `any`.
- Verify migration file contains zero unescaped credentials or secrets.
- Verification: `bun x tsc --noEmit` → exit 0.

## Done criteria

- [ ] `@supabase/supabase-js` and `@supabase/ssr` added to `package.json`
- [ ] `supabase/migrations/20261017000000_init_multi_tenant_schema.sql` created with RLS on all tables
- [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts`, and `middleware.ts` created
- [ ] `types/database.ts` exports typed definitions for all schema entities
- [ ] `bun x tsc --noEmit` exits 0 with zero type errors
- [ ] `plans/README.md` status row updated

## STOP conditions

- If Supabase SSR client types conflict with Next.js 16 async cookie APIs, stop and document the adapter approach.
- If user requests non-Postgres storage, stop; RLS requires PostgreSQL.

## Maintenance notes

- Any new table added in subsequent plans must immediately enable RLS and use `is_workspace_member()`.
- Keep Supabase service role keys strictly out of client builds; only use anon keys in client bundles.
