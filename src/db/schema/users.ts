import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    name: text("name"),
    otp: text("otp"),
    assignedSurveyId: text("assigned_survey_id"),
    hasSubmitted: integer("has_submitted", { mode: "boolean" }).default(false),
    submittedAt: text("submitted_at"),
    companyId: integer("company_id"),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    assignedSurveyIdx: index("assigned_survey_idx").on(table.assignedSurveyId),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
