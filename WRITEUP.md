# WRITEUP.md

## 1. Why you, why us (max 500 words)

Me considero una persona creativa y siempre dispuesta a aprender algo nuevo cada día. Tengo experiencia desarrollando software y, en mi trabajo actual, interactúo directamente con las necesidades de los clientes. Allí se exigen soluciones de todo tipo, sin importar la problemática, así que estoy acostumbrado a tomar decisiones y proponer alternativas concretas.

**Fortalezas:** desarrollo fullstack con TypeScript, trabajo con clientes reales, implementación de sistemas en producción (no solo escribir código) y capacidad de adaptarme cuando el problema no viene “de manual”. En esta prueba construí un monorepo con API, paquete compartido y cliente web, con tests de overtime y un flujo de aprobación que bloquea ediciones.

**Debilidad honesta:** no tengo experiencia profesional con React Native ni con el dominio payroll a escala de producción (multi-tenant, impuestos, filings). Sí tengo base sólida en React y en APIs REST, y el diseño headless de `packages/shared` facilitaría aprender el lado móvil sin reescribir la lógica de negocio.

**Proyectos concretos:** en mi portafolio y en mi GitHub (`github.com/santiagoJordan01`) están proyectos relacionados con React y desarrollo web. Para esta prueba técnica, el repositorio Mini Timesheets incluye empleados, entradas de horas, resumen semanal con overtime y aprobación semanal.

**¿Por qué OCMI?** Siempre he demostrado interés en pertenecer a esta empresa, no solo por lo que significaría para mí a nivel personal y profesional, sino porque siento que puedo aportar de verdad: me apasiona lo que hago. Además de desarrollar, implemento el sistema en la empresa donde trabajo, interactúo con clientes y sé resolver los problemas que se presentan. OCMI construye tecnología propia para nómina y seguros — un dominio real, con reglas de negocio claras — y eso encaja con cómo me gusta trabajar.

---

## 2. Decisions and trade-offs (max 700 words)

### Decision 1 — Lógica de negocio en un paquete compartido

- **Chosen:** Tipos, validaciones Zod y el cálculo de horas extra y sueldo en `packages/shared`. Tanto la API como la aplicación web lo consumen directamente, sin copiar ni pegar nada.
- **Rejected:** Repetir los mismos esquemas en backend y frontend, o meter la fórmula del overtime en una ruta de la API.
- **Why:** La prueba lo pedía y me evitó inconsistencias. Si toca cambiar el cálculo, se hace una sola vez. Pude probar `calculateWeeklyPay` sin levantar la base de datos, y si más adelante hay una app móvil, el mismo paquete sirve sin reescribir reglas.

### Decision 2 — Aprobación semanal con `weekly_approvals`

- **Chosen:** Tabla `weekly_approvals` con empleado, inicio de semana y estado (`pending`, `approved`, `rejected`). Cuando una semana se aprueba, la API no deja crear, editar ni borrar horas de esa semana.
- **Rejected:** Marcar cada time entry como aprobado o usar borrado lógico en las entradas.
- **Why:** En nómina real se aprueba la semana entera, no el día suelto. Evita estados mezclados. Centralicé la validación en `assertWeekNotLocked` para mantener las rutas simples y los tests claros.

### Decision 3 — Monorepo pnpm + Hono + Drizzle + PostgreSQL

- **Chosen:** `apps/api`, `apps/web` y `packages/shared` con pnpm workspaces. API con Hono y Drizzle; PostgreSQL en Docker (puerto 5433, para no chocar con otras bases locales).
- **Rejected:** Frameworks más pesados o quedarme solo con SQLite para simplificar.
- **Why:** Hono es liviano y tipado. Drizzle me deja SQL explícito con migraciones. PostgreSQL es más realista para payroll. Docker permite levantar el proyecto con pocos comandos desde un clone fresco.

### What I would do differently in production

Si esto fuera para producción con un equipo detrás, lo primero sería autenticación con roles (admin, supervisor, empleado), para que no cualquiera pueda aprobar una semana. Agregaría CI en cada cambio: tipos, pruebas y migraciones. Separaría entornos (desarrollo, staging, producción) y guardaría secretos fuera del código. Aseguraría idempotencia y transacciones en operaciones críticas (aprobar semana, carga masiva de horas). Pondría la interfaz en inglés y español, no solo los errores de la API. Añadiría pruebas E2E con Playwright y una guía de onboarding para que alguien nuevo levante todo en minutos.

---

## 2.1 Questions

### React Native experience

No tengo experiencia con React Native. Sí tengo experiencia con React en proyectos personales y profesionales; en mi portafolio y en mi GitHub (`github.com/santiagoJordan01`) hay proyectos relacionados.

### Development environment

- **OS:** Windows 11  
- **Processor:** AMD Ryzen 5 4500U with Radeon Graphics (2.38 GHz)  
- **RAM:** 16 GB  
- **Storage:** 512 GB SSD  
- **Tools:** Cursor, VS Code, Docker Desktop, DBeaver  
