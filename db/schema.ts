import { mysqlTable, serial, varchar, timestamp, uniqueIndex } from "drizzle-orm/mysql-core";

export const subscribers = mysqlTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("subscribers_email_unique").on(table.email)],
);
