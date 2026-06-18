import { and, asc, eq, gte, lte } from "drizzle-orm";
import {
  calculateWeeklyPay,
  getWeekEnd,
  getWeekStart,
  isFutureDate,
  todayDateString,
} from "@mini-timesheets/shared";
import type { Database } from "../db/index.js";
import { employees, timeEntries, weeklyApprovals } from "../db/schema.js";
import { AppError } from "./errors.js";
import { isEmployeeActive } from "./mappers.js";
import { handleDbError } from "./validation.js";

export async function getEmployeeOrThrow(db: Database, employeeId: string) {
  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee) {
    throw new AppError("NOT_FOUND", 404);
  }

  return employee;
}

export async function assertWeekNotLocked(
  db: Database,
  employeeId: string,
  date: string,
) {
  const weekStart = getWeekStart(date);
  const [approval] = await db
    .select()
    .from(weeklyApprovals)
    .where(
      and(
        eq(weeklyApprovals.employeeId, employeeId),
        eq(weeklyApprovals.weekStart, weekStart),
        eq(weeklyApprovals.status, "approved"),
      ),
    )
    .limit(1);

  if (approval) {
    throw new AppError("WEEK_LOCKED", 409);
  }
}

export async function assertEmployeeCanLogTime(
  db: Database,
  employeeId: string,
  date: string,
) {
  const employee = await getEmployeeOrThrow(db, employeeId);

  if (!isEmployeeActive(employee)) {
    throw new AppError("EMPLOYEE_INACTIVE", 409);
  }

  if (isFutureDate(date, todayDateString())) {
    throw new AppError("FUTURE_DATE", 400);
  }

  await assertWeekNotLocked(db, employeeId, date);
}

export async function assertWeekCanBeRejected(
  db: Database,
  employeeId: string,
  weekStartInput: string,
) {
  const weekStart = getWeekStart(weekStartInput);
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

  if (approval?.status === "approved") {
    throw new AppError("WEEK_ALREADY_APPROVED", 409);
  }
}

function normalizeEntryDate(value: string): string {
  return value.slice(0, 10);
}

export async function upsertTimeEntriesBulk(
  db: Database,
  employeeId: string,
  entries: { date: string; hours: number }[],
) {
  for (const entry of entries) {
    await assertEmployeeCanLogTime(db, employeeId, entry.date);
  }

  try {
    await db.transaction(async (tx) => {
      for (const entry of entries) {
        await tx
          .insert(timeEntries)
          .values({
            employeeId,
            date: entry.date,
            hours: entry.hours.toFixed(2),
          })
          .onConflictDoUpdate({
            target: [timeEntries.employeeId, timeEntries.date],
            set: {
              hours: entry.hours.toFixed(2),
              updatedAt: new Date(),
            },
          });
      }
    });
  } catch (error) {
    handleDbError(error);
  }
}

export async function getWeeklySummaries(db: Database, weekStartInput: string) {
  const weekStart = getWeekStart(weekStartInput);
  const weekEnd = getWeekEnd(weekStart);
  const allEmployees = await db
    .select()
    .from(employees)
    .orderBy(asc(employees.lastName), asc(employees.firstName));

  const employeesWithEntries = await db
    .selectDistinct({ employeeId: timeEntries.employeeId })
    .from(timeEntries)
    .where(and(gte(timeEntries.date, weekStart), lte(timeEntries.date, weekEnd)));

  const employeeIdsWithEntries = new Set(
    employeesWithEntries.map((row) => row.employeeId),
  );

  const approvals = await db
    .select()
    .from(weeklyApprovals)
    .where(eq(weeklyApprovals.weekStart, weekStart));

  const approvalByEmployee = new Map(
    approvals.map((approval) => [approval.employeeId, approval]),
  );

  const relevantEmployees = allEmployees.filter(
    (employee) =>
      employeeIdsWithEntries.has(employee.id) || approvalByEmployee.has(employee.id),
  );

  const summaries = [];

  for (const employee of relevantEmployees) {
    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.employeeId, employee.id),
          gte(timeEntries.date, weekStart),
          lte(timeEntries.date, weekEnd),
        ),
      );

    const pay = calculateWeeklyPay({
      employeeId: employee.id,
      hourlyRate: Number(employee.hourlyRate),
      weekStart,
      entries: entries.map((entry) => ({
        date: normalizeEntryDate(String(entry.date)),
        hours: Number(entry.hours),
      })),
    });

    const approval = approvalByEmployee.get(employee.id);

    summaries.push({
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        hourlyRate: Number(employee.hourlyRate),
        status: isEmployeeActive(employee) ? "active" : "inactive",
      },
      pay,
      approval: approval
        ? {
            id: approval.id,
            status: approval.status,
            updatedAt: approval.updatedAt.toISOString(),
          }
        : { status: "pending" as const },
    });
  }

  return summaries;
}
