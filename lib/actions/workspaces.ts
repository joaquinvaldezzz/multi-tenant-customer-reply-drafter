"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";

import type { Workspace, WorkspaceMember, WorkspaceRole, WorkspaceUsage } from "@/types/database";
import { getCurrentUser } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { user as userTable, workspaceMembers, workspaces, workspaceUsage } from "@/lib/db/schema";

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

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const slug = slugify(name);

    // 1. Insert workspace
    const [insertedWs] = await db.insert(workspaces).values({ name, slug }).returning();

    const newWorkspace: Workspace = {
      id: insertedWs.id,
      name: insertedWs.name,
      slug: insertedWs.slug,
      created_at: insertedWs.createdAt.toISOString(),
    };

    // 2. Insert workspace creator as owner
    await db.insert(workspaceMembers).values({
      workspaceId: newWorkspace.id,
      userId: user.id,
      role: "owner",
    });

    // 3. Initialize workspace usage for current billing period (YYYY-MM)
    const currentBillingPeriod = new Date().toISOString().slice(0, 7);
    try {
      await db.insert(workspaceUsage).values({
        workspaceId: newWorkspace.id,
        billingPeriod: currentBillingPeriod,
        draftCount: 0,
        monthlyLimit: 50,
      });
    } catch {
      // Optional usage record creation failure should not block workspace creation
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

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    // Verify user is a member of this workspace
    const membership = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id),
      ),
    });

    if (!membership) {
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
    if (!trimmedEmail.includes("@")) {
      return { success: false, error: "A valid email address is required" };
    }

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    // Look up user profile by email
    const [profile] = await db
      .select({ id: userTable.id, email: userTable.email })
      .from(userTable)
      .where(eq(userTable.email, trimmedEmail))
      .limit(1);

    if (!profile) {
      return {
        success: false,
        error: "No registered user found with that email address",
      };
    }

    // Check if already a member
    const existingMember = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, profile.id),
      ),
    });

    if (existingMember) {
      return { success: false, error: "This user is already a member of this workspace" };
    }

    const [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId: profile.id,
        role,
      })
      .returning();

    revalidatePath("/workspaces");
    return {
      success: true,
      data: {
        id: member.id,
        workspace_id: member.workspaceId,
        user_id: member.userId,
        role: member.role,
        created_at: member.createdAt.toISOString(),
      },
    };
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
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: true,
        data: { user: null, workspaces: [], activeWorkspaceId: null },
      };
    }

    const members = await db.query.workspaceMembers.findMany({
      where: eq(workspaceMembers.userId, user.id),
      with: { workspace: true },
    });

    const workspacesList: WorkspaceWithRole[] = members
      .filter((m) => m.workspace)
      .map((m) => ({
        workspace: {
          id: m.workspace.id,
          name: m.workspace.name,
          slug: m.workspace.slug,
          created_at: m.workspace.createdAt.toISOString(),
        },
        role: m.role,
      }));

    const cookieStore = await cookies();
    let activeWorkspaceId = cookieStore.get("active_workspace_id")?.value ?? null;

    const isValidActive = workspacesList.some((w) => w.workspace.id === activeWorkspaceId);
    if (!isValidActive) {
      activeWorkspaceId = workspacesList.length > 0 ? workspacesList[0].workspace.id : null;
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
        workspaces: workspacesList,
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
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized: Active user session required" };
    }

    const members = await db
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        createdAt: workspaceMembers.createdAt,
        email: userTable.email,
        fullName: userTable.name,
      })
      .from(workspaceMembers)
      .leftJoin(userTable, eq(workspaceMembers.userId, userTable.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(workspaceMembers.createdAt);

    const details: WorkspaceMemberDetail[] = members.map((m) => ({
      id: m.id,
      workspace_id: m.workspaceId,
      user_id: m.userId,
      role: m.role,
      created_at: m.createdAt.toISOString(),
      email: m.email ?? null,
      full_name: m.fullName ?? null,
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
    const currentBillingPeriod = new Date().toISOString().slice(0, 7);
    const usage = await db.query.workspaceUsage.findFirst({
      where: and(
        eq(workspaceUsage.workspaceId, workspaceId),
        eq(workspaceUsage.billingPeriod, currentBillingPeriod),
      ),
    });

    if (!usage) {
      return { success: true, data: null };
    }

    const result: WorkspaceUsage = {
      id: usage.id,
      workspace_id: usage.workspaceId,
      billing_period: usage.billingPeriod,
      draft_count: usage.draftCount,
      monthly_limit: usage.monthlyLimit,
      updated_at: usage.updatedAt.toISOString(),
    };

    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load usage data",
    };
  }
}
