# 006b — Horarios: excepciones por fecha y calendario efectivo

## Objetivo
Segunda mitad de P7 (plan §5.6). En la misma página `/recepcion/horarios` (006a), para el profesional elegido:
- **Excepciones por fecha:** "No atiende", por ejemplo un feriado o vacaciones, u "Horario especial", que para esa
  fecha reemplaza a la semana tipo.
- **Calendario mensual efectivo:** lo que de verdad atiende cada día del mes, con la semana tipo y las excepciones
  ya resueltas por el backend.

**Depende de:** 006a aprobada.

## Reglas del backend (confirmadas en el código)
- Una excepción es una regla con `specificDate` y `weekday: null`:
  - **No atiende:** `{ weekday: null, specificDate, startTime: null, endTime: null, available: false }`;
  - **Horario especial:** uno o varios turnos `{ weekday: null, specificDate, startTime, endTime, available: true }`.
- Mismos endpoints que la 006a: `POST /professionals/{id}/schedules`, `PUT /schedules/{id}` y
  `POST /schedules/{id}/deactivate`. Mismos 409 de cruce entre turnos disponibles de la **misma fecha**.
- **Cómo resuelve el backend:** si una fecha tiene reglas propias, se usan **solo** esas y se ignora la semana tipo.
  Si alguna de ellas es `available: false`, ese día no atiende.
- `GET /professionals/{id}/schedules/effective?from=YYYY-MM-DD&to=YYYY-MM-DD` → `EffectiveDay[]` =
  `[{ date, shifts: [{ startTime, endTime }] }]`, con un elemento por día del rango. Si `shifts` está vacío, ese día
  no atiende.
  - Rango máximo de 31 días: un mes entero cabe (del 1 al último día).
  - Ya existe `SchedulesApi.getEffective`.

## Archivos a tocar
```
src/app/features/appointments/
  services/schedules.api.ts                      list() deja de filtrar las reglas con specificDate (lo hacía
                                                 la 006a); devuelve todas las activas
  services/schedules.store.ts                    + computed weeklyRules (weekday) y exceptionRules (specificDate);
                                                 weekly-schedule recibe solo weeklyRules
  services/schedules.store.ts                    + excepciones (reglas con specificDate, de hoy en adelante),
                                                   mes visible y días efectivos; recargar el calendario tras
                                                   cada cambio de reglas (también los de la semana tipo)
  pages/schedules/schedules.page.ts              + secciones "Excepciones" y "Calendario", y ?mes=YYYY-MM
  pages/schedules/schedules.page.spec.ts         + 1 caso (total 3)
  components/
    schedule-exceptions/                         dumb: lista de excepciones y el botón "Añadir excepción"
    exception-form/                              dumb: fecha + tipo (No atiende | Horario especial) + turnos
    effective-calendar/                          dumb: grilla mensual lun–dom con los turnos de cada día
```
Se reutilizan `shift-editor` y las funciones de formato de horas de la 006a.

## Criterios de aceptación
**Excepciones (`schedule-exceptions`)**
1. **Lista.** Sección "Excepciones" con un `<h2>`. Muestra las reglas con `specificDate` ≥ hoy (`ClinicClock`),
   agrupadas por fecha en orden ascendente.
   - Cada grupo: "jue 25 dic" (con `clinicDate`) y, después, "No atiende" o los turnos "09:00 – 13:00".
   - Sin excepciones: "Sin excepciones próximas".
2. **Añadir excepción.** "Añadir excepción" (`.btn-outline`) abre `exception-form`, con estos campos:
   - Fecha: `type="date"`, con `min` = hoy.
   - Tipo: radios "No atiende" y "Horario especial".
   - Con "Horario especial", uno o varios turnos con `shift-editor` y "+ Añadir turno". El primero viene en
     09:00–13:00.
3. **Guardar.**
   - **No atiende** → un `POST` con `available: false` y las horas en `null`.
   - **Horario especial** → un `POST` por turno, en orden. Si uno falla, se detiene, muestra el `message` y no
     deshace los ya creados: la lista se recarga y muestra lo que quedó.
   - Si ya hay reglas de esa fecha, se agregan; no se reemplazan. Combinar "No atiende" con turnos es válido para
     el backend: el día queda sin atención. Se avisa con `hint`: "Esta fecha ya tiene reglas: se sumarán.".
   - Éxito: toast "Excepción registrada" y se recargan las reglas y el calendario.
4. **Quitar.** Cada grupo tiene "Quitar excepción".
   - Pide confirmación: "¿Quitar la excepción del jue 25 dic? Ese día volverá a usar la semana tipo.".
   - Si se confirma → `POST /schedules/{id}/deactivate` por cada regla de la fecha → toast "Excepción quitada".
   - Nunca se usa "Eliminar".
5. **Errores.** El `message` del backend va en `exception-form` o en un toast de error. Nunca un error silencioso.
6. **Solo lectura.** Sin `SCHEDULE_MANAGE` no hay botones de acción.

**Calendario efectivo (`effective-calendar`)**
7. **Grilla.** Sección "Calendario" con un `<h2>` y una navegación de mes: ← "octubre 2026" →, con el mes en
   `?mes=YYYY-MM`. Por defecto, el mes actual de `ClinicClock`.
   - Se pide `GET …/effective?from=<1 del mes>&to=<último día del mes>`, siempre con `switchMap`.
   - La grilla va de lunes a domingo, con días de relleno de los meses vecinos, vacíos y en color atenuado.
8. **Cada día** muestra su número y sus turnos ("08:00–12:00"), o "No atiende" en color atenuado.
   - Hoy lleva un borde con `--color-focus` y `aria-current="date"`.
   - Un día con excepción lleva además un ícono y el texto "Excepción", visible o accesible: el color no es el único
     indicador.
9. **Sincronización.** Después de cualquier cambio de reglas, de la semana tipo o de las excepciones, se vuelve a
   pedir el calendario del mes visible.
10. **Accesibilidad.** Es una tabla semántica con `<th>` "lun" a "dom", y cada celda lleva un `aria-label` con la
    fecha completa y sus turnos.

## Responsive
- `< sm`: el calendario pasa a **lista** de días del mes (solo los del mes, sin relleno), una fila por día:
  "lun 6 · 08:00–12:00, 14:00–20:00". Las excepciones van apiladas.
- `≥ sm`: grilla de 7 columnas con `minmax(0, 1fr)`. Si el texto no cabe, la celda muestra hasta 2 turnos y "+N".
- `≥ lg`: la semana tipo y las excepciones van en una columna, y el calendario a la derecha (2 columnas).
- `effective-calendar` usa `@container`. Sin scroll horizontal, con objetivos táctiles ≥ 44 px y fuente ≥ 12 px.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
Se amplía `schedules.page.spec.ts` con **1 caso** (3 en total):
1. **Excepción "No atiende":**
   - con la carga inicial (`GET /professionals`, `GET …/schedules` y
     `GET …/effective?from=2026-10-01&to=2026-10-31`), "Añadir excepción" → fecha `2026-10-20`, tipo
     "No atiende" → Guardar;
   - `POST /api/v1/professionals/prof-1/schedules` con body exacto
     `{ weekday: null, specificDate: '2026-10-20', startTime: null, endTime: null, available: false }` → 201;
   - nuevo `GET …/schedules` y `GET …/effective?from=2026-10-01&to=2026-10-31`, con el 20 sin turnos;
   - en Excepciones se ve "No atiende", y la celda del 20 dice "No atiende".

Usar el reloj fijo con `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'))`. Los 2
casos de la 006a se ajustan **solo** para atender la nueva petición `…/effective` de la carga inicial.

## Prueba manual
1. Feriado: "No atiende" el 25 de diciembre → el calendario de diciembre lo muestra → la agenda (003) de ese día no
   tiene columna de turno para ese profesional.
2. Horario especial un sábado de 09:00 a 11:00 → el calendario muestra solo ese turno ese día.
3. Quitar la excepción → el día vuelve a la semana tipo.
4. Anchos 375 (lista) y 1366 (grilla).

## Resultado

**Archivos creados**
- `src/app/features/appointments/components/exception-form/exception-form.component.ts`: fecha (`min` = hoy), tipo (radios "No atiende" / "Horario especial"), turnos con `bd-shift-editor` en modo `embedded`, "+ Añadir turno" y "Quitar turno" (desde el segundo turno), aviso "Esta fecha ya tiene reglas: se sumarán.".
- `src/app/features/appointments/components/schedule-exceptions/schedule-exceptions.component.ts`: `<h2>` "Excepciones", botón "Añadir excepción" (`.btn-outline`), grupos por fecha con `clinicDate`, estado "No atiende" o turnos, "Quitar excepción", "Sin excepciones próximas".
- `src/app/features/appointments/components/effective-calendar/effective-calendar.component.ts`: `<h2>` "Calendario", navegación ← mes →, tabla semántica lun–dom con `<th>`, `aria-label` por celda, `data-date`, `aria-current="date"` en hoy, "Excepción" con ícono `CalendarX`, "No atiende" atenuado, días de relleno vacíos. Responsive con `@container (min-width: 36rem)`: debajo, una lista de días; encima, grilla de 7 columnas con "+N" a partir de 3 turnos.

**Archivos modificados**
- `services/schedules.api.ts`: `list()` ya no filtra; devuelve todas las reglas activas (normalizadas a `HH:mm`).
- `services/schedules.store.ts`: `weeklyRules`, `exceptionGroups` (desde hoy, ascendente), `exceptionDates`; calendario con `switchMap` (`visibleMonth`, `effectiveDays`, `calendarLoading`, `calendarError`); `saveException` (un POST por turno con `concatMap`, se detiene al primer error), `removeException` (deactivate por regla); recarga silenciosa de reglas y calendario tras cada cambio. Helpers exportados `monthRange` y `shiftMonth`. `loadProfessionals` lee `?mes=` (validado con regex).
- `models/schedule.models.ts`: `ScheduleRequest` admite `null` en `weekday`, `specificDate`, `startTime` y `endTime` (necesario para el POST de "No atiende").
- `components/shift-editor/shift-editor.component.ts`: nuevo input `embedded` (sin botones, emite `valueChange` con el valor válido o `null`). Sin el input el comportamiento es igual que en 006a.
- `pages/schedules/schedules.page.ts`: secciones semana tipo + excepciones (columna izquierda) y calendario (derecha en `≥1200px`, grid `minmax(0,1fr) minmax(0,1.3fr)`); `?mes=` y `?profesional=` con `replaceUrl` y `queryParamsHandling: 'merge'`; confirmación "¿Quitar la excepción del jue 25 dic? ..." con `ConfirmDialogService`.
- `pages/schedules/schedules.page.spec.ts`: 3 casos. Reloj fijo `2026-10-10T12:00:00-05:00`. Los 2 casos de 006a solo atienden la petición `…/effective` de la carga inicial y, tras un POST exitoso, responden el recálculo del calendario que el propio cambio dispara (`flushPendingCalendar`); sin eso `verify()` falla. Caso nuevo: "No atiende" del 20 de octubre.

**Build**: OK (`npx ng build` terminó con "Application bundle generation complete"; chunk lazy `schedules-page` 48.81 kB).

**Tests** (`npx ng test --watch=false`):
```
 Test Files  6 passed (6)
      Tests  21 passed (21)
```
(20 previos + 1 nuevo. Solo el spec de la página: `Test Files 1 passed (1)`, `Tests 3 passed (3)`.)

**Responsive**: NO revisado visualmente (no hay navegador disponible). Revisado leyendo el CSS: calendario en lista bajo 36rem de contenedor y grilla por encima; celdas con `table-layout: fixed`; sin anchos fijos en px salvo bordes; objetivos de 44 px en navegación de mes, "Añadir excepción", "Quitar excepción" y botones de turno; fuente mínima `--fs-xs` (12 px). Pendiente: revisar en 375, 768, 1024 y 1366, sobre todo que la columna del calendario a 1366 supere 36rem de contenedor.

**Cómo probar a mano**: iniciar sesión como secretaria, ir a `/recepcion/horarios`, elegir un profesional con horario en el backend. Las excepciones usan el mismo backend que la 006a.

**Problemas y supuestos**
- `ShiftEditor` se reutiliza con un modo `embedded` (sin botones) porque el formulario de excepciones necesita varios turnos en un solo "Guardar". Es un cambio de API del componente, compatible hacia atrás.
- "Quitar turno" en el formulario de excepciones no estaba en la tarea; se añadió para poder corregir un turno extra.
- Turnos por defecto: el primero 09:00–13:00 y los añadidos 14:00–20:00 (la tarea solo fija el primero).
- Si una excepción falla a mitad de camino, el formulario sigue abierto con el `message` y la lista se recarga en silencio, sin cerrar el formulario ni el editor de la semana.
- Al cambiar de profesional se cierra el formulario de excepciones (igual que el editor de 006a).
- Errores al quitar una excepción: toast de error (igual que la desactivación de 006a).
- El calendario muestra un skeleton solo al cambiar de mes o de profesional; las recargas tras un cambio mantienen la grilla visible.
- Los días de relleno de los meses vecinos aparecen vacíos, porque el backend solo se consulta para el mes visible.
- Sin commit. `prompt.txt` ya figuraba como modificado antes de empezar y no se tocó.

## Revisión

**Revisión 1** — Estado: APROBADO

Revisor: Claude (Opus). Ejecutor: Haiku, por delegación del usuario en esta sesión.

Build OK y `ng test`: 21/21 (6 archivos). Se cumplen:
- **Reglas:** `SchedulesApi.list` ya no filtra. El store separa `weeklyRules` y `exceptionGroups` (de hoy en
  adelante, agrupadas por fecha) con `computed`, y `weekly-schedule` recibe solo la semana tipo.
- **Excepciones:**
  - "No atiende" se guarda con un `POST` con `available: false` y las horas en `null`. "Horario especial" hace un
    `POST` por turno con `concatMap` y se detiene ante el primer error;
  - aviso "se sumarán" cuando la fecha ya tiene reglas;
  - "Quitar excepción" pide confirmación con el texto de la tarea y desactiva cada regla de esa fecha.
- **Calendario:**
  - `switchMap` sobre el mes visible (`?mes=` validado) y el profesional;
  - tabla semántica con `<th scope="col">`, `aria-label` por celda y `aria-current="date"` en hoy;
  - las excepciones se marcan con ícono y texto, no solo con color;
  - lista o grilla según `@container`.
- **Recarga:** después de cualquier cambio se recargan las reglas y el calendario sin vaciar la pantalla.
- **Componentes:** las plantillas no pasan de 150 líneas y no hay colores sueltos.
- **Tests:** 3 casos. Los 2 de la 006a solo se ajustaron para atender las peticiones nuevas.

Se aceptan:
- El botón "Quitar turno" dentro del formulario de excepción.
- El input `embedded` de `shift-editor`, que no cambia su uso en la semana tipo.

Pendiente de la prueba manual del usuario: confirmar que el calendario a 1366 px muestra la grilla, porque su
contenedor tiene que superar los 36rem.
