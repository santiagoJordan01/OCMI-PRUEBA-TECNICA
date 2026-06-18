import { describe, expect, it } from "vitest";
import {
  calculateWeeklyPay,
  getWeekEnd,
  getWeekStart,
  isDateInWeek,
} from "./payroll.js";

describe("getWeekStart", () => {
  it("returns Sunday for a Wednesday", () => {
    expect(getWeekStart("2026-06-11")).toBe("2026-06-07");
  });

  it("returns the same day when input is Sunday", () => {
    expect(getWeekStart("2026-06-07")).toBe("2026-06-07");
  });
});

describe("getWeekEnd", () => {
  it("returns Saturday for a week starting Sunday", () => {
    expect(getWeekEnd("2026-06-07")).toBe("2026-06-13");
  });
});

describe("isDateInWeek", () => {
  it("includes dates from Sunday through Saturday", () => {
    expect(isDateInWeek("2026-06-07", "2026-06-07")).toBe(true);
    expect(isDateInWeek("2026-06-13", "2026-06-07")).toBe(true);
    expect(isDateInWeek("2026-06-14", "2026-06-07")).toBe(false);
  });
});

describe("calculateWeeklyPay", () => {
  const base = {
    employeeId: "emp-1",
    hourlyRate: 20,
    weekStart: "2026-06-07",
  };

  it("calculates pay with no overtime when total is exactly 40h", () => {
    const result = calculateWeeklyPay({
      ...base,
      entries: [
        { date: "2026-06-07", hours: 8 },
        { date: "2026-06-08", hours: 8 },
        { date: "2026-06-09", hours: 8 },
        { date: "2026-06-10", hours: 8 },
        { date: "2026-06-11", hours: 8 },
      ],
    });

    expect(result.totalHours).toBe(40);
    expect(result.regularHours).toBe(40);
    expect(result.overtimeHours).toBe(0);
    expect(result.regularPay).toBe(800);
    expect(result.overtimePay).toBe(0);
    expect(result.totalPay).toBe(800);
  });

  it("calculates overtime beyond 40h at 1.5x rate", () => {
    const result = calculateWeeklyPay({
      ...base,
      entries: [
        { date: "2026-06-07", hours: 10 },
        { date: "2026-06-08", hours: 10 },
        { date: "2026-06-09", hours: 10 },
        { date: "2026-06-10", hours: 10 },
        { date: "2026-06-11", hours: 5 },
      ],
    });

    expect(result.totalHours).toBe(45);
    expect(result.regularHours).toBe(40);
    expect(result.overtimeHours).toBe(5);
    expect(result.regularPay).toBe(800);
    expect(result.overtimePay).toBe(150);
    expect(result.totalPay).toBe(950);
  });

  it("handles decimal hours", () => {
    const result = calculateWeeklyPay({
      ...base,
      entries: [
        { date: "2026-06-07", hours: 7.5 },
        { date: "2026-06-08", hours: 7.5 },
        { date: "2026-06-09", hours: 7.5 },
        { date: "2026-06-10", hours: 7.5 },
        { date: "2026-06-11", hours: 7.5 },
        { date: "2026-06-12", hours: 7.5 },
      ],
    });

    expect(result.totalHours).toBe(45);
    expect(result.overtimeHours).toBe(5);
    expect(result.totalPay).toBe(950);
  });

  it("ignores entries outside the selected week", () => {
    const result = calculateWeeklyPay({
      ...base,
      entries: [
        { date: "2026-06-07", hours: 8 },
        { date: "2026-06-14", hours: 20 },
      ],
    });

    expect(result.totalHours).toBe(8);
    expect(result.overtimeHours).toBe(0);
    expect(result.totalPay).toBe(160);
  });

  it("returns zero pay when there are no entries", () => {
    const result = calculateWeeklyPay({
      ...base,
      entries: [],
    });

    expect(result.totalHours).toBe(0);
    expect(result.totalPay).toBe(0);
  });
});
