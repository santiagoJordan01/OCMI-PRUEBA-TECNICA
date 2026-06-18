import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@mini-timesheets/shared";
import { asc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import type { Database } from "../db/index.js";
import { employees } from "../db/schema.js";
import { mapEmployee } from "../lib/mappers.js";
import { getEmployeeOrThrow } from "../lib/services.js";
import { jsonValidator } from "../lib/validation.js";

export function createEmployeesRouter(db: Database) {
  const router = new Hono();

  router.get("/", async (c) => {
    const includeInactive = c.req.query("includeInactive") === "true";
    const rows = includeInactive
      ? await db
          .select()
          .from(employees)
          .orderBy(asc(employees.lastName), asc(employees.firstName))
      : await db
          .select()
          .from(employees)
          .where(isNull(employees.deactivatedAt))
          .orderBy(asc(employees.lastName), asc(employees.firstName));

    return c.json(rows.map(mapEmployee));
  });

  router.get("/:id", async (c) => {
    const employee = await getEmployeeOrThrow(db, c.req.param("id"));
    return c.json(mapEmployee(employee));
  });

  router.post("/", jsonValidator(createEmployeeSchema), async (c) => {
    const input = c.req.valid("json");
    const [created] = await db
      .insert(employees)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        hourlyRate: input.hourlyRate.toFixed(2),
      })
      .returning();

    return c.json(mapEmployee(created), 201);
  });

  router.patch("/:id", jsonValidator(updateEmployeeSchema), async (c) => {
    const input = c.req.valid("json");
    await getEmployeeOrThrow(db, c.req.param("id"));

    const [updated] = await db
      .update(employees)
      .set({
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.hourlyRate !== undefined
          ? { hourlyRate: input.hourlyRate.toFixed(2) }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(employees.id, c.req.param("id")))
      .returning();

    return c.json(mapEmployee(updated));
  });

  router.post("/:id/deactivate", async (c) => {
    const employee = await getEmployeeOrThrow(db, c.req.param("id"));

    if (employee.deactivatedAt) {
      return c.json(mapEmployee(employee));
    }

    const [updated] = await db
      .update(employees)
      .set({ deactivatedAt: new Date(), updatedAt: new Date() })
      .where(eq(employees.id, c.req.param("id")))
      .returning();

    return c.json(mapEmployee(updated));
  });

  router.post("/:id/reactivate", async (c) => {
    await getEmployeeOrThrow(db, c.req.param("id"));

    const [updated] = await db
      .update(employees)
      .set({ deactivatedAt: null, updatedAt: new Date() })
      .where(eq(employees.id, c.req.param("id")))
      .returning();

    return c.json(mapEmployee(updated));
  });

  return router;
}
