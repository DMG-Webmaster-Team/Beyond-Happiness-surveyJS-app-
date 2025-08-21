import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const companies = sqliteTable(
  "companies",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: integer("created_at").$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
  },
  (table) => ({
    nameIdx: index("company_name_idx").on(table.name),
    createdAtIdx: index("company_created_at_idx").on(table.createdAt),
  })
);

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
