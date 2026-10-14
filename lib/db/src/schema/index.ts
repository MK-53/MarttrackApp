import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const briefingsTable = pgTable("briefings", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  summary: text("summary").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  requestSnapshot: jsonb("request_snapshot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const storesTable = pgTable("stores", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  state: jsonb("state").$type<Record<string, unknown>>().notNull(),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const storeMembersTable = pgTable(
  "store_members",
  {
    id: text("id").primaryKey(),
    storeId: text("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role").$type<"owner" | "seller">().notNull(),
    pinHash: text("pin_hash").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  table => [
    index("store_members_store_id_idx").on(table.storeId),
    uniqueIndex("store_members_token_hash_idx").on(table.tokenHash),
  ],
);

// Export your models here. Add one export per file
// export * from "./posts";
//
// Each model/table should ideally be split into different files.
// Each model/table should define a Drizzle table, insert schema, and types:
//
//   import { pgTable, text, serial } from "drizzle-orm/pg-core";
//   import { createInsertSchema } from "drizzle-zod";
//   import { z } from "zod/v4";
//
//   export const postsTable = pgTable("posts", {
//     id: serial("id").primaryKey(),
//     title: text("title").notNull(),
//   });
//
//   export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true });
//   export type InsertPost = z.infer<typeof insertPostSchema>;
//   export type Post = typeof postsTable.$inferSelect;

export type Briefing = typeof briefingsTable.$inferSelect;
export type InsertBriefing = typeof briefingsTable.$inferInsert;
export type Store = typeof storesTable.$inferSelect;
export type StoreMemberRecord = typeof storeMembersTable.$inferSelect;