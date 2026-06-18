# CURSOR.MD — Reglas para Mini Timesheets (OCMI)

Instrucciones para el agente de Cursor. Deben coincidir con `SPEC.md` y el código en este repo.

## Stack

- pnpm monorepo: `apps/api`, `apps/web`, `packages/shared`
- API: Hono + Drizzle + PostgreSQL
- Client: Next.js 15 + React Query + Tailwind
- Shared: `@mini-timesheets/shared` — tipos, Zod, `calculateWeeklyPay`

## Arquitectura headless obligatoria

- `packages/shared` **no** importa React, Next.js, React Native ni accede a `window` / `document`.
- Solo exporta tipos TypeScript, esquemas Zod y funciones puras.
- **Toda** la lógica de overtime/pay vive en `packages/shared/src/payroll.ts` (`calculateWeeklyPay`).
- La API y el cliente importan schemas y tipos desde shared; no los redefinen.

## Semana de nómina (US)

- Semana: **domingo → sábado** (`getWeekStart`, `getWeekEnd` en shared).
- Overtime: horas **> 40** en la misma semana calendario.
- Fechas como strings `YYYY-MM-DD`, parseadas en UTC.

## Zod y validación

- Schemas en `packages/shared/src/schemas.ts` (archivo único).
- Validación de formulario en el cliente: `schema.safeParse()` antes de llamar la API.
- Validación en API: `@hono/zod-validator` para body/query.
- Reglas que requieren DB (empleado activo, semana aprobada, fecha futura) van en `apps/api/src/lib/services.ts`, **no** en `.refine()` de Zod.

## Soft delete y bloqueo

- **Empleados:** soft delete con `deactivatedAt` (timestamp). Inactivos ocultos por defecto en listados.
- **Time entries:** sin `deletedAt`. DELETE es hard delete.
- **Semanas aprobadas:** `weekly_approvals.status = 'approved'` bloquea create/update/delete de entries de esa semana → error `WEEK_LOCKED` (409).

## Error envelope (API)

- Lanzar `AppError` desde `apps/api/src/lib/errors.ts`.
- Handler global en `apps/api/src/app.ts` responde:

```json
{ "error": { "code": "...", "message": "..." } }
```

- HTTP status en la línea de respuesta, no dentro del JSON.
- Mensajes bilingües: `Record<ErrorCode, { en, es }>` en `errors.ts`.
- Idioma: header `Accept-Language` (`es` si empieza por `es`, si no `en`).

## Rutas API

- Montar routers en `createApp()`: `/employees`, `/time-entries`, `/weekly-summary`.
- Cada dominio exporta `createXRouter(db)` desde `apps/api/src/routes/`.
- Sin prefijo `/api`.

## Cliente web

- Páginas en `apps/web/src/app/`: `employees`, `time-entries`, `weekly-summary`.
- Cliente HTTP en `apps/web/src/lib/api.ts`.
- React Query en las páginas (no hay carpeta `hooks/` obligatoria).
- Formularios con `useState` + Zod shared (`safeParse`); React Hook Form no es requerido.
- Sin lógica de negocio (overtime/pay) en componentes — solo mostrar datos de la API.

## Testing

- Vitest en shared, api y web.
- Tras implementar lógica en shared, agregar tests en `payroll.test.ts`.
- Test de integración API: `app.request()` contra `createApp(db)`; requiere Postgres migrado.
- Si Postgres no está disponible, el suite de integración se omite con `describe.skipIf`.

## TypeScript

- Evitar `any`. Tipar respuestas API y parámetros.
- Imports ESM en API con extensión `.js` en código fuente compilado.

## Prohibiciones

- No poner cálculo de overtime/pay en rutas API ni en componentes React.
- No hard-delete empleados (usar `deactivate`).
- No permitir mutaciones de time entries en semanas `approved`.
- No instalar librerías fuera del stack acordado sin justificar en `WRITEUP.md`.

## Artefactos relacionados

- `SPEC.md` — alcance y contratos
- `.cursorrules` — resumen corto para Cursor
- `AI_WORKFLOW.md` — cómo se usó IA en este proyecto
