DELETE FROM "time_entries" AS newer
USING "time_entries" AS older
WHERE newer."employee_id" = older."employee_id"
  AND newer."date" = older."date"
  AND newer."id" > older."id";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "time_entries_employee_date_idx" ON "time_entries" USING btree ("employee_id","date");
