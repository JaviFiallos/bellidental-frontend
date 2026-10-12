# 003a — Agenda del día de recepción (lectura)

## Objetivo
Pantalla de inicio de la secretaria (`/recepcion`, plan §5.3, P3): la agenda del día por profesional y por estado,
en reemplazo del Google Calendar compartido. De un vistazo responde "quién viene ahora, quién ya llegó y con quién".
Esta tarea solo muestra datos: las acciones ("Llegó" en la tarjeta, panel, Confirmar, No asistió, Cancelar) son de
la **003b**; Nueva cita, Sin cita y Reprogramar son de la 004.

**Depende de:** 002b (commit `3cbf525`) · backend 006c (G-8 resuelto): todos los endpoints de horarios devuelven
`ApiResponse`; el horario efectivo llega como `ApiResponse<EffectiveDay[]>`. Si el backend en ejecución todavía
devuelve la lista sola, falta reiniciarlo con la 006c: no rodearlo en el frontend.

## Brief de diseño (`/impeccable shape`, aprobado por el usuario)
- **Usuario:** secretaria en el PC de recepción (1366/1920), todo el día, con interrupciones. Modo Operate.
- **Barra superior:** `bd-page-header` "Agenda" + `bd-date-nav` (◀ fecha ▶ + "Hoy") + `bd-segmented` de vista
  ("Por profesional" · "Por estado") + interruptor "Ver canceladas". Sin botones de crear (llegan en la 004).
- **Contadores = leyenda:** una sola línea compacta, sin cajas grandes: punto de color + etiqueta + número
  ("26 citas · 4 agendadas · 3 en espera · 14 atendidas · 2 no asistieron"). Cuenta las del día sin
  canceladas/reprogramadas.
- **Grilla por profesional:** columna de horas fija (`position: sticky`) a la izquierda; encabezado de columnas fijo
  arriba con punto `colorTag` + nombre del profesional. 1 h = 8 rem (15 min ≈ 2 rem) con líneas finas cada 15 min y
  más marcadas cada hora. Las horas fuera del turno efectivo del profesional se ven sombreadas (`color-mix` de
  `--slate-100`) y sin interacción. **Línea de "ahora"** (`--blue-950`, 2 px, con la hora en un chip) solo si la
  fecha es hoy; se mueve con el refresco. Al abrir el día de hoy, scroll inicial con la hora actual en el tercio
  superior.
- **Tarjeta (`AppointmentCardComponent`, dumb, exportada en `index.ts`):** alto = duración, posición = hora de
  inicio. Barra izquierda y fondo con los colores del estado (plan §2.3, tokens `--appointment-*`), `bd-status-badge`
  con la etiqueta, nombre del paciente, hora "10:30–11:00", especialidad (y motivo si cabe), ícono pequeño con
  `aria-label` si `source` es `BOT` ("Agendada por el bot") o `WALK_IN` ("Sin cita"). Tarjeta de 15 min: una línea
  (hora + paciente truncado + ícono de estado con texto oculto accesible). "Confirmada" = Agendada + ✓.
  Se construye como `<article>` con un `<button>` principal (abrirá el panel en la 003b; en esta tarea emite
  `opened` y la página no hace nada aún) y deja un espacio de acciones (`<ng-content select="[actions]">`) para el
  "Llegó" de la 003b. Nunca un botón dentro de otro.
- **Vista por estado:** columnas Agendadas · En espera · Atendidas · No asistió (sin "En atención" hasta G-1),
  tarjetas por hora con borde izquierdo del `colorTag` y el nombre del profesional en texto (el color nunca va
  solo). Columnas con contador en el encabezado.
- **Canceladas/Reprogramadas:** ocultas; con "Ver canceladas" aparecen en gris tachado (slate) en su hora y en una
  columna "Canceladas" de la vista por estado.

## Archivos a tocar
```
src/app/
  app.routes.ts                    'recepcion' → loadChildren de appointments.routes (la entrada
                                   'recepcion/horarios' sigue con ComingSoon y va ANTES de 'recepcion')
  core/services/clinic-clock.service.ts   + dayRange(date) {from,to con -05:00}, addDays(date, n),
                                          minutesOfDay(iso) en America/Guayaquil
  shared/components/
    segmented/                     (nuevo) bd-segmented: radiogroup de 2–4 opciones (model())
    date-nav/                      (nuevo) bd-date-nav: ◀ fecha larga ▶ + "Hoy" (deshabilitado si ya es hoy)
    status-badge/                  (nuevo) bd-status-badge: input tone ('scheduled' | 'waiting' | 'in-progress' |
                                   'attended' | 'no-show' | 'cancelled') + label (+ ícono opcional)
    empty-state/                   (nuevo) bd-empty-state: ícono + título + texto + <ng-content> para la acción
    skeleton/                      (nuevo) bd-skeleton: bloque con forma (línea, rect) y animación suave
                                   (sin animación con prefers-reduced-motion)
  features/
    appointments/
      index.ts                     + AppointmentCardComponent, appointmentDisplayState, AppointmentDisplayState
      appointments.routes.ts       (nuevo) '' → ReceptionAgendaPage
      pages/reception-agenda/      (nuevo, smart) lee ?fecha y ?vista, usa AgendaStore, orquesta vistas
      components/
        agenda-toolbar/            fecha, vista, "Ver canceladas", "Actualizado HH:mm"
        agenda-summary/            contadores-leyenda
        agenda-grid/               columnas por profesional, horas, turnos sombreados, línea de ahora
        agenda-by-status/          columnas por estado
        agenda-day-list/           < md: selector de profesional + lista por hora
        appointment-card/          tarjeta (dumb)
      services/
        schedules.api.ts           (nuevo) getEffective(professionalId, from, to) → EffectiveDay[]
        agenda.store.ts            (nuevo, provisto por la página) signals: date, view, showCancelled,
                                   showAllProfessionals, professionals, effectiveDays, appointments, loading,
                                   error, lastUpdatedAt; computed: columns, summary, appointmentsByColumn
      models/schedule.models.ts    EffectiveDay { date, shifts: { startTime, endTime }[] }
      domain/appointment-state.ts  (nuevo) status + checkedInAt → { key, label, tone }
      domain/agenda-layout.ts      (nuevo) rango horario del día, minutos → offset/alto en rem
    professionals/
      services/professionals.api.ts   + list() → Professional[] (`GET /api/v1/professionals`, solo activos)
```

## Criterios de aceptación
**Carga y datos**
1. URL `/recepcion?fecha=2026-10-10&vista=profesional|estado`. Sin `fecha` → hoy (`ClinicClock`); sin `vista`
   → `profesional`. Cambiar fecha o vista actualiza la URL (`replaceUrl`) y recarga solo lo necesario.
2. Por fecha: `GET /api/v1/professionals` (una vez por visita) → por cada profesional
   `GET /api/v1/professionals/{id}/schedules/effective?from={fecha}&to={fecha}` → y en paralelo
   `GET /api/v1/appointments?from={fecha}T00:00:00-05:00&to={fecha}T23:59:59-05:00`.
   `startTime`/`endTime` pueden llegar como `HH:mm` o `HH:mm:ss`: aceptar ambos.
3. Columnas: profesionales con turno ese día **o** con citas ese día (aunque no tengan turno), en el orden de
   `GET /professionals`. Interruptor "Ver todos los profesionales" muestra también al resto.
4. Rango horario: 08:00–20:00, ampliado hasta cubrir cualquier turno o cita fuera de ese rango (redondeado a la hora).
5. `appointmentDisplayState` (plan §2.3, `CONTEXT.md` §5): PENDING/CONFIRMED sin `checkedInAt` → "Agendada"
   (CONFIRMED: "Confirmada" con ✓), tono `scheduled`; con `checkedInAt` → "En espera", `waiting`; ATTENDED →
   "Atendida", `attended`; NO_SHOW → "No asistió", `no-show`; CANCELLED → "Cancelada", RESCHEDULED → "Reprogramada",
   ambas `cancelled`. (El tono `in-progress` existe en `bd-status-badge` para la 007 con G-1.)
6. Refresco cada 60 s y al volver a la pestaña (`visibilitychange`), solo de `GET /appointments`, sin skeleton ni
   parpadeo; "Actualizado HH:mm" en la barra. Se limpia al salir de la página.

**Estados de la pantalla**
7. Carga inicial: `bd-skeleton` con la forma de la grilla (columnas y bloques), no spinner.
8. Ningún profesional con turno ni citas ese día → `bd-empty-state` "Ningún profesional atiende este día" con el
   botón "Ver todos los profesionales".
9. Día con profesionales pero sin citas → la grilla con turnos sombreados y un texto discreto "Sin citas este día".
10. Error en cualquier GET → `bd-alert` con el `message` de `ApiError` + botón "Reintentar" que repite la carga.
    Error en un refresco → se conservan los datos y "Actualizado" se cambia por "No se pudo actualizar" con ícono.

**Accesibilidad y estilo**
11. `bd-segmented` como `role="radiogroup"` con flechas ←→; `bd-date-nav` con `aria-label` en ◀ ▶ ("Día anterior",
    "Día siguiente") y la fecha larga en texto ("sábado 10 de octubre de 2026"). Tarjetas con `aria-label`
    completo ("10:30 a 11:00, David Pérez, Profilaxis, Agendada").
12. Solo tokens; colores del profesional solo desde `colorTag`; estado siempre color + texto o ícono; objetivos
    ≥ 44 px salvo las tarjetas de 15 min (que en la 003b no llevan "Llegó"); tipografía de la grilla ≥ 14 px
    (horas 12 px como mínimo).
13. Componentes de `components/` son dumb (solo `input()`/`output()`); HTTP solo en `services/`.

## Responsive
Revisar en **375, 768, 1024, 1366 y 1920**:
- `xl` (≥ 1536): todas las columnas sin scroll horizontal.
- `md`–`lg` (900–1535): columnas `minmax(14rem, 1fr)`; si no caben, scroll horizontal **dentro** de la grilla con
  la columna de horas y el encabezado fijos. En 1366 caben 4 profesionales.
- `< md` (< 900): `agenda-day-list`: selector de profesional (`bd-segmented` si son ≤ 4, `<select>` si son más)
  + lista por hora con la tarjeta completa. La vista por estado en `< md` muestra una pestaña por estado.
- Nunca scroll horizontal de la página.

## Tests requeridos
Solo integración: `pages/reception-agenda/reception-agenda.page.spec.ts` (`HttpTestingController`, página real con
sus hijos, `ActivatedRoute` con `?fecha=2026-10-10`, `vi.setSystemTime` en ese día). Respuestas con la forma exacta
de §7.1 (y `EffectiveDay` envuelto en `ApiResponse`, G-8); si se reutilizan, en `features/appointments/testing/fixtures.ts`.
2 casos:
1. carga del día → `GET /professionals` (2 profesionales) → 2 × `GET …/schedules/effective` con `from` y `to` =
   `2026-10-10` → `GET /appointments` con el rango del día (verificar los parámetros) → responder 3 citas (una
   PENDING, una CONFIRMED con `checkedInAt`, una CANCELLED) → cada paciente visible en la columna de su profesional
   con "Agendada" y "En espera"; la cancelada no se ve; los contadores dicen 2 citas · 1 en espera;
2. `GET /appointments` responde 500 → se ve el mensaje y "Reintentar" → clic → nuevo `GET /appointments` →
   responde bien → se ven las tarjetas.

## Prueba manual
Con el backend en `:8080` (con G-8 aplicado) y `npx ng serve`, como secretaria:
1. `/recepcion` abre hoy con la línea de "ahora" visible; ◀ ▶ y "Hoy" cambian el día y la URL.
2. Con 3 profesionales y citas de varios estados: cada cita en su columna y su hora, con el color y la etiqueta de su
   estado; fuera de turno sombreado.
3. "Por estado" agrupa bien; "Ver canceladas" muestra las canceladas tachadas.
4. Un día sin turnos → empty-state y "Ver todos los profesionales".
5. Crear una cita desde otra sesión o desde el bot → aparece en ≤ 60 s sin recargar.
6. Apagar el backend → "No se pudo actualizar" sin perder lo que se ve; recargar → alerta + "Reintentar".
7. Anchos 375, 768, 1024, 1366 y 1920.

## Resultado
- **Qué se hizo (archivos creados o modificados tras correcciones):**
  - [agenda.store.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/services/agenda.store.ts):
    - Se corrigieron las importaciones para importar `Professional` y `ProfessionalsApi` exclusivamente desde `features/professionals` (`index.ts`).
    - Flujo reactivo con `loadTrigger$` (`Subject<string>`) + `switchMap` para cancelar peticiones en vuelo al cambiar de fecha rápidamente y evitar condiciones de carrera.
    - Se eliminó el `catchError` silencioso de `getEffective`: errores tipados como `ApiError` muestran `err.message` en la alerta.
    - Se expuso el signal `now` actualizado con `ClinicClock.now()` en carga y cada 60 s, y `lastUpdatedAt` usa `ClinicClock.now()`.
  - [agenda-grid.component.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/components/agenda-grid/agenda-grid.component.ts):
    - Recibe el signal `now` como input y mueve la línea de "ahora" con el refresco.
    - Tipografía de `.agenda-grid__now-chip` ajustada a `var(--fs-xs)` (12 px).
    - Lógica de sombras y posicionamiento delegada a `domain/agenda-layout.ts` y expuesta como `computed` (`shadesByProf`, `positionedApptsByProf`), sin invocar métodos en la plantilla.
    - Columna identificada con `data-professional-id` y estilos responsivos migrados al mixin `@include bp.bp-down('md')`.
    - Importación de `Professional` desde `features/professionals`.
  - [agenda-layout.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/domain/agenda-layout.ts):
    - Funciones puras `calculateShades` y `calculatePositionedAppointment` para el cálculo de turnos y posiciones en la grilla.
  - [agenda-day-list.component.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/components/agenda-day-list/agenda-day-list.component.ts):
    - Importación de `Professional` corregida hacia `features/professionals`.
  - [fixtures.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/testing/fixtures.ts):
    - Importación de `Professional` corregida hacia `features/professionals`.
  - [date-nav.component.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/shared/components/date-nav/date-nav.component.ts):
    - Botones ◀ ▶ y botón "Hoy" actualizados a dimensiones táctiles de 44 px.
  - [agenda-toolbar.component.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/components/agenda-toolbar/agenda-toolbar.component.ts):
    - Control de "Ver canceladas" ajustado a `min-height: 44px`.
  - [agenda-by-status.component.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/components/agenda-by-status/agenda-by-status.component.ts):
    - `@use` posicionado al inicio y estilos responsivos migrados al mixin `@include bp.bp-down('md')`.
  - [reception-agenda.page.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/pages/reception-agenda/reception-agenda.page.ts):
    - Pasa `[now]="store.now()"` a `bd-agenda-grid` y estilos responsivos migrados al mixin `@include bp.bp-down('md')`.
  - [reception-agenda.page.spec.ts](file:///home/javif/Documentos/UTA/Titulacion/bellidental-app/bellidental-frontend/src/app/features/appointments/pages/reception-agenda/reception-agenda.page.spec.ts):
    - Caso 1 verifica explícitamente que cada paciente se ubique dentro de la columna de su profesional correspondiente mediante `[data-professional-id]`.

- **Resultado del build:**
  - `npx ng build`: OK (Application bundle generation complete).
  - Copia literal de los totales de `npx ng test --watch=false`:
```
 Test Files  3 passed (3)
      Tests  8 passed (8)
```

- **Anchos revisados y responsive (revisión 375 y 1366):**
  - 375 px: `agenda-day-list` se activa correctamente mediante el mixin `bp.bp-down('md')`, botones y controles táctiles de 44 px, tarjetas apiladas fluidamente sin desborde horizontal de la ventana.
  - 1366 px: Grilla horizontal amplia, columnas sticky fijas y encabezados fijos, visualización de profesionales y citas fluida y clara.

- **Prueba manual:**
  - Levantar backend en `:8080`.
  - Levantar frontend con `npx ng serve`.
  - Iniciar sesión como secretaria (`secretaria@bellidental.local`).
  - Navegar a `/recepcion` y validar cambio rápido de días (sin carreras), refresco de la línea de tiempo en tiempo real, objetivos táctiles de 44 px y distribución por columnas.

- **Problemas encontrados y supuestos tomados:**
  - Se verificó que todos los componentes y estilos cumplen rigurosamente con los mixins de breakpoints y sin llamadas de métodos en templates.

## Revisión

**Estado: CORRECCIONES**

Verificado por Claude: `npx ng build` OK · `ng test` 8/8 OK · rutas (`recepcion/horarios` antes de `recepcion`) ·
URL `?fecha`/`?vista` · peticiones y parámetros correctos (el spec verifica `from`/`to`) · compartidos creados ·
plantillas < 150 líneas · estados de carga, vacío y error · `appointmentDisplayState` según §2.3.

1. **Arquitectura (obligatorio):** se importan rutas internas de `professionals`: `services/agenda.store.ts`
   (`professionals/models/…` y `professionals/services/professionals.api`), `components/agenda-grid`,
   `components/agenda-day-list` y `testing/fixtures.ts`. Importar solo desde `features/professionals` (su
   `index.ts`).
2. **Carrera al cambiar de día (obligatorio):** `loadAgenda()` anida `subscribe` sin cancelar la carga anterior.
   Si se pulsa ◀ dos veces rápido, la respuesta del primer día puede llegar después y se muestra con la fecha del
   segundo en la barra. Lo mismo con `refreshAppointments()`: si el refresco de 60 s sale con un día y responde
   después de cambiar de fecha, pisa las citas del día nuevo. Pasar la carga a un flujo con `switchMap` sobre la
   fecha (p. ej. `Subject<string>` o `toObservable(date)` + `switchMap` + `takeUntilDestroyed`) e ignorar cualquier
   respuesta de refresco cuya fecha ya no sea la actual (o cancelarla con el mismo flujo).
3. **Error silencioso:** `catchError(() => of([]))` en cada `getEffective` oculta el fallo: el profesional aparece
   sin turno (todo sombreado) o desaparece de las columnas. Criterio 10: un error en cualquier GET de la carga muestra
   la alerta con el `message` y "Reintentar". Quitar ese `catchError`. Tipar los errores como `ApiError` y usar
   `err.message` sin textos de respaldo propios ("Error al cargar la agenda…").
4. **La línea de "ahora" no se mueve:** `nowMinutes` es un `computed` sin dependencias reactivas: se calcula una
   vez y queda fija (criterio del brief: "se mueve con el refresco"). Que el store exponga un signal `now`
   (`ClinicClock.now()`) que se actualice en la carga y en cada refresco de 60 s, y que la grilla lo reciba como
   input. Usar también `clinicClock.now()` en lugar de `new Date()` para `lastUpdatedAt`.
5. **Tamaños fuera de norma:** `.agenda-grid__now-chip` con `font-size: 10px` → mínimo 12 px (`var(--fs-xs)`);
   botones ◀ ▶ de `bd-date-nav` de 36 px y el control de `agenda-toolbar` con `min-height: 38px` → objetivos de
   44 × 44 px (`responsive/SKILL.md`).
6. **Puntos de corte escritos a mano:** `@media (max-width: 899px)` en `agenda-grid` y `agenda-by-status` → usar
   `@use '…/shared/styles/breakpoints' as bp` y `@include bp.bp-down('md')` (los estilos inline ya son SCSS).
7. **Lógica de dominio en el componente:** `getShades()` (fusión de turnos y huecos sombreados) vive en
   `agenda-grid` y se llama desde la plantilla en cada detección de cambios. Moverla a `domain/agenda-layout.ts`
   como función pura y exponer un `computed` `shadesByProfessional` en la grilla (o en el store). Lo mismo para
   `getApptTopRem`/`getApptHeightRem`: precalcular la posición en un `computed` por columna en vez de llamar métodos
   desde la plantilla.
8. **Test caso 1:** hoy solo busca los nombres en todo el texto de la página. Verificar que cada paciente está
   **dentro de la columna de su profesional** (buscar el contenedor de la columna por su encabezado o un
   `data-professional-id` y leer su texto), como pide la tarea.

Tras corregir: `npx ng build` y `npx ng test --watch=false`; revisar de nuevo 375 y 1366; actualizar Resultado
(solo lo que cambió).

### Revisión 2

**Estado: APROBADO**

Las 8 correcciones están aplicadas:
- `appointments` importa `professionals` solo por su `index.ts`.
- La carga pasa por `loadTrigger$` + `switchMap` (se cancela la anterior) y descarta respuestas de un día distinto
  al actual; el refresco también las descarta.
- Ya no hay `catchError` que oculte errores del horario efectivo: cualquier GET fallido muestra la alerta.
- El store tiene un signal `now` que se actualiza en la carga y en cada refresco, y la grilla lo recibe como input.
- Tamaños corregidos: el chip de la hora ≥ 12 px; ◀ ▶ y los controles de la barra de 44 px.
- `bp-down('md')` en lugar de `max-width: 899px`.
- `calculateShades` y `calculatePositionedAppointment` están en `domain/agenda-layout.ts`.
- El test verifica cada paciente dentro de `[data-professional-id]`.

`npx ng build` OK · `ng test` 8/8 OK. `/impeccable audit` de la agenda se hará al aprobar la 003b (pantalla
completa).
