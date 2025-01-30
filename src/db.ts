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
const RE_SHIP_NEW = /^([A-Z\-.'+\d\s]+) ([A-Z][a-z]+)-class ([A-Z][a-z]+)$/;
const RE_SHIP_OLD = /^([A-Z][a-z]+) Class ([A-Za-z\s]+) ([A-Z]+-\d+)$/;
const MEGASHIP_CATEGORY_REMAP = new Map<string, string>([
  ["Agricultural Vessel", "Cropper"],
  ["Bulk Cargo Ship", "Hauler"],
  ["Prison Ship", "Reformatory"],
  ["Science Vessel", "Researcher"],
  ["Survey Vessel", "Surveyor"],
  ["Tanker", "Tanker"],
  ["Tourist Ship", "Traveller"],
]);

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
    category: text("category"),
    shipClass: text("ship_class"),
    codename: text("codename"),
    week: integer("week", { mode: "timestamp_ms" }).notNull(),
    // we do not set an FK because the user's corresponding FSDJump might come afterwards
    systemId: integer("system_id"),
  },
  (table) => [primaryKey({ columns: [table.name, table.week] })],
);

function parseMegashipName(name: string) {
  if (RE_SHIP_NEW.test(name)) {
    // {codename} {class}-class {category}
    const [_, codename, shipClass, category] = name.match(RE_SHIP_NEW)!;
    return [codename.trim(), shipClass, category];
  } else if (RE_SHIP_OLD.test(name)) {
    // {class} Class {category} {codename}
    const [_, shipClass, category, codename] = name.match(RE_SHIP_OLD)!;
    return [codename, shipClass, MEGASHIP_CATEGORY_REMAP.get(category.trim())];
  }
  return [null, null, null];
}

function getMegashipUplinkCount(category: string, shipClass: string) {
  if (category == "Reformatory") return 0;
  if (shipClass == "Lowell") return 2;
  return 1;
}

export async function findMegaships(db: LibSQLDatabase) {
  return db
    .select({
      name: megaships.name,
      category: megaships.category,
      shipClass: megaships.shipClass,
      codename: megaships.codename,
      week: megaships.week,
      system: systems,
    })
    .from(megaships)
    .innerJoin(systems, eq(systems.id64, megaships.systemId))
    .where(eq(megaships.week, getWeeklyTick()));
}

export async function updateMegaship(
  db: LibSQLDatabase,
  name: string,
  timestamp: Date,
  systemId: number,
) {
  const [codename, shipClass, category] = parseMegashipName(name);
  await db
    .insert(megaships)
    .values({
      name,
      category,
      shipClass,
      codename,
      week: getWeeklyTick(timestamp),
      systemId,
    })
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
