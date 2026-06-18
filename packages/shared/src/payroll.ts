import {
  OVERTIME_MULTIPLIER,
  OVERTIME_THRESHOLD_HOURS,
  type TimeEntry,
  type WeeklyPayBreakdown,
} from "./types.js";

/** US payroll weeks start on Sunday (day 0). */
export function getWeekStart(date: string): string {
  const d = parseDate(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return formatDate(d);
}

export function getWeekEnd(weekStart: string): string {
  const d = parseDate(weekStart);
  d.setUTCDate(d.getUTCDate() + 6);
  return formatDate(d);
}

export function isDateInWeek(date: string, weekStart: string): boolean {
  const weekEnd = getWeekEnd(weekStart);
  return date >= weekStart && date <= weekEnd;
}

export interface PayCalculationInput {
  employeeId: string;
  hourlyRate: number;
  weekStart: string;
  entries: Pick<TimeEntry, "date" | "hours">[];
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

/**
 * Calculates regular/overtime hours and pay for a single employee week.
 * Overtime applies to hours beyond 40 in the same calendar week.
 */
export function calculateWeeklyPay(input: PayCalculationInput): WeeklyPayBreakdown {
  const weekEntries = input.entries.filter((entry) =>
    isDateInWeek(entry.date, input.weekStart),
  );

  const totalHours = roundHours(
    weekEntries.reduce((sum, entry) => sum + entry.hours, 0),
  );

  const regularHours = roundHours(Math.min(totalHours, OVERTIME_THRESHOLD_HOURS));
  const overtimeHours = roundHours(Math.max(totalHours - OVERTIME_THRESHOLD_HOURS, 0));

  const regularPay = roundMoney(regularHours * input.hourlyRate);
  const overtimePay = roundMoney(overtimeHours * input.hourlyRate * OVERTIME_MULTIPLIER);
  const totalPay = roundMoney(regularPay + overtimePay);

  return {
    employeeId: input.employeeId,
    weekStart: input.weekStart,
    totalHours,
    regularHours,
    overtimeHours,
    hourlyRate: input.hourlyRate,
    regularPay,
    overtimePay,
    totalPay,
  };
}

function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
