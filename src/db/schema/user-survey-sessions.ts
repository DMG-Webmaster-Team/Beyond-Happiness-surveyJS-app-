import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { surveys } from "./surveys";

export const userSurveySessions = mysqlTable(
  "user_survey_sessions",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: varchar("user_id", { length: 128 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    surveyId: varchar("survey_id", { length: 128 })
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),

    // Survey configuration snapshot at session creation time
    surveyConfig: text("survey_config").notNull(), // JSON string of survey definition
    surveyTitle: varchar("survey_title", { length: 255 }).notNull(),
    surveyDescription: text("survey_description"),
    canTakeMultiple: boolean("can_take_multiple").default(false),
    isAnonymous: boolean("is_anonymous").default(false),

    // Session metadata
    status: varchar("status", { length: 50 }).notNull().default("active"), // active, completed, expired, abandoned
    progress: text("progress"), // JSON string of current progress/answers

    // Timestamps
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
    expiresAt: timestamp("expires_at"), // Session expiry timestamp
    completedAt: timestamp("completed_at"), // When survey was completed
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
