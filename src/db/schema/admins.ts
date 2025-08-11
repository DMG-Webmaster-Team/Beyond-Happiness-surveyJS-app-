import { 
  mysqlTable, 
  varchar, 
  timestamp,
  index
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

export const admins = mysqlTable("admins", {
  id: varchar("id", { length: 128 }).primaryKey().$defaultFn(() => createId()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  emailIdx: index("admin_email_idx").on(table.email),
}));

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
