import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const admins = sqliteTable(
  "admins",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name").notNull(),
    createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    emailIdx: index("admin_email_idx").on(table.email),
  })
);

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
