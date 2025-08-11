import { 
  mysqlTable, 
  varchar, 
  timestamp, 
  boolean,
  json,
  text,
  index
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";
import { admins } from "./admins";

export const surveys = mysqlTable("surveys", {
  id: varchar("id", { length: 128 }).primaryKey().$defaultFn(() => createId()),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  definition: json("definition").notNull(), // SurveyJS JSON definition
  canTakeMultiple: boolean("can_take_multiple").default(false),
  createdBy: varchar("created_by", { length: 128 }).notNull().references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  createdByIdx: index("survey_created_by_idx").on(table.createdBy),
  createdAtIdx: index("survey_created_at_idx").on(table.createdAt),
}));

export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
