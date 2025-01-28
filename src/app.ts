import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import zeromq from "zeromq";
import zlib from "zlib";

import { megaships } from "./schema";

const SERVER_PORT = 3000;
const DATABASE_URL = "file:cruiser.db";
const EDDI_URL = "tcp://eddn.edcd.io:9500";
const EDDI_FSS_SCHEMA = "https://eddn.edcd.io/schemas/fsssignaldiscovered/1";

const app = express();
const db = drizzle(DATABASE_URL);
const eddi = new zeromq.Subscriber();

app.get("/", async (req, res) => {
  // TODO filter by latest tick
  // TODO add powerplay filter
  // TODO allow sort by distance to reference system
  res.send(await db.select().from(megaships));
});

app.listen(SERVER_PORT, async () => {
  console.log(`edcruiser listening on http://localhost:${SERVER_PORT}`);

  eddi.connect(EDDI_URL);
  eddi.subscribe("");
  console.log("EDDI listener connected successfully");

  for await (const [src] of eddi) {
    const event = JSON.parse(zlib.inflateSync(src).toString());
    // TODO fetch powerplay data
    if (event.$schemaRef === EDDI_FSS_SCHEMA) {
      for (const signal of event.message.signals) {
        if (signal.SignalType === "Megaship") {
          await db
            .insert(megaships)
            .values({
              name: signal.SignalName,
              system_id: event.message.SystemAddress,
              system_name: event.message.StarSystem,
              system_x: event.message.StarPos[0],
              system_y: event.message.StarPos[1],
              system_z: event.message.StarPos[2],
              last_update: signal.timestamp,
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
      }
    }
  }
});
