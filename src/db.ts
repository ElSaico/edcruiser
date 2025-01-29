import { isThursday, previousThursday, setHours, startOfHour } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import { eq, sql } from "drizzle-orm";
import { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

import { FSDJump } from "./eddn";

const WEEKLY_TICK_HOUR = 7;

function getWeeklyTick(date: Date = new UTCDate()) {
  if (!isThursday(date) || date.getHours() < WEEKLY_TICK_HOUR) {
    date = previousThursday(date);
  }
  return startOfHour(setHours(date, WEEKLY_TICK_HOUR));
}

export const systems = sqliteTable(
  "systems",
  {
    id64: integer("id64").primaryKey(),
    name: text("name").notNull(),
    x: real("x").notNull(),
    y: real("y").notNull(),
    z: real("z").notNull(),
    power: text("power"),
  },
  (table) => [index("power_idx").on(table.power)],
);

export const megaships = sqliteTable(
  "megaships",
  {
    name: text("name").notNull(),
    week: integer("week", { mode: "timestamp_ms" }).notNull(),
    // we do not set an FK because the user's corresponding FSDJump might come afterwards
    systemId: integer("system_id"),
  },
  (table) => [primaryKey({ columns: [table.name, table.week] })],
);

export async function findMegaships(db: LibSQLDatabase, afterTick: boolean) {
  const query = db
    .select({ name: megaships.name, week: megaships.week, system: systems })
    .from(megaships)
    .innerJoin(systems, eq(systems.id64, megaships.systemId));
  if (afterTick) {
    return query.where(eq(megaships.week, getWeeklyTick()));
  }
  return query;
}

export async function updateMegaship(
  db: LibSQLDatabase,
  name: string,
  timestamp: Date,
  systemId: number,
) {
  await db
    .insert(megaships)
    .values({ name: name, week: getWeeklyTick(timestamp), systemId: systemId })
    .onConflictDoNothing();
}

export async function updateSystem(db: LibSQLDatabase, message: FSDJump) {
  await db
    .insert(systems)
    .values({
      id64: message.SystemAddress,
      name: message.StarSystem,
      x: message.StarPos[0],
      y: message.StarPos[1],
      z: message.StarPos[2],
      power: message.ControllingPower,
    })
    .onConflictDoUpdate({
      target: systems.id64,
      set: { power: sql`excluded.power` },
      setWhere: sql`power <> excluded.power`,
    });
}
