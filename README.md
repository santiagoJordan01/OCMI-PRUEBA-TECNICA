# Mini Timesheets — OCMI Technical Assessment

A simplified timesheet tracker built as a pnpm monorepo with:

- `apps/api` — Hono + Drizzle + PostgreSQL REST API
- `apps/web` — Next.js client
- `packages/shared` — headless types, Zod schemas, and overtime/pay calculation

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable`)
- Docker Desktop (for PostgreSQL)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL
pnpm db:up

# 3. Run database migrations
pnpm db:migrate

# 4. Start API and web app
pnpm dev
```

- API: http://localhost:3001
- Web: http://localhost:3000

## Environment variables

### API (`apps/api/.env`)

```env
DATABASE_URL=postgresql://timesheets:timesheets@localhost:5432/timesheets
PORT=3001
```

### Web (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Payroll week rules

- Payroll weeks run **Sunday through Saturday** (US-style week).
- Overtime applies to hours **beyond 40 in the same week**.
- Overtime pay uses a **1.5× multiplier** on the hourly rate.
- Approved weeks lock their time entries from create/update/delete.

## Project scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run API and web in parallel |
| `pnpm build` | Build all packages |
| `pnpm test` | Run all tests |
| `pnpm db:up` | Start PostgreSQL via Docker |
| `pnpm db:migrate` | Apply Drizzle migrations |

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/employees` | List employees (`?includeInactive=true`) |
| POST | `/employees` | Create employee |
| PATCH | `/employees/:id` | Update employee |
| POST | `/employees/:id/deactivate` | Soft-delete employee |
| GET | `/time-entries` | List entries (`?employeeId=`) |
| POST | `/time-entries` | Create entry |
| PATCH | `/time-entries/:id` | Update entry |
| DELETE | `/time-entries/:id` | Delete entry |
| GET | `/weekly-summary?weekStart=YYYY-MM-DD` | Weekly totals per employee |
| POST | `/weekly-summary/approve` | Approve employee week |
| POST | `/weekly-summary/reject` | Reject employee week |

API errors use a consistent envelope:

```json
{
  "error": {
    "code": "WEEK_LOCKED",
    "message": "This week has been approved and its time entries are locked."
  }
}
```

Send `Accept-Language: es` for Spanish error messages.

## Tests

```bash
pnpm test
```

Includes:

- Shared overtime/pay unit tests
- API integration test for approval locking
- Frontend helper test

> Integration tests require PostgreSQL running and migrations applied.

## Submission artifacts

- `README.md` — setup instructions
- `WRITEUP.md` — candidate-written (no AI)
- `AI_WORKFLOW.md` — AI workflow description + committed artifacts

## Troubleshooting

- **Docker not running**: start Docker Desktop, then run `pnpm db:up`
- **Port conflicts**: change `PORT` and `NEXT_PUBLIC_API_URL`
- **Migration errors**: ensure the database is empty or run `docker compose down -v` to reset
