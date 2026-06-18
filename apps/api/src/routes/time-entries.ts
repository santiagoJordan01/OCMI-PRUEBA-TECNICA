import {
  bulkTimeEntriesSchema,
  createTimeEntrySchema,
  updateTimeEntrySchema,
} from "@mini-timesheets/shared";
import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Database } from "../db/index.js";
import { timeEntries } from "../db/schema.js";
import { AppError } from "../lib/errors.js";
import { mapTimeEntry } from "../lib/mappers.js";
import {
  assertEmployeeCanLogTime,
  assertWeekNotLocked,
  getEmployeeOrThrow,
  upsertTimeEntriesBulk,
} from "../lib/services.js";
import { handleDbError, jsonValidator } from "../lib/validation.js";

export function createTimeEntriesRouter(db: Database) {
  const router = new Hono();

  router.get("/", async (c) => {
    const employeeId = c.req.query("employeeId");
    const conditions = employeeId ? eq(timeEntries.employeeId, employeeId) : undefined;

    const rows = await db
      .select()
      .from(timeEntries)
      .where(conditions)
      .orderBy(asc(timeEntries.date));

    return c.json(rows.map(mapTimeEntry));
  });

  router.post("/bulk", jsonValidator(bulkTimeEntriesSchema), async (c) => {
    const input = c.req.valid("json");
    await upsertTimeEntriesBulk(db, input.employeeId, input.entries);

    const rows = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.employeeId, input.employeeId))
      .orderBy(asc(timeEntries.date));

    return c.json(rows.map(mapTimeEntry));
  });

  router.get("/:id", async (c) => {
    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, c.req.param("id")))
      .limit(1);

    if (!entry) {
      throw new AppError("NOT_FOUND", 404);
    }

    return c.json(mapTimeEntry(entry));
  });

  router.post("/", jsonValidator(createTimeEntrySchema), async (c) => {
    const input = c.req.valid("json");
    await assertEmployeeCanLogTime(db, input.employeeId, input.date);

    try {
      const [created] = await db
        .insert(timeEntries)
        .values({
          employeeId: input.employeeId,
          date: input.date,
          hours: input.hours.toFixed(2),
        })
        .returning();

      return c.json(mapTimeEntry(created), 201);
    } catch (error) {
      handleDbError(error);
    }
  });

  router.patch("/:id", jsonValidator(updateTimeEntrySchema), async (c) => {
    const input = c.req.valid("json");
    const [existing] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, c.req.param("id")))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", 404);
    }

    const nextDate = input.date ?? String(existing.date).slice(0, 10);
    const nextHours = input.hours ?? Number(existing.hours);

    await assertEmployeeCanLogTime(db, existing.employeeId, nextDate);
    await assertWeekNotLocked(db, existing.employeeId, String(existing.date).slice(0, 10));

    try {
      const [updated] = await db
        .update(timeEntries)
        .set({
          ...(input.date !== undefined ? { date: input.date } : {}),
          ...(input.hours !== undefined ? { hours: input.hours.toFixed(2) } : {}),
          updatedAt: new Date(),
        })
        .where(eq(timeEntries.id, c.req.param("id")))
        .returning();

      return c.json(mapTimeEntry(updated));
    } catch (error) {
      handleDbError(error);
    }
  });

  router.delete("/:id", async (c) => {
    const [existing] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, c.req.param("id")))
      .limit(1);

    if (!existing) {
      throw new AppError("NOT_FOUND", 404);
    }

    await getEmployeeOrThrow(db, existing.employeeId);
    await assertWeekNotLocked(db, existing.employeeId, String(existing.date).slice(0, 10));

    await db.delete(timeEntries).where(eq(timeEntries.id, c.req.param("id")));
    return c.body(null, 204);
  });

  return router;
}
