export type EmployeeStatus = "active" | "inactive";

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  hourlyRate: number;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  date: string;
  hours: number;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyApproval {
  id: string;
  employeeId: string;
  weekStart: string;
  status: ApprovalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyPayBreakdown {
  employeeId: string;
  weekStart: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export const OVERTIME_THRESHOLD_HOURS = 40;
export const OVERTIME_MULTIPLIER = 1.5;
