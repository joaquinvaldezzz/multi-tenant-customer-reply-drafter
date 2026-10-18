# Plan 011: Migrate Login Authentication to Server Action with useActionState and Zod

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 6341833..HEAD -- app/(auth)/login/page.tsx lib/actions/ lib/validations/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/010-better-auth-email-password.md
- **Category**: tech-debt
- **Planned at**: commit `6341833`, 2026-10-18

## Why this matters

The login page in `app/(auth)/login/page.tsx` currently invokes client-side authentication (`authClient.signIn.email`) within a standard `onSubmit` handler, managing multiple local state hooks (`email`, `password`, `error`, `loading`) manually without centralized server-side schema validation. Migrating the login flow to a Next.js Server Action with React 19's native `useActionState` and Zod validates form inputs reliably on the server, simplifies component state management, improves accessibility and progressive enhancement, and eliminates client-side auth error leaking.

## Current state

- `app/(auth)/login/page.tsx:25-67`:
  Current form handles submission with `authClient.signIn.email`, manual state for `email`, `password`, `error`, and `loading`, and client-side navigation via `router.push()`:
  ```typescript
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
        callbackURL: redirectTo,
      });

      if (signInError) {
        setError(signInError.message ?? "Invalid email or password");
        setLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  }
  ```
- `lib/auth.ts:9-27`:
  Better Auth server instance already has `nextCookies()` plugin registered, which allows server-side API calls like `auth.api.signInEmail` to read and write session cookies directly into Next.js headers/cookies:
  ```typescript
  export const auth = betterAuth({
    database: drizzleAdapter(db, { ... }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL ?? "http://localhost:3000",
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    plugins: [nextCookies()],
  });
  ```
- `lib/validations/kb.ts`:
  Existing Zod validation pattern in the codebase. All schema definitions reside under `lib/validations/`.
- `lib/actions/workspaces.ts`:
  Existing Server Action pattern in the codebase using `"use server"`.

## Commands you will need

| Purpose   | Command                                                                                    | Expected on success |
| --------- | ------------------------------------------------------------------------------------------ | ------------------- |
| Typecheck | `bun x tsc --noEmit`                                                                       | exit 0, no errors   |
| Lint      | `bun x eslint "app/(auth)/login/page.tsx" "lib/actions/auth.ts" "lib/validations/auth.ts"` | exit 0, no errors   |
| Build     | `bun run build`                                                                            | exit 0              |

## Suggested executor toolkit

- Next.js 16 Forms and Server Actions guide (`node_modules/next/dist/docs/01-app/02-guides/forms.md`).
- React 19 `useActionState` documentation: signature is `const [state, formAction, isPending] = useActionState(action, initialState)`.
- Coss UI primitives (`components/ui/`): `Input`, `Button`, `Alert`, `AlertDescription`.

## Scope

**In scope**:

- `lib/validations/auth.ts` (create: defines `loginSchema` with Zod)
- `lib/actions/auth.ts` (create: defines server action `signInAction` and state types)
- `app/(auth)/login/page.tsx` (refactor: use `useActionState` and action dispatch instead of `handleSubmit` / `useState`)

**Out of scope**:

- `app/(auth)/signup/page.tsx` (signup flow can be migrated in a separate follow-up plan)
- `lib/auth.ts` (Better Auth server configuration remains intact)
- Social OAuth / MFA plugins

## Git workflow

- Branch: `advisor/011-login-form-server-action-zod`
- Commit message convention: `refactor(auth): migrate login form to server action with useActionState and zod`

## Steps

### Step 1: Define authentication validation schema and state with Zod

Create `lib/validations/auth.ts`:

- Define `loginSchema` using Zod (`z.object({ email, password })`).
- `email`: trimmed, valid email format with user-friendly error message.
- `password`: string, minimum 8 characters (matching `minPasswordLength: 8` configured in `lib/auth.ts:23`).
- Export type `LoginInput = z.infer<typeof loginSchema>`.
- Export `LoginActionState` interface and `initialLoginState` object. **Important Next.js Server Action rule**: files marked with `"use server"` can only export `async` functions (see [invalid-use-server-value](https://nextjs.org/docs/messages/invalid-use-server-value)). Non-function constants like `initialLoginState` must reside in a regular module like `lib/validations/auth.ts` instead of `lib/actions/auth.ts`.

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface LoginActionState {
  success?: boolean;
  message?: string | null;
  errors?: {
    email?: string[];
    password?: string[];
  };
}

export const initialLoginState: LoginActionState = {
  message: null,
  errors: {},
};
```

**Verify**: `bun x tsc --noEmit` → exit 0

---

### Step 2: Create Server Action `signInAction`

Create `lib/actions/auth.ts`:

- Mark file with `"use server"`.
- Import `type LoginActionState` from `@/lib/validations/auth`.
- **CRITICAL**: Do NOT export constants, objects, or non-async values from this file. Next.js enforces that all exports from a `"use server"` entrypoint must be functions. Only export `signInAction`.
- Implement `signInAction(prevState: LoginActionState, formData: FormData): Promise<LoginActionState>`:
  1. Extract `email`, `password`, and `redirectTo` (defaulting to `"/knowledge-base"`) from `formData`.
  2. Validate input using `loginSchema.safeParse({ email, password })`.
  3. If validation fails, return `{ success: false, errors: validationResult.error.flatten().fieldErrors, message: "Please check the form for errors" }`.
  4. In a `try / catch` block:
     - Call `await auth.api.signInEmail({ body: { email: validationResult.data.email, password: validationResult.data.password }, headers: await headers() })`.
     - `nextCookies()` in Better Auth writes session cookies to headers.
     - On error, catch `APIError` from `better-auth/api` (or generic `Error`), extract message (or fallback to `"Invalid email or password"`), and return `{ success: false, message: errorMessage }`.
  5. Outside the `try / catch` block, call `redirect(targetUrl)` from `next/navigation`. (Crucial: never place `redirect()` inside `try` block without re-throwing `isRedirectError`, as Next.js throws an internal control exception for redirects).

```typescript
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";

import type { LoginActionState } from "@/lib/validations/auth";
import { auth } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

export async function signInAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const rawRedirectTo = formData.get("redirectTo");

  const redirectTo =
    typeof rawRedirectTo === "string" && rawRedirectTo.startsWith("/")
      ? rawRedirectTo
      : "/knowledge-base";

  const validation = loginSchema.safeParse({
    email: typeof rawEmail === "string" ? rawEmail : "",
    password: typeof rawPassword === "string" ? rawPassword : "",
  });

  if (!validation.success) {
    return {
      success: false,
      errors: validation.error.flatten().fieldErrors,
      message: "Please enter a valid email and password.",
    };
  }

  try {
    await auth.api.signInEmail({
      body: {
        email: validation.data.email,
        password: validation.data.password,
      },
      headers: await headers(),
    });
  } catch (err) {
    if (err instanceof APIError || (err && typeof err === "object" && "message" in err)) {
      return {
        success: false,
        message: (err as { message?: string }).message ?? "Invalid email or password",
      };
    }
    return {
      success: false,
      message: "An unexpected error occurred during sign in. Please try again.",
    };
  }

  return redirect(redirectTo);
}
```

**Verify**: `bun x tsc --noEmit` → exit 0

---

### Step 3: Refactor `app/(auth)/login/page.tsx` with `useActionState`

Update `app/(auth)/login/page.tsx`:

- Remove unnecessary manual state hooks (`useState` for email, password, error, loading).
- Remove unused imports (`react-hook-form`, `zodResolver`, etc. if added in working tree).
- Import `useActionState` from `"react"`.
- Import `signInAction` from `@/lib/actions/auth`.
- Import `initialLoginState` from `@/lib/validations/auth`.
- Initialize `const [state, formAction, isPending] = useActionState(signInAction, initialLoginState)`.
- Use `<form action={formAction} className="space-y-4">`.
- Render a hidden input for `redirectTo`: `<input type="hidden" name="redirectTo" value={redirectTo} />`.
- Give inputs `name="email"` and `name="password"` and `defaultValue=""`.
- Disable inputs and submit button when `isPending` is true.
- Display `state.message` in the top `Alert` when present.
- Display individual field errors (`state.errors?.email?.[0]` and `state.errors?.password?.[0]`) beneath each input using a subtle red text message (`<p className="text-xs text-destructive">`).

Target component structure:

```tsx
/* eslint-disable jsx-a11y/label-has-associated-control */
"use client";

import React, { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircleIcon, BotIcon } from "lucide-react";

import { signInAction } from "@/lib/actions/auth";
import { initialLoginState } from "@/lib/validations/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/knowledge-base";

  const [state, formAction, isPending] = useActionState(signInAction, initialLoginState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-xs">
        <div className="flex flex-col items-center text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <BotIcon className="size-6" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-semibold tracking-tight text-foreground">
            Sign in to ReplyDrafter
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email and password to access your workspaces
          </p>
        </div>

        {Boolean(state.message) && (
          <Alert variant="error">
            <AlertCircleIcon className="size-4" />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" action={formAction}>
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="email">
              Email address
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              autoComplete="email"
              disabled={isPending}
              aria-invalid={Boolean(state.errors?.email)}
              aria-describedby={state.errors?.email ? "email-error" : undefined}
            />
            {state.errors?.email?.[0] && (
              <p id="email-error" className="text-xs text-destructive">
                {state.errors.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isPending}
              aria-invalid={Boolean(state.errors?.password)}
              aria-describedby={state.errors?.password ? "password-error" : undefined}
            />
            {state.errors?.password?.[0] && (
              <p id="password-error" className="text-xs text-destructive">
                {state.errors.password[0]}
              </p>
            )}
          </div>

          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            className="font-medium text-primary underline-offset-4 hover:underline"
            href="/signup"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/20 px-4 py-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-xs" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
```

**Verify**:

- `bun x tsc --noEmit` → exit 0
- `bun x eslint "app/(auth)/login/page.tsx"` → exit 0

---

### Step 4: Run full verification

Ensure no lint regressions or type issues were introduced across touched files.

**Verify**:

- `bun x tsc --noEmit` → exit 0
- `bun x eslint "app/(auth)/login/page.tsx" "lib/actions/auth.ts" "lib/validations/auth.ts"` → exit 0
- `bun run build` → exit 0

## Test plan

1. **Validation Error Test**:
   - Navigate to `/login`.
   - Submit invalid email (e.g. `test` instead of `test@example.com`).
   - Confirm field validation message appears under email input without triggering server auth.
   - Submit password with fewer than 8 characters (e.g. `12345`).
   - Confirm password error message `"Password must be at least 8 characters"` is displayed.
2. **Invalid Credentials Test**:
   - Submit valid email (`user@test.com`) with incorrect password (`password1234`).
   - Confirm top alert displays `"Invalid email or password"` from Better Auth API error handling.
3. **Pending State Test**:
   - Click submit; verify button displays `"Signing in..."` and form inputs are disabled during execution.
4. **Successful Login & Redirect Test**:
   - Submit valid credentials for a registered user.
   - Confirm session cookie (`better-auth.session_token`) is set and user is redirected to `/knowledge-base` (or the URL specified by `?redirectTo=...`).

## Done criteria

- [x] `lib/validations/auth.ts` exists and exports `loginSchema`, `LoginActionState`, and `initialLoginState`
- [x] `lib/actions/auth.ts` exists, marked `"use server"`, and exports ONLY `signInAction` (no non-function runtime exports)
- [x] `app/(auth)/login/page.tsx` uses `useActionState(signInAction, initialLoginState)`
- [x] No `authClient.signIn` call remains in `app/(auth)/login/page.tsx`
- [x] `bun x tsc --noEmit` exits 0 with zero errors
- [x] `bun x eslint "app/(auth)/login/page.tsx" "lib/actions/auth.ts" "lib/validations/auth.ts"` exits 0
- [x] `plans/README.md` status row updated

## STOP conditions

- If Next.js throws `invalid-use-server-value` ("A 'use server' file can only export async functions"), verify that no objects, constants, or non-async values are exported from `lib/actions/auth.ts`. Move any non-function constants (such as `initialLoginState`) to `lib/validations/auth.ts`.
- If `nextCookies()` in Better Auth fails to set cookies in the server action response, check that `lib/auth.ts` plugins include `nextCookies()` from `better-auth/next-js`.
- If `redirect()` causes an uncaught promise rejection, verify that `redirect()` is placed outside `try...catch` blocks in `signInAction`.
- If `redirectTo` contains an external or open-redirect URL (e.g. `https://malicious.com`), ensure it is sanitized with `rawRedirectTo.startsWith("/")`.

## Maintenance notes

- Signup action can be added to `lib/actions/auth.ts` alongside `signInAction` using the same `useActionState` pattern.
- If rate limiting or lockout protection is required in the future, it can be attached directly inside `signInAction` prior to calling `auth.api.signInEmail`.
