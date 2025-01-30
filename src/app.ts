import { UTCDate } from "@date-fns/utc";
import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import zeromq from "zeromq";
import zlib from "zlib";

import {
  findMegaships,
  updateMegaship,
  updateSystem,
  WEEKLY_TICK_HOUR,
} from "./db";
import { FSDJump, FSSSignalDiscovered, Journal } from "./eddn";

const SERVER_PORT = 3000;
const DATABASE_URL = "file:cruiser.db";
const EDDI_URL = "tcp://eddn.edcd.io:9500";

const app = express();
const db = drizzle(DATABASE_URL);
const eddi = new zeromq.Subscriber();

app.get("/", async (req, res) => {
  // TODO add sort by distance to reference system
  res.send(await findMegaships(db));
});

app.listen(SERVER_PORT, async () => {
  console.log(`edcruiser listening on http://localhost:${SERVER_PORT}`);

  eddi.connect(EDDI_URL);
  eddi.subscribe("");
  console.log("EDDI listener connected successfully");

  for await (const [src] of eddi) {
    const event: Journal = JSON.parse(zlib.inflateSync(src).toString());
    // TODO ignore legacy messages
    switch (event.message.event) {
      case "FSSSignalDiscovered":
        const fss = event.message as FSSSignalDiscovered;
        const date = new UTCDate(fss.timestamp);
        if (
          date.getDay() == 4 &&
          date.getHours() > WEEKLY_TICK_HOUR &&
          date.getHours() < WEEKLY_TICK_HOUR + 12
        ) {
          // megaships may take several hours to move after the tick, so the
          // earlier scans might not be indicative of the rest of the week
          continue;
        }
        for (const signal of fss.signals) {
          if (signal.SignalType === "Megaship") {
            await updateMegaship(
              db,
              signal.SignalName,
              new UTCDate(signal.timestamp),
              fss.SystemAddress,
            );
          }
        }
        break;
      case "FSDJump":
        const fsd = event.message as FSDJump;
        await updateSystem(db, fsd);
        break;
    }
  }
});
