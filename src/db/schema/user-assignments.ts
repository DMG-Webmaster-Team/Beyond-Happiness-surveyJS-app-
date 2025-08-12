import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { surveys } from "./surveys";

export const userAssignments = sqliteTable(
  "user_assignments",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    assignedAt: integer("assigned_at").$defaultFn(() => Date.now()),
    dueAt: integer("due_at"),
    status: text("status").default("pending"),
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
