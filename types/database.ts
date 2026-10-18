import type { kbEntries, workspaceMembers, workspaces, workspaceUsage } from "@/lib/db/schema";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type WorkspaceRole = "owner" | "member";
export type KBCategory = "faq" | "policy";

// Drizzle inferred types
export type WorkspaceSelect = InferSelectModel<typeof workspaces>;
export type WorkspaceInsertDrizzle = InferInsertModel<typeof workspaces>;
export type WorkspaceMemberSelect = InferSelectModel<typeof workspaceMembers>;
export type WorkspaceMemberInsertDrizzle = InferInsertModel<typeof workspaceMembers>;
export type KBEntrySelect = InferSelectModel<typeof kbEntries>;
export type KBEntryInsertDrizzle = InferInsertModel<typeof kbEntries>;
export type WorkspaceUsageSelect = InferSelectModel<typeof workspaceUsage>;
export type WorkspaceUsageInsertDrizzle = InferInsertModel<typeof workspaceUsage>;

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export interface ProfileInsert {
  id: string;
  email?: string | null;
  full_name?: string | null;
  created_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  email?: string | null;
  full_name?: string | null;
  created_at?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface WorkspaceInsert {
  id?: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface WorkspaceUpdate {
  id?: string;
  name?: string;
  slug?: string;
  created_at?: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
}

export interface WorkspaceMemberInsert {
  id?: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at?: string;
}

export interface WorkspaceMemberUpdate {
  id?: string;
  workspace_id?: string;
  user_id?: string;
  role?: WorkspaceRole;
  created_at?: string;
}

export interface KBEntry {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  category: KBCategory;
  created_at: string;
  updated_at: string;
}

export interface KBEntryInsert {
  id?: string;
  workspace_id: string;
  title: string;
  content: string;
  category: KBCategory;
  created_at?: string;
  updated_at?: string;
}

export interface KBEntryUpdate {
  id?: string;
  workspace_id?: string;
  title?: string;
  content?: string;
  category?: KBCategory;
  created_at?: string;
  updated_at?: string;
}

export interface WorkspaceUsage {
  id: string;
  workspace_id: string;
  billing_period: string;
  draft_count: number;
  monthly_limit: number;
  updated_at: string;
}

export interface WorkspaceUsageInsert {
  id?: string;
  workspace_id: string;
  billing_period: string;
  draft_count?: number;
  monthly_limit?: number;
  updated_at?: string;
}

export interface WorkspaceUsageUpdate {
  id?: string;
  workspace_id?: string;
  billing_period?: string;
  draft_count?: number;
  monthly_limit?: number;
  updated_at?: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      workspaces: {
        Row: Workspace;
        Insert: WorkspaceInsert;
        Update: WorkspaceUpdate;
        Relationships: [];
      };
      workspace_members: {
        Row: WorkspaceMember;
        Insert: WorkspaceMemberInsert;
        Update: WorkspaceMemberUpdate;
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_entries: {
        Row: KBEntry;
        Insert: KBEntryInsert;
        Update: KBEntryUpdate;
        Relationships: [
          {
            foreignKeyName: "kb_entries_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_usage: {
        Row: WorkspaceUsage;
        Insert: WorkspaceUsageInsert;
        Update: WorkspaceUsageUpdate;
        Relationships: [
          {
            foreignKeyName: "workspace_usage_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_workspace_member: {
        Args: { ws_id: string };
        Returns: boolean;
      };
      is_workspace_owner: {
        Args: { ws_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      workspace_role: WorkspaceRole;
      kb_category: KBCategory;
    };
    CompositeTypes: Record<never, never>;
  };
}
