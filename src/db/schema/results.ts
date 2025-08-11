import { 
  mysqlTable, 
  varchar, 
  timestamp,
  json,
  index
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";
import { surveys } from "./surveys";
import { users } from "./users";
import { admins } from "./admins";

export const results = mysqlTable("results", {
  id: varchar("id", { length: 128 }).primaryKey().$defaultFn(() => createId()),
  surveyId: varchar("survey_id", { length: 128 }).notNull().references(() => surveys.id),
  userId: varchar("user_id", { length: 128 }).references(() => users.id),
  adminId: varchar("admin_id", { length: 128 }).references(() => admins.id),
  data: json("data").notNull(), // Survey response data
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => ({
  surveyIdIdx: index("result_survey_id_idx").on(table.surveyId),
  userIdIdx: index("result_user_id_idx").on(table.userId),
  submittedAtIdx: index("result_submitted_at_idx").on(table.submittedAt),
  surveyUserIdx: index("result_survey_user_idx").on(table.surveyId, table.userId),
}));

export type Result = typeof results.$inferSelect;
export type NewResult = typeof results.$inferInsert;
