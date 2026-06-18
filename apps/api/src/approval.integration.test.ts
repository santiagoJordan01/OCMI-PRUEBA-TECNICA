import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { createDb } from "./db/index.js";
import {
  ensureTestDatabase,
  getAdminDatabaseUrl,
  getTestDatabaseUrl,
  probeDatabase,
} from "./test-db.js";

let dbAvailable = false;

try {
  if (await probeDatabase(getAdminDatabaseUrl())) {
    await ensureTestDatabase();
    dbAvailable = await probeDatabase(getTestDatabaseUrl());
  }
} catch {
  dbAvailable = false;
}

const testDatabaseUrl = getTestDatabaseUrl();
const db = createDb(testDatabaseUrl);
const app = createApp(db);

async function request(
  path: string,
  init?: RequestInit & { locale?: "en" | "es" },
) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (init?.locale) {
    headers.set("Accept-Language", init.locale);
  }

  const response = await app.request(path, {
    ...init,
    headers,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

describe.skipIf(!dbAvailable)("approval flow locks time entries", () => {
  let employeeId: string;
  let entryId: string;
  const weekStart = "2026-06-07";
  const entryDate = "2026-06-09";

  beforeAll(async () => {
    await db.execute(
      sql`TRUNCATE TABLE weekly_approvals, time_entries, employees RESTART IDENTITY CASCADE`,
    );

    const created = await request("/employees", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Jane",
        lastName: "Doe",
        hourlyRate: 25,
      }),
    });

    employeeId = created.body.id;

    const entry = await request("/time-entries", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        date: entryDate,
        hours: 8,
      }),
    });

    entryId = entry.body.id;
  });

  afterAll(async () => {
    await db.execute(
      sql`TRUNCATE TABLE weekly_approvals, time_entries, employees RESTART IDENTITY CASCADE`,
    );
  });

  it("allows editing entries before approval", async () => {
    const { response, body } = await request(`/time-entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify({ hours: 7.5 }),
    });

    expect(response.status).toBe(200);
    expect(body.hours).toBe(7.5);
  });

  it("locks entries after weekly approval", async () => {
    const approve = await request("/weekly-summary/approve", {
      method: "POST",
      body: JSON.stringify({ employeeId, weekStart }),
    });

    expect(approve.response.status).toBe(200);
    expect(approve.body.status).toBe("approved");

    const lockedUpdate = await request(`/time-entries/${entryId}`, {
      method: "PATCH",
      body: JSON.stringify({ hours: 6 }),
      locale: "es",
    });

    expect(lockedUpdate.response.status).toBe(409);
    expect(lockedUpdate.body.error.code).toBe("WEEK_LOCKED");
    expect(lockedUpdate.body.error.message).toContain("aprobada");
  });
});
