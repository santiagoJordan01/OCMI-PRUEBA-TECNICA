# Mini Timesheets — OCMI Technical Assessment

A simplified timesheet tracker built as a pnpm monorepo with:

- `apps/api` — Hono + Drizzle + PostgreSQL REST API
- `apps/web` — Next.js client
- `packages/shared` — headless types, Zod schemas, and overtime/pay calculation

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable`)
- Docker Desktop (for PostgreSQL)

## Quick start (fresh clone)

Follow these steps **in order** the first time you run the project.

### 1. Clone and install

```bash
git clone https://github.com/santiagoJordan01/OCMI-PRUEBA-TECNICA.git
cd OCMI-PRUEBA-TECNICA
pnpm install
```

### 2. Environment files

Copy the example env files (required on first setup):

**Linux / macOS:**

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

**Windows (PowerShell):**

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.local.example apps/web/.env.local
```

Defaults:

- API → `http://localhost:3001`
- Web → `http://localhost:3000`
- PostgreSQL → `localhost:5433` (Docker)

### 3. Start PostgreSQL

**Docker Desktop must be running** before this step.

```bash
pnpm db:up
```

Wait until the container is healthy (`docker compose ps` should show `healthy`).

### 4. Run migrations

Required **once** after `db:up` (and again after pulling new migrations):

```bash
pnpm db:migrate
```

### 5. Start the app

**Option A — recommended (Docker + dev servers):**

```bash
pnpm start
```

This runs `docker compose up -d` and then starts the API, web app, and shared package watcher in parallel.

**Option B — if Docker is already running:**

```bash
pnpm dev
```

### 6. Open the app

Use **localhost** in the browser (not a LAN IP — CORS is configured for `localhost`):

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API health | http://localhost:3001/health |

**Suggested flow in the UI:**

1. **Employees** — create at least one hourly employee
2. **Time entries** — log hours (week grid or single-day form)
3. **Weekly summary** — pick the same pay week (Sunday–Saturday), review totals, approve/reject

### Stopping the project

Press `Ctrl+C` in the terminal. On Windows you may see:

```
¿Desea terminar el trabajo por lotes (S/N)?
```

Answer **S** (Yes). Lines like `apps/web dev: Failed` are **normal** — they mean the process was interrupted, not that the app crashed.

Data in PostgreSQL **persists** between restarts (Docker volume). `pnpm start` does **not** delete your employees or time entries.

### Daily workflow (after first setup)

```bash
pnpm start
# or, if Docker is already up:
pnpm dev
```

You only need `pnpm db:migrate` again when new migration files are added.

## Environment variables

### API (`apps/api/.env`)

```env
DATABASE_URL=postgresql://timesheets:timesheets@localhost:5433/timesheets
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
| `pnpm start` | Start Docker Postgres, then run API + web in dev mode |
| `pnpm dev` | Run API and web in parallel (Postgres must already be up) |
| `pnpm build` | Build all packages (stop `pnpm dev` first on Windows) |
| `pnpm test` | Run all tests (uses separate DB `timesheets_test`) |
| `pnpm db:up` | Start PostgreSQL via Docker (port **5433**) |
| `pnpm db:down` | Stop PostgreSQL container (data is kept unless you use `-v`) |
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
| POST | `/time-entries/bulk` | Upsert multiple entries for one employee (transactional) |
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

**Prerequisites:** Docker running (`pnpm db:up`) and migrations applied (`pnpm db:migrate`).

```bash
pnpm test
```

Includes:

- Shared overtime/pay unit tests (9)
- API integration tests — approval locking + full flow (12)
- Frontend helper test (2)

> Integration tests use a **separate database** (`timesheets_test` on the same Postgres server) so `pnpm test` does **not** erase dev data in `timesheets`.

## Verify setup (optional)

From a clean terminal, after `pnpm start`:

```bash
curl http://localhost:3001/health
# expected: {"status":"ok"}

curl http://localhost:3001/employees
# expected: [] or a JSON array of employees
```

## Troubleshooting

- **Docker not running**: start Docker Desktop, then run `pnpm db:up`
- **`ECONNREFUSED` on port 5433**: Postgres container is down — `pnpm db:up`
- **Password authentication failed for user "timesheets"**: another PostgreSQL may be on port 5432 (common on Windows). This project uses **port 5433** in Docker. Ensure `docker-compose.yml` and `DATABASE_URL` both use `5433`
- **Web loads but API calls fail**: open http://localhost:3000 (not `http://192.168.x.x:3000`). Check `apps/web/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3001`
- **Empty employees list**: create employees in the UI, or enable **Show inactive** if they were deactivated
- **Weekly summary empty**: add time entries for that pay week (Sunday–Saturday), or select the correct week in the date picker
- **Employees disappeared after `pnpm test`**: only happens if tests ran against the dev DB in older versions; current tests use `timesheets_test`
- **`apps/web dev: Failed` when stopping**: normal after `Ctrl+C` — not an application error
- **Port conflicts**: change `PORT` in `apps/api/.env` and `NEXT_PUBLIC_API_URL` in `apps/web/.env.local`
- **Migration errors**: ensure Postgres is up; for a full reset run `docker compose down -v` (this **deletes all data**)
