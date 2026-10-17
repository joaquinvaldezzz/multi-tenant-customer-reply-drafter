# Plan 002: Multi-Tenant Workspace and Knowledge Base (FAQ/Policy) CRUD

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a742e28..HEAD -- app/ components/ lib/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/001-supabase-schema-and-rls.md
- **Category**: direction
- **Planned at**: commit `a742e28`, 2026-10-17

## Why this matters

The AI customer reply drafter relies entirely on direct grounding from the workspace's company policies and FAQ entries. Before drafting replies, team members need an intuitive, responsive interface to manage workspaces and maintain knowledge base entries. This plan implements workspace switching, member listing, and full CRUD operations for FAQ/policy items with tenant-level isolation.

## Current state

- Existing UI components in `components/ui/` include:
  - `table.tsx`, `dialog.tsx`, `button.tsx`, `input.tsx`, `textarea.tsx`, `badge.tsx`, `alert.tsx`, `select.tsx`, `dropdown-menu.tsx` / `menu.tsx`.
- Plan 001 establishes `kb_entries` and `workspaces` tables with `is_workspace_member()` RLS policies.
- No pages currently exist under `app/` except the default starter `app/page.tsx` and `app/layout.tsx`.

## Commands you will need

| Purpose            | Command              | Expected on success |
| ------------------ | -------------------- | ------------------- |
| Install validation | `bun add zod`        | exit 0              |
| Typecheck          | `bun x tsc --noEmit` | exit 0, no errors   |

## Scope

**In scope**:

- `app/(dashboard)/layout.tsx` (dashboard shell with workspace context provider and navigation)
- `app/(dashboard)/knowledge-base/page.tsx` (FAQ & policy list view with filtering)
- `app/(dashboard)/knowledge-base/new/page.tsx` or modal dialog (create FAQ/policy)
- `app/(dashboard)/knowledge-base/[id]/page.tsx` or modal dialog (edit/delete entry)
- `app/(dashboard)/workspaces/page.tsx` (workspace list, creation, and member role view)
- `lib/actions/kb.ts` (Server Actions for creating, updating, and deleting KB entries)
- `lib/actions/workspaces.ts` (Server Actions for workspace creation and member invitation)
- `lib/validations/kb.ts` (Zod schemas for input validation)

**Out of scope**:

- Vector embeddings / search index generation (deliberate trade-off: direct context injection)
- LLM drafting endpoint (handled in Plan 003)

## Git workflow

- Branch: `advisor/002-workspace-and-kb-crud`
- Commit convention: Conventional Commits (e.g. `feat: add workspace and knowledge base crud`)

## Steps

### Step 1: Install Zod for input validation

Install `zod` for server and client schema validation.

```bash
bun add zod
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 2: Implement Zod schemas and Server Actions for Knowledge Base

Create `lib/validations/kb.ts`:

- Define `kbEntrySchema` with `title` (min 3 chars, max 200), `content` (min 10 chars, max 10000), `category` (`'faq' | 'policy'`), and `workspaceId` (UUID).

Create `lib/actions/kb.ts`:

- `createKbEntry(formData)`: verifies active user session, inserts into `kb_entries` using Supabase server client, revalidates `/knowledge-base`.
- `updateKbEntry(id, formData)`: updates existing entry where `id = id` (RLS validates membership), revalidates path.
- `deleteKbEntry(id)`: deletes entry where `id = id`, revalidates path.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 3: Implement Server Actions for Workspace Management

Create `lib/actions/workspaces.ts`:

- `createWorkspace(name)`: generates slug, inserts into `workspaces`, inserts creator into `workspace_members` with role `'owner'`, initializes `workspace_usage` row for current month with 0 draft count.
- `switchActiveWorkspace(workspaceId)`: updates workspace cookie or session state.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 4: Build Knowledge Base Management UI

Create:

- `app/(dashboard)/knowledge-base/page.tsx`:
  - Category tabs (`All`, `FAQs`, `Policies`).
  - Table of entries showing Title, Category Badge, Updated Date, and Action Menu (Edit, Delete).
  - Empty state when no entries exist with a button to "Add your first policy or FAQ".
- Add/Edit Dialog using `components/ui/dialog.tsx`, `components/ui/input.tsx`, `components/ui/textarea.tsx`, and `components/ui/select.tsx`.

**Verify**: `bun x tsc --noEmit` → exit 0

## Test plan

- Test form validation rejects empty or undersized titles (<3 chars).
- Verify server actions return clear error messages when Supabase rejects unauthorized updates.
- Verification: `bun x tsc --noEmit` → exit 0.

## Done criteria

- [ ] `zod` installed in `package.json`
- [ ] `lib/validations/kb.ts` and `lib/actions/kb.ts` created and typed
- [ ] `lib/actions/workspaces.ts` handles workspace creation and member role assignment
- [ ] Knowledge base management UI rendered with filtering and modal dialogs
- [ ] `bun x tsc --noEmit` exits 0 with zero errors
- [ ] `plans/README.md` status row updated

## STOP conditions

- If user permission model requires more than `owner` and `member`, stop and request specifications.
- If Next.js Server Actions fail on form submission in client components, check `"use server"` directive at top of action files.

## Maintenance notes

- KB entry contents are passed directly into LLM prompts in Plan 003; keep content length capped at 10,000 characters to prevent prompt bloat.
