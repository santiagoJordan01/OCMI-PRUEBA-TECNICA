import { z } from "zod";
import { getWeekStart } from "./payroll.js";

const hoursSchema = z
  .number()
  .min(0.25, "Hours must be at least 0.25")
  .max(24, "Hours cannot exceed 24");

const hourlyRateSchema = z
  .number()
  .positive("Hourly rate must be greater than 0");

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const normalizedWeekStartSchema = dateSchema.transform((date) => getWeekStart(date));

export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  hourlyRate: hourlyRateSchema,
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const createTimeEntrySchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  date: dateSchema,
  hours: hoursSchema,
});

export const updateTimeEntrySchema = z.object({
  date: dateSchema.optional(),
  hours: hoursSchema.optional(),
});

export const weekQuerySchema = z.object({
  weekStart: normalizedWeekStartSchema,
});

export const approvalActionSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  weekStart: normalizedWeekStartSchema,
});

export const approvalQuerySchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  weekStart: normalizedWeekStartSchema,
});

export const bulkTimeEntriesSchema = z
  .object({
    employeeId: z.string().uuid("Invalid employee ID"),
    entries: z
      .array(
        z.object({
          date: dateSchema,
          hours: hoursSchema,
        }),
      )
      .min(1, "At least one entry is required")
      .max(7, "Cannot submit more than 7 days at once"),
  })
  .refine(
    (data) => new Set(data.entries.map((entry) => entry.date)).size === data.entries.length,
    { message: "Duplicate dates in the same request", path: ["entries"] },
  );

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

/** Calendar date for the user's local timezone (YYYY-MM-DD). */
export function todayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isFutureDate(date: string, today: string = todayDateString()): boolean {
  return date > today;
}

/** UTC calendar date — used for payroll week boundaries. */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
