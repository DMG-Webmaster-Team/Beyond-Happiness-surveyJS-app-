import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  decimal,
  index,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";

export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    otp: varchar("otp", { length: 10 }),
    status: varchar("status", { length: 50 }).default("active"),
    companyId: varchar("company_id", { length: 128 }),
    companyName: varchar("company_name", { length: 255 }),
    assignedSurveyId: varchar("assigned_survey_id", { length: 255 }),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    statusIdx: index("status_idx").on(table.status),
    companyIdIdx: index("user_company_id_idx").on(table.companyId),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
