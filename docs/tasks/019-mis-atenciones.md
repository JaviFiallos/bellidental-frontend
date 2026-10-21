# 019 — Consultorio: mis atenciones (por día, semana o mes)

> Plan §5.19 (P19). Sin backend nuevo: reutiliza `GET /api/v1/appointments` (tarea 007).
> Perfil: ODONTOLOGO y DIRECTOR (sus propias atenciones). Pedido del usuario 2026-10-19.

## Brief de diseño (modo Operate)
- **Tarea principal:** encontrar una atención anterior propia y abrirla en **2 clics** (período → "Corregir").
  Responde a "¿a quién atendí esta semana?" y "¿qué atención dejé abierta?".
- Tabla densa ordenada de la **más reciente a la más antigua**, estado con color **y** texto.
- **Antigoals:** sin "Editar" ni "Eliminar" (corregir una cerrada es anular y registrar, D-6, lo resuelve la
  pantalla de atención); sin paginación (el período acota el volumen); sin datos clínicos que no traiga la cita.

## Contrato (sin cambios en el backend)
- **`GET /api/v1/appointments?professionalId={me}&from={ISO}&to={ISO}`** (`APPOINTMENT_READ`) →
  `ApiResponse<Appointment[]>` (modelo `Appointment` de `features/appointments`). Campos que se usan:
  `id`, `patientId`, `patientName`, `specialtyName`, `startAt`, `encounterId`, `encounterStatus` (`OPEN`/`COMPLETED`),
  `encounterVoided`.
- `{me}` = `SessionStore.currentUser()?.professionalId` (como `dentist-board.store.ts`).
- `from` = `ClinicClock.dayRange(primerDía).from`, `to` = `ClinicClock.dayRange(últimoDía).to` (offset −05:00).
- Atención = cita con `encounterId != null`. Las citas sin atención se descartan en el frontend.

## Objetivo
1. **Ruta** `/consultorio/atenciones` con `profileGuard('ODONTOLOGO','DIRECTOR')` y `loadComponent` de
   `MyEncountersPage`. Declararla **antes** de `consultorio/atencion/:encounterId`.
2. **Sidebar** (`layout/nav-items.ts`): entrada **"Mis atenciones"** (ícono `History` de lucide) justo debajo de
   "Mis citas", para ODONTOLOGO y DIRECTOR. El ítem "Mis citas" (`/consultorio`) no debe quedar activo en
   `/consultorio/atenciones` (revisar el `routerLinkActive`; usar `exact` si hace falta para `/consultorio`).
3. **Período** (estado en la URL para que "Atrás" desde la atención vuelva al mismo período):
   `?periodo=dia|semana|mes&fecha=YYYY-MM-DD`. Por defecto `semana` y hoy (`ClinicClock.todayDateString()`).
   - Selector `bd-segmented`: Día · Semana · Mes.
   - Rango (lógica pura en `clinical/domain/encounter-period.ts`, con strings `YYYY-MM-DD`, sin `new Date()` local):
     día = esa fecha; semana = **lunes a domingo** que contiene la fecha; mes = día 1 al último día del mes.
   - `bd-date-nav` para ‹ anterior · siguiente › y "Hoy". Se amplía el componente compartido (sin romper sus usos):
     - `label = input<string | null>(null)`: si viene, se muestra en lugar de la fecha formateada;
     - `unit = input<'día' | 'semana' | 'mes'>('día')`: `aria-label` "Día/Semana/Mes anterior" y "… siguiente".
     - Etiquetas: día "lunes, 19 de octubre de 2026" (lo actual); semana "13 – 19 oct 2026" (o "28 sept – 4 oct 2026"
       si cruza de mes); mes "octubre 2026". `isToday` = el período contiene hoy.
   - ‹ › mueven un día, 7 días o un mes (el mes conserva el día 1 para no saltar meses cortos).
4. **Carga** (`clinical/services/my-encounters.store.ts`, provisto por la página): al cambiar período o fecha pide
   el rango; descarta respuestas viejas (`switchMap`). Filtra `encounterId != null` y ordena por `startAt` **desc**.
   - Cabecera (`bd-page-header` si encaja): "Mis atenciones" + resumen "8 atenciones · 1 abierta".
   - Casilla **"Solo abiertas"** (filtro local: `encounterStatus === 'OPEN' && !encounterVoided`).
   - Sin `professionalId` en la sesión: `bd-empty-state` "Tu usuario no está registrado como profesional" y no pide nada.
   - Carga: `bd-skeleton`. Vacío: `bd-empty-state` "No hay atenciones en este período". Error: `message` del backend
     (403 → "No tienes permiso", 0 → "No se pudo conectar con el servidor") con botón "Reintentar".
5. **Tabla** (`clinical/components/encounter-log-table/`, presentacional): columnas **Fecha · Hora · Paciente ·
   Especialidad · Estado · Acción**.
   - Fecha `dd/MM/yyyy` y hora `HH:mm` en America/Guayaquil (pipes de `shared/pipes`).
   - Paciente: `patientName` como enlace a `/pacientes/:patientId`.
   - Estado con `bd-status-badge` (color + texto): anulada (`encounterVoided`) → "Anulada" tono `cancelled`;
     `COMPLETED` → "Cerrada" tono `attended`; `OPEN` → "Abierta" tono `in-progress`.
   - Acción (un `<a>` con estilo de botón, 44 px de alto mínimo) a `/consultorio/atencion/:encounterId`:
     `OPEN` → **"Continuar"**; `COMPLETED` → **"Corregir"**; anulada → **"Ver"**. `aria-label` con el paciente
     ("Corregir atención de Pérez David").
   - Mapeo estado → etiqueta/tono/acción en `clinical/domain/encounter-period.ts` (o un archivo `encounter-log.ts`
     en `domain/`), no en la plantilla.
6. Sin cambios en la pantalla de atención ni en el backend.

## Archivos a tocar
```
src/app/
├── app.routes.ts                                   (ruta /consultorio/atenciones)
├── layout/
│   ├── nav-items.ts                                ("Mis atenciones" para ODONTOLOGO y DIRECTOR)
│   └── sidebar/…                                   (solo si hace falta exact en /consultorio)
├── shared/components/date-nav/date-nav.component.ts (inputs label y unit, retrocompatibles)
└── features/clinical/
    ├── domain/encounter-period.ts                  (rangos día/semana/mes, etiquetas, estado → texto/tono/acción)
    ├── services/my-encounters.store.ts             (signals; usa AppointmentsApi de features/appointments/index.ts)
    ├── components/encounter-log-table/encounter-log-table.component.ts
    └── pages/my-encounters/
        ├── my-encounters.page.ts
        └── my-encounters.page.spec.ts
```
- Depende de `features/appointments/index.ts` (`AppointmentsApi`, `Appointment`), `core/auth` (`SessionStore`),
  `core/services` (`ClinicClock`) y `shared/components` (segmented, date-nav, status-badge, empty-state, skeleton,
  page-header). El `index.ts` de `clinical` no cambia (la página solo la carga la ruta).

## Criterios de aceptación
- [ ] "Mis atenciones" aparece en el sidebar del odontólogo y del director, debajo de "Mis citas", y es el único
      ítem activo en `/consultorio/atenciones`.
- [ ] Por defecto muestra la semana actual (lunes–domingo, Guayaquil) y pide un solo
      `GET /api/v1/appointments?professionalId=…&from=…T00:00:00-05:00&to=…T23:59:59-05:00`.
- [ ] Solo filas con atención, de la más reciente a la más antigua; citas sin atención no aparecen.
- [ ] Día/Semana/Mes y ‹ › cambian el rango y la URL; recargar o volver con "Atrás" conserva el período.
- [ ] Estado con color y texto; "Continuar" / "Corregir" / "Ver" según el estado; abren la atención.
- [ ] "Solo abiertas" filtra sin otra petición; el resumen cuenta atenciones y abiertas del período.
- [ ] Estados de carga, vacío, error (con "Reintentar") y usuario sin profesional.
- [ ] `bd-date-nav` sigue igual en sus usos actuales (agenda de recepción y horarios).
- [ ] Sin colores sueltos (solo tokens), sin `any`, OnPush, plantillas < ~150 líneas.

## Responsive
Anchos: **375, 768, 1024, 1366**.
- `≥ sm` (600): tabla; sin scroll horizontal de la página (si no cabe, el scroll vive en el contenedor de la tabla).
- `< sm`: la tabla pasa a **lista de tarjetas** (fecha y hora + estado arriba, paciente, especialidad, botón de
  acción a todo el ancho).
- Selector de período y `date-nav` en una fila en `≥ md`; apilados en `< md`. Objetivos táctiles ≥ 44 px.

## Tests requeridos
`my-encounters.page.spec.ts` (2 casos; reloj fijo como en `dentist-board.page.spec.ts`; respuestas
`ApiResponse<Appointment[]>` reales):
1. `abrir Mis atenciones → pide la semana actual y lista las atenciones de la más reciente a la más antigua`:
   verifica la URL con `professionalId`, `from` (lunes) y `to` (domingo); responde 3 citas (una abierta, una
   cerrada, una sin atención) → se ven 2 filas en orden desc con "Continuar" y "Corregir", y la sin atención no.
2. `error del backend → muestra el mensaje y Reintentar`: responde 500 con `message` → se ve el mensaje y el
   botón "Reintentar".

## Prueba manual
1. Entrar como odontólogo → sidebar "Mis atenciones" → semana actual con sus atenciones, más reciente arriba.
2. ‹ semana anterior → cambian el rango, la etiqueta y la URL. "Hoy" vuelve a la semana actual.
3. Cambiar a Día y a Mes; recorrer meses (31 → 30 → febrero) sin saltos.
4. "Corregir" en una atención cerrada de otro día → abre la atención en modo corrección; "Atrás" vuelve al mismo período.
5. Dejar una atención abierta → "Solo abiertas" la muestra con "Continuar".
6. Director con profesional: ve las suyas. Revisar 375, 768, 1024 y 1366 (tarjetas en 375).
7. Agenda de recepción: el `date-nav` sigue mostrando la fecha y "Día anterior/siguiente".

## Resultado

**Archivos creados**
- `src/app/features/clinical/domain/encounter-period.ts`: rangos día/semana (lunes–domingo)/mes con aritmética UTC sobre strings `YYYY-MM-DD`, etiquetas, parseo de `?periodo=&fecha=` (inválido → semana y hoy) y desplazamiento ‹ ›.
- `src/app/features/clinical/domain/encounter-log.ts`: `isEncounterOpen`, `encounterLogStatus` (estado → etiqueta, tono y acción) y `encounterSummaryText`.
- `src/app/features/clinical/services/my-encounters.store.ts`: signals; `switchMap` descarta respuestas viejas; filtra `encounterId != null` y ordena por `startAt` desc; `Solo abiertas` es filtro local.
- `src/app/features/clinical/components/encounter-log-table/encounter-log-table.component.ts`: presentacional. Tabla en `>= sm`; en `< sm` cada fila es una tarjeta (CSS, un solo marcado).
- `src/app/features/clinical/pages/my-encounters/my-encounters.page.ts` y `my-encounters.page.spec.ts` (2 casos).

**Archivos modificados**
- `src/app/shared/components/date-nav/date-nav.component.ts`: inputs nuevos `label` (null por defecto) y `unit` ('día' por defecto). Con los defaults, el texto y los `aria-label` ("Día anterior/siguiente") son los de antes.
- `src/app/layout/nav-items.ts`: "Mis atenciones" (ícono `History`) debajo de "Mis citas" para ODONTOLOGO y DIRECTOR. Nuevo flag `exact` en `NavItem`; "Mis citas" lo usa.
- `src/app/layout/sidebar/sidebar.component.html`: `[routerLinkActiveOptions]="{ exact: !!item.exact }"`.
- `src/app/app.routes.ts`: ruta `consultorio/atenciones` con `profileGuard('ODONTOLOGO','DIRECTOR')`, antes de `consultorio/atencion/:encounterId`.

**Decisiones**
- Sin backend: `AppointmentsApi.list` con `professionalId` de la sesión y rango con `ClinicClock.dayRange`.
- Fecha de la tabla con el pipe `date` de Angular (`dd/MM/yyyy`, zona `America/Guayaquil`), porque `shared/pipes` no tiene formato numérico. Hora con `clinicTime`.
- Cambiar de tipo de período mantiene la fecha ancla; cada cambio (tipo, ‹ ›, Hoy) hace `router.navigate` con push, así "Atrás" desde la atención vuelve al mismo período.
- Consecuencia del `exact` en "Mis citas": en `/consultorio/atencion/:id` ningún ítem del sidebar queda activo (antes quedaba "Mis citas"). Es la forma más simple de cumplir "único ítem activo en /consultorio/atenciones"; si se quiere conservar, hay que añadir una regla específica.
- `label` del período lo arma el dominio (también para el día), así que el texto de `bd-date-nav` por defecto no se usa en esta pantalla.

**Build**: `npx ng build` → `Application bundle generation complete. [15.810 seconds]` (sin errores; el chunk `my-encounters-page` pesa 14.51 kB raw).

**Tests**
- `npx ng test --watch=false --include='src/app/features/clinical/pages/my-encounters/**/*.spec.ts'` → `Test Files  1 passed (1)` / `Tests  2 passed (2)`.
- `npx ng test --watch=false --include='src/app/features/appointments/**/*.spec.ts'` (usa `bd-date-nav` en la agenda) → `Test Files  2 passed (2)` / `Tests  12 passed (12)`.
- `npx ng test --watch=false` (completo) → `Test Files  10 passed (10)` / `Tests  46 passed (46)`.

**Verificación visual**: no hecha. No levanté el navegador, así que no revisé 375/768/1024/1366 ni el sidebar. Pendiente para el usuario según la Prueba manual, con especial atención a la tarjeta de `< sm` (grid de `encounter-log__row`) y al `exact` del sidebar.

**Supuestos**
- Rango de "Mis citas" en el spec: hoy fijado a 2026-10-21 (miércoles) con `vi.useFakeTimers({ toFake: ['Date'] })`, semana 19–25 oct.
- Una atención con `encounterStatus` distinto de `COMPLETED` y sin anular se muestra como "Abierta" (solo `OPEN` es válido en el backend).
- No se commiteó nada; no toqué backend ni `clinical/index.ts`.

## Revisión
_(lo llena Claude)_

### Ronda 1
Estado: APROBADO

- Revisado: período lunes–domingo y mes con aritmética UTC sobre `YYYY-MM-DD`, URL `?periodo=&fecha=`, `switchMap`
  en el store, estados de carga/vacío/error/sin profesional, tabla → tarjetas en `< sm`, `bd-date-nav` retrocompatible.
- Corrección mínima de Claude: el pipe `date` de Angular no acepta nombres IANA (`'America/Guayaquil'` caía en la
  zona del navegador) → `'-0500'` (Ecuador sin horario de verano).
- Build OK; tests 10 archivos / 46 pasan.
- Pendiente de decisión del usuario: con `exact` en "Mis citas", ningún ítem del sidebar queda activo dentro de
  `/consultorio/atencion/:id` (antes quedaba "Mis citas").
- Pendiente manual: 375/768/1024/1366 y la Prueba manual.
