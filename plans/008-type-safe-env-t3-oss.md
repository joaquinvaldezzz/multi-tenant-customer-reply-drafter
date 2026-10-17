# Plan 008: Validate Environment Variables with @t3-oss/env-nextjs and Zod

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 65b4a6d..HEAD -- package.json lib/env.ts next.config.ts lib/supabase/client.ts lib/supabase/server.ts lib/supabase/middleware.ts .env.example`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `65b4a6d`, 2026-10-17

## Why this matters

Environment variables across the application are currently accessed via raw `process.env.*` with non-null assertions (`!`), which causes ESLint `@typescript-eslint/no-non-null-assertion` errors in `lib/supabase/client.ts`, `lib/supabase/server.ts`, and `lib/supabase/middleware.ts`. More critically, if required variables such as `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing or misconfigured, errors surface only as obscure runtime failures rather than failing fast at build time.

Integrating `@t3-oss/env-nextjs` and `zod` according to [T3 Env Next.js documentation](https://env.t3.gg/docs/nextjs) in `lib/env.ts` establishes compile-time and build-time validation. It ensures client-side code cannot accidentally access server secrets (like `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY`), provides IDE autocomplete for all environment variables, and eliminates unsafe non-null assertions across the codebase.

## Current state

- Package manager: `bun` (version `1.4.2` specified in `package.json#packageManager`).
- Framework: Next.js `16.4.2` with TypeScript `5` and `"moduleResolution": "bundler"`.
- Configuration: `next.config.ts` currently configures Turbopack, experimental features, and caching, but does not import or validate environment variables.
- Module location convention: Core utilities and clients live under `lib/` (e.g. `lib/supabase/`, `lib/utils.ts`). Placing the environment definition at `lib/env.ts` keeps the root tidy and aligns with `@/lib/*` path alias resolution.
- Raw environment variable usage:
  - `lib/supabase/client.ts:7-8`:
    ```ts
    export function createClient() {
      return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
    }
    ```
  - `lib/supabase/server.ts:10-11`:
    ```ts
    return createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
    ```
  - `lib/supabase/middleware.ts:13-14`:
    ```ts
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
    ```
- `.env.example`: Does not exist yet in the repository root.

## Commands you will need

| Purpose          | Command                                                                                            | Expected on success                          |
| ---------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Install packages | `bun add @t3-oss/env-nextjs zod`                                                                   | exit 0, dependencies added to `package.json` |
| Typecheck        | `bun x tsc --noEmit`                                                                               | exit 0, no type errors                       |
| Lint scoped      | `bun x eslint lib/env.ts lib/supabase/client.ts lib/supabase/server.ts lib/supabase/middleware.ts` | exit 0, no lint errors                       |
| Build check      | `SKIP_ENV_VALIDATION=1 bun run build`                                                              | exit 0, Next.js build succeeds               |

## Suggested executor toolkit

- Reference documentation: [https://env.t3.gg/docs/nextjs](https://env.t3.gg/docs/nextjs)
- Zod reference: [https://zod.dev](https://zod.dev)
- TypeScript path alias: `@/*` resolves to `./*` per `tsconfig.json`. Specifically, `@/lib/env` resolves to `lib/env.ts`.

## Scope

**In scope** (the only files you should modify):

- `package.json` — add `@t3-oss/env-nextjs` and `zod` under `dependencies`
- `lib/env.ts` (create) — schema definition using `createEnv` from `@t3-oss/env-nextjs`
- `next.config.ts` — import `./lib/env` at top level and add package transpilation for standalone builds
- `lib/supabase/client.ts` — consume `env.NEXT_PUBLIC_SUPABASE_URL` and `env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `lib/supabase/server.ts` — consume `env.NEXT_PUBLIC_SUPABASE_URL` and `env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `lib/supabase/middleware.ts` — consume `env.NEXT_PUBLIC_SUPABASE_URL` and `env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `.env.example` (create) — placeholder template for required environment variables

**Out of scope** (do NOT touch, even though they look related):

- `.env.local` — NEVER commit, overwrite, or log secrets; developer credentials are local only.
- `env.ts` (root) — Do not place `env.ts` in root; it belongs strictly at `lib/env.ts`.
- `lib/composer-editor.ts`, `lib/composer-query.ts` — unrelated component files with pre-existing lint issues.
- `app/` — existing page routes and layouts.
- `supabase/migrations/` — Postgres schemas and migration SQL.

## Git workflow

- Branch: `advisor/008-t3-env-validation`
- Commit convention: Conventional Commits (e.g. `feat: add type-safe environment validation via @t3-oss/env-nextjs in lib/env.ts`)
- Do NOT push or open a PR unless instructed by the operator.

## Steps

### Step 1: Install `@t3-oss/env-nextjs` and `zod`

Install `@t3-oss/env-nextjs` and `zod` using bun:

```bash
bun add @t3-oss/env-nextjs zod
```

Confirm both packages appear in `package.json` under `dependencies`.

**Verify**:

```bash
bun -e "import { createEnv } from '@t3-oss/env-nextjs'; import { z } from 'zod'; console.log('OK')"
```

Expected output: `OK` (exit 0).

---

### Step 2: Create `lib/env.ts` schema definition

Create `lib/env.ts`:

```ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url("NEXT_PUBLIC_APP_URL must be a valid URL")
      .default("http://localhost:3000"),
  },
  // Destructure client variables for Next.js bundler static replacement
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // Treat empty string values in environment as undefined
  emptyStringAsUndefined: true,
  // Skip validation when explicitly asked (e.g. Docker build phases without env injection)
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
```

Key considerations:

1. `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are marked `.optional()` so server initialization does not crash before Plan 003 (LLM drafter) and Plan 006 (seed script) land.
2. `experimental__runtimeEnv` ensures client variables are correctly inlined by Turbopack / Next.js bundler without having to duplicate server keys.
3. `emptyStringAsUndefined: true` transforms `""` in `.env` to `undefined`, allowing `.default()` values to trigger properly.

**Verify**: `bun x tsc --noEmit` → exit 0.

---

### Step 3: Configure build-time validation in `next.config.ts`

Update `next.config.ts` to import `./lib/env` at the top level and add `transpilePackages` for standalone Docker builds:

```ts
import "./lib/env";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
```

**Verify**: `bun x tsc --noEmit` → exit 0.

---

### Step 4: Refactor Supabase utilities to use `lib/env.ts`

Replace `process.env.NEXT_PUBLIC_SUPABASE_URL!` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` with `env.NEXT_PUBLIC_SUPABASE_URL` and `env.NEXT_PUBLIC_SUPABASE_ANON_KEY` across all Supabase utility files.

> **Import Order Note**: Per `.prettierrc.json` and `@ianvs/prettier-plugin-sort-imports`, third-party packages come first, followed by `<TYPES>`, and then local `@/lib/*` modules. Place `import { env } from "@/lib/env";` after type imports as shown below to ensure ESLint passes with zero `prettier/prettier` violations.

1. **`lib/supabase/client.ts`**: Replace entire file with:

```ts
import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { env } from "@/lib/env";

export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
```

2. **`lib/supabase/server.ts`**: Replace entire file with:

```ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { env } from "@/lib/env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
```

3. **`lib/supabase/middleware.ts`**: Replace entire file with:

```ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Active workspace / tenant resolution helper
  const activeWorkspaceId =
    request.cookies.get("active_workspace_id")?.value || request.headers.get("x-workspace-id");

  if (activeWorkspaceId) {
    supabaseResponse.headers.set("x-workspace-id", activeWorkspaceId);
  }

  if (user) {
    supabaseResponse.headers.set("x-user-id", user.id);
  }

  return { supabaseResponse, user, supabase };
}
```

**Verify**:

- `bun x tsc --noEmit` → exit 0.
- `bun x eslint lib/env.ts lib/supabase/client.ts lib/supabase/server.ts lib/supabase/middleware.ts` → exit 0 with 0 errors (confirms `@typescript-eslint/no-non-null-assertion` and import order errors are resolved).

---

### Step 5: Create `.env.example`

Create `.env.example` in the repository root to document expected variables:

```bash
# Supabase Configuration (Client & Server)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AI / LLM Configuration (Server-side only)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Application Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Verify**: Confirm `.env.example` exists and contains only dummy placeholder strings.

---

### Step 6: Verify validation and failure behavior

Run a command to verify that `SKIP_ENV_VALIDATION=1` allows importing `lib/env.ts` in isolated environments:

```bash
SKIP_ENV_VALIDATION=1 bun -e "import('./lib/env').then(() => console.log('Validation bypass works'))"
```

Expected output: `Validation bypass works` (exit 0).

Next, run a self-asserting negative test to verify that invalid URLs or missing required variables throw a validation error when validation is not skipped:

```bash
NEXT_PUBLIC_SUPABASE_URL="not-a-valid-url" NEXT_PUBLIC_SUPABASE_ANON_KEY="" bun -e "try { await import('./lib/env'); console.error('Expected validation failure did not trigger'); process.exit(1); } catch (e) { console.log('Validation failure correctly caught'); }"
```

Expected output: `Validation failure correctly caught` (exit 0).

**Verify**: Both commands exit 0 and print the expected success messages.

---

## Test plan

1. **Typecheck gate**:
   `bun x tsc --noEmit` exits with 0.
2. **Lint gate for modified files**:
   `bun x eslint lib/env.ts lib/supabase/client.ts lib/supabase/server.ts lib/supabase/middleware.ts` exits with 0 and zero `@typescript-eslint/no-non-null-assertion` or `prettier/prettier` warnings/errors.
3. **Location check gate**:
   `test -f lib/env.ts && test ! -f env.ts` exits with 0 (confirms `lib/env.ts` was created in `lib/` and not repository root).
4. **Environment validation gate**:
   - `SKIP_ENV_VALIDATION=1 bun -e "import('./lib/env').then(() => console.log('Bypass OK'))"` prints `Bypass OK`.
   - `NEXT_PUBLIC_SUPABASE_URL="invalid" NEXT_PUBLIC_SUPABASE_ANON_KEY="" bun -e "try { await import('./lib/env'); process.exit(1); } catch (e) { console.log('Caught OK'); }"` prints `Caught OK`.
5. **Clean code gate**:
   `! git grep -E "process\.env\.[A-Z0-9_]+!" lib/supabase/` exits with 0 (confirms zero raw non-null assertions remain in `lib/supabase/`).
6. **Build gate**:
   `SKIP_ENV_VALIDATION=1 bun run build` or `bun run build` (with valid `.env.local`) succeeds without breaking Next.js build.

## Done criteria

- [ ] `@t3-oss/env-nextjs` and `zod` are added to `package.json#dependencies`
- [ ] `lib/env.ts` exists inside the `lib/` directory (`test -f lib/env.ts && test ! -f env.ts`)
- [ ] `next.config.ts` imports `./lib/env` and includes `transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"]`
- [ ] `lib/supabase/client.ts`, `lib/supabase/server.ts`, and `lib/supabase/middleware.ts` import `{ env } from "@/lib/env"`
- [ ] Zero `process.env.*!` non-null assertions remain in `lib/supabase/` (`! git grep -E "process\.env\.[A-Z0-9_]+!" lib/supabase/`)
- [ ] `.env.example` exists with placeholder keys matching `lib/env.ts`
- [ ] `bun x tsc --noEmit` exits 0
- [ ] `bun x eslint lib/env.ts lib/supabase/client.ts lib/supabase/server.ts lib/supabase/middleware.ts` exits 0
- [ ] `git status` shows no modifications outside the in-scope files
- [ ] `plans/README.md` status row is updated

## STOP conditions

Stop and report back (do not improvise) if:

- Next.js 16 fails to load TypeScript files directly in `next.config.ts` (Next 16 supports `next.config.ts` out of the box; if a module loader error occurs, stop).
- `no-underscore-dangle` ESLint rule flags `experimental__runtimeEnv` despite it having middle rather than leading/trailing underscores.
- Any change requires modifying files outside the Scope section.
- Installing `@t3-oss/env-nextjs` produces dependency conflicts with React 19 or Next.js 16.

## Maintenance notes

- When new environment variables are introduced in future plans (e.g. `ANTHROPIC_API_KEY` in Plan 003, `PLAYWRIGHT_BASE_URL` in Plan 005), add them to `server` or `client` in `lib/env.ts` rather than reading `process.env` directly in feature code.
- Remember that any variable accessed in client components must be prefixed with `NEXT_PUBLIC_` and enumerated inside `experimental__runtimeEnv`.
