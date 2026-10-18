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
          <input name="redirectTo" type="hidden" value={redirectTo} />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="email">
              Email address
            </label>
            <Input
              aria-invalid={Boolean(state.errors?.email)}
              id="email"
              name="email"
              type="email"
              placeholder="name@company.com"
              aria-describedby={state.errors?.email ? "email-error" : undefined}
              required
              autoComplete="email"
              disabled={isPending}
            />
            {state.errors?.email?.[0] ? (
              <p className="text-xs text-destructive" id="email-error">
                {state.errors.email[0]}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <Input
              aria-invalid={Boolean(state.errors?.password)}
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              aria-describedby={state.errors?.password ? "password-error" : undefined}
              required
              autoComplete="current-password"
              disabled={isPending}
            />
            {state.errors?.password?.[0] ? (
              <p className="text-xs text-destructive" id="password-error">
                {state.errors.password[0]}
              </p>
            ) : null}
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
