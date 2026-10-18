import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .email({
      error: "Enter a valid email address",
    })
    .min(1, "Email address is required")
    .trim(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

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
