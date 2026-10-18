import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import {
  kbEntries,
  kbEntriesRelations,
  workspaceMembers,
  workspaceMembersRelations,
  workspaces,
  workspacesRelations,
  workspaceUsage,
  workspaceUsageRelations,
} from "./schema";

const schema = {
  kbEntries,
  kbEntriesRelations,
  workspaceMembers,
  workspaceMembersRelations,
  workspaces,
  workspacesRelations,
  workspaceUsage,
  workspaceUsageRelations,
};

const connectionString = env.DATABASE_URL;

// Disable prepared statements for Supabase transaction pooler (pgbouncer / port 6543) compatibility
const client = postgres(connectionString, {
  prepare: false,
});

export const db = drizzle(client, { schema });
export type DatabaseInstance = typeof db;
