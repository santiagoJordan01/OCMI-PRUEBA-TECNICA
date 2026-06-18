"use client";

import {
  createTimeEntrySchema,
  getWeekStart,
  isFutureDate,
  todayDateString,
} from "@mini-timesheets/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  ErrorBanner,
  Field,
  Input,
  Panel,
  Select,
} from "@/components/ui";
import { ApiClientError, api } from "@/lib/api";
import { formatWeekDayHeader, formatWeekRange, getWeekDayDates } from "@/lib/week";

type WeekGrid = Record<string, string>;

function normalizeDate(date: string): string {
  return date.slice(0, 10);
}

function emptyWeekGrid(weekStart: string): WeekGrid {
  return Object.fromEntries(getWeekDayDates(weekStart).map((date) => [date, ""]));
}

function gridFromEntries(weekStart: string, entries: { date: string; hours: number }[]): WeekGrid {
  const grid = emptyWeekGrid(weekStart);
  const weekDays = new Set(getWeekDayDates(weekStart));
  for (const entry of entries) {
    const date = normalizeDate(entry.date);
    if (weekDays.has(date)) {
      grid[date] = String(entry.hours);
    }
  }
  return grid;
}

interface WeekEntryGridProps {
  employees: { id: string; firstName: string; lastName: string }[];
  onEmployeeChange?: (employeeId: string) => void;
  initialEmployeeId?: string;
}

export function WeekEntryGrid({
  employees,
  onEmployeeChange,
  initialEmployeeId = "",
}: WeekEntryGridProps) {
  const queryClient = useQueryClient();
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [weekStart, setWeekStart] = useState(getWeekStart(todayDateString()));
  const [localEdits, setLocalEdits] = useState<WeekGrid>({});
  const [fillHours, setFillHours] = useState("8");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const weekDays = useMemo(() => getWeekDayDates(weekStart), [weekStart]);
  const today = todayDateString();
  const isFutureDay = (date: string) => isFutureDate(date, today);

  const entriesQuery = useQuery({
    queryKey: ["time-entries", employeeId],
    queryFn: () => api.timeEntries.list(employeeId),
    enabled: Boolean(employeeId),
  });

  const serverGrid = useMemo(
    () =>
      employeeId
        ? gridFromEntries(weekStart, entriesQuery.data ?? [])
        : emptyWeekGrid(weekStart),
    [employeeId, weekStart, entriesQuery.data],
  );

  useEffect(() => {
    setLocalEdits({});
  }, [employeeId, weekStart]);

  useEffect(() => {
    if (initialEmployeeId && initialEmployeeId !== employeeId) {
      setEmployeeId(initialEmployeeId);
    }
  }, [initialEmployeeId, employeeId]);

  function getCellValue(date: string): string {
    if (Object.prototype.hasOwnProperty.call(localEdits, date)) {
      return localEdits[date];
    }
    return serverGrid[date] ?? "";
  }

  const totalHours = weekDays.reduce((sum, date) => {
    const raw = getCellValue(date).trim();
    const hours = Number(raw);
    return Number.isFinite(hours) && hours > 0 ? sum + hours : sum;
  }, 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!employeeId) {
        throw new Error("Select an employee first");
      }

      const skippedFutureDates: string[] = [];
      const entriesToSave: { date: string; hours: number }[] = [];

      for (const date of weekDays) {
        const raw = getCellValue(date).trim();
        if (!raw) {
          continue;
        }

        if (isFutureDay(date)) {
          skippedFutureDates.push(date);
          continue;
        }

        const hours = Number(raw);
        const parsed = createTimeEntrySchema.safeParse({ employeeId, date, hours });
        if (!parsed.success) {
          throw new Error(`${date}: ${parsed.error.issues[0]?.message ?? "Invalid hours"}`);
        }

        entriesToSave.push({ date, hours });
      }

      if (entriesToSave.length === 0 && skippedFutureDates.length > 0) {
        throw new Error(
          "Only future dates have hours — time entries cannot be created for dates that have not occurred yet.",
        );
      }

      if (entriesToSave.length === 0) {
        throw new Error("No changes to save — edit at least one day or enter new hours");
      }

      try {
        await api.timeEntries.bulkUpsert({ employeeId, entries: entriesToSave });
      } catch (err) {
        const message =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Save failed";
        throw new Error(message);
      }

      return { skippedFutureDates };
    },
    onSuccess: async (result) => {
      setError(null);
      setLocalEdits({});
      setNotice(
        result.skippedFutureDates.length > 0
          ? `Week saved. Future dates were skipped: ${result.skippedFutureDates.join(", ")}.`
          : null,
      );
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      await queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
    },
    onError: (err: Error) => {
      setNotice(null);
      setError(err.message);
    },
  });

  function handleEmployeeChange(value: string) {
    setEmployeeId(value);
    onEmployeeChange?.(value);
  }

  function setCellValue(date: string, value: string) {
    setLocalEdits((current) => ({ ...current, [date]: value }));
  }

  function fillWeekdays(hours: string) {
    const parsed = Number(hours);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    setLocalEdits((current) => {
      const next = { ...current };
      weekDays.forEach((date, index) => {
        if (index >= 1 && index <= 5 && !isFutureDay(date)) {
          next[date] = String(parsed);
        }
      });
      return next;
    });
  }

  function fillEmptyDays(hours: string) {
    const parsed = Number(hours);
    if (!Number.isFinite(parsed) || parsed <= 0) return;

    setLocalEdits((current) => {
      const next = { ...current };
      for (const date of weekDays) {
        const currentValue = Object.prototype.hasOwnProperty.call(current, date)
          ? current[date]
          : (serverGrid[date] ?? "");
        if (!currentValue.trim() && !isFutureDay(date)) {
          next[date] = String(parsed);
        }
      }
      return next;
    });
  }

  function clearLocalEdits() {
    setLocalEdits({});
  }

  function clearGrid() {
    setLocalEdits(Object.fromEntries(weekDays.map((date) => [date, ""])));
  }

  return (
    <Panel
      title="Log week at once"
      subtitle={`Pay week: ${formatWeekRange(weekStart)} (Sun–Sat). Saved days load automatically — edit any cell and save. To remove a day, use Delete in the list below.`}
    >
      {error ? <ErrorBanner message={error} /> : null}
      {notice ? (
        <div className="mb-4 flex gap-3 rounded-md border border-amber-200 bg-[var(--warning-soft)] px-4 py-3 text-sm text-amber-900">
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee">
            <Select
              value={employeeId}
              onChange={(event) => handleEmployeeChange(event.target.value)}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pay week" hint="Snaps to Sunday">
            <Input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(getWeekStart(event.target.value))}
            />
          </Field>
        </div>

        {employeeId && entriesQuery.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading saved hours for this week…</p>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-slate-50/90">
                {weekDays.map((date) => {
                  const { dayLabel, dateLabel } = formatWeekDayHeader(date);
                  const future = isFutureDay(date);
                  const saved = Boolean(serverGrid[date]?.trim());
                  return (
                    <th
                      key={date}
                      className={`px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide ${future ? "text-slate-400" : "text-slate-600"}`}
                    >
                      <span className="block">{dayLabel}</span>
                      <span className="mt-0.5 block font-normal normal-case text-[var(--muted)]">
                        {dateLabel}
                        {future ? " · future" : saved ? " · saved" : ""}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              <tr>
                {weekDays.map((date) => {
                  const future = isFutureDay(date);
                  return (
                    <td key={date} className="border-t border-[var(--border-subtle)] p-2">
                      <input
                        type="number"
                        min="0.25"
                        max="24"
                        step="0.25"
                        placeholder="—"
                        title={future ? "Cannot log hours for future dates" : undefined}
                        disabled={!employeeId || saveMutation.isPending || future}
                        value={getCellValue(date)}
                        onChange={(event) => setCellValue(date, event.target.value)}
                        className={`w-full rounded-md border px-2 py-2 text-center text-sm shadow-sm outline-none transition-colors placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 ${
                          future
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                            : "border-[var(--border)] bg-white text-slate-900 focus:border-[var(--accent)]"
                        } disabled:bg-slate-50 disabled:text-slate-400`}
                      />
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Quick actions
          </span>
          <div className="w-fit max-w-full rounded-lg border border-[var(--border-subtle)] bg-slate-50/80 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <span className="whitespace-nowrap">Hours</span>
                <Input
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  value={fillHours}
                  onChange={(event) => setFillHours(event.target.value)}
                  disabled={!employeeId}
                  aria-label="Hours to fill"
                  className="!w-[3.25rem] !max-w-[3.25rem] h-8 shrink-0 px-2 py-1 text-center text-sm"
                />
              </label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!employeeId}
                className="shrink-0 whitespace-nowrap"
                onClick={() => fillWeekdays(fillHours)}
              >
                Weekdays
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!employeeId}
                className="shrink-0 whitespace-nowrap"
                onClick={() => fillEmptyDays(fillHours)}
              >
                Empty days
              </Button>

              <span className="mx-0.5 hidden h-6 w-px shrink-0 bg-[var(--border)] sm:inline-block" aria-hidden />

              {Object.keys(localEdits).length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!employeeId}
                  className="shrink-0 whitespace-nowrap"
                  onClick={clearLocalEdits}
                >
                  Discard edits
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={!employeeId}
                className="shrink-0 whitespace-nowrap"
                onClick={clearGrid}
              >
                Clear grid
              </Button>
            </div>
          </div>
          <p className="max-w-xl text-xs text-[var(--muted)]">
            Fill applies Mon–Fri on non-future days. Clear grid only empties inputs; use Delete below to
            remove saved entries.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
          <p className="text-sm text-[var(--muted)]">
            Week total:{" "}
            <span className="font-semibold text-slate-800">{totalHours.toFixed(2)}h</span>
            {totalHours > 40 ? (
              <span className="ml-2 text-xs font-medium text-[var(--warning)]">
                ({(totalHours - 40).toFixed(2)}h overtime)
              </span>
            ) : null}
          </p>
          <Button
            loading={saveMutation.isPending}
            disabled={!employeeId}
            onClick={() => saveMutation.mutate()}
          >
            Save week
          </Button>
        </div>
      </div>
    </Panel>
  );
}
