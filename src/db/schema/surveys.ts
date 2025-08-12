import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { admins } from "./admins";

export const surveys = sqliteTable(
  "surveys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    title: text("title").notNull(),
    description: text("description"),
    definition: text("definition").notNull(), // SurveyJS JSON definition as text
    canTakeMultiple: integer("can_take_multiple", { mode: "boolean" }).default(
      false
    ),
    createdBy: text("created_by")
      .notNull()
      .references(() => admins.id),
    createdAt: integer("created_at").$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
  },
  (table) => ({
    createdByIdx: index("survey_created_by_idx").on(table.createdBy),
    createdAtIdx: index("survey_created_at_idx").on(table.createdAt),
  })
);

export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
