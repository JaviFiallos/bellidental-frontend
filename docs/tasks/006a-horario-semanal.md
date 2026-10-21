# 006a — Horarios: semana tipo por profesional

## Objetivo
Primera mitad de P7 (plan §5.6). En `/recepcion/horarios` la secretaria elige un profesional y gestiona su
**semana tipo**: los turnos de cada día de lunes a sábado (domingo opcional). Puede añadirlos, editarlos y
desactivarlos, nunca borrarlos.

**Fuera de alcance:** las excepciones por fecha y el calendario mensual efectivo, que son la 006b.

## Reglas del backend (confirmadas en el código)
- `GET /api/v1/professionals` (`PROFESSIONAL_READ`) → `Professional[]`. Ya existe en `professionals/index.ts`.
- `GET /api/v1/professionals/{id}/schedules` (`PROFESSIONAL_READ`) → `ApiResponse<Schedule[]>`, solo los activos:
  `Schedule { id: number, weekday: 1–7 | null, specificDate: 'YYYY-MM-DD' | null, startTime: 'HH:mm' | null,
  endTime: 'HH:mm' | null, available: boolean }`.
  - `weekday` va de 1 (lunes) a 7 (domingo).
  - Las reglas con `specificDate` son excepciones: esta tarea las **ignora**.
  - La hora puede llegar como `HH:mm` o como `HH:mm:ss`. Se acepta cualquiera de las dos y se muestra `HH:mm`.
- `POST /api/v1/professionals/{id}/schedules` (`SCHEDULE_MANAGE`), body
  `{ weekday, specificDate: null, startTime: 'HH:mm', endTime: 'HH:mm', available: true }` → 201
  `ApiResponse<Schedule>`, message "Horario registrado.".
- `PUT /api/v1/schedules/{id}` con el mismo body → 200, "Horario actualizado.".
- `POST /api/v1/schedules/{id}/deactivate` → 200, "Horario desactivado.".
- **Errores:**
  - Si se cruza con otro turno disponible del mismo día: 409 "El turno se solapa con otro horario existente.".
  - 400 si `endTime` ≤ `startTime`. El mensaje del backend está a medias en inglés, así que el cliente valida
    antes y no deja enviar.
- Permisos: SECRETARIA tiene `SCHEDULE_MANAGE`. Sin ese permiso, la página es solo de lectura.

## Archivos a tocar
```
src/app/
  app.routes.ts                                  quitar 'recepcion/horarios' (ComingSoonPage)
  features/appointments/
    appointments.routes.ts                       + { path: 'horarios', loadComponent: SchedulesPage }
                                                 antes de la ruta ''
    models/schedule.models.ts                    + Schedule, ScheduleRequest
    services/schedules.api.ts                    + list(professionalId), create(professionalId, body),
                                                   update(id, body), deactivate(id)
    services/schedules.store.ts                  (nuevo) estado con signals: profesional elegido, reglas,
                                                 cargando, error, guardando por regla; provisto por la página
    pages/schedules/
      schedules.page.ts                          smart: selector de profesional (lee y escribe ?profesional=),
                                                 orquesta el store
      schedules.page.spec.ts                     (nuevo) 2 casos
    components/
      weekly-schedule/                           dumb: 7 filas (lun–sáb, y domingo plegado), turnos por día
      shift-editor/                              dumb: dos <input type="time"> + Guardar/Cancelar,
                                                 con validación fin > inicio
```

## Criterios de aceptación
**Selector de profesional**
1. **Elección.** `bd-page-header` "Horarios". Debajo, un select "Profesional" con los activos, que muestra
   `fullName` y su punto de color (`colorTag`, como en la agenda).
   - Se elige el de `?profesional=<id>` o, si no hay, el primero.
   - Al cambiar, se actualiza la URL con `replaceUrl` y se piden sus reglas.
   - Cada respuesta de `GET …/schedules` corresponde al profesional que se eligió último: `switchMap`.
2. **Estados.** Cargando → `bd-skeleton`. Error → `bd-alert` con el `message` y "Reintentar". Sin profesionales →
   `bd-empty-state`.

**Semana tipo (`weekly-schedule`)**
3. **Filas.** Una por día: "Lunes" … "Sábado". "Domingo" va al final, plegado bajo "Mostrar domingo", salvo que ya
   tenga turnos.
   - Cada fila muestra sus turnos (solo reglas con `weekday` y `available: true`), ordenados por `startTime`, como
     chips "08:00 – 12:00".
   - Un día sin turnos dice "No atiende".
   - Las reglas `available: false` con `weekday` se muestran como "No atiende (regla)", con su acción "Desactivar".
4. **Añadir turno.** "+ Añadir turno" (`.btn-ghost`, 44 px, `aria-label` "Añadir turno el lunes") abre
   `shift-editor` en esa fila.
   - Valores por defecto: 08:00–12:00 si el día no tiene turnos; si ya tiene, 14:00–20:00.
   - Guardar → `POST` con body exacto `{ weekday, specificDate: null, startTime, endTime, available: true }`.
     Éxito: toast "Turno añadido", y el chip aparece con los datos de la respuesta, sin recargar todo.
5. **Editar.** Un clic en el chip, que es un `<button>`, abre `shift-editor` con sus horas.
   - Guardar → `PUT /schedules/{id}` con el mismo formato → toast "Turno actualizado".
6. **Desactivar.** Cada chip tiene "Desactivar", un botón de ícono con `aria-label` "Desactivar turno 08:00 – 12:00
   del lunes".
   - Pide confirmación con `ConfirmDialogService`: "¿Desactivar el turno de 08:00 a 12:00 del lunes? Las citas ya
     agendadas no se cancelan.".
   - Si se confirma → `POST /schedules/{id}/deactivate` → toast "Turno desactivado" → el chip desaparece.
   - Nunca se usa la palabra "Eliminar".
7. **Validación en `shift-editor`.**
   - Si fin ≤ inicio → "La hora de fin debe ser posterior a la de inicio", y Guardar queda deshabilitado.
   - Los inputs usan `step="900"` (15 min) y la clase `.input`.
   - Esc cancela y Enter guarda.
8. **Errores al guardar.** 409, 400 u otros → el `message` del backend dentro del editor, que sigue abierto.
   403 → "No tienes permiso"; 0 → "No se pudo conectar con el servidor".
9. **Solo lectura.** Sin `SCHEDULE_MANAGE` no aparecen "+ Añadir turno", "Desactivar" ni la edición: los chips son
   texto.
10. **Reglas.** El HTTP va solo en `SchedulesApi`. Los componentes son dumb. Las horas se formatean con una función
    pura: `HH:mm:ss` → `HH:mm`. Sin colores sueltos: el punto del profesional usa `colorTag`, que viene del catálogo,
    como en la agenda.

## Responsive
- `< md`: cada día es un bloque apilado y los chips se envuelven. `shift-editor` ocupa el ancho del bloque.
- `≥ md`: cada día es una fila de grid, con el nombre del día en una columna fija (~8rem) y los turnos a la derecha.
  Ancho máximo ~56rem.
- `weekly-schedule` usa `@container`. Objetivos táctiles ≥ 44 px y sin scroll horizontal.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
`pages/schedules/schedules.page.spec.ts`, con **2 casos**. Sesión SECRETARIA con `SCHEDULE_MANAGE`.
1. **Añadir turno:**
   - abrir la página → `GET /api/v1/professionals` (2 profesionales) → `GET /api/v1/professionals/prof-1/schedules`
     con un turno el lunes de 08:00 a 12:00;
   - se ve "08:00 – 12:00" en Lunes;
   - "Añadir turno el martes" → valores por defecto 08:00–12:00 → Guardar;
   - `POST /api/v1/professionals/prof-1/schedules` con body exacto
     `{ weekday: 2, specificDate: null, startTime: '08:00', endTime: '12:00', available: true }`;
   - responder 201 → el chip aparece en Martes.
2. **409:**
   - añadir en Lunes 10:00–13:00 → `POST` → responder 409 "El turno se solapa con otro horario existente.";
   - el mensaje se ve dentro del editor, que sigue abierto.

## Prueba manual
1. Elegir la endodoncista → dejarle solo el martes: desactivar los otros días y añadir el turno del martes.
2. Intentar un turno cruzado → mensaje de cruce.
3. Abrir la agenda (003) de un martes y de un miércoles → la columna muestra o no muestra el turno.
4. Anchos 375 y 1366.

## Resultado

**Archivos creados**
- `src/app/features/appointments/services/schedules.store.ts`: estado con signals (profesionales, reglas, editor, guardado, desactivación), `switchMap` para la carga de reglas por profesional.
- `src/app/features/appointments/pages/schedules/schedules.page.ts`: página smart, `providers: [SchedulesStore]`, lee y escribe `?profesional=` con `replaceUrl`, confirmación con `ConfirmDialogService`.
- `src/app/features/appointments/pages/schedules/schedules.page.spec.ts`: 2 casos de integración.
- `src/app/features/appointments/components/weekly-schedule/weekly-schedule.component.ts`: presentacional, 7 días (domingo plegado en `<details>`), chips, `@container`.
- `src/app/features/appointments/components/shift-editor/shift-editor.component.ts`: presentacional, Reactive Forms, validación fin > inicio, Esc cancela, Enter guarda.

**Archivos modificados**
- `src/app/app.routes.ts`: quitada la ruta `recepcion/horarios` (ComingSoonPage).
- `src/app/features/appointments/appointments.routes.ts`: ruta `horarios` (lazy) antes de `''`.
- `src/app/features/appointments/models/schedule.models.ts`: `Schedule`, `ScheduleRequest`, `WEEKDAY_LABELS`.
- `src/app/features/appointments/services/schedules.api.ts`: `list`, `create`, `update`, `deactivate`; `toClockTime` (HH:mm:ss → HH:mm) aplicado en las respuestas. `getEffective` intacto.

**Build**: OK (`npx ng build` terminó con "Application bundle generation complete"; chunk lazy `schedules-page`).

**Tests** (`npx ng test --watch=false`):
```
 Test Files  6 passed (6)
      Tests  20 passed (20)
```
(18 previos + 2 nuevos. Solo el spec de la página: `Test Files 1 passed (1)`, `Tests 2 passed (2)`.)

**Responsive**: NO revisado visualmente (no hay navegador disponible). Revisado leyendo el CSS: grid de 2 columnas (8rem + 1fr) solo con `@container (min-width: 36rem)`; por debajo, bloques apilados; chips con `flex-wrap`; objetivos de 44 px en chips, acciones y "+ Añadir turno"; página con `max-width: 56rem` y sin anchos fijos. Pendiente: revisar en 375, 768, 1024 y 1366.

**Cómo probar a mano**: iniciar sesión como secretaria (con `SCHEDULE_MANAGE`), ir a `/recepcion/horarios`. Hace falta un profesional activo con horario en el backend.

**Supuestos y desviaciones**
- El select muestra el punto de color del profesional elegido junto al select (las `<option>` nativas no admiten un punto de color).
- Desactivar una regla "No atiende" pide confirmación con texto propio ("¿Desactivar la regla \"No atiende\" del lunes? ..."): la tarea solo fija el texto para turnos. Toast: "Regla desactivada".
- Errores de desactivación: se muestran como toast de error (la tarea no fija dónde); errores al guardar: dentro del editor.
- Los horarios de la semana tipo se filtran en la API: solo se mantienen las reglas con `specificDate === null` (las excepciones quedan para la 006b).
- Las reglas se cargan con `switchMap`; al cambiar de profesional se cierra el editor abierto.
- Si el profesional cambia mientras se guarda un turno, la respuesta no se añade a la lista visible.
- Se usa el icono `Ban` de lucide-angular para "Desactivar".
- Sin commit. `prompt.txt` no se tocó (ya figuraba como modificado al empezar).

## Revisión

**Revisión 1** — Estado: APROBADO

Revisor: Claude (Opus). Ejecutor: Haiku, por delegación del usuario en esta sesión.

Build OK y `ng test`: 20/20 (6 archivos). Se cumplen:
- **Ruta y store:** la ruta `horarios` está dentro de `recepcion`, así que hereda `profileGuard('SECRETARIA')`.
  `SchedulesStore` usa `switchMap` para las reglas del profesional elegido último, y una respuesta de guardado que
  llega después de cambiar de profesional no se agrega a la lista.
- **Selector:** `?profesional=` con `replaceUrl`.
- **Semana tipo:**
  - lunes a sábado, y domingo en `<details>`, abierto si tiene contenido;
  - turnos por defecto 08:00–12:00 o 14:00–20:00;
  - el `POST`/`PUT` lleva el body exacto, y "Desactivar" pide confirmación con el texto de la tarea;
  - las acciones tienen `aria-label` con el día y la hora;
  - sin `SCHEDULE_MANAGE` la página es solo de lectura.
- **Editor:** valida fin > inicio, y Esc/Enter funcionan.
- **Errores:** los de guardar quedan dentro del editor, y los de desactivar van en un toast.
- **Formato:** la hora se normaliza de `HH:mm:ss` a `HH:mm` en `SchedulesApi`.
- **Tests:** los 2 casos tienen el body exacto.

Para la 006b: `SchedulesApi.list` descarta las reglas con `specificDate`. La 006b tiene que quitar ese filtro
de la API y separar la semana tipo de las excepciones en el store, con `computed`.
