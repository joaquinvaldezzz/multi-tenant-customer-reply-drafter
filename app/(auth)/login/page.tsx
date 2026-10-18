"use client";

import { startTransition, Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldAlertIcon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import type { LoginSchema } from "@/lib/validations/auth";
import { signInAction } from "@/lib/actions/auth";
import { initialLoginState, loginSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function LoginForm() {
  const [, formAction, isPending] = useActionState(signInAction, initialLoginState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/knowledge-base";

  const form = useForm<LoginSchema>({
    defaultValues: {
      email: "",
      password: "",
    },
    resolver: zodResolver(loginSchema),
  });

  const handleSubmit = form.handleSubmit((data) => {
    const formData = new FormData();
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("redirectTo", redirectTo);

    startTransition(() => {
      formAction(formData);
    });
  });

  return (
    <div className="flex flex-1 items-center justify-center">
      <Card className="w-full max-w-xs">
        <CardHeader className="border-b">
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>Enter email and password to login</CardDescription>
        </CardHeader>
        <CardPanel>
          <Form className="flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Email address</FieldLabel>
                  <Input
                    type="email"
                    placeholder="Enter your email address"
                    autoComplete="email"
                    {...field}
                  />
                  <FieldError match={Boolean(fieldState.error)}>
                    {fieldState.error?.message}
                  </FieldError>
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    autoComplete="off"
                    {...field}
                  />
                  <FieldError match={Boolean(fieldState.error)}>
                    {fieldState.error?.message}
                  </FieldError>
                </Field>
              )}
            />
            <Button type="submit" disabled={isPending}>
              Login
            </Button>
          </Form>
        </CardPanel>

        <CardFooter className="border-t">
          <div className="flex gap-1 text-xs text-muted-foreground">
            <ShieldAlertIcon className="size-3 h-lh shrink-0" />
            <p>The information you enter is encrypted and stored securely.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}
