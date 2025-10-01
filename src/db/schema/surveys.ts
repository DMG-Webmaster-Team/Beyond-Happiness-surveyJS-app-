import {
  mysqlTable,
  varchar,
  text,
  json,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { admins } from "./admins";

export const surveys = mysqlTable(
  "surveys",
  {
    id: varchar("id", { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    definition: json("definition").notNull(), // SurveyJS JSON definition
    canTakeMultiple: boolean("can_take_multiple").default(false),
    isAnonymous: boolean("is_anonymous").default(false), // New: boolean field for anonymous surveys
    companyId: varchar("company_id", { length: 128 }),
    companyName: varchar("company_name", { length: 255 }),
    metadata: text("metadata"), // JSON string for additional data
    isActive: boolean("is_active").default(true), // true = visible in assignable forms
    isPublished: boolean("is_published").default(true), // false = "deleted" from admin UI
    createdBy: varchar("created_by", { length: 128 }).notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
    updatedAt: timestamp("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .onUpdateNow(),
  },
  (table) => ({
    createdByIdx: index("survey_created_by_idx").on(table.createdBy),
    createdAtIdx: index("survey_created_at_idx").on(table.createdAt),
    companyIdIdx: index("survey_company_id_idx").on(table.companyId),
  })
);

export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
