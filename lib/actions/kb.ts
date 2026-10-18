"use server";

import { revalidatePath } from "next/cache";
import { desc, eq } from "drizzle-orm";

import type { KBEntry } from "@/types/database";
import { db } from "@/lib/db";
import { kbEntries } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";
import { kbEntrySchema, updateKbEntrySchema } from "@/lib/validations/kb";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function extractData(input: FormData | Record<string, unknown>): Record<string, unknown> {
  if (input instanceof FormData) {
    const raw: Record<string, unknown> = {};
    Array.from(input.entries()).forEach(([key, value]) => {
      raw[key] = value;
    });
    return raw;
  }
  return input;
}

function toKBEntry(entry: typeof kbEntries.$inferSelect): KBEntry {
  return {
    id: entry.id,
    workspace_id: entry.workspaceId,
    title: entry.title,
    content: entry.content,
    category: entry.category,
    created_at: entry.createdAt.toISOString(),
    updated_at: entry.updatedAt.toISOString(),
  };
}

export async function createKbEntry(
  input: FormData | { title: string; content: string; category: string; workspaceId: string },
): Promise<ActionResult<KBEntry>> {
  try {
    const rawData = extractData(input);
    const parsed = kbEntrySchema.safeParse(rawData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { success: false, error: issue ? issue.message : "Invalid input" };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const [inserted] = await db
      .insert(kbEntries)
      .values({
        workspaceId: parsed.data.workspaceId,
        title: parsed.data.title,
        content: parsed.data.content,
        category: parsed.data.category,
      })
      .returning();

    revalidatePath("/knowledge-base");
    return { success: true, data: toKBEntry(inserted) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create knowledge base entry",
    };
  }
}

export async function updateKbEntry(
  id: string,
  input: FormData | { title?: string; content?: string; category?: string },
): Promise<ActionResult<KBEntry>> {
  try {
    const rawData = extractData(input);
    const parsed = updateKbEntrySchema.safeParse(rawData);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { success: false, error: issue ? issue.message : "Invalid input" };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const [updated] = await db
      .update(kbEntries)
      .set({
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.content !== undefined ? { content: parsed.data.content } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        updatedAt: new Date(),
      })
      .where(eq(kbEntries.id, id))
      .returning();

    if (!updated) {
      return { success: false, error: "Knowledge base entry not found" };
    }

    revalidatePath("/knowledge-base");
    return { success: true, data: toKBEntry(updated) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update knowledge base entry",
    };
  }
}

export async function deleteKbEntry(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const [deleted] = await db.delete(kbEntries).where(eq(kbEntries.id, id)).returning();

    if (!deleted) {
      return { success: false, error: "Knowledge base entry not found" };
    }

    revalidatePath("/knowledge-base");
    return { success: true, data: { id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete knowledge base entry",
    };
  }
}

export async function getKbEntries(workspaceId: string): Promise<ActionResult<KBEntry[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const entries = await db.query.kbEntries.findMany({
      where: eq(kbEntries.workspaceId, workspaceId),
      orderBy: [desc(kbEntries.updatedAt)],
    });

    return { success: true, data: entries.map(toKBEntry) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load knowledge base entries",
    };
  }
}

export async function getKbEntryById(id: string): Promise<ActionResult<KBEntry>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const entry = await db.query.kbEntries.findFirst({
      where: eq(kbEntries.id, id),
    });

    if (!entry) {
      return { success: false, error: "Knowledge base entry not found" };
    }

    return { success: true, data: toKBEntry(entry) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load entry",
    };
  }
}
