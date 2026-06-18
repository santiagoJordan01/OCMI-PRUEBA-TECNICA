import {
  approvalActionSchema,
  approvalQuerySchema,
  weekQuerySchema,
} from "@mini-timesheets/shared";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import type { Database } from "../db/index.js";
import { weeklyApprovals } from "../db/schema.js";
import { mapWeeklyApproval } from "../lib/mappers.js";
import {
  assertWeekCanBeRejected,
  getEmployeeOrThrow,
  getWeeklySummaries,
} from "../lib/services.js";
import { jsonValidator, queryValidator } from "../lib/validation.js";

export function createWeeklySummaryRouter(db: Database) {
  const router = new Hono();

  router.get("/", queryValidator(weekQuerySchema), async (c) => {
    const { weekStart } = c.req.valid("query");
    const summaries = await getWeeklySummaries(db, weekStart);
    return c.json({ weekStart, summaries });
  });

  router.post("/approve", jsonValidator(approvalActionSchema), async (c) => {
    const input = c.req.valid("json");
    await getEmployeeOrThrow(db, input.employeeId);

    const [approval] = await db
      .insert(weeklyApprovals)
      .values({
        employeeId: input.employeeId,
        weekStart: input.weekStart,
        status: "approved",
      })
      .onConflictDoUpdate({
        target: [weeklyApprovals.employeeId, weeklyApprovals.weekStart],
        set: { status: "approved", updatedAt: new Date() },
      })
      .returning();

    return c.json(mapWeeklyApproval(approval));
  });

  router.post("/reject", jsonValidator(approvalActionSchema), async (c) => {
    const input = c.req.valid("json");
    await getEmployeeOrThrow(db, input.employeeId);
    await assertWeekCanBeRejected(db, input.employeeId, input.weekStart);

    const [approval] = await db
      .insert(weeklyApprovals)
      .values({
        employeeId: input.employeeId,
        weekStart: input.weekStart,
        status: "rejected",
      })
      .onConflictDoUpdate({
        target: [weeklyApprovals.employeeId, weeklyApprovals.weekStart],
        set: { status: "rejected", updatedAt: new Date() },
      })
      .returning();

    return c.json(mapWeeklyApproval(approval));
  });

  router.get("/approval", queryValidator(approvalQuerySchema), async (c) => {
    const { employeeId, weekStart } = c.req.valid("query");

    const [approval] = await db
      .select()
      .from(weeklyApprovals)
      .where(
        and(
          eq(weeklyApprovals.employeeId, employeeId),
          eq(weeklyApprovals.weekStart, weekStart),
        ),
      )
      .limit(1);

    if (!approval) {
      return c.json({ status: "pending" });
    }

    return c.json(mapWeeklyApproval(approval));
  });

  return router;
}
