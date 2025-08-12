import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { surveys } from "./surveys";
import { users } from "./users";
import { admins } from "./admins";

export const results = sqliteTable(
  "results",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id),
    userId: text("user_id").references(() => users.id),
    adminId: text("admin_id").references(() => admins.id),
    data: text("data").notNull(), // Survey response data as text
    submittedAt: integer("submitted_at").$defaultFn(() => Date.now()),
  },
  (table) => ({
    surveyIdIdx: index("result_survey_id_idx").on(table.surveyId),
    userIdIdx: index("result_user_id_idx").on(table.userId),
    submittedAtIdx: index("result_submitted_at_idx").on(table.submittedAt),
    surveyUserIdx: index("result_survey_user_idx").on(
      table.surveyId,
      table.userId
    ),
  })
);

export type Result = typeof results.$inferSelect;
export type NewResult = typeof results.$inferInsert;
