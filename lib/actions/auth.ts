"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";

import type { LoginActionState } from "@/lib/validations/auth";
import { auth } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

export async function signInAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const formValues = Object.fromEntries(formData);
  const parsedData = loginSchema.safeParse(formValues);

  if (!parsedData.success) {
    return {
      message: "Invalid form data",
      errors: parsedData.data,
    };
  }

  const { email, password } = parsedData.data;

  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError || (error && typeof error === "object" && "message" in error)) {
      return {
        success: false,
        message: (error as { message?: string }).message ?? "Invalid email or password",
      };
    }
    return {
      success: false,
      message: "An unexpected error occurred during sign in. Please try again.",
    };
  }

  return redirect("/knowledge-base");
}
