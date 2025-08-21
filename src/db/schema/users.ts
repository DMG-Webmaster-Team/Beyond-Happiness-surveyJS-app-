import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull().unique(),
    name: text("name"),
    phone: text("phone"),
    otp: text("otp"),
    status: text("status").default("active"),
    companyId: text("company_id"),
    companyName: text("company_name"),
    createdAt: integer("created_at").$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at").$defaultFn(() => Date.now()),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    statusIdx: index("status_idx").on(table.status),
    companyIdIdx: index("user_company_id_idx").on(table.companyId),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
