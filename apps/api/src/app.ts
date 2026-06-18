import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { Database } from "./db/index.js";
import { AppError, errorResponse, getLocale } from "./lib/errors.js";
import { createEmployeesRouter } from "./routes/employees.js";
import { createTimeEntriesRouter } from "./routes/time-entries.js";
import { createWeeklySummaryRouter } from "./routes/weekly-summary.js";

function isAllowedDevOrigin(origin: string): boolean {
  if (origin.startsWith("http://localhost:")) return true;
  if (origin.startsWith("http://127.0.0.1:")) return true;
  if (/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin)) return true;
  return false;
}

export function createApp(db: Database) {
  const app = new Hono();

  app.use(
    "*",
    cors({
      origin: (origin) => (origin && isAllowedDevOrigin(origin) ? origin : "http://localhost:3000"),
      allowHeaders: ["Content-Type", "Accept-Language"],
    }),
  );

  app.get("/health", (c) => c.json({ status: "ok" }));

  app.route("/employees", createEmployeesRouter(db));
  app.route("/time-entries", createTimeEntriesRouter(db));
  app.route("/weekly-summary", createWeeklySummaryRouter(db));

  app.onError((error, c) => {
    const locale = getLocale(c);

    if (error instanceof AppError) {
      const override = error.message !== error.code ? error.message : undefined;
      return c.json(errorResponse(error.code, locale, override), error.status);
    }

    if (error instanceof HTTPException) {
      const message =
        error.message && error.message !== "Bad Request" ? error.message : undefined;
      return c.json(errorResponse("VALIDATION_ERROR", locale, message), error.status);
    }

    console.error(error);
    return c.json(errorResponse("INTERNAL_ERROR", locale), 500);
  });

  return app;
}
