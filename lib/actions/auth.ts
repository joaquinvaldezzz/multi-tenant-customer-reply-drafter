"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";

import { auth } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

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
