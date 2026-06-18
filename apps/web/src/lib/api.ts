import type {
  ApiErrorBody,
  Employee,
  TimeEntry,
  WeeklyApproval,
  WeeklyPayBreakdown,
} from "@mini-timesheets/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": "en",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiClientError(
      body?.error.code ?? "INTERNAL_ERROR",
      body?.error.message ?? "Request failed",
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface WeeklySummaryItem {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    hourlyRate: number;
    status: "active" | "inactive";
  };
  pay: WeeklyPayBreakdown;
  approval: { status: "pending" | "approved" | "rejected"; id?: string; updatedAt?: string };
}

export const api = {
  employees: {
    list: (includeInactive = false) =>
      request<Employee[]>(`/employees?includeInactive=${includeInactive}`),
    get: (id: string) => request<Employee>(`/employees/${id}`),
    create: (body: { firstName: string; lastName: string; hourlyRate: number }) =>
      request<Employee>("/employees", { method: "POST", body: JSON.stringify(body) }),
    update: (
      id: string,
      body: Partial<{ firstName: string; lastName: string; hourlyRate: number }>,
    ) => request<Employee>(`/employees/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deactivate: (id: string) =>
      request<Employee>(`/employees/${id}/deactivate`, { method: "POST" }),
    reactivate: (id: string) =>
      request<Employee>(`/employees/${id}/reactivate`, { method: "POST" }),
  },
  timeEntries: {
    list: (employeeId?: string) =>
      request<TimeEntry[]>(
        employeeId ? `/time-entries?employeeId=${employeeId}` : "/time-entries",
      ),
    bulkUpsert: (body: { employeeId: string; entries: { date: string; hours: number }[] }) =>
      request<TimeEntry[]>("/time-entries/bulk", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    create: (body: { employeeId: string; date: string; hours: number }) =>
      request<TimeEntry>("/time-entries", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ date: string; hours: number }>) =>
      request<TimeEntry>(`/time-entries/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (id: string) => request<void>(`/time-entries/${id}`, { method: "DELETE" }),
  },
  weeklySummary: {
    list: (weekStart: string) =>
      request<{ weekStart: string; summaries: WeeklySummaryItem[] }>(
        `/weekly-summary?weekStart=${weekStart}`,
      ),
    approve: (body: { employeeId: string; weekStart: string }) =>
      request<WeeklyApproval>("/weekly-summary/approve", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    reject: (body: { employeeId: string; weekStart: string }) =>
      request<WeeklyApproval>("/weekly-summary/reject", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
};
