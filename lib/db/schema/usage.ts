import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { workspaces } from "./workspaces";

export const workspaceUsage = pgTable(
  "workspace_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    billingPeriod: text("billing_period").notNull(),
    draftCount: integer("draft_count").notNull().default(0),
    monthlyLimit: integer("monthly_limit").notNull().default(50),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("workspace_usage_workspace_period_unique").on(table.workspaceId, table.billingPeriod),
  ],
);

export const workspaceUsageRelations = relations(workspaceUsage, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceUsage.workspaceId],
    references: [workspaces.id],
  }),
}));
