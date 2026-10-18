import { Suspense } from "react";

import type { Metadata } from "next";
import { Spinner } from "@/components/ui/spinner";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <div className="flex flex-1 items-center justify-center">
        <LoginForm />
      </div>
    </Suspense>
  );
}
