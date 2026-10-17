"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, ArrowLeftIcon, FileTextIcon } from "lucide-react";

import type { KBCategory } from "@/types/database";
import { createKbEntry } from "@/lib/actions/kb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useWorkspace } from "../../layout";

export default function NewKbEntryPage() {
  const router = useRouter();
  const { activeWorkspace, isLoading: wsLoading } = useWorkspace();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<KBCategory>("faq");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeWorkspace?.id) {
      setFormError("Active workspace is required. Please select or create one first.");
      return;
    }

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

    const res = await createKbEntry({
      workspaceId: activeWorkspace.id,
      title: trimmedTitle,
      content: trimmedContent,
      category,
    });

    setIsSubmitting(false);

    if (!res.success) {
      setFormError(res.error || "Failed to create knowledge base entry");
      return;
    }

    router.push("/knowledge-base");
    router.refresh();
  }

  if (wsLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading workspace context...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/knowledge-base" />}
          className="-ms-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Knowledge Base
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-xs">
        <div className="mb-6">
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground">
            New Knowledge Base Entry
          </h1>
          <p className="text-sm text-muted-foreground">
            Add a policy or FAQ for{" "}
            <span className="font-semibold text-foreground">
              {activeWorkspace?.name || "current workspace"}
            </span>
            .
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert variant="error">
              <AlertCircleIcon className="size-4" />
              <AlertTitle>Validation Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <label htmlFor="create-kb-title" className="text-xs font-medium text-foreground">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="create-kb-title"
              placeholder="e.g. Return Policy or Account Deletion Guide"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              autoFocus
              required
            />
            <p className="text-[11px] text-muted-foreground">Between 3 and 200 characters.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="create-kb-category" className="text-xs font-medium text-foreground">
              Category <span className="text-destructive">*</span>
            </label>
            <Select value={category} onValueChange={(val) => setCategory(val as KBCategory)}>
              <SelectTrigger id="create-kb-category">
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
              <label htmlFor="create-kb-content" className="text-xs font-medium text-foreground">
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
              id="create-kb-content"
              placeholder="Provide detailed instructions or facts. Clear text helps the AI customer reply drafter produce grounded, accurate responses..."
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
              {isSubmitting ? "Creating..." : "Create Entry"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
