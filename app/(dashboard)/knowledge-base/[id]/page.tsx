"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircleIcon, ArrowLeftIcon, ClockIcon, SaveIcon, Trash2Icon } from "lucide-react";

import type { KBCategory, KBEntry } from "@/types/database";
import { deleteKbEntry, getKbEntryById, updateKbEntry } from "@/lib/actions/kb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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
import { Textarea } from "@/components/ui/textarea";

function EditKbEntryContent() {
  const params = useParams();
  const router = useRouter();
  const id =
    typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [entry, setEntry] = useState<KBEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<KBCategory>("faq");
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const res = await getKbEntryById(id);
      if (res.success && res.data) {
        setEntry(res.data);
        setTitle(res.data.title);
        setContent(res.data.content);
        setCategory(res.data.category);
      } else {
        setLoadError(res.error || "Entry not found");
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

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
    setSaveSuccess(false);

    const res = await updateKbEntry(id, {
      title: trimmedTitle,
      content: trimmedContent,
      category,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || "Failed to update entry");
      return;
    }

    if (res.data) {
      setEntry(res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  async function handleDelete() {
    if (!id) return;
    setIsDeleting(true);
    const res = await deleteKbEntry(id);
    setIsDeleting(false);

    if (res.success) {
      router.push("/knowledge-base");
      router.refresh();
    } else {
      setFormError(res.error || "Failed to delete entry");
      setDeleteDialogOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading knowledge base entry...
      </div>
    );
  }

  if (loadError || !entry) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-8">
        <Alert variant="error">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>Entry Not Found</AlertTitle>
          <AlertDescription>
            {loadError ||
              "The requested knowledge base entry does not exist or you do not have permission to view it."}
          </AlertDescription>
        </Alert>
        <Button variant="outline" render={<Link href="/knowledge-base" />}>
          <ArrowLeftIcon className="size-4" />
          Back to Knowledge Base
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button and actions */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/knowledge-base" />}
          className="-ms-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Knowledge Base
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2Icon className="size-3.5" />
          Delete
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <div className="mb-6 flex items-start justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
              Edit Knowledge Base Entry
            </h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ClockIcon className="size-3" />
                Updated {new Date(entry.updated_at).toLocaleDateString()}
              </span>
              <Badge variant={entry.category === "faq" ? "info" : "secondary"} size="sm">
                {entry.category === "faq" ? "FAQ" : "Policy"}
              </Badge>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && (
            <Alert variant="error">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Validation Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {saveSuccess && (
            <Alert variant="success">
              <AlertDescription>Changes saved successfully!</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <label htmlFor="edit-kb-title" className="text-xs font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="edit-kb-title"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              required
            />
            <p className="text-[11px] text-muted-foreground">Between 3 and 200 characters.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-kb-category" className="text-xs font-medium text-foreground">
              Category <span className="text-destructive">*</span>
            </label>
            <Select value={category} onValueChange={(val) => setCategory(val as KBCategory)}>
              <SelectTrigger id="edit-kb-category">
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
              <label htmlFor="edit-kb-content" className="text-xs font-medium text-foreground">
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
              id="edit-kb-content"
              rows={8}
              value={content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Capped at 10,000 characters to prevent prompt bloat.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              render={<Link href="/knowledge-base" />}
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
              <SaveIcon className="size-4" />
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Delete Knowledge Base Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
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

export default function EditKbEntryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="py-12 text-center text-sm text-muted-foreground">Loading entry...</div>
      }
    >
      <EditKbEntryContent />
    </React.Suspense>
  );
}
