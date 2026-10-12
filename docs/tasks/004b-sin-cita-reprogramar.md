# 004b — Agenda: atención sin cita (walk-in) y reprogramar

## Objetivo
Completar P4 (plan §5.4):
- registrar a un paciente que llega **sin cita** y entra directo "En espera";
- **reprogramar** una cita a otra hora, día, profesional o especialidad.

Ambos reutilizan el formulario y el `slot-picker` de la 004a.

**Depende de:** 004a aprobada. **Fuera de alcance:** "Registrar paciente" (005).

## Reglas del backend (confirmadas en el código)
- `POST /api/v1/appointments/walk-in`, body `{ patientId, professionalId, specialtyId }` → 201
  `ApiResponse<Appointment>`, message "Atención sin cita registrada.".
  - El backend busca el **primer hueco desde ahora** con la duración de la especialidad, crea la cita con
    `source: WALK_IN` y `checkedInAt = ahora`, así que la tarjeta queda "En espera".
  - Si no hay hueco hoy: 409 "Sin hueco hoy para este profesional.".
- `POST /api/v1/appointments/{id}/reschedule`, body `{ startAt, endAt?, professionalId?, specialtyId? }` → 201
  `ApiResponse<Appointment>` (la cita **nueva**), message "Cita reprogramada.".
  - La original pasa a `RESCHEDULED`; la nueva conserva paciente, motivo, notas y origen, y lleva
    `rescheduledFromId`.
  - Solo se puede reprogramar `PENDING`/`CONFIRMED` sin `checkedInAt`. Si no: 409 "Solo se puede reprogramar citas
    en estado PENDING o CONFIRMED." o "No se puede reprogramar una cita con check-in.".
  - Los cruces y el horario fuera de turno dan los mismos 409 que crear.
- Permisos: walk-in → `APPOINTMENT_CREATE`; reprogramar → `APPOINTMENT_UPDATE`.

## Archivos a tocar
```
src/app/features/appointments/
  services/appointments.api.ts          + walkIn(body), reschedule(id, body) → Observable<Appointment>
  services/appointment-form.store.ts    + modo 'create' | 'walk-in' | 'reschedule'; submit según el modo;
                                          en walk-in, sin huecos ni fecha
  domain/appointment-state.ts           + 'reschedule' en availableActions (PENDING/CONFIRMED sin check-in,
                                          permiso APPOINTMENT_UPDATE)
  components/
    agenda-toolbar/                     + botón "Sin cita" (.btn-outline, ícono de pasos) junto a "Nueva cita"
    appointment-form/                   + input `mode`; en reschedule muestra el resumen de la cita original en
                                          lugar del buscador; en walk-in oculta fecha y hora
    appointment-panel/                  + acción "Reprogramar" (.btn-outline)
  pages/reception-agenda/               abre el formulario en cada modo y vuelve a cargar la agenda al terminar
```

## Criterios de aceptación
**Sin cita**
1. "Sin cita" (toolbar, `.btn-outline`, solo con `APPOINTMENT_CREATE` y si la agenda muestra **hoy**; en otro día,
   deshabilitado con el `title` "Solo para hoy") abre el formulario con el título "Atención sin cita".
2. Campos: paciente, especialidad y profesional; sin fecha, hora ni motivo.
   - **Profesional por defecto:** el primero, en el orden de la agenda, que tenga la especialidad y un hueco ahora.
     Para saberlo, se pide `GET /availability?…&date=hoy` a cada profesional con esa especialidad, en paralelo con
     `forkJoin`, y se toma el que tenga el `startAt` más cercano.
   - Junto a cada profesional, en el `<select>`: "libre 10:45" o "sin hueco hoy".
3. Botón "Registrar llegada" (`.btn-primary`) → `POST /appointments/walk-in` con body exacto
   `{ patientId, professionalId, specialtyId }`.
   - Éxito: se cierra el panel, toast "David Pérez en espera · 10:45 con Dra. X", se recarga la agenda y la tarjeta
     dice "En espera".
   - 409: mensaje en el formulario.

**Reprogramar**
4. "Reprogramar" en el panel de detalle: solo en `PENDING`/`CONFIRMED` sin `checkedInAt` y con
   `APPOINTMENT_UPDATE`, va después de las acciones de estado. Abre el formulario en el mismo panel, con el título
   "Reprogramar cita".
5. Arriba, el resumen de la original, de solo lectura: paciente, "sáb 10 oct · 10:30 con Dra. X",
   especialidad. Especialidad y profesional vienen precargados con los de la original y se pueden cambiar. La fecha
   es la de la original si es hoy o futura; si no, hoy. Sin hora elegida.
6. En el `slot-picker`, la hora actual de la cita, si aparece, se marca como "actual" y no se puede elegir. Como el
   backend solo devuelve huecos libres, en la práctica no aparece; no se fuerza.
7. Botón "Reprogramar" (`.btn-primary`) → `POST /appointments/{id}/reschedule`.
   - Body exacto: `{ startAt }`, más `professionalId` y `specialtyId` **solo si cambiaron**.
   - Éxito: se cierra el panel, toast "Cita reprogramada: sáb 10 oct · 11:00", y la agenda va a la fecha nueva.
     La tarjeta original pasa a reprogramada, oculta salvo con "Ver canceladas".
   - 409: mensaje en el formulario y se recargan los huecos.

## Responsive
Igual que la 004a: panel lateral no modal en `≥ lg`, hoja inferior en `md`–`lg`, pantalla completa en `< md`.
Revisar en **375, 768, 1024, 1366 y 1920**.

## Tests requeridos
Se amplía `reception-agenda.page.spec.ts` con **2 casos**:
1. "Sin cita":
   - elegir paciente y especialidad → un `GET /availability` por profesional → queda elegido el del hueco más
     cercano;
   - "Registrar llegada" → `POST /api/v1/appointments/walk-in` con el body exacto → 201;
   - nuevo `GET /appointments` → la tarjeta dice "En espera".
2. Abrir una cita PENDING → "Reprogramar" → elegir otra hora → `POST /api/v1/appointments/{id}/reschedule` con body
   `{ startAt }` (sin profesional ni especialidad, porque no cambiaron) → responde 409 "El profesional ya tiene una
   cita en ese horario." → el mensaje se ve y se vuelve a pedir `/availability`.

## Prueba manual
1. Sin cita con 2 profesionales de la misma especialidad → se elige el que tiene hueco antes → la tarjeta aparece
   "En espera" con el ícono de "sin cita".
2. Reprogramar una cita a mañana con otro profesional → la agenda salta a mañana; hoy, con "Ver canceladas", se ve
   la original como reprogramada.
3. Intentar reprogramar una cita con llegada → la acción no aparece.
4. Anchos 375, 1024 y 1366.

## Resultado

- **Archivos creados o modificados**:
  - `src/app/features/appointments/models/appointment.models.ts`: Se añadieron los tipos `WalkInAppointmentRequest` (`patientId`, `professionalId`, `specialtyId`) y `RescheduleAppointmentRequest` (`startAt`, `endAt?`, `professionalId?`, `specialtyId?`).
  - `src/app/features/appointments/services/appointments.api.ts`: Se agregaron los métodos `walkIn(body)` para `POST /api/v1/appointments/walk-in` y `reschedule(id, body)` para `POST /api/v1/appointments/{id}/reschedule`.
  - `src/app/features/appointments/domain/appointment-state.ts`: Se integró la acción `'reschedule'` dentro de `AppointmentActionType` y `availableActions` (permitida para citas en `PENDING` o `CONFIRMED` sin `checkedInAt`, con permiso `APPOINTMENT_UPDATE`).
  - `src/app/features/appointments/components/agenda-toolbar/agenda-toolbar.component.ts`: Se incorporó el botón "Sin cita" (`.btn-outline` con ícono `Footprints`) condicionado por `canCreate()`, deshabilitado con `title="Solo para hoy"` si la fecha no es hoy, y con output `walkIn`.
  - `src/app/features/appointments/components/appointment-panel/appointment-panel.component.ts`: Se añadió la acción "Reprogramar" con botón `.btn-outline` e ícono `CalendarSync`.
  - `src/app/features/appointments/services/agenda.store.ts`: Se aseguró el manejo exhaustivo en `runAction` para que `'reschedule'` (manejado vía panel/página) no cause valores indefinidos.
  - `src/app/features/appointments/services/appointment-form.store.ts`:
    - Se refactorizó la carga de disponibilidad walk-in (`walkInTrigger$`) usando `switchMap` y `takeUntilDestroyed` para evitar condiciones de carrera y desuscribirse limpiamente.
    - Se incorporó la señal `walkInLoading` y se limpia `selectedProfessionalId` de inmediato al cambiar la especialidad para evitar selecciones inconsistentes.
    - Manejo granular de errores de disponibilidad por profesional etiquetando como `"no disponible"`; si todos fallan, se expone el error en el banner `bd-alert`; si ningún profesional tiene huecos libres hoy, no se auto-selecciona y se informa mediante `notice` ("Ningún profesional tiene hueco hoy para esta especialidad.").
    - Al recibir 409 tanto en `submit` normal como en walk-in, se recargan los huecos (`reloadSlots()`).
    - En `openReschedule()`, se eliminó el cast parcial `as Patient` manteniendo `patient` en `null`.
  - `src/app/features/appointments/components/appointment-form/appointment-form.component.ts`:
    - Añadido input `walkInLoading`.
    - Select de profesional deshabilitado y mostrando "Buscando huecos…" mientras carga la disponibilidad en modo `walk-in`.
    - En `reschedule` muestra la tarjeta de resumen de la cita original sin buscador de paciente; en `walk-in` oculta fecha, hora y motivo, y muestra en las opciones del profesional su disponibilidad ("libre HH:mm", "sin hueco hoy" o "no disponible").
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.ts`:
    - Enlace de `walkInLoading` hacia `<bd-appointment-form>`.
    - En `onCloseFormPanel()`, si se cierra el formulario de reprogramación sin guardar (Esc o ×), el panel activo regresa a `'detail'` preservando la selección y visibilidad de la tarjeta seleccionada.
    - Al completar con éxito la reprogramación en `onSaveAppointment()`, se deselecciona la cita explícitamente (`store.selectAppointment(null)`).
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.spec.ts`: Se cubren los 2 casos de integración requeridos (flujo sin cita con consulta concurrente de disponibilidad y preselección del profesional más próximo; y flujo de reprogramación con captura de 409 y recarga de huecos).

- **Resultado del build y tests**:
  - `npx ng build`: OK (0 errores, 0 advertencias de presupuesto).
  - Totales literales de `npx ng test --watch=false`:
```
 Test Files  3 passed (3)
      Tests  14 passed (14)
```

- **Anchos revisados y problemas visuales encontrados**:
  - 375 px: En "Sin cita", el side-sheet ocupa la pantalla completa (`fullscreenBelowMd`) mostrando paciente, especialidad y profesional; con la especialidad seleccionada el select de profesional se deshabilita momentáneamente mostrando "Buscando huecos…" hasta resolver las disponibilidades. En "Reprogramar", la tarjeta de la cita original se muestra legible y al cerrar con Esc vuelve al panel de detalle.
  - 768 px: Presentación en hoja inferior modal. Los selects conservan touch targets cómodos y el estado de carga no altera la grilla.
  - 1024 px: Hoja inferior modal con scroll contenido.
  - 1366 px: Panel lateral derecho no modal (26rem) con persistencia de espacio en la grilla.
  - 1920 px: Layout amplio sin colisiones ni desbordes.

- **Cómo levantar lo necesario para la Prueba manual**:
  1. Backend en `:8080`.
  2. Frontend: `npx ng serve`.
  3. Ingresar como secretaria (`secretaria@bellidental.local` / `Cambiar.2026!`).
  4. Para atención sin cita: en la agenda de hoy, hacer clic en "Sin cita" en el toolbar, seleccionar paciente y especialidad; verificar que mientras carga muestre "Buscando huecos…", que el profesional con hueco más próximo quede seleccionado con su hora indicada y hacer clic en "Registrar llegada".
  5. Para reprogramar: hacer clic en una cita PENDING o CONFIRMED, pulsar "Reprogramar" en el panel de detalle, verificar que al pulsar Esc/× regrese al detalle de la cita; al reprogramar con éxito, confirmar que se limpie la selección y salte a la fecha correspondiente.

## Revisión

**Revisión 1** — Estado: CORRECCIONES

Build OK y `ng test`: 14/14 (3 archivos). Se cumplen:
- `walkIn` y `reschedule` en `AppointmentsApi`, con el body exacto (en reprogramar, `professionalId` y
  `specialtyId` solo si cambiaron);
- "Sin cita" deshabilitado fuera de hoy, con `title`;
- "Reprogramar" según el estado, el check-in y el permiso;
- títulos del panel, toasts y salto a la fecha nueva;
- resumen de la cita original con `clinicDate`/`clinicTime`;
- recarga de huecos tras un 409 al reprogramar;
- los 2 tests con el body exacto y "En espera" visible.

Hay que corregir:

1. **Disponibilidad del walk-in (`loadWalkInAvailability`).**
   - **Carrera:** el `forkJoin` se suscribe suelto. Si la especialidad cambia antes de que responda, el resultado
     viejo pisa al nuevo, y no se cancela al destruir el store. Hay que pasarlo por un `Subject` con `switchMap` y
     `takeUntilDestroyed`, igual que `availabilityTrigger$`.
   - **Profesional anterior:** al cambiar la especialidad, `selectedProfessionalId` sigue con el profesional
     anterior hasta que llega la respuesta. Así se puede enviar con un profesional que no tiene esa especialidad.
     Hay que vaciarlo al empezar y mostrar un estado de carga: `slotsLoading` o un signal propio, con el select
     deshabilitado y el texto "Buscando huecos…".
   - **Error silencioso:** `catchError(() => of({ slots: [] }))` muestra "sin hueco hoy" aunque haya fallado la
     red o el backend haya respondido 409/403.
     - En ese profesional, la etiqueta pasa a "no disponible".
     - Si fallan todos, se muestra el `message` en el `bd-alert` del formulario.
   - **Ningún profesional con hueco:** hoy se elige `profs[0]`, que va a dar 409 seguro. Hay que dejar el select
     sin elegir y mostrar el aviso "Ningún profesional tiene hueco hoy para esta especialidad." en `notice`.
   - **409 al registrar:** además del mensaje, hay que volver a pedir la disponibilidad, para que las etiquetas
     "libre HH:mm" se actualicen.
2. **Selección colgada después de reprogramar.** Al abrir "Reprogramar", la cita sigue en
   `store.selectedAppointment()` aunque el panel de detalle se cierre. La tarjeta queda marcada como seleccionada,
   con `aria-expanded="true"`, sin ningún panel abierto.
   - Si se cierra el formulario de reprogramar sin guardar (con Esc o con ×), se vuelve al detalle:
     `activePanel` pasa a `'detail'`.
   - Si se reprograma con éxito: `store.selectAppointment(null)`.
3. **Cast `as Patient` en `openReschedule`.** Arma un `Patient` incompleto con un cast. En reprogramar el paciente
   no hace falta: `canSubmit` no lo usa y el resumen sale de `originalAppointment`. Hay que dejar `patient` en
   `null` y quitar el cast.

Los 14 tests tienen que seguir pasando. No se agregan tests nuevos.

**Revisión 2** — Estado: APROBADO

Build OK y `ng test`: 14/14 (3 archivos). Se aplicaron las correcciones:
1. **Disponibilidad del walk-in:**
   - pasa por `walkInTrigger$`, con `switchMap` y `takeUntilDestroyed`;
   - al empezar vacía el profesional, deshabilita el select y muestra "Buscando huecos…";
   - si falla un profesional, su etiqueta dice "no disponible", y si fallan todos se muestra el `message`;
   - si ninguno tiene hueco, el select queda sin elegir y aparece el aviso en `notice`;
   - tras un 409 se vuelve a pedir la disponibilidad.
2. **Selección:** si se cierra el formulario de reprogramar sin guardar, se vuelve al detalle. Si se reprograma con
   éxito, se quita la selección.
3. **Paciente:** `openReschedule` deja `patient` en `null` y ya no tiene el cast.

Corrección mínima de Claude: `setSpecialtyId` limpia `error`. Así, un fallo total de disponibilidad no sigue visible
después de elegir otra especialidad.
