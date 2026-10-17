"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  AlertCircleIcon,
  BarChart3Icon,
  Building2Icon,
  CheckIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

import type { WorkspaceMemberDetail } from "@/lib/actions/workspaces";
import type { WorkspaceRole, WorkspaceUsage } from "@/types/database";
import {
  createWorkspace,
  getWorkspaceMembers,
  getWorkspaceUsage,
  inviteWorkspaceMember,
  switchActiveWorkspace,
} from "@/lib/actions/workspaces";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useWorkspace } from "../layout";

export default function WorkspacesPage() {
  const {
    workspaces,
    activeWorkspace,
    activeRole,
    user,
    isLoading: wsLoading,
    switchWorkspace,
    refreshWorkspaces,
  } = useWorkspace();

  const [members, setMembers] = useState<WorkspaceMemberDetail[]>([]);
  const [usage, setUsage] = useState<WorkspaceUsage | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Create Workspace Dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Invite Member Dialog
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("member");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const [isPending, startTransition] = useTransition();

  async function loadActiveDetails() {
    if (!activeWorkspace?.id) {
      setMembers([]);
      setUsage(null);
      return;
    }
    setLoadingDetails(true);
    const [membersRes, usageRes] = await Promise.all([
      getWorkspaceMembers(activeWorkspace.id),
      getWorkspaceUsage(activeWorkspace.id),
    ]);

    if (membersRes.success && membersRes.data) {
      setMembers(membersRes.data);
    }
    if (usageRes.success && usageRes.data) {
      setUsage(usageRes.data);
    }
    setLoadingDetails(false);
  }

  useEffect(() => {
    loadActiveDetails();
  }, [activeWorkspace?.id]);

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newWsName.trim();
    if (!trimmed) return;

    setIsCreating(true);
    setCreateError(null);

    const res = await createWorkspace({ name: trimmed });
    setIsCreating(false);

    if (!res.success) {
      setCreateError(res.error || "Failed to create workspace");
      return;
    }

    setNewWsName("");
    setCreateDialogOpen(false);
    await refreshWorkspaces();
  }

  async function handleInviteMember(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace?.id) return;

    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail) return;

    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    const res = await inviteWorkspaceMember(activeWorkspace.id, trimmedEmail, inviteRole);
    setIsInviting(false);

    if (!res.success) {
      setInviteError(res.error || "Failed to invite member");
      return;
    }

    setInviteEmail("");
    setInviteRole("member");
    setInviteSuccess(true);
    await loadActiveDetails();
    setTimeout(() => {
      setInviteSuccess(false);
      setInviteDialogOpen(false);
    }, 1500);
  }

  const isOwner = activeRole === "owner";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Workspaces & Team
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your workspaces, team member roles, and monthly drafting usage.
          </p>
        </div>
        <div>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm">
            <PlusIcon className="size-4" />
            New Workspace
          </Button>
        </div>
      </div>

      {/* Workspaces List Section */}
      <div className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">Your Workspaces</h2>
          <p className="text-xs text-muted-foreground">
            You can switch between different tenant workspaces below.
          </p>
        </div>

        {wsLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading workspaces...
          </div>
        ) : workspaces.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No workspaces found. Click "New Workspace" above to get started.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Your Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-28 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces.map((entry) => {
                  const isActive = entry.workspace.id === activeWorkspace?.id;
                  return (
                    <TableRow key={entry.workspace.id}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2Icon className="size-4 shrink-0 text-muted-foreground" />
                          <span>{entry.workspace.name}</span>
                          {isActive && (
                            <Badge variant="default" size="sm" className="gap-1 text-[10px]">
                              <CheckIcon className="size-3" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entry.workspace.slug}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={entry.role === "owner" ? "default" : "secondary"}
                          size="sm"
                          className="text-xs capitalize"
                        >
                          {entry.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                        {new Date(entry.workspace.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {isActive ? (
                          <span className="text-xs font-medium text-muted-foreground">
                            Selected
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => switchWorkspace(entry.workspace.id)}
                            className="h-7 text-xs"
                          >
                            Switch
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Active Workspace Details: Team Members & Usage */}
      {activeWorkspace && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Team Members List (2 Cols) */}
          <div className="space-y-4 rounded-xl border bg-card p-6 shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-primary" />
                  <h2 className="font-heading text-base font-semibold text-foreground">
                    Team Members
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Members with access to{" "}
                  <span className="font-medium text-foreground">{activeWorkspace.name}</span>.
                </p>
              </div>
              {isOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setInviteError(null);
                    setInviteSuccess(false);
                    setInviteDialogOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <UserPlusIcon className="size-3.5" />
                  Invite Member
                </Button>
              )}
            </div>

            {loadingDetails ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading members...
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User / Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {m.email || m.full_name || "Workspace Member"}
                            </span>
                            {m.user_id === user?.id && (
                              <span className="text-[11px] text-muted-foreground">(You)</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={m.role === "owner" ? "default" : "secondary"}
                            size="sm"
                            className="text-xs capitalize"
                          >
                            {m.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Usage & Limits Card (1 Col) */}
          <div className="space-y-4 rounded-xl border bg-card p-6 shadow-xs">
            <div className="flex items-center gap-2">
              <BarChart3Icon className="size-4 text-primary" />
              <h2 className="font-heading text-base font-semibold text-foreground">
                Monthly Usage
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Draft count limit for the current billing period.
            </p>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Billing Period</span>
                <span className="font-mono font-medium text-foreground">
                  {usage?.billing_period || new Date().toISOString().slice(0, 7)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-heading text-2xl font-bold text-foreground">
                  {usage?.draft_count ?? 0}
                </span>
                <span className="text-xs text-muted-foreground">
                  of {usage?.monthly_limit ?? 50} drafts used
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(((usage?.draft_count ?? 0) / (usage?.monthly_limit || 50)) * 100),
                    )}%`,
                  }}
                />
              </div>

              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                <SparklesIcon className="size-3 shrink-0 text-primary" />
                <span>
                  {(usage?.monthly_limit || 50) - (usage?.draft_count ?? 0)} AI draft replies
                  remaining
                </span>
              </div>
            </div>

            <div className="space-y-1 rounded-lg border p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 font-medium text-foreground">
                <ShieldCheckIcon className="size-3.5 text-primary" />
                <span>Tenant Isolation</span>
              </div>
              <p className="text-[11px]">
                Knowledge base policies and drafting counts are isolated per workspace via Supabase
                RLS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogPopup>
          <form onSubmit={handleCreateWorkspace}>
            <DialogHeader>
              <DialogTitle>Create New Workspace</DialogTitle>
              <DialogDescription>
                Set up a new workspace for your organization or customer support tier.
              </DialogDescription>
            </DialogHeader>

            <DialogPanel className="space-y-4">
              {createError && (
                <Alert variant="error">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Creation Error</AlertTitle>
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <label htmlFor="modal-ws-name" className="text-xs font-medium text-foreground">
                  Workspace Name <span className="text-destructive">*</span>
                </label>
                <Input
                  id="modal-ws-name"
                  placeholder="e.g. Acme Support Team"
                  value={newWsName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewWsName(e.target.value)
                  }
                  autoFocus
                  required
                />
                <p className="text-[11px] text-muted-foreground">Between 2 and 100 characters.</p>
              </div>
            </DialogPanel>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || newWsName.trim().length < 2}>
                {isCreating ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogPopup>
          <form onSubmit={handleInviteMember}>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Add a member to{" "}
                <span className="font-semibold text-foreground">{activeWorkspace?.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <DialogPanel className="space-y-4">
              {inviteError && (
                <Alert variant="error">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Invitation Error</AlertTitle>
                  <AlertDescription>{inviteError}</AlertDescription>
                </Alert>
              )}

              {inviteSuccess && (
                <Alert variant="success">
                  <AlertDescription>Member invited successfully!</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <label htmlFor="invite-email" className="text-xs font-medium text-foreground">
                  User Email <span className="text-destructive">*</span>
                </label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setInviteEmail(e.target.value)
                  }
                  autoFocus
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Must be the email address of a registered user.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="invite-role" className="text-xs font-medium text-foreground">
                  Role
                </label>
                <Select
                  value={inviteRole}
                  onValueChange={(val) => setInviteRole(val as WorkspaceRole)}
                >
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="member">Member (Can create & view entries)</SelectItem>
                    <SelectItem value="owner">
                      Owner (Can invite members & manage workspace)
                    </SelectItem>
                  </SelectPopup>
                </Select>
              </div>
            </DialogPanel>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isInviting || !inviteEmail.trim() || !inviteEmail.includes("@")}
              >
                {isInviting ? "Inviting..." : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
