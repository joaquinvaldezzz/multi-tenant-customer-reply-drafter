# Plan 009: Drizzle ORM Integration with Supabase Postgres

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6ce7da7..HEAD -- package.json lib/ types/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-supabase-schema-and-rls.md, plans/002-workspace-and-kb-crud.md, plans/008-type-safe-env-t3-oss.md
- **Category**: migration
- **Planned at**: commit `6ce7da7`, 2026-10-18

## Why this matters

Data access currently relies on untyped Supabase SDK calls (`supabase.from("workspaces") as any`) inside Server Actions. This creates runtime failure risks when schemas change and lacks compile-time query validation. Integrating Drizzle ORM provides type-safe SQL queries, schema-as-code definitions in TypeScript, and atomic relational joins against the existing Supabase Postgres database. It also establishes the database layer prerequisite for the Better Auth Drizzle adapter in Plan 010.

## Current state

- Supabase Postgres schema exists in `supabase/migrations/20261017000000_init_multi_tenant_schema.sql` (defining `workspaces`, `workspace_members`, `kb_entries`, `workspace_usage`).
- Server actions currently construct untyped queries using `@supabase/ssr` server client:
  - `lib/actions/workspaces.ts:40`: `const supabase = (await createClient()) as any;`
  - `lib/actions/workspaces.ts:53-57`:
    ```typescript
    const { data: wsData, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name, slug })
      .select()
      .single();
    ```
  - `lib/actions/kb.ts:37`: `const supabase = (await createClient()) as any;`
- Package manager is `bun` (`bun.lock`).
- Environment variables are validated via `@t3-oss/env-nextjs` in `lib/env.ts`.
- Terminology must match `GLOSSARY.md`: use `Workspace`, `Member`, `Knowledge Base Entry`, `Draft Quota`.

## Commands you will need

| Purpose   | Command                                                                  | Expected on success        |
| --------- | ------------------------------------------------------------------------ | -------------------------- |
| Install   | `bun add drizzle-orm postgres && bun add -D drizzle-kit @types/postgres` | exit 0                     |
| Typecheck | `bun x tsc --noEmit`                                                     | exit 0, no errors          |
| Generate  | `bun x drizzle-kit generate`                                             | exit 0, migrations created |

## Suggested executor toolkit

- Skills: `supabase-postgres-best-practices` for Supabase connection pooler configuration (`prepare: false` on port 6543).
- Drizzle documentation: `drizzle-orm/postgres-js` client connection pattern.

## Scope

**In scope**:

- `package.json` (add `drizzle-orm`, `postgres` as dependencies; `drizzle-kit`, `@types/postgres` as devDependencies; add `db:generate` and `db:push` scripts)
- `lib/env.ts` (add `DATABASE_URL` and `DIRECT_URL` server environment variables)
- `drizzle.config.ts` (create Drizzle Kit configuration file)
- `lib/db/index.ts` (create singleton Drizzle instance using `postgres` driver with `prepare: false`)
- `lib/db/schema/workspaces.ts` (schema definitions for `workspaces` and `workspace_members`)
- `lib/db/schema/kb.ts` (schema definition for `kb_entries`)
- `lib/db/schema/usage.ts` (schema definition for `workspace_usage`)
- `lib/db/schema/index.ts` (schema barrel export)
- `lib/actions/workspaces.ts` (refactor queries to Drizzle ORM)
- `lib/actions/kb.ts` (refactor queries to Drizzle ORM)
- `types/database.ts` (export inferred types from Drizzle schema to maintain compatibility)

**Out of scope**:

- Implementing Better Auth (Plan 010 handles Better Auth configuration and auth tables)
- Modifying Postgres RLS policies in `supabase/migrations/`
- Touching UI components in `app/(dashboard)/` or `components/ui/`

## Git workflow

- Branch: `advisor/009-drizzle-orm-supabase`
- Commit convention: Conventional Commits (e.g. `feat(db): integrate drizzle orm with supabase postgres`)

## Steps

### Step 1: Install Drizzle ORM and Postgres driver

Install `drizzle-orm` and `postgres`, along with `drizzle-kit` and `@types/postgres` devDependencies.

```bash
bun add drizzle-orm postgres
bun add -D drizzle-kit @types/postgres
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 2: Add DATABASE_URL to environment schema

Edit `lib/env.ts` to declare `DATABASE_URL` and `DIRECT_URL` in the server schema:

```typescript
// lib/env.ts
server: {
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
},
```

Ensure `emptyStringAsUndefined: true` remains set.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 3: Create Drizzle Kit configuration

Create `drizzle.config.ts` in the project root:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Add helper scripts to `package.json`:

```json
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 4: Define TypeScript Drizzle schemas matching existing Supabase tables

Create `lib/db/schema/workspaces.ts`:

```typescript
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role", { enum: ["owner", "member"] }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("workspace_members_workspace_user_unique").on(table.workspaceId, table.userId),
  ],
);

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
}));
```

Create `lib/db/schema/kb.ts`:

```typescript
import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { workspaces } from "./workspaces";

export const kbEntries = pgTable("kb_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category", { enum: ["faq", "policy"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kbEntriesRelations = relations(kbEntries, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [kbEntries.workspaceId],
    references: [workspaces.id],
  }),
}));
```

Create `lib/db/schema/usage.ts`:

```typescript
import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { workspaces } from "./workspaces";

export const workspaceUsage = pgTable(
  "workspace_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    billingPeriod: text("billing_period").notNull(),
    draftCount: integer("draft_count").notNull().default(0),
    monthlyLimit: integer("monthly_limit").notNull().default(50),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("workspace_usage_workspace_period_unique").on(table.workspaceId, table.billingPeriod),
  ],
);

export const workspaceUsageRelations = relations(workspaceUsage, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceUsage.workspaceId],
    references: [workspaces.id],
  }),
}));
```

Create `lib/db/schema/index.ts` exporting all schemas:

```typescript
export * from "./workspaces";
export * from "./kb";
export * from "./usage";
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 5: Create Drizzle database client instance

Create `lib/db/index.ts`:

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

const connectionString = env.DATABASE_URL;

// Disable prepared statements for Supabase transaction pooler (pgbouncer / port 6543) compatibility
const client = postgres(connectionString, {
  prepare: false,
});

export const db = drizzle(client, { schema });
export type DatabaseInstance = typeof db;
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 6: Refactor Server Actions in `lib/actions/workspaces.ts` to use Drizzle ORM

Update `lib/actions/workspaces.ts` to query using `db`:

- `createWorkspace`: insert into `workspaces`, `workspaceMembers`, `workspaceUsage` using `db.insert(...)`.
- `switchActiveWorkspace`: query `workspaceMembers` using `db.query.workspaceMembers.findFirst(...)`.
- `getUserWorkspaces`: query memberships joining workspaces using `db.query.workspaceMembers.findMany({ where: eq(workspaceMembers.userId, user.id), with: { workspace: true } })`.
- `getWorkspaceUsage`: query `workspaceUsage` using `db.query.workspaceUsage.findFirst(...)`.

Maintain exact same return shape `ActionResult<T>` and cookie behavior.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 7: Refactor Server Actions in `lib/actions/kb.ts` to use Drizzle ORM

Update `lib/actions/kb.ts` to query `kbEntries` using `db`:

- `createKbEntry`: `db.insert(kbEntries).values(...)`.
- `updateKbEntry`: `db.update(kbEntries).set(...).where(eq(kbEntries.id, id))`.
- `deleteKbEntry`: `db.delete(kbEntries).where(eq(kbEntries.id, id))`.
- `getKbEntries`: `db.query.kbEntries.findMany({ where: eq(kbEntries.workspaceId, workspaceId) })`.
- `getKbEntryById`: `db.query.kbEntries.findFirst({ where: eq(kbEntries.id, id) })`.

Maintain exact same validation logic and return shape `ActionResult<T>`.

**Verify**: `bun x tsc --noEmit` → exit 0

## Test plan

- Test type checking: `bun x tsc --noEmit` must pass with 0 errors.
- Test schema generation: `bun run db:generate` produces migration files corresponding to existing tables without drift.
- Test data access: verify `getUserWorkspaces`, `createWorkspace`, `createKbEntry`, and `getKbEntries` return expected structures matching `ActionResult<T>`.

## Done criteria

- [x] `bun add drizzle-orm postgres` and dev dependencies installed and recorded in `package.json`
- [x] `lib/env.ts` validates `DATABASE_URL`
- [x] `lib/db/schema/` defines tables matching Supabase schema (`workspaces`, `workspace_members`, `kb_entries`, `workspace_usage`)
- [x] `lib/db/index.ts` exports `db` configured with `prepare: false`
- [x] `lib/actions/workspaces.ts` and `lib/actions/kb.ts` execute operations via `db` instead of `supabase.from()`
- [x] `bun x tsc --noEmit` exits 0 with zero errors
- [x] `plans/README.md` status row updated

## STOP conditions

- If `DATABASE_URL` is unavailable in the environment during local verification, use a placeholder in `.env.local` to verify compilation.
- If Supabase table schemas differ from `supabase/migrations/20261017000000_init_multi_tenant_schema.sql`, STOP and reconcile columns before proceeding.
- If any UI component breaks due to return type mismatches, STOP and align types in `types/database.ts`.

## Maintenance notes

- Supabase transaction pooler (port 6543) requires `prepare: false`. If connecting directly to port 5432 or session pooler, prepared statements can be re-enabled.
- Plan 010 will add Better Auth tables (`user`, `session`, `account`, `verification`) to `lib/db/schema/` and attach `drizzleAdapter(db, { provider: "pg", schema })`.
