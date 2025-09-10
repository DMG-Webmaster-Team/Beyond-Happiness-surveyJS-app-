import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { surveys } from "./surveys";

export const userSurveySessions = sqliteTable(
  "user_survey_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    surveyId: text("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),

    // Survey configuration snapshot at session creation time
    surveyConfig: text("survey_config").notNull(), // JSON string of survey definition
    surveyTitle: text("survey_title").notNull(),
    surveyDescription: text("survey_description"),
    canTakeMultiple: integer("can_take_multiple", { mode: "boolean" }).default(
      false
    ),
    isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(false),

    // Session metadata
    status: text("status").notNull().default("active"), // active, completed, expired, abandoned
    progress: text("progress"), // JSON string of current progress/answers

    // Timestamps
    createdAt: integer("created_at").$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
    expiresAt: integer("expires_at"), // Session expiry timestamp
    completedAt: integer("completed_at"), // When survey was completed
  },
  (table) => ({
    userIdIdx: index("user_survey_session_user_id_idx").on(table.userId),
    surveyIdIdx: index("user_survey_session_survey_id_idx").on(table.surveyId),
    statusIdx: index("user_survey_session_status_idx").on(table.status),
    userSurveyIdx: index("user_survey_session_user_survey_idx").on(
      table.userId,
      table.surveyId
    ),
    expiresAtIdx: index("user_survey_session_expires_at_idx").on(
      table.expiresAt
    ),
  })
);

export type UserSurveySession = typeof userSurveySessions.$inferSelect;
export type NewUserSurveySession = typeof userSurveySessions.$inferInsert;

