"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import type { Workspace, WorkspaceMember, WorkspaceRole, WorkspaceUsage } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base || "workspace"}-${randomSuffix}`;
}

export async function createWorkspace(
  input: FormData | { name: string },
): Promise<ActionResult<Workspace>> {
  try {
    const rawName = input instanceof FormData ? input.get("name") : input.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";

    if (!name || name.length < 2) {
      return { success: false, error: "Workspace name must be at least 2 characters" };
    }
    if (name.length > 100) {
      return { success: false, error: "Workspace name must not exceed 100 characters" };
    }

    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const slug = slugify(name);

    // 1. Insert workspace
    const { data: wsData, error: wsError } = await supabase
      .from("workspaces")
      .insert({ name, slug })
      .select()
      .single();

    if (wsError) {
      return { success: false, error: wsError.message };
    }

    const newWorkspace = wsData as Workspace;

    // 2. Insert workspace creator as owner
    const { error: memberError } = await supabase.from("workspace_members").insert({
      workspace_id: newWorkspace.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberError) {
      return { success: false, error: memberError.message };
    }

    // 3. Initialize workspace usage for current billing period (YYYY-MM)
    const currentBillingPeriod = new Date().toISOString().slice(0, 7);
    const { error: usageError } = await supabase.from("workspace_usage").insert({
      workspace_id: newWorkspace.id,
      billing_period: currentBillingPeriod,
      draft_count: 0,
      monthly_limit: 50,
    });

    if (usageError) {
      console.warn("Failed to initialize workspace usage:", usageError.message);
    }

    // 4. Set active workspace cookie
    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", newWorkspace.id, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    revalidatePath("/workspaces");
    revalidatePath("/knowledge-base");

    return { success: true, data: newWorkspace };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create workspace",
    };
  }
}

export async function switchActiveWorkspace(
  workspaceId: string,
): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    if (!workspaceId) {
      return { success: false, error: "Workspace ID is required" };
    }

    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    // Verify user is a member of this workspace
    const { data: membership, error: memberCheckError } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberCheckError || !membership) {
      return { success: false, error: "Access denied: You are not a member of this workspace" };
    }

    const cookieStore = await cookies();
    cookieStore.set("active_workspace_id", workspaceId, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    revalidatePath("/workspaces");
    revalidatePath("/knowledge-base");

    return { success: true, data: { workspaceId } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to switch workspace",
    };
  }
}

export async function inviteWorkspaceMember(
  workspaceId: string,
  email: string,
  role: WorkspaceRole = "member",
): Promise<ActionResult<WorkspaceMember>> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      return { success: false, error: "A valid email address is required" };
    }

    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    // Look up user profile by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", trimmedEmail)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        success: false,
        error: "No registered user found with that email address",
      };
    }

    // Check if already a member
    const { data: existingMember } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existingMember) {
      return { success: false, error: "This user is already a member of this workspace" };
    }

    const { data: member, error: insertError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceId,
        user_id: profile.id,
        role,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath("/workspaces");
    return { success: true, data: member as WorkspaceMember };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to invite member",
    };
  }
}

export interface WorkspaceWithRole {
  workspace: Workspace;
  role: WorkspaceRole;
}

export interface WorkspaceMemberDetail {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
  email: string | null;
  full_name: string | null;
}

export async function getUserWorkspaces(): Promise<
  ActionResult<{
    user: { id: string; email: string | null } | null;
    workspaces: WorkspaceWithRole[];
    activeWorkspaceId: string | null;
  }>
> {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return {
        success: true,
        data: { user: null, workspaces: [], activeWorkspaceId: null },
      };
    }

    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select("role, workspaces (id, name, slug, created_at)")
      .eq("user_id", user.id);

    if (membersError) {
      return { success: false, error: membersError.message };
    }

    const workspaces: WorkspaceWithRole[] = (members || [])
      .filter((m: any) => m.workspaces)
      .map((m: any) => ({
        workspace: m.workspaces as Workspace,
        role: m.role as WorkspaceRole,
      }));

    const cookieStore = await cookies();
    let activeWorkspaceId = cookieStore.get("active_workspace_id")?.value || null;

    const isValidActive = workspaces.some((w) => w.workspace.id === activeWorkspaceId);
    if (!isValidActive) {
      activeWorkspaceId = workspaces.length > 0 ? workspaces[0].workspace.id : null;
      if (activeWorkspaceId) {
        cookieStore.set("active_workspace_id", activeWorkspaceId, {
          path: "/",
          httpOnly: false,
          sameSite: "lax",
        });
      }
    }

    return {
      success: true,
      data: {
        user: { id: user.id, email: user.email ?? null },
        workspaces,
        activeWorkspaceId,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load workspaces",
    };
  }
}

export async function getWorkspaceMembers(
  workspaceId: string,
): Promise<ActionResult<WorkspaceMemberDetail[]>> {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (!user || authError) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const { data: members, error } = await supabase
      .from("workspace_members")
      .select("id, workspace_id, user_id, role, created_at, profiles (email, full_name)")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const details: WorkspaceMemberDetail[] = (members || []).map((m: any) => ({
      id: m.id,
      workspace_id: m.workspace_id,
      user_id: m.user_id,
      role: m.role,
      created_at: m.created_at,
      email: m.profiles?.email ?? null,
      full_name: m.profiles?.full_name ?? null,
    }));

    return { success: true, data: details };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load workspace members",
    };
  }
}

export async function getWorkspaceUsage(
  workspaceId: string,
): Promise<ActionResult<WorkspaceUsage | null>> {
  try {
    const supabase = (await createClient()) as any;
    const currentBillingPeriod = new Date().toISOString().slice(0, 7);
    const { data, error } = await supabase
      .from("workspace_usage")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("billing_period", currentBillingPeriod)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data as WorkspaceUsage) ?? null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load usage data",
    };
  }
}
