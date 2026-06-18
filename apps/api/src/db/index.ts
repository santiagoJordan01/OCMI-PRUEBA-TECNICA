import "../load-env.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

function getConnectionString(url?: string) {
  return (
    url ??
    process.env.DATABASE_URL ??
    "postgresql://timesheets:timesheets@localhost:5433/timesheets"
  );
}

export function createDb(url?: string) {
  const client = postgres(getConnectionString(url), { max: 1 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;

export { schema };
