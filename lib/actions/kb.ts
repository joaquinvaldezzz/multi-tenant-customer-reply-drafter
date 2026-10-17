"use server";

import { revalidatePath } from "next/cache";

import type { KBEntry } from "@/types/database";
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
    for (const [key, value] of input.entries()) {
      raw[key] = value;
    }
    return raw;
  }
  return input;
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

    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const { data, error } = await supabase
      .from("kb_entries")
      .insert({
        workspace_id: parsed.data.workspaceId,
        title: parsed.data.title,
        content: parsed.data.content,
        category: parsed.data.category,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/knowledge-base");
    return { success: true, data: data as KBEntry };
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

    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const { data, error } = await supabase
      .from("kb_entries")
      .update({
        title: parsed.data.title,
        content: parsed.data.content,
        category: parsed.data.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/knowledge-base");
    return { success: true, data: data as KBEntry };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update knowledge base entry",
    };
  }
}

export async function deleteKbEntry(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const { error } = await supabase.from("kb_entries").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
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
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const { data, error } = await supabase
      .from("kb_entries")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as KBEntry[]) ?? [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load knowledge base entries",
    };
  }
}

export async function getKbEntryById(id: string): Promise<ActionResult<KBEntry>> {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const { data, error } = await supabase
      .from("kb_entries")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    if (!data) {
      return { success: false, error: "Knowledge base entry not found" };
    }

    return { success: true, data: data as KBEntry };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load entry",
    };
  }
}
