import {
  mysqlTable,
  varchar,
  timestamp,
  index,
  primaryKey,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { surveys } from "./surveys";

export const userAssignments = mysqlTable(
  "user_assignments",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    surveyId: varchar("survey_id", { length: 255 })
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
    dueAt: timestamp("due_at"),
    status: varchar("status", { length: 50 }).default("pending"),
  },
  (table) => ({
    // Composite primary key for idempotent imports
    pk: primaryKey({ columns: [table.userId, table.surveyId] }),
    // Indexes for performance
    surveyIdIdx: index("assignment_survey_idx").on(table.surveyId),
    userIdIdx: index("assignment_user_idx").on(table.userId),
    statusIdx: index("assignment_status_idx").on(table.status),
    dueAtIdx: index("assignment_due_at_idx").on(table.dueAt),
  })
);

export type UserAssignment = typeof userAssignments.$inferSelect;
export type NewUserAssignment = typeof userAssignments.$inferInsert;
