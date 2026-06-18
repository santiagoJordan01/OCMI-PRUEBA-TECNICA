import { describe, expect, it } from "vitest";
import { getWeekStart } from "@mini-timesheets/shared";
import { getWeekDayDates } from "./week";

describe("week picker helper", () => {
  it("normalizes any date to the Sunday that starts its payroll week", () => {
    expect(getWeekStart("2026-06-11")).toBe("2026-06-07");
  });

  it("returns seven dates from Sunday through Saturday", () => {
    expect(getWeekDayDates("2026-06-07")).toEqual([
      "2026-06-07",
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
      "2026-06-12",
      "2026-06-13",
    ]);
  });
});
