"use client";

import { getWeekStart, todayDateString } from "@mini-timesheets/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Button,
  DataList,
  DataListItem,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  ItemTitle,
  LoadingState,
  MetaText,
  PageHeader,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { formatWeekRange } from "@/lib/week";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function WeeklySummaryPage() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(getWeekStart(todayDateString()));
  const [actionError, setActionError] = useState<string | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["weekly-summary", weekStart],
    queryFn: () => api.weeklySummary.list(weekStart),
  });

  const approvalMutation = useMutation({
    mutationFn: ({
      employeeId,
      action,
    }: {
      employeeId: string;
      action: "approve" | "reject";
    }) =>
      action === "approve"
        ? api.weeklySummary.approve({ employeeId, weekStart })
        : api.weeklySummary.reject({ employeeId, weekStart }),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["weekly-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    },
    onError: (error: Error) => setActionError(error.message),
  });

  const summaries = summaryQuery.data?.summaries ?? [];

  const totals = useMemo(() => {
    return summaries.reduce(
      (acc, item) => {
        acc.hours += item.pay.totalHours;
        acc.pay += item.pay.totalPay;
        return acc;
      },
      { hours: 0, pay: 0 },
    );
  }, [summaries]);

  return (
    <div>
      <PageHeader
        title="Weekly summary"
        description="Review regular and overtime hours, then approve or reject each employee's week. Approved weeks lock their entries."
        action={
          <Field label="Pay week" hint="Sunday start">
            <Input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(getWeekStart(event.target.value))}
              className="min-w-[160px]"
            />
          </Field>
        }
      />

      <p className="-mt-2 mb-6 text-sm font-medium text-slate-600">
        Week of {formatWeekRange(weekStart)}
      </p>

      {summaryQuery.isLoading ? <LoadingState /> : null}
      {summaryQuery.error ? <ErrorBanner message={(summaryQuery.error as Error).message} /> : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <StatCard label="Total hours" value={`${totals.hours.toFixed(2)}h`} />
        <StatCard label="Total payroll" value={formatMoney(totals.pay)} accent="primary" />
      </div>

      {!summaryQuery.isLoading && summaries.length === 0 ? (
        <EmptyState
          title="No activity this week"
          description="Add time entries for employees to see payroll totals here."
        />
      ) : null}

      {summaries.length > 0 ? (
        <Panel title="Employee breakdown">
          <DataList>
            {summaries.map((item) => (
              <DataListItem
                key={item.employee.id}
                actions={
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        approvalMutation.mutate({
                          employeeId: item.employee.id,
                          action: "approve",
                        })
                      }
                      disabled={
                        approvalMutation.isPending || item.approval.status === "approved"
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        approvalMutation.mutate({
                          employeeId: item.employee.id,
                          action: "reject",
                        })
                      }
                      disabled={
                        approvalMutation.isPending ||
                        item.approval.status === "approved" ||
                        item.approval.status === "rejected"
                      }
                    >
                      Reject
                    </Button>
                  </>
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ItemTitle>
                    {item.employee.firstName} {item.employee.lastName}
                  </ItemTitle>
                  <StatusBadge status={item.employee.status} />
                  <StatusBadge status={item.approval.status} />
                </div>
                <MetaText>
                  Rate {formatMoney(item.employee.hourlyRate)} / hr
                </MetaText>
                <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <span className="text-[var(--muted)]">Total </span>
                    <span className="font-medium text-slate-800">{item.pay.totalHours}h</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Regular </span>
                    <span className="font-medium text-slate-800">{item.pay.regularHours}h</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Overtime </span>
                    <span className="font-medium text-slate-800">{item.pay.overtimeHours}h</span>
                  </div>
                  <div>
                    <span className="text-[var(--muted)]">Pay </span>
                    <span className="font-semibold text-slate-900">
                      {formatMoney(item.pay.totalPay)}
                    </span>
                  </div>
                </div>
                {item.approval.status === "approved" ? (
                  <p className="mt-2 text-xs font-medium text-[var(--success)]">
                    Entries locked for this week
                  </p>
                ) : null}
              </DataListItem>
            ))}
          </DataList>
        </Panel>
      ) : null}
    </div>
  );
}
