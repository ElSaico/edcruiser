import { drizzle } from "drizzle-orm/libsql";
import express from "express";
import zeromq from "zeromq";
import zlib from "zlib";

import { findMegaships, updateMegaship } from "./db";
import { EDDN } from "./eddn";

const SERVER_PORT = 3000;
const DATABASE_URL = "file:cruiser.db";
const EDDI_URL = "tcp://eddn.edcd.io:9500";
const EDDI_FSS_SCHEMA = "https://eddn.edcd.io/schemas/fsssignaldiscovered/1";

const app = express();
const db = drizzle(DATABASE_URL);
const eddi = new zeromq.Subscriber();

app.get("/", async (req, res) => {
  // TODO add powerplay filter
  // TODO add sort by distance to reference system
  res.send(findMegaships(db, true));
});

app.listen(SERVER_PORT, async () => {
  console.log(`edcruiser listening on http://localhost:${SERVER_PORT}`);

  eddi.connect(EDDI_URL);
  eddi.subscribe("");
  console.log("EDDI listener connected successfully");

  for await (const [src] of eddi) {
    const event: EDDN<any> = JSON.parse(zlib.inflateSync(src).toString());
    // TODO fetch system powerplay data
    if (event.$schemaRef === EDDI_FSS_SCHEMA) {
      for (const signal of event.message.signals) {
        if (signal.SignalType === "Megaship") {
          await updateMegaship(db, event, signal);
        }
      }
    }
  }
});
