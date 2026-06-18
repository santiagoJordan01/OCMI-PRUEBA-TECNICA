import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

config({
  path: resolve(fileURLToPath(new URL("../.env", import.meta.url))),
  override: true,
});
