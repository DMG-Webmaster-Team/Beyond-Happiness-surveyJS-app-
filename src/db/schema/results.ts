import {
  mysqlTable,
  varchar,
  json,
  timestamp,
  index,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";
import { surveys } from "./surveys";
import { users } from "./users";
import { admins } from "./admins";

export const results = mysqlTable(
  "results",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    surveyId: varchar("survey_id", { length: 255 })
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 }).references(() => users.id, {
      onDelete: "cascade",
    }),
    adminId: varchar("admin_id", { length: 255 }).references(() => admins.id, {
      onDelete: "cascade",
    }),
    data: json("data").notNull(), // Survey response data as JSON
    submittedAt: timestamp("submitted_at").default(sql`CURRENT_TIMESTAMP`),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
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
