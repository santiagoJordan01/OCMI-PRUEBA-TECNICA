# SPEC.md — Mini Timesheets (OCMI Technical Assessment)

Especificación de implementación alineada con el PDF de OCMI y el código en este repositorio.

## Scope

Monorepo con tres piezas:

- `apps/api` — REST API (Hono + Drizzle + PostgreSQL)
- `apps/web` — cliente web (Next.js + React Query)
- `packages/shared` — paquete headless: tipos, Zod, cálculo de overtime/pay

Dominio: roster de empleados por hora, registro diario de horas, resumen semanal con overtime (>40h/semana a 1.5×), y aprobación semanal por empleado que bloquea ediciones.

## Tech stack

| Capa | Tecnología |
|------|------------|
| Monorepo | pnpm workspaces |
| API | Hono + Drizzle ORM + PostgreSQL (Docker Compose) |
| Shared | TypeScript + Zod + funciones puras |
| Client | Next.js 15 (App Router) + React Query + Tailwind + Zod (shared) |

## Estructura del repo

```
repo/
├── apps/
│   ├── api/        # Hono + Drizzle + PostgreSQL
│   └── web/        # Next.js client
└── packages/
    └── shared/     # types, schemas, payroll logic
```

## Database schema (Drizzle)

### `employees`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| first_name | varchar | |
| last_name | varchar | |
| hourly_rate | numeric(10,2) | |
| deactivated_at | timestamptz | nullable — soft delete |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Estado derivado: `active` si `deactivated_at IS NULL`, `inactive` en caso contrario.

### `time_entries`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| employee_id | uuid | FK → employees |
| date | date | YYYY-MM-DD |
| hours | numeric(5,2) | 0.25–24 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Sin soft-delete en entries. Las entradas se bloquean cuando la semana del empleado está `approved`.

### `weekly_approvals`

| Columna | Tipo | Notas |
|---------|------|-------|
| id | uuid | PK |
| employee_id | uuid | FK → employees |
| week_start | date | domingo que inicia la semana |
| status | enum | `pending` \| `approved` \| `rejected` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Índice único: `(employee_id, week_start)`.

## Package `@mini-timesheets/shared` (headless)

Sin imports de React, Next.js, React Native ni acceso a `window`.

### Types (`types.ts`)

- `Employee`, `TimeEntry`, `WeeklyApproval`, `WeeklyPayBreakdown`
- `ApiErrorBody`, `ApprovalStatus`, `EmployeeStatus`
- Constantes: `OVERTIME_THRESHOLD_HOURS = 40`, `OVERTIME_MULTIPLIER = 1.5`

### Zod schemas (`schemas.ts`)

- `createEmployeeSchema` / `updateEmployeeSchema` — firstName, lastName, hourlyRate
- `createTimeEntrySchema` / `updateTimeEntrySchema` — employeeId (uuid), date, hours (0.25–24)
- `approvalActionSchema` — employeeId, weekStart
- `weekQuerySchema` — weekStart
- Helpers: `isFutureDate()`, `toDateString()`

Validaciones de negocio con DB (empleado activo, semana bloqueada) viven en la API, no en Zod.

### Payroll (`payroll.ts`)

- `getWeekStart(date)` — semana US: **domingo** como inicio
- `getWeekEnd(weekStart)` — sábado
- `isDateInWeek(date, weekStart)`
- `calculateWeeklyPay(input)` — regular/overtime hours + pay

Fórmula: `regular × rate + overtime × rate × 1.5`

Fechas tratadas como UTC (strings `YYYY-MM-DD`).

## API endpoints (puerto 3001, sin prefijo `/api`)

### Employees

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/employees` | Lista activos; `?includeInactive=true` incluye inactivos |
| GET | `/employees/:id` | Detalle |
| POST | `/employees` | Crear |
| PATCH | `/employees/:id` | Actualizar |
| POST | `/employees/:id/deactivate` | Soft delete (`deactivatedAt`) |
| POST | `/employees/:id/reactivate` | Reactivar |

### Time entries

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/time-entries` | Lista; `?employeeId=` opcional |
| GET | `/time-entries/:id` | Detalle |
| POST | `/time-entries` | Crear (empleado activo, fecha no futura, semana no aprobada) |
| PATCH | `/time-entries/:id` | Editar (mismas reglas) |
| DELETE | `/time-entries/:id` | Eliminar (hard delete; bloqueado si semana aprobada) |

### Weekly summary

| Method | Path | Descripción |
|--------|------|-------------|
| GET | `/weekly-summary?weekStart=YYYY-MM-DD` | Totales por empleado + estado de aprobación |
| POST | `/weekly-summary/approve` | Body: `{ employeeId, weekStart }` |
| POST | `/weekly-summary/reject` | Body: `{ employeeId, weekStart }` |
| GET | `/weekly-summary/approval?employeeId=&weekStart=` | Estado de aprobación |

## Error envelope (bilingüe)

HTTP status en la respuesta; cuerpo:

```json
{
  "error": {
    "code": "WEEK_LOCKED",
    "message": "This week has been approved and its time entries are locked."
  }
}
```

Idioma según header `Accept-Language` (default `en`; `es` si empieza por `es`).

Códigos: `VALIDATION_ERROR`, `NOT_FOUND`, `EMPLOYEE_INACTIVE`, `FUTURE_DATE`, `WEEK_LOCKED`, `INTERNAL_ERROR`.

Implementación: `apps/api/src/lib/errors.ts`, manejador global en `app.ts`.

## Client screens (`apps/web`)

1. **Employees** (`/employees`) — lista, toggle inactivos, crear/editar, deactivate/reactivate
2. **Time entries** (`/time-entries`) — filtro por empleado, CRUD, validación con Zod shared
3. **Weekly summary** (`/weekly-summary`) — selector de semana, totales, approve/reject

Estado servidor: React Query. Cliente HTTP: `apps/web/src/lib/api.ts`.

## Testing

| Ámbito | Archivo | Qué cubre |
|--------|---------|-----------|
| Shared unit | `packages/shared/src/payroll.test.ts` | 40h exactas, overtime, decimales, entries fuera de semana |
| API integration | `apps/api/src/approval.integration.test.ts` | Approve → PATCH entry devuelve `WEEK_LOCKED` (requiere Postgres) |
| Frontend bonus | `apps/web/src/lib/week.test.ts` | `getWeekStart()` normaliza a domingo |

Integración usa `app.request()` de Hono (sin `hono/testing` package). Se omite si Postgres no está disponible.

## Implementation order (real)

1. Monorepo pnpm + Docker Compose + Drizzle migrations
2. `@mini-timesheets/shared` — schemas, `calculateWeeklyPay`, tests
3. `apps/api` — rutas, servicios, error envelope, test de integración
4. `apps/web` — tres pantallas, React Query, Zod en formularios
5. `README.md`, `AI_WORKFLOW.md`, artefactos (`SPEC.md`, `CURSOR.MD`, `.cursorrules`)

## Must-have OCMI (checklist)

- [x] Shared headless consumido por API y cliente
- [x] Overtime correcto + unit tests
- [x] Soft-delete empleados (`deactivatedAt`)
- [x] Error envelope + errores API en/es
- [x] README con setup desde clone fresco
- [x] Test integración flujo approve → lock

## Nice-to-have (no implementado)

- UI i18n (en/es)
- Nx / Turborepo
- React Hook Form
- Cliente API generado
- E2E / Storybook
