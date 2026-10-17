"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircleIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HelpCircleIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";

import type { KBCategory, KBEntry } from "@/types/database";
import { createKbEntry, deleteKbEntry, getKbEntries, updateKbEntry } from "@/lib/actions/kb";
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
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
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useWorkspace } from "../layout";

export default function KnowledgeBasePage() {
  const { activeWorkspace, isLoading: wsLoading } = useWorkspace();
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog State (Create / Edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KBEntry | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<KBCategory>("faq");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation dialog
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadEntries() {
    if (!activeWorkspace?.id) {
      setEntries([]);
      return;
    }
    setLoadingEntries(true);
    const res = await getKbEntries(activeWorkspace.id);
    if (res.success && res.data) {
      setEntries(res.data);
    }
    setLoadingEntries(false);
  }

  useEffect(() => {
    loadEntries();
  }, [activeWorkspace?.id]);

  function openCreateDialog() {
    setEditingEntry(null);
    setTitle("");
    setContent("");
    setCategory("faq");
    setFormError(null);
    setDialogOpen(true);
  }

  function openEditDialog(entry: KBEntry) {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setCategory(entry.category);
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace?.id) {
      setFormError("Active workspace required");
      return;
    }

    // Client-side validations matching Zod schema
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (trimmedTitle.length < 3) {
      setFormError("Title must be at least 3 characters");
      return;
    }
    if (trimmedTitle.length > 200) {
      setFormError("Title must not exceed 200 characters");
      return;
    }
    if (trimmedContent.length < 10) {
      setFormError("Content must be at least 10 characters");
      return;
    }
    if (trimmedContent.length > 10000) {
      setFormError("Content must not exceed 10,000 characters");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    if (editingEntry) {
      const res = await updateKbEntry(editingEntry.id, {
        title: trimmedTitle,
        content: trimmedContent,
        category,
      });
      setIsSubmitting(false);
      if (!res.success) {
        setFormError(res.error || "Failed to update entry");
        return;
      }
    } else {
      const res = await createKbEntry({
        workspaceId: activeWorkspace.id,
        title: trimmedTitle,
        content: trimmedContent,
        category,
      });
      setIsSubmitting(false);
      if (!res.success) {
        setFormError(res.error || "Failed to create entry");
        return;
      }
    }

    setDialogOpen(false);
    await loadEntries();
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    const res = await deleteKbEntry(deleteId);
    setIsDeleting(false);
    setDeleteId(null);
    if (res.success) {
      await loadEntries();
    }
  }

  const filteredEntries = entries.filter((entry) => {
    const matchesCategory = categoryFilter === "all" || entry.category === categoryFilter;
    const matchesSearch =
      !searchQuery ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!wsLoading && !activeWorkspace) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <BookOpenIcon className="size-6 text-muted-foreground" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>No Active Workspace</EmptyTitle>
          <EmptyDescription>
            Select or create a workspace to manage policies and FAQ knowledge base items.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link href="/workspaces" />}>Go to Workspaces</Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Knowledge Base
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage company policies and FAQs used to ground AI reply drafts for{" "}
            <span className="font-semibold text-foreground">
              {activeWorkspace?.name || "your workspace"}
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} size="sm">
            <PlusIcon className="size-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <Tabs value={categoryFilter} onValueChange={(val) => setCategoryFilter(val as string)}>
          <TabsList size="sm">
            <TabsTab value="all">All ({entries.length})</TabsTab>
            <TabsTab value="faq">
              <HelpCircleIcon className="me-1.5 size-3.5" />
              FAQs ({entries.filter((e) => e.category === "faq").length})
            </TabsTab>
            <TabsTab value="policy">
              <FileTextIcon className="me-1.5 size-3.5" />
              Policies ({entries.filter((e) => e.category === "policy").length})
            </TabsTab>
          </TabsList>
        </Tabs>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search entries..."
            size="sm"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      {loadingEntries ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          Loading knowledge base entries...
        </div>
      ) : filteredEntries.length === 0 ? (
        <Empty className="rounded-xl border bg-card">
          <EmptyMedia variant="icon">
            <BookOpenIcon className="size-6 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No entries found</EmptyTitle>
            <EmptyDescription>
              {searchQuery || categoryFilter !== "all"
                ? "No entries match your current search and filter criteria."
                : "Add your first policy or FAQ to help ground AI reply drafts."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {searchQuery || categoryFilter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCategoryFilter("all");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            ) : (
              <Button size="sm" onClick={openCreateDialog}>
                <PlusIcon className="size-4" />
                Add your first policy or FAQ
              </Button>
            )}
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/knowledge-base/${entry.id}`}
                        className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
                      >
                        {entry.title}
                      </Link>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {entry.content}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.category === "faq" ? "info" : "secondary"} size="sm">
                      {entry.category === "faq" ? "FAQ" : "Policy"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {new Date(entry.updated_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Menu>
                      <MenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                          />
                        }
                      >
                        <MoreVerticalIcon className="size-4" />
                      </MenuTrigger>
                      <MenuPopup align="end" className="w-36">
                        <MenuItem onClick={() => openEditDialog(entry)} className="gap-2">
                          <PencilIcon className="size-3.5" />
                          <span>Edit</span>
                        </MenuItem>
                        <MenuItem
                          render={<Link href={`/knowledge-base/${entry.id}`} />}
                          className="gap-2"
                        >
                          <ExternalLinkIcon className="size-3.5" />
                          <span>Open</span>
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                          variant="destructive"
                          onClick={() => setDeleteId(entry.id)}
                          className="gap-2"
                        >
                          <Trash2Icon className="size-3.5" />
                          <span>Delete</span>
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / Edit Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPopup className="max-w-xl">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "Edit Knowledge Base Entry" : "New Knowledge Base Entry"}
              </DialogTitle>
              <DialogDescription>
                {editingEntry
                  ? "Update this policy or FAQ entry to keep AI grounding accurate."
                  : "Add a company policy or customer FAQ for grounding AI drafted replies."}
              </DialogDescription>
            </DialogHeader>

            <DialogPanel className="space-y-4">
              {formError && (
                <Alert variant="error">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Validation Error</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <label htmlFor="kb-title" className="text-xs font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  id="kb-title"
                  placeholder="e.g. 30-Day Return Policy or How to reset password"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  autoFocus
                  required
                />
                <p className="text-[11px] text-muted-foreground">Between 3 and 200 characters.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="kb-category" className="text-xs font-medium text-foreground">
                  Category <span className="text-destructive">*</span>
                </label>
                <Select value={category} onValueChange={(val) => setCategory(val as KBCategory)}>
                  <SelectTrigger id="kb-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="faq">FAQ (Frequently Asked Question)</SelectItem>
                    <SelectItem value="policy">Policy (Company Terms & Guidelines)</SelectItem>
                  </SelectPopup>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="kb-content" className="text-xs font-medium text-foreground">
                    Content <span className="text-destructive">*</span>
                  </label>
                  <span
                    className={`text-[11px] ${
                      content.length > 10000
                        ? "font-semibold text-destructive"
                        : content.length > 9000
                          ? "text-warning"
                          : "text-muted-foreground"
                    }`}
                  >
                    {content.length.toLocaleString()} / 10,000
                  </span>
                </div>
                <Textarea
                  id="kb-content"
                  placeholder="Detail the answer, terms, or guidelines here. Clear instructions directly improve AI draft quality..."
                  rows={6}
                  value={content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setContent(e.target.value)
                  }
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Capped at 10,000 characters to prevent prompt bloat during LLM reply generation.
                </p>
              </div>
            </DialogPanel>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  title.trim().length < 3 ||
                  content.trim().length < 10 ||
                  content.length > 10000
                }
              >
                {isSubmitting ? "Saving..." : editingEntry ? "Save Changes" : "Create Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Delete Knowledge Base Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone and will
              remove it from AI draft context.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Entry"}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
