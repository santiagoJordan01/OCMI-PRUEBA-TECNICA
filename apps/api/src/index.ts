import "./load-env.js";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { createDb } from "./db/index.js";

const port = Number(process.env.PORT ?? 3001);
const db = createDb();
const app = createApp(db);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API running on http://localhost:${port}`);
});
