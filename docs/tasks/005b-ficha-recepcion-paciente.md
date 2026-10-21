# 005b — Pacientes: ficha de recepción

## Objetivo
Segunda mitad de P5 (plan §5.5). En `/pacientes/:id` la secretaria ve, en una sola pantalla:
- la **identificación** del paciente;
- sus **observaciones** administrativas, editables en línea;
- sus **citas**: la próxima, con "Reprogramar" y "Cancelar", y las anteriores con su estado.

ODONTOLOGO y DIRECTOR ven provisionalmente solo la identificación, hasta la 014.

**Depende de:** 005a aprobada (modelo `Patient` con `adminNotes`, `PatientsApi.update`).
**Fuera de alcance:**
- el estado de cuenta (015);
- antecedentes, odontograma y diagnósticos (la secretaria no los ve, `CONTEXT.md` §3);
- desactivar paciente.

## Reglas del backend (confirmadas en el código)
- `GET /api/v1/patients/{id}` (`PATIENT_READ`) → `Patient`, con `adminNotes`. Si no existe: 404 con `message`.
- `PUT /api/v1/patients/{id}` (`PATIENT_UPDATE`) es parcial. El body `{ adminNotes: "…" }` cambia solo las
  observaciones; `""` las borra y la respuesta trae `adminNotes: null`.
- `GET /api/v1/appointments?patientId={id}` (`APPOINTMENT_READ`, backend 006d, G-4) → `Appointment[]` con
  **todas** las citas del paciente, de todos los estados, ordenadas por `startAt` ascendente. Si no tiene, `[]`.
  Sin `from`/`to`.
- `POST /api/v1/appointments/{id}/cancel` (`APPOINTMENT_CANCEL`) → 200. Ya existe `AppointmentsApi.cancel`.

## Archivos a tocar
```
src/app/
  app.routes.ts                                  'pacientes/:id' → loadComponent de PatientReceptionPage
                                                 (sin profileGuard: la página decide por perfil)
  features/appointments/
    services/appointments.api.ts                 + listByPatient(patientId) → GET /appointments?patientId=
    pages/reception-agenda/reception-agenda.page.ts
                                                 + query params `cita` y `accion`: al cargar las citas del día,
                                                   si `cita` está en la lista abre su detalle; con
                                                   `accion=reprogramar` abre directamente el formulario de
                                                   reprogramar. Después se quitan los dos params de la URL
                                                   (replaceUrl)
  features/patients/
    pages/patient-reception/
      patient-reception.page.ts                  smart: lee :id, carga paciente y citas, decide qué secciones
                                                 ver según el perfil y los permisos, guarda observaciones y
                                                 cancela
      patient-reception.page.spec.ts             (nuevo) 2 casos
    components/
      patient-identity/                          dumb: nombre, documento, edad, teléfono, correo, contacto de
                                                 emergencia y tipo de sangre; output edit
      admin-notes/                               dumb: vista y edición en línea; inputs notes, saving, error;
                                                 output save(string)
      patient-appointments/                      dumb: próximas y anteriores; inputs appointments, now,
                                                 canReschedule, canCancel; outputs reschedule y cancel
```
`patients` importa de `appointments` solo por su `index.ts`: `Appointment`, `AppointmentsApi` y
`appointmentDisplayState`. No se crea un ciclo, porque el `index.ts` de `appointments` no exporta nada que importe
de `patients`. `patients/index.ts` **no** exporta la página nueva.

## Criterios de aceptación
**Carga**
1. **Peticiones.** Al entrar se pide `GET /patients/{id}`. Solo con el perfil SECRETARIA se pide además, en
   paralelo, `GET /appointments?patientId={id}`. Mientras tanto se muestra `bd-skeleton`.
   - 404 o 0 → `bd-alert` con el `message` y "Reintentar".
   - Si falla solo la carga de citas, el error va dentro de esa sección, con su propio "Reintentar", y el resto se
     sigue viendo.
   - 403 → "No tienes permiso".
2. **Cambio de `:id`.** Si el `:id` cambia porque se eligió otro paciente en el buscador global, se vuelve a
   cargar todo (`paramMap` con `switchMap`, sin duplicar suscripciones).

**Identificación (`patient-identity`)**
3. **Encabezado.**
   - `<h1>` con `fullName` y, debajo, una línea: "CI 1710034065 · 19 años · 0987 654 321".
     - El documento usa una etiqueta corta: CI, RUC o Pasaporte.
     - El teléfono usa el pipe `phone`.
     - Los datos que falten se omiten, sin "null".
   - Datos secundarios, en una lista `<dl>`: correo, tipo de sangre (`bloodTypeLabel`) y contacto de emergencia
     (nombre y teléfono). Solo los que existan.
4. **Editar.** El botón "Editar" (`.btn-outline`, ícono de lápiz) lleva a `/pacientes/{id}/editar`. Solo aparece si
   el perfil es SECRETARIA y el usuario tiene `PATIENT_UPDATE`.

**Observaciones (`admin-notes`, solo SECRETARIA)**
5. **Vista.**
   - Etiqueta "Observaciones" y el texto, que respeta los saltos de línea (`white-space: pre-line`).
   - Sin texto: "Sin observaciones", en color atenuado.
   - Botón "Editar observaciones" (`.btn-ghost`, 44 px).
6. **Edición en línea.** Un `textarea` de 3 filas y como máximo 1000 caracteres reemplaza a la vista y recibe el
   foco.
   - **Guardar al salir:** en `blur` o con Ctrl/⌘+Enter, si el texto cambió, se hace `PUT /patients/{id}` con body
     exacto `{ adminNotes: <texto con trim()> }`. Si no cambió, solo se vuelve a la vista.
   - **Esc:** descarta los cambios y vuelve a la vista.
   - Mientras guarda: "Guardando…" con `role="status"`. Al terminar se ve el texto nuevo, que sale de la respuesta.
   - **Error:** el textarea queda abierto con el texto escrito y el `message` en `bd-alert`, para no perder lo
     escrito.

**Citas (`patient-appointments`, solo SECRETARIA)**
7. **Próximas.** Citas `PENDING` o `CONFIRMED` con `startAt` ≥ ahora (`ClinicClock`), en orden ascendente.
   - **La primera** se destaca en una tarjeta: "mar 14 oct · 10:30" (`clinicDate` y `clinicTime`), profesional,
     especialidad, estado con `bd-status-badge` (texto y tono de `appointmentDisplayState`) y, si tiene, el motivo.
   - **Las demás** van debajo, en una lista compacta con fecha, hora, profesional y estado.
   - Sin próximas: "Sin citas próximas".
8. **Acciones de la próxima cita.**
   - **"Reprogramar"** (`.btn-outline`): solo si no tiene `checkedInAt` y el usuario tiene `APPOINTMENT_UPDATE`.
     Navega a `/recepcion?fecha=<YYYY-MM-DD de la cita>&cita=<id>&accion=reprogramar`, y la agenda abre el
     formulario de reprogramar de esa cita (ver 11).
   - **"Cancelar cita"** (`.btn-ghost` en tono peligro): con `APPOINTMENT_CANCEL`.
     - Pide confirmación con `ConfirmDialogService`, con el mismo texto que la agenda.
     - Si se confirma → `POST /appointments/{id}/cancel` → toast "Cita cancelada" → se recargan las citas.
     - Error → toast de error con el `message`.
9. **Anteriores.** Las demás citas, en orden **descendente**: las de `startAt` < ahora y las `CANCELLED`,
   `RESCHEDULED` o `NO_SHOW` futuras. Muestran fecha, hora, profesional, especialidad y estado (`bd-status-badge`).
   - Se muestran las 10 primeras, con "Ver todas (N)" si hay más.
   - En `< sm` se ven como lista de tarjetas y en `≥ sm`, como tabla. Se usa `bd-table` si existe en `shared/`; si
     no, una tabla semántica con la clase `.table-cards`.
   - Sin anteriores: "Sin citas anteriores".
10. **Reglas.** Los componentes son dumb: el "ahora" les llega como `input`, y la separación entre próximas y
    anteriores es un `computed` del componente o una función pura. Sin `new Date()` suelto.

**Agenda (`reception-agenda.page.ts`)**
11. **Params `cita` y `accion`.**
    - Si la URL trae `cita` y la cita está entre las cargadas para `fecha`, se abre su detalle.
    - Si además trae `accion=reprogramar` y la cita admite esa acción (`availableActions`), se abre directamente el
      formulario "Reprogramar cita". Al cerrarlo sin guardar se vuelve al detalle, igual que en la 004b.
    - Hecho esto, los params `cita` y `accion` se quitan de la URL con `replaceUrl: true` (se mantienen `fecha` y
      `vista`).
    - Si la cita no está, no pasa nada.

**Perfil**
12. ODONTOLOGO y DIRECTOR ven solo la identificación, sin el botón "Editar", y no se pide `GET /appointments`. Se
    decide con `SessionStore.profile()` y `hasPermission()`, nunca comparando nombres de rol.

## Responsive
- `< md`: una columna en orden identificación → observaciones → próxima cita → anteriores, y las acciones de la
  próxima cita a todo el ancho.
- `≥ lg`: la identificación y las observaciones arriba, a todo el ancho; debajo, la próxima cita y las anteriores en
  una sola columna de ancho máximo ~64rem. La columna derecha queda para el estado de cuenta de la 015: no se
  reserva espacio vacío.
- `patient-appointments` usa `@container` para pasar de tarjetas a tabla.
- Sin scroll horizontal y con objetivos táctiles ≥ 44 px.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
`pages/patient-reception/patient-reception.page.spec.ts`, con **2 casos**:
- sesión de SECRETARIA con `PATIENT_UPDATE`, `APPOINTMENT_UPDATE` y `APPOINTMENT_CANCEL`;
- reloj fijo con `vi.useFakeTimers()` + `vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'))`, como en
  `reception-agenda.page.spec.ts`.

1. **Carga:**
   - abrir `/pacientes/pat-1` → `GET /api/v1/patients/pat-1` y `GET /api/v1/appointments?patientId=pat-1`;
   - responder con un `Patient` real (`adminNotes: "Presupuesto ortodoncia $1.200"`) y tres citas con la forma real
     del DTO: una `CONFIRMED` el 2026-10-14 a las 10:30, una `ATTENDED` el 2026-10-03 y una `CANCELLED` el
     2026-10-12;
   - se ve el nombre, "CI 1710034065" y las observaciones;
   - la próxima cita muestra "10:30" y "Confirmada";
   - en anteriores aparecen la atendida y la cancelada, con sus estados en texto.
2. **Observaciones:**
   - tras la carga, "Editar observaciones" → escribir "Abona $100 mensuales" → `blur`;
   - `PUT /api/v1/patients/pat-1` con body exacto `{ adminNotes: 'Abona $100 mensuales' }`;
   - responder 200 con el `Patient` actualizado → se ve el texto nuevo y ya no hay `textarea`.

## Prueba manual
1. Buscar un paciente con citas → ficha con la próxima cita y las anteriores.
2. Editar las observaciones, salir del campo → se guardan. Reabrir y pulsar Esc → no cambian.
3. "Reprogramar" en la próxima cita → la agenda de ese día abre el formulario de reprogramar → reprogramar → volver
   a la ficha y ver la cita nueva.
4. "Cancelar cita" → confirmar → la cita pasa a anteriores como cancelada.
5. Entrar como odontólogo a `/pacientes/{id}` → solo identificación.
6. Anchos 375 y 1366.

## Resultado

**Archivos creados**
- `src/app/features/patients/pages/patient-reception/patient-reception.page.ts` (smart: carga paciente y citas en paralelo con `forkJoin`, reintentos por sección, observaciones, cancelar, reprogramar).
- `src/app/features/patients/pages/patient-reception/patient-reception.page.spec.ts` (2 casos de integración).
- `src/app/features/patients/components/patient-identity/patient-identity.component.ts` (input `patient`, `canEdit`; output `edit`).
- `src/app/features/patients/components/admin-notes/admin-notes.component.ts` (inputs `notes`, `canEdit`, `saving`, `error`; output `save`).
- `src/app/features/patients/components/patient-appointments/patient-appointments.component.ts` (inputs `appointments`, `now`, `canReschedule`, `canCancel`; outputs `reschedule`, `cancel`).

**Archivos modificados**
- `src/app/app.routes.ts`: `pacientes/:id` carga `PatientReceptionPage`.
- `src/app/features/appointments/services/appointments.api.ts`: `listByPatient(patientId)`.
- `src/app/features/patients/services/patients.api.ts`: `update` acepta `Partial<UpdatePatientRequest>` (antes exigía el DTO completo; el body `{ adminNotes }` no compilaba). Las llamadas existentes siguen válidas.
- `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.ts`: query params `cita` y `accion`. Al cargar, abre el detalle y, con `accion=reprogramar` y si `availableActions` lo admite, el formulario de reprogramar. Luego quita los dos params con `replaceUrl`. Si la fecha no cambió, fuerza una recarga para tener la cita al día.

**Build y tests**
- `npx ng build`: OK (sin errores ni avisos de presupuesto).
- Patients: `Test Files 2 passed (2)` / `Tests 4 passed (4)` (form 2 + recepción 2).
- Appointments: `Test Files 1 passed (1)` / `Tests 8 passed (8)`.
- Completo, una vez: `Test Files  5 passed (5)` / `Tests  18 passed (18)` (16 existentes + 2 nuevos).

**Responsive (revisado leyendo CSS, no visualmente)**
- No pude abrir el navegador: no se revisó en 375/768/1024/1366 con DevTools. Queda pendiente para la prueba manual.
- Diseño previsto: página con `max-width: 64rem`; `patient-appointments` usa `@container` (`max-width: 37.49rem`) para pasar la tabla `.table-cards` a tarjetas; botones de acción de la próxima cita a ancho completo y 44 px de alto; sin scroll horizontal por diseño.

**Supuestos y problemas**
- Se gatean "Editar" y "Editar observaciones" con `PATIENT_UPDATE` (además de SECRETARIA en la página). La tarea no lo dice para las observaciones; si no se quiere, basta quitar `canEdit` en `admin-notes`.
- Las acciones de "Reprogramar" y "Cancelar" usan los permisos `APPOINTMENT_UPDATE` y `APPOINTMENT_CANCEL`, y "Reprogramar" además exige que la cita no tenga `checkedInAt`.
- Las "anteriores" son todas las citas que no son "próximas" (incluye citas abiertas con fecha pasada y las futuras atendidas, si las hubiera).
- El texto de confirmación de cancelar se duplica en la ficha (mismo texto que la agenda); es una sola frase, no se extrajo a `shared/`.
- Para la prueba manual: hace falta un paciente con citas en la BD y el backend con `GET /api/v1/appointments?patientId=` (backend 006d).

## Revisión

**Revisión 1** — Estado: APROBADO

Revisor: Claude (Opus). Ejecutor: Haiku, por delegación del usuario en esta sesión.

Build OK y `ng test`: 18/18 (5 archivos). Se cumplen:
- **Carga:** con `paramMap` + `switchMap` y "Reintentar" por sección. Las citas solo se piden con el perfil
  SECRETARIA, y si fallan, el error queda en su sección.
- **Identificación:** con el pipe `phone` y sin "null". "Editar" solo con SECRETARIA y `PATIENT_UPDATE`.
- **Observaciones en línea:**
  - se guardan al salir o con Ctrl/⌘+Enter, con body `{ adminNotes }`;
  - Esc descarta los cambios;
  - si hay error, el editor queda abierto con el texto escrito.
- **Citas:**
  - las próximas son las `PENDING`/`CONFIRMED` desde ahora, y las anteriores, el resto en orden descendente,
    10 visibles y "Ver todas";
  - "Reprogramar" solo si la cita no tiene check-in, y "Cancelar" con confirmación;
  - el componente pasa de tarjetas a tabla con `@container`.
- **Agenda:** `?cita&accion=reprogramar` se aplica cuando termina la carga, y luego se quitan los params con
  `replaceUrl`.
- **Tests:** los 2 casos tienen el body exacto del `PUT`.

Se aceptan:
- `PatientsApi.update` recibe `Partial<UpdatePatientRequest>`, porque el `PUT` del backend es parcial.
- "Editar observaciones" exige también `PATIENT_UPDATE`.

Corrección mínima de Claude: en `admin-notes`, al cerrar el editor con Esc o con Ctrl+Enter, el foco vuelve a
"Editar observaciones". Antes se perdía en el `body`, porque el `textarea` desaparece. Al cerrar con `blur` no se
mueve el foco, porque el usuario ya lo llevó a otro lado.

Queda anotado, sin bloquear:
- La identificación espera también a las citas antes de salir del skeleton (`forkJoin`). Como las dos peticiones
  van en paralelo, el costo es bajo.
