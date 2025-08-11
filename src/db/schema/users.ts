import { 
  mysqlTable, 
  varchar, 
  timestamp, 
  boolean, 
  int,
  index
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 128 }).primaryKey().$defaultFn(() => createId()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  name: varchar("name", { length: 255 }),
  otp: varchar("otp", { length: 10 }),
  assignedSurveyId: varchar("assigned_survey_id", { length: 128 }),
  hasSubmitted: boolean("has_submitted").default(false),
  submittedAt: timestamp("submitted_at"),
  companyId: int("company_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  emailIdx: index("email_idx").on(table.email),
  assignedSurveyIdx: index("assigned_survey_idx").on(table.assignedSurveyId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
