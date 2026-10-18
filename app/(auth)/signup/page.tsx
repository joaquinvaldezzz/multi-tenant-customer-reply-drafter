"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, BotIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: "/knowledge-base",
      });

      if (signUpError) {
        setError(signUpError.message ?? "Failed to create account");
        setLoading(false);
        return;
      }

      router.push("/knowledge-base");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
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
            Create an account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started with ReplyDrafter for multi-tenant customer support
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
              htmlFor="name"
              className="flex flex-col gap-1.5 text-xs font-medium text-foreground"
            >
              <span>Full name</span>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                required
                placeholder="Jane Doe"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                disabled={loading}
              />
            </label>
          </div>

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
              <span>Password (min. 8 characters)</span>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                disabled={loading}
              />
            </label>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !name || !email || !password}
          >
            {loading ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
