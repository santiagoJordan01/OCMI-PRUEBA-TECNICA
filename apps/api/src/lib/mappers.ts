import type { Employee, TimeEntry, WeeklyApproval } from "@mini-timesheets/shared";
import type { employees, timeEntries, weeklyApprovals } from "../db/schema.js";

type DbEmployee = typeof employees.$inferSelect;
type DbTimeEntry = typeof timeEntries.$inferSelect;
type DbWeeklyApproval = typeof weeklyApprovals.$inferSelect;

export function mapEmployee(row: DbEmployee): Employee {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    hourlyRate: Number(row.hourlyRate),
    deactivatedAt: row.deactivatedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapTimeEntry(row: DbTimeEntry): TimeEntry {
  const date =
    typeof row.date === "string" ? row.date.slice(0, 10) : String(row.date).slice(0, 10);

  return {
    id: row.id,
    employeeId: row.employeeId,
    date,
    hours: Number(row.hours),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapWeeklyApproval(row: DbWeeklyApproval): WeeklyApproval {
  const weekStart =
    typeof row.weekStart === "string"
      ? row.weekStart.slice(0, 10)
      : String(row.weekStart).slice(0, 10);

  return {
    id: row.id,
    employeeId: row.employeeId,
    weekStart,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function isEmployeeActive(employee: DbEmployee): boolean {
  return employee.deactivatedAt === null;
}
