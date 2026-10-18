# Plan 010: Better Auth for Email and Password Authentication

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6ce7da7..HEAD -- package.json lib/ app/ proxy.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/009-drizzle-orm-with-supabase.md
- **Category**: migration
- **Planned at**: commit `6ce7da7`, 2026-10-18

## Why this matters

The application currently relies on `@supabase/ssr` cookies and Supabase Auth (`supabase.auth.getUser()`) for user session resolution, but lacks dedicated email and password login and signup interfaces. Migrating to Better Auth decouples authentication from the proprietary Supabase client SDK, integrates directly with Drizzle ORM (Plan 009), provides full control over the user table and sessions, and enables type-safe client and server authentication helpers in Next.js App Router.

## Current state

- Plan 009 establishes Drizzle ORM (`lib/db`) with Supabase Postgres.
- Authentication checks in server actions currently call `supabase.auth.getUser()`:
  - `lib/actions/workspaces.ts:41-48`:
    ```typescript
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }
    ```
- Next.js 16 route protection lives in `proxy.ts` (Next.js 16 middleware replacement):
  - `proxy.ts:7-19`:
    ```typescript
    const { supabaseResponse, user } = await updateSession(request);
    if (pathname.startsWith("/dashboard")) {
      if (!user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("redirectTo", pathname);
        return NextResponse.redirect(url);
      }
    }
    ```
- No UI currently exists under `app/(auth)/login` or `app/(auth)/signup`.
- Coss UI primitives (`Button`, `Input`, `Alert`, `Badge`) exist in `components/ui/`.

## Commands you will need

| Purpose   | Command               | Expected on success   |
| --------- | --------------------- | --------------------- |
| Install   | `bun add better-auth` | exit 0                |
| Typecheck | `bun x tsc --noEmit`  | exit 0, no errors     |
| DB Push   | `bun run db:push`     | exit 0, tables synced |

## Suggested executor toolkit

- Skills: `coss` for using `Input`, `Button`, `Alert`, and form components in login and signup views.
- Better Auth documentation: Next.js App Router integration guide, Drizzle adapter configuration.

## Scope

**In scope**:

- `package.json` (add `better-auth`)
- `lib/env.ts` (add `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
- `lib/db/schema/auth.ts` (Better Auth Drizzle schemas: `user`, `session`, `account`, `verification`)
- `lib/db/schema/index.ts` (re-export auth schemas)
- `lib/db/schema/workspaces.ts` (link `workspaceMembers.userId` relation to `user.id`)
- `lib/auth.ts` (Better Auth server configuration with Drizzle adapter and email/password provider)
- `lib/auth-client.ts` (client auth client initialized via `createAuthClient`)
- `app/api/auth/[...all]/route.ts` (Next.js route handler for Better Auth endpoints)
- `proxy.ts` (update session token verification and route guarding)
- `lib/actions/workspaces.ts` and `lib/actions/kb.ts` (replace Supabase auth checks with Better Auth session helper)
- `app/(auth)/login/page.tsx` (email and password login page)
- `app/(auth)/signup/page.tsx` (email and password signup page)
- `app/(dashboard)/layout.tsx` (display user email and trigger logout via `authClient.signOut()`)

**Out of scope**:

- Social OAuth providers (Google, GitHub; deferred post-MVP)
- Email verification mail delivery services (Resend / AWS SES; email/password authentication is direct/active immediately)
- Modifying Knowledge Base CRUD logic or Anthropic LLM API calls

## Git workflow

- Branch: `advisor/010-better-auth-email-password`
- Commit convention: Conventional Commits (e.g. `feat(auth): integrate better auth for email and password authentication`)

## Steps

### Step 1: Install Better Auth

Install `better-auth`.

```bash
bun add better-auth
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 2: Configure environment variables

Update `lib/env.ts` to validate Better Auth variables:

```typescript
// lib/env.ts
server: {
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
},
```

Ensure `.env.local` contains `BETTER_AUTH_SECRET` (generate using `openssl rand -base64 32`) and `BETTER_AUTH_URL=http://localhost:3000`.

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 3: Define Better Auth Drizzle tables

Create `lib/db/schema/auth.ts`:

```typescript
import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { workspaceMembers } from "./workspaces";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userRelations = relations(user, ({ many }) => ({
  memberships: many(workspaceMembers),
  sessions: many(session),
  accounts: many(account),
}));
```

Export `lib/db/schema/auth.ts` from `lib/db/schema/index.ts`:

```typescript
export * from "./auth";
export * from "./workspaces";
export * from "./kb";
export * from "./usage";
```

Update `lib/db/schema/workspaces.ts` to define the relation between `workspaceMembers` and `user`:

```typescript
export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(user, {
    fields: [workspaceMembers.userId],
    references: [user.id],
  }),
}));
```

Push or generate migration:

```bash
bun run db:push
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 4: Configure Better Auth server instance

Create `lib/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
```

Create a server session helper function:

```typescript
// lib/auth-session.ts
import { headers } from "next/headers";

import { auth } from "@/lib/auth";

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
}
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 5: Mount Next.js App Router API route handler

Create `app/api/auth/[...all]/route.ts`:

```typescript
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth.handler);
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 6: Create client-side Better Auth SDK

Create `lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 7: Update proxy.ts for Better Auth session guarding

In `proxy.ts`, replace the `@supabase/ssr` `updateSession` check with Better Auth session cookie verification:

```typescript
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Better auth stores session token in cookie "better-auth.session_token"
  const sessionCookie =
    request.cookies.get("better-auth.session_token")?.value ??
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const hasSession = Boolean(sessionCookie);

  // Protect /dashboard, /workspaces, /knowledge-base
  const isProtectedRoute =
    pathname.startsWith("/workspaces") ||
    pathname.startsWith("/knowledge-base") ||
    pathname.startsWith("/dashboard");

  if (isProtectedRoute && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated user away from /login or /signup
  if ((pathname === "/login" || pathname === "/signup") && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/knowledge-base";
    return NextResponse.redirect(url);
  }

  // Active workspace header propagation
  const response = NextResponse.next();
  const activeWorkspaceId =
    request.cookies.get("active_workspace_id")?.value ?? request.headers.get("x-workspace-id");
  if (activeWorkspaceId) {
    response.headers.set("x-workspace-id", activeWorkspaceId);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 8: Update Server Actions to use Better Auth session

In `lib/actions/workspaces.ts` and `lib/actions/kb.ts`:

- Replace `const supabase = (await createClient()) as any; const { data: { user } } = await supabase.auth.getUser();`
- With `const user = await getCurrentUser(); if (!user) return { success: false, error: "Unauthorized" };`
- Replace user profile queries with direct lookups on `schema.user` via Drizzle:
  ```typescript
  const profile = await db.query.user.findFirst({
    where: eq(schema.user.email, trimmedEmail),
  });
  ```

**Verify**: `bun x tsc --noEmit` → exit 0

### Step 9: Build Login and Signup UI

Create `app/(auth)/login/page.tsx`:

- Render email & password inputs with coss `Input`, `Button`, `Alert` components.
- Submit using `authClient.signIn.email({ email, password, callbackURL: "/knowledge-base" })`.
- Link to `/signup`.

Create `app/(auth)/signup/page.tsx`:

- Render name, email, and password inputs.
- Submit using `authClient.signUp.email({ name, email, password, callbackURL: "/knowledge-base" })`.
- Link to `/login`.

Update `app/(dashboard)/layout.tsx`:

- Add a "Sign Out" button in `DashboardHeader` calling `await authClient.signOut(); router.push("/login");`.

**Verify**: `bun x tsc --noEmit` → exit 0

## Test plan

- Test type checking: `bun x tsc --noEmit` passes with 0 errors.
- Test sign up flow:
  1. Navigate to `/signup`.
  2. Fill in name, email, and 8+ character password.
  3. Submit and verify user record is created in `user` table and redirected to `/knowledge-base`.
- Test sign in and sign out:
  1. Sign out via header; verify redirect to `/login`.
  2. Sign in with created credentials; verify redirect back to active workspace.
- Test protected routes:
  1. Access `/knowledge-base` without session cookie; verify redirection to `/login?redirectTo=%2Fknowledge-base`.

## Done criteria

- [x] `bun add better-auth` installed and registered in `package.json`
- [x] `lib/env.ts` validates `BETTER_AUTH_SECRET`
- [x] Better Auth schemas (`user`, `session`, `account`, `verification`) defined in `lib/db/schema/auth.ts`
- [x] Better Auth mounted at `app/api/auth/[...all]/route.ts`
- [x] Next.js 16 `proxy.ts` verifies session cookie and protects private routes
- [x] Server actions resolve user via `getCurrentUser()`
- [x] Login (`/login`) and Signup (`/signup`) pages functional with email and password
- [x] `bun x tsc --noEmit` exits 0 with zero errors
- [x] `plans/README.md` status row updated

## STOP conditions

- If Better Auth schema generation conflicts with existing `profiles` table in Supabase, preserve existing data by aliasing or running a data migration script.
- If Next.js 16 `proxy.ts` cannot read cookies in serverless edge mode, ensure `nextCookies()` plugin is registered in `lib/auth.ts`.
- If `BETTER_AUTH_SECRET` is missing in runtime, stop and set a secure string in `.env.local`.

## Maintenance notes

- Better Auth supports future extensions like OAuth (Google, GitHub) or Two-Factor Authentication (2FA) by adding plugins to `lib/auth.ts` without modifying the core user schema.
- Password hashing is handled internally by Better Auth using `scrypt`.
