import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const DEFAULT_DEV_URL =
  "postgresql://timesheets:timesheets@localhost:5433/timesheets";

const TEST_DB_NAME = "timesheets_test";

function toUrl(connectionString: string): URL {
  return new URL(connectionString.replace(/^postgresql:/, "postgres:"));
}

function fromUrl(url: URL): string {
  return url.toString().replace(/^postgres:/, "postgresql:");
}

export function getDevDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DEV_URL;
}

export function getTestDatabaseUrl(): string {
  if (process.env.DATABASE_TEST_URL) {
    return process.env.DATABASE_TEST_URL;
  }

  const url = toUrl(getDevDatabaseUrl());
  url.pathname = `/${TEST_DB_NAME}`;
  return fromUrl(url);
}

export function getAdminDatabaseUrl(): string {
  const url = toUrl(getDevDatabaseUrl());
  url.pathname = "/postgres";
  return fromUrl(url);
}

export async function probeDatabase(url: string): Promise<boolean> {
  try {
    const probe = postgres(url, { max: 1, connect_timeout: 3 });
    await probe`SELECT 1`;
    await probe.end();
    return true;
  } catch {
    return false;
  }
}

export async function ensureTestDatabase(): Promise<void> {
  const admin = postgres(getAdminDatabaseUrl(), { max: 1 });

  try {
    const rows = await admin`
      SELECT 1 FROM pg_database WHERE datname = ${TEST_DB_NAME}
    `;

    if (rows.length === 0) {
      await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
    }
  } finally {
    await admin.end();
  }

  const testUrl = getTestDatabaseUrl();
  const client = postgres(testUrl, { max: 1 });
  const db = drizzle(client);
  const migrationsFolder = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../drizzle",
  );

  await migrate(db, { migrationsFolder });
  await client.end();
}
