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

async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  const response = await app.request(path, { ...init, headers });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  return { response, body };
}

describe.skipIf(!dbAvailable)("full timesheet flow", () => {
  let employeeId: string;
  const weekStart = "2026-06-07";
  const weekDays = [
    "2026-06-09",
    "2026-06-10",
    "2026-06-11",
    "2026-06-12",
    "2026-06-13",
  ];

  beforeAll(async () => {
    await db.execute(
      sql`TRUNCATE TABLE weekly_approvals, time_entries, employees RESTART IDENTITY CASCADE`,
    );

    const created = await request("/employees", {
      method: "POST",
      body: JSON.stringify({
        firstName: "Flow",
        lastName: "Tester",
        hourlyRate: 20,
      }),
    });
    expect(created.response.status).toBe(201);
    employeeId = created.body.id;
  });

  afterAll(async () => {
    await db.execute(
      sql`TRUNCATE TABLE weekly_approvals, time_entries, employees RESTART IDENTITY CASCADE`,
    );
  });

  it("creates a full work week of time entries", async () => {
    for (const date of weekDays) {
      const { response } = await request("/time-entries", {
        method: "POST",
        body: JSON.stringify({ employeeId, date, hours: 8 }),
      });
      expect(response.status).toBe(201);
    }

    const list = await request(`/time-entries?employeeId=${employeeId}`);
    expect(list.response.status).toBe(200);
    expect(list.body).toHaveLength(5);
  });

  it("returns weekly summary with correct overtime pay", async () => {
    const { response, body } = await request(`/weekly-summary?weekStart=${weekStart}`);
    expect(response.status).toBe(200);

    const summary = body.summaries.find(
      (item: { employee: { id: string } }) => item.employee.id === employeeId,
    );
    expect(summary).toBeDefined();
    expect(summary.pay.totalHours).toBe(40);
    expect(summary.pay.overtimeHours).toBe(0);
    expect(summary.pay.totalPay).toBe(800);
  });

  it("updates one day without removing the other entries", async () => {
    const listBefore = await request(`/time-entries?employeeId=${employeeId}`);
    const wednesday = listBefore.body.find(
      (entry: { date: string }) => entry.date === "2026-06-11",
    );
    expect(wednesday).toBeDefined();

    const updated = await request(`/time-entries/${wednesday.id}`, {
      method: "PATCH",
      body: JSON.stringify({ hours: 6 }),
    });
    expect(updated.response.status).toBe(200);
    expect(updated.body.hours).toBe(6);

    const listAfter = await request(`/time-entries?employeeId=${employeeId}`);
    expect(listAfter.body).toHaveLength(5);

    const dates = listAfter.body.map((entry: { date: string }) => entry.date).sort();
    expect(dates).toEqual(weekDays.sort());

    const wed = listAfter.body.find((entry: { date: string }) => entry.date === "2026-06-11");
    expect(wed.hours).toBe(6);
  });

  it("rejects duplicate entries for the same employee and date", async () => {
    const duplicate = await request("/time-entries", {
      method: "POST",
      body: JSON.stringify({ employeeId, date: "2026-06-09", hours: 4 }),
    });
    expect(duplicate.response.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_ENTRY");
  });

  it("rejects duplicate dates in a bulk request", async () => {
    const bulk = await request("/time-entries/bulk", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        entries: [
          { date: "2026-06-09", hours: 8 },
          { date: "2026-06-09", hours: 4 },
        ],
      }),
    });
    expect(bulk.response.status).toBe(400);
    expect(bulk.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("bulk upserts a week of entries", async () => {
    const bulk = await request("/time-entries/bulk", {
      method: "POST",
      body: JSON.stringify({
        employeeId,
        entries: [
          { date: "2026-06-09", hours: 7 },
          { date: "2026-06-10", hours: 8 },
        ],
      }),
    });
    expect(bulk.response.status).toBe(200);
    const updated = bulk.body.find((entry: { date: string }) => entry.date.startsWith("2026-06-09"));
    expect(updated.hours).toBe(7);
  });

  it("rejects future dates", async () => {
    const { response, body } = await request("/time-entries", {
      method: "POST",
      body: JSON.stringify({ employeeId, date: "2099-12-31", hours: 8 }),
    });
    expect(response.status).toBe(400);
    expect(body.error.code).toBe("FUTURE_DATE");
  });

  it("normalizes weekStart to Sunday when approving and locks entries", async () => {
    const approve = await request("/weekly-summary/approve", {
      method: "POST",
      body: JSON.stringify({ employeeId, weekStart: "2026-06-11" }),
    });
    expect(approve.response.status).toBe(200);
    expect(approve.body.weekStart).toBe("2026-06-07");
    expect(approve.body.status).toBe("approved");

    const entry = (await request(`/time-entries?employeeId=${employeeId}`)).body[0];
    const locked = await request(`/time-entries/${entry.id}`, {
      method: "PATCH",
      body: JSON.stringify({ hours: 4 }),
    });
    expect(locked.response.status).toBe(409);
    expect(locked.body.error.code).toBe("WEEK_LOCKED");
  });

  it("cannot reject an approved week", async () => {
    const reject = await request("/weekly-summary/reject", {
      method: "POST",
      body: JSON.stringify({ employeeId, weekStart }),
    });
    expect(reject.response.status).toBe(409);
    expect(reject.body.error.code).toBe("WEEK_ALREADY_APPROVED");
  });

  it("deactivates employee and blocks new entries", async () => {
    const deactivated = await request(`/employees/${employeeId}/deactivate`, {
      method: "POST",
    });
    expect(deactivated.response.status).toBe(200);

    const blocked = await request("/time-entries", {
      method: "POST",
      body: JSON.stringify({ employeeId, date: "2026-06-09", hours: 4 }),
    });
    expect(blocked.response.status).toBe(409);
    expect(blocked.body.error.code).toBe("EMPLOYEE_INACTIVE");
  });
});
