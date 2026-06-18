import { getWeekStart } from "@mini-timesheets/shared";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseUtcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Seven YYYY-MM-DD strings from Sunday through Saturday. */
export function getWeekDayDates(weekStart: string): string[] {
  const start = parseUtcDate(getWeekStart(weekStart));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return formatUtcDate(day);
  });
}

export function formatWeekDayHeader(date: string): { dayLabel: string; dateLabel: string } {
  const d = parseUtcDate(date);
  const dayLabel = DAY_LABELS[d.getUTCDay()];
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
  return { dayLabel, dateLabel };
}

export function formatWeekRange(weekStart: string): string {
  const days = getWeekDayDates(weekStart);
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt.format(parseUtcDate(days[0]))} – ${fmt.format(parseUtcDate(days[6]))}`;
}
