import { z } from "zod";

export const kbCategorySchema = z.enum(["faq", "policy"], {
  message: "Category must be either 'faq' or 'policy'",
});

export const kbEntrySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters"),
  content: z
    .string()
    .trim()
    .min(10, "Content must be at least 10 characters")
    .max(10000, "Content must not exceed 10,000 characters"),
  category: kbCategorySchema,
  workspaceId: z.string().uuid("Invalid workspace ID"),
});

export const updateKbEntrySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must not exceed 200 characters"),
  content: z
    .string()
    .trim()
    .min(10, "Content must be at least 10 characters")
    .max(10000, "Content must not exceed 10,000 characters"),
  category: kbCategorySchema,
});

export type KBEntryInput = z.infer<typeof kbEntrySchema>;
export type UpdateKBEntryInput = z.infer<typeof updateKbEntrySchema>;
