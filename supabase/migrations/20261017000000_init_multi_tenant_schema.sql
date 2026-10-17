-- Supabase migration: Multi-tenant schema and Row-Level Security (RLS) setup
-- 20261017000000_init_multi_tenant_schema.sql

-- 1. Profiles table (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Workspace members table (junction between auth.users and workspaces)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_members_workspace_user_unique UNIQUE (workspace_id, user_id)
);

-- 4. Knowledge base entries table
CREATE TABLE IF NOT EXISTS public.kb_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL CHECK (category IN ('faq', 'policy')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Workspace usage tracking table
CREATE TABLE IF NOT EXISTS public.workspace_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  billing_period text NOT NULL CHECK (billing_period ~ '^\d{4}-\d{2}$'),
  draft_count integer NOT NULL DEFAULT 0,
  monthly_limit integer NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_usage_workspace_period_unique UNIQUE (workspace_id, billing_period)
);

-- Foreign key indexes for query performance and cascade efficiency
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON public.workspace_members (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON public.workspace_members (user_id);
CREATE INDEX IF NOT EXISTS idx_kb_entries_workspace_id ON public.kb_entries (workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_usage_workspace_id ON public.workspace_usage (workspace_id);

-- RLS Helper Functions
CREATE OR REPLACE FUNCTION public.is_workspace_member(ws_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(ws_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable Row-Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kb_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- Policies: Profiles
-- -------------------------------------------------------------
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- -------------------------------------------------------------
-- Policies: Workspaces
-- -------------------------------------------------------------
CREATE POLICY "workspaces_select_member" ON public.workspaces
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(id));

CREATE POLICY "workspaces_insert_authenticated" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "workspaces_update_owner" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (public.is_workspace_owner(id))
  WITH CHECK (public.is_workspace_owner(id));

-- -------------------------------------------------------------
-- Policies: Workspace Members
-- -------------------------------------------------------------
CREATE POLICY "workspace_members_select_member" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert_owner_or_creator" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_workspace_owner(workspace_id)
    OR (
      user_id = auth.uid()
      AND role = 'owner'
      AND NOT EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
      )
    )
  );

CREATE POLICY "workspace_members_update_owner" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (public.is_workspace_owner(workspace_id))
  WITH CHECK (public.is_workspace_owner(workspace_id));

CREATE POLICY "workspace_members_delete_owner" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (public.is_workspace_owner(workspace_id));

-- -------------------------------------------------------------
-- Policies: Knowledge Base Entries
-- -------------------------------------------------------------
CREATE POLICY "kb_entries_select_member" ON public.kb_entries
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "kb_entries_insert_member" ON public.kb_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "kb_entries_update_member" ON public.kb_entries
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "kb_entries_delete_member" ON public.kb_entries
  FOR DELETE TO authenticated
  USING (public.is_workspace_member(workspace_id));

-- -------------------------------------------------------------
-- Policies: Workspace Usage
-- -------------------------------------------------------------
CREATE POLICY "workspace_usage_select_member" ON public.workspace_usage
  FOR SELECT TO authenticated
  USING (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_usage_insert_member" ON public.workspace_usage
  FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(workspace_id));

CREATE POLICY "workspace_usage_update_member" ON public.workspace_usage
  FOR UPDATE TO authenticated
  USING (public.is_workspace_member(workspace_id))
  WITH CHECK (public.is_workspace_member(workspace_id));
