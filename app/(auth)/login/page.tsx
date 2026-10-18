"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircleIcon, BotIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/knowledge-base";

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

        {Boolean(error) && (
          <Alert variant="error">
            <AlertCircleIcon className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="flex flex-col gap-1.5 text-xs font-medium text-foreground"
            >
              <span>Email address</span>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                disabled={loading}
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="flex flex-col gap-1.5 text-xs font-medium text-foreground"
            >
              <span>Password</span>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={loading}
              />
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={loading || !email || !password}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
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
