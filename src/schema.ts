import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const megaships = sqliteTable("megaships", {
  name: text().primaryKey(),
  system_id: integer().notNull(),
  system_name: text().notNull(),
  system_x: real().notNull(),
  system_y: real().notNull(),
  system_z: real().notNull(),
  last_update: integer().notNull(),
});
