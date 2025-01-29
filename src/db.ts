import { isThursday, previousThursday, setHours, startOfHour } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { eq } from "drizzle-orm";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { EDDN, FSSSignalDiscovered } from "./eddn";

const WEEKLY_TICK_HOUR = 7;

function getWeeklyTick(date: Date = new UTCDate()) {
  if (!isThursday(date) || date.getHours() < WEEKLY_TICK_HOUR) {
    date = previousThursday(date);
  }
  return startOfHour(setHours(date, WEEKLY_TICK_HOUR));
}

export const megaships = sqliteTable(
  "megaships",
  {
    name: text("name").notNull(),
    week: integer("week", { mode: "timestamp" }).notNull(),
    systemId: integer("system_id").notNull(),
    systemName: text("system_name").notNull(),
    systemX: real("system_x").notNull(),
    systemY: real("system_y").notNull(),
    systemZ: real("system_z").notNull(),
  },
  (table) => [primaryKey({ columns: [table.name, table.week] })],
);

export async function findMegaships(db: LibSQLDatabase, afterTick: boolean) {
  const query = db.select().from(megaships);
  if (afterTick) {
    return query.where(eq(megaships.week, getWeeklyTick()));
  }
  return query;
}

export async function updateMegaship(
  db: LibSQLDatabase,
  event: EDDN<FSSSignalDiscovered>,
  signal: FSSSignalDiscovered,
) {
  await db
    .insert(megaships)
    .values({
      name: signal.SignalName,
      week: getWeeklyTick(new Date(signal.timestamp)),
      systemId: event.message.SystemAddress,
      systemName: event.message.StarSystem,
      systemX: event.message.StarPos[0],
      systemY: event.message.StarPos[1],
      systemZ: event.message.StarPos[2],
    })
    .onConflictDoNothing();
}
