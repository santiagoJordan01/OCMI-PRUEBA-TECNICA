import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "EMPLOYEE_INACTIVE"
  | "FUTURE_DATE"
  | "WEEK_LOCKED"
  | "WEEK_ALREADY_APPROVED"
  | "DUPLICATE_ENTRY"
  | "INTERNAL_ERROR";

const messages: Record<ErrorCode, { en: string; es: string }> = {
  VALIDATION_ERROR: {
    en: "The request contains invalid data.",
    es: "La solicitud contiene datos inválidos.",
  },
  NOT_FOUND: {
    en: "The requested resource was not found.",
    es: "No se encontró el recurso solicitado.",
  },
  EMPLOYEE_INACTIVE: {
    en: "Cannot modify time entries for an inactive employee.",
    es: "No se pueden modificar entradas de un empleado inactivo.",
  },
  FUTURE_DATE: {
    en: "Time entries cannot be created for future dates.",
    es: "No se pueden crear entradas para fechas futuras.",
  },
  WEEK_LOCKED: {
    en: "This week has been approved and its time entries are locked.",
    es: "Esta semana fue aprobada y sus entradas están bloqueadas.",
  },
  WEEK_ALREADY_APPROVED: {
    en: "An approved week cannot be rejected.",
    es: "Una semana aprobada no puede ser rechazada.",
  },
  DUPLICATE_ENTRY: {
    en: "A time entry already exists for this employee on this date.",
    es: "Ya existe una entrada para este empleado en esta fecha.",
  },
  INTERNAL_ERROR: {
    en: "An unexpected error occurred.",
    es: "Ocurrió un error inesperado.",
  },
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: ContentfulStatusCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AppError";
  }
}

export function getLocale(c: Context): "en" | "es" {
  const header = c.req.header("Accept-Language")?.toLowerCase() ?? "en";
  return header.startsWith("es") ? "es" : "en";
}

export function errorMessage(code: ErrorCode, locale: "en" | "es"): string {
  return messages[code][locale];
}

export function errorResponse(code: ErrorCode, locale: "en" | "es", override?: string) {
  const message =
    override && override !== code ? override : errorMessage(code, locale);

  return {
    error: {
      code,
      message,
    },
  };
}
