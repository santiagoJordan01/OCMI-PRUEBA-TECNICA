# AI Workflow — Mini Timesheets

Descripción del flujo real usado para construir esta entrega (OCMI Technical Assessment, Parte 3).

## Tools used

- **Cursor** (Composer) como agente principal para scaffolding, API, shared package y pantallas web.
- **Terminal**: pnpm, Docker Compose, Vitest.
- **Contexto cargado manualmente**: PDF de la prueba OCMI, y después `SPEC.md` + `CURSOR.MD` / `.cursorrules`.

## Project context artifacts

| Archivo | Rol |
|---------|-----|
| `SPEC.md` | Alcance, schema, endpoints, checklist OCMI |
| `CURSOR.MD` | Reglas de arquitectura para el agente |
| `.cursorrules` | Resumen de convenciones en el IDE |
| `AI_WORKFLOW.md` | Este documento |

## How AI was used

### Fase 1 — Análisis y plan

Se pegó el PDF de OCMI en Cursor para entender dominio (timesheets, overtime 40h, aprobación semanal) y must-haves. Se definió el monorepo pnpm con `apps/api`, `apps/web`, `packages/shared`.

### Fase 2 — Shared package primero

**Enfoque:** implementar la lógica de negocio headless antes que API o UI, como pide la prueba.

**Prompt típico:**
> Implementá en `packages/shared` los schemas Zod (empleado, time entry), `getWeekStart` (semana domingo–sábado), y `calculateWeeklyPay` con tests para 40h exactas, overtime, decimales y entries fuera de semana.

**Resultado:**
- `schemas.ts`, `payroll.ts`, `types.ts`
- `payroll.test.ts` — 9 tests unitarios

**Revisión humana:** confirmar que overtime no vive en API ni en React.

### Fase 3 — API (Hono + Drizzle)

**Prompt típico:**
> Creá la API con empleados (soft delete `deactivatedAt`), time entries, weekly summary con `calculateWeeklyPay` desde shared, y aprobación semanal que bloquee mutaciones.

**Decisiones tomadas con IA:**
- Tabla `weekly_approvals` en lugar de status por entry (alineado al PDF OCMI).
- Servicios en `lib/services.ts` para `assertEmployeeCanLogTime` y `assertWeekNotLocked`.
- Error envelope en `lib/errors.ts` con `Accept-Language`.

**Correcciones posteriores:**
- Imports `.js` en tests de Vitest → `extensionAlias` en `vitest.config.ts`.
- Test de integración con `describe.skipIf` cuando Docker/Postgres no está activo.

### Fase 4 — Cliente web (Next.js)

**Prompt típico:**
> Tres pantallas: employees, time-entries, weekly-summary. React Query + validación con Zod de `@mini-timesheets/shared`. Sin lógica de overtime en el cliente.

**Resultado:**
- Formularios con `useState` + `safeParse` (no React Hook Form).
- `lib/api.ts` como cliente HTTP tipado.
- Test bonus: `week.test.ts` para `getWeekStart`.

### Fase 5 — Documentación y alineación

Los primeros borradores de `SPEC.md`, `CURSOR.MD` y este archivo describían un diseño distinto (`calculateOvertime`, `deletedAt` en entries, semana ISO, React Hook Form). Se reescribieron para coincidir con el código y el PDF de OCMI.

## Artifacts committed as-is

- `SPEC.md`, `CURSOR.MD`, `.cursorrules`, `AI_WORKFLOW.md`
- Código en `apps/`, `packages/`
- `README.md` con setup desde clone fresco
- `WRITEUP.md` — **plantilla vacía; el candidato debe completarla sin IA (Parte 2)**

## What I reviewed manually

- Overtime solo en `packages/shared` (`calculateWeeklyPay`).
- Soft delete en empleados (`deactivatedAt`), no en time entries.
- Semanas aprobadas bloquean PATCH/DELETE de entries (`WEEK_LOCKED`, mensaje en español con `Accept-Language: es`).
- Empleados inactivos no reciben nuevas entries (`EMPLOYEE_INACTIVE`).
- Horas 0.25–24, sin fechas futuras.
- `pnpm test` y `pnpm build` pasan; integración requiere `pnpm db:up` + `pnpm db:migrate`.

## If this were production

- CI (lint, typecheck, tests con Postgres en servicio).
- OpenAPI + cliente generado.
- Auth y multi-tenancy.
- UI i18n (en/es) además de errores API.
- Nx/Turborepo para task graph en monorepo grande.
