import type { ZodSchema } from "zod";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AppError, errorResponse, getLocale } from "./errors.js";

function validationError(c: Context, message?: string) {
  const locale = getLocale(c);
  return c.json(errorResponse("VALIDATION_ERROR", locale, message), 400);
}

export function jsonValidator<T extends ZodSchema>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (!result.success) {
      return validationError(c, result.error.issues[0]?.message);
    }
  });
}

export function queryValidator<T extends ZodSchema>(schema: T) {
  return zValidator("query", schema, (result, c) => {
    if (!result.success) {
      return validationError(c, result.error.issues[0]?.message);
    }
  });
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "23505"
  );
}

export function handleDbError(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AppError("DUPLICATE_ENTRY", 409);
  }
  throw error;
}
