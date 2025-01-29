import { sql } from "drizzle-orm";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { EDDN, FSSSignalDiscovered } from "./eddn";

export const megaships = sqliteTable("megaships", {
  name: text().primaryKey(),
  system_id: integer().notNull(),
  system_name: text().notNull(),
  system_x: real().notNull(),
  system_y: real().notNull(),
  system_z: real().notNull(),
  last_update: integer().notNull(),
});

export async function updateMegaship(
  db: LibSQLDatabase,
  event: EDDN<FSSSignalDiscovered>,
  signal: FSSSignalDiscovered,
) {
  await db
    .insert(megaships)
    .values({
      name: signal.SignalName,
      system_id: event.message.SystemAddress,
      system_name: event.message.StarSystem,
      system_x: event.message.StarPos[0],
      system_y: event.message.StarPos[1],
      system_z: event.message.StarPos[2],
      last_update: Date.parse(signal.timestamp),
    })
    .onConflictDoUpdate({
      target: megaships.name,
      set: {
        system_id: sql`excluded.system_id`,
        system_name: sql`excluded.system_name`,
        system_x: sql`excluded.system_x`,
        system_y: sql`excluded.system_y`,
        system_z: sql`excluded.system_z`,
        last_update: sql`excluded.last_update`,
      },
      setWhere: sql`excluded.last_update > last_update`,
    });
}
