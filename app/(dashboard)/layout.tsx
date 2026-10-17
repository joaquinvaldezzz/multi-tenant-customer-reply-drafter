"use client";

import React, {
  createContext,
  Suspense,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircleIcon,
  BookOpenIcon,
  BotIcon,
  Building2Icon,
  CheckIcon,
  ChevronsUpDownIcon,
  PlusIcon,
} from "lucide-react";

import type { WorkspaceWithRole } from "@/lib/actions/workspaces";
import type { Workspace, WorkspaceRole } from "@/types/database";
import {
  createWorkspace,
  getUserWorkspaces,
  switchActiveWorkspace,
} from "@/lib/actions/workspaces";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  Menu,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";

export interface WorkspaceContextType {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: Workspace | null;
  activeRole: WorkspaceRole | null;
  user: { id: string; email: string | null } | null;
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  activeWorkspace: null,
  activeRole: null,
  user: null,
  isLoading: true,
  switchWorkspace: async () => {},
  refreshWorkspaces: async () => {},
});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}

function DashboardHeader({
  activeWorkspace,
  activeRole,
  activeWorkspaceId,
  workspaces,
  user,
  onSwitchWorkspace,
  onOpenCreateDialog,
}: {
  activeWorkspace: Workspace | null;
  activeRole: WorkspaceRole | null;
  activeWorkspaceId: string | null;
  workspaces: WorkspaceWithRole[];
  user: { id: string; email: string | null } | null;
  onSwitchWorkspace: (id: string) => void;
  onOpenCreateDialog: () => void;
}) {
  const pathname = usePathname();

  const navLinks = [
    {
      href: "/knowledge-base",
      label: "Knowledge Base",
      icon: BookOpenIcon,
      active: pathname.startsWith("/knowledge-base"),
    },
    {
      href: "/workspaces",
      label: "Workspaces & Team",
      icon: Building2Icon,
      active: pathname.startsWith("/workspaces"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          {/* App Brand */}
          <Link
            href="/knowledge-base"
            className="flex items-center gap-2 font-heading font-semibold tracking-tight text-foreground"
          >
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <BotIcon className="size-4" />
            </div>
            <span className="hidden sm:inline-block">ReplyDrafter</span>
          </Link>

          {/* Workspace Switcher */}
          <div className="flex items-center">
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 max-w-56 gap-2 px-2.5 text-xs font-medium"
                  />
                }
              >
                <Building2Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {activeWorkspace ? activeWorkspace.name : "Select Workspace"}
                </span>
                {activeRole && (
                  <Badge variant="secondary" size="sm" className="px-1 text-[10px] capitalize">
                    {activeRole}
                  </Badge>
                )}
                <ChevronsUpDownIcon className="ms-auto size-3 shrink-0 text-muted-foreground" />
              </MenuTrigger>
              <MenuPopup align="start" className="w-56">
                <MenuGroupLabel>Workspaces</MenuGroupLabel>
                {workspaces.map((entry) => (
                  <MenuItem
                    key={entry.workspace.id}
                    onClick={() => onSwitchWorkspace(entry.workspace.id)}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{entry.workspace.name}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge variant="outline" size="sm" className="text-[9px] capitalize">
                        {entry.role}
                      </Badge>
                      {entry.workspace.id === activeWorkspaceId && (
                        <CheckIcon className="size-3.5 text-primary" />
                      )}
                    </div>
                  </MenuItem>
                ))}
                <MenuSeparator />
                <MenuItem
                  onClick={onOpenCreateDialog}
                  className="gap-2 font-medium text-primary focus:text-primary"
                >
                  <PlusIcon className="size-3.5" />
                  <span>Create Workspace</span>
                </MenuItem>
              </MenuPopup>
            </Menu>
          </div>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    link.active
                      ? "bg-accent font-semibold text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side status / user */}
        <div className="flex items-center gap-3">
          {user?.email && (
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <span className="max-w-40 truncate">{user.email}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="flex gap-2 border-t bg-background px-4 py-2 md:hidden">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium ${
                link.active
                  ? "bg-accent font-semibold text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-3.5" />
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [workspaces, setWorkspaces] = useState<WorkspaceWithRole[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create Workspace Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function loadData() {
    setIsLoading(true);
    const res = await getUserWorkspaces();
    if (res.success && res.data) {
      setUser(res.data.user);
      setWorkspaces(res.data.workspaces);
      setActiveWorkspaceId(res.data.activeWorkspaceId);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const activeEntry = workspaces.find((w) => w.workspace.id === activeWorkspaceId);
  const activeWorkspace = activeEntry?.workspace ?? null;
  const activeRole = activeEntry?.role ?? null;

  async function handleSwitchWorkspace(workspaceId: string) {
    startTransition(async () => {
      const res = await switchActiveWorkspace(workspaceId);
      if (res.success) {
        setActiveWorkspaceId(workspaceId);
        router.refresh();
      }
    });
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    setIsCreating(true);
    setCreateError(null);

    const res = await createWorkspace({ name: newWorkspaceName.trim() });
    setIsCreating(false);

    if (!res.success) {
      setCreateError(res.error || "Failed to create workspace");
      return;
    }

    if (res.data) {
      setNewWorkspaceName("");
      setCreateDialogOpen(false);
      await loadData();
      router.refresh();
    }
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        activeRole,
        user,
        isLoading,
        switchWorkspace: handleSwitchWorkspace,
        refreshWorkspaces: loadData,
      }}
    >
      <div className="flex min-h-screen flex-col bg-muted/20">
        <Suspense
          fallback={
            <header className="sticky top-0 z-40 h-14 border-b bg-background/95 backdrop-blur-md" />
          }
        >
          <DashboardHeader
            activeWorkspace={activeWorkspace}
            activeRole={activeRole}
            activeWorkspaceId={activeWorkspaceId}
            workspaces={workspaces}
            user={user}
            onSwitchWorkspace={handleSwitchWorkspace}
            onOpenCreateDialog={() => {
              setCreateError(null);
              setCreateDialogOpen(true);
            }}
          />
        </Suspense>

        {/* Main Content Area */}
        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogPopup>
          <form onSubmit={handleCreateWorkspace}>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
              <DialogDescription>
                Workspaces isolate knowledge base policies, FAQ entries, and team members.
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="space-y-4">
              {createError && (
                <Alert variant="error">
                  <AlertCircleIcon className="size-4" />
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <label htmlFor="ws-name" className="text-xs font-medium text-foreground">
                  Workspace Name
                </label>
                <Input
                  id="ws-name"
                  placeholder="e.g. Acme Support Team"
                  value={newWorkspaceName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewWorkspaceName(e.target.value)
                  }
                  autoFocus
                  required
                />
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
              <Button type="submit" disabled={isCreating || !newWorkspaceName.trim()}>
                {isCreating ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </WorkspaceContext.Provider>
  );
}
