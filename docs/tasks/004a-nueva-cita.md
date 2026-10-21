# 004a — Agenda: nueva cita (formulario, selector de horas y clic en un hueco de la grilla)

## Objetivo
Agendar una cita desde la agenda de recepción con el menor número de clics (plan §5.4, P4, TGA T3):
paciente → especialidad → profesional → fecha → hora libre → Guardar. Se abre con el botón "Nueva cita" o con un clic
en un hueco libre de la grilla. Desde el hueco se precargan el profesional, la fecha y la hora.

**Depende de:** 003c (commit `221b5f5`). **Fuera de alcance:** Sin cita y Reprogramar (004b), "Registrar paciente"
(005; el enlace queda deshabilitado).

## Reglas del backend (confirmadas en el código)
- `GET /api/v1/specialties` → `ApiResponse<[{ id, name, defaultDurationMinutes }]>`, solo las activas.
- `GET /api/v1/availability?professionalId&specialtyId&date=YYYY-MM-DD` → `[{ startAt, endAt }]`.
  - Los huecos duran lo de la especialidad y respetan el horario efectivo, las citas ocupadas y la hora actual.
  - Una fecha pasada devuelve `[]`.
  - Si el profesional no tiene esa especialidad, responde 409 "El profesional no tiene activa esta especialidad."
- `POST /api/v1/appointments`, body `{ patientId, professionalId, specialtyId, startAt, endAt?, reason?, notes? }` →
  201 `ApiResponse<Appointment>`, con message "Cita creada.".
  - Sin `endAt`, el backend usa la duración de la especialidad, así que **no se envía**.
  - Errores: 409 "El profesional ya tiene una cita en ese horario."; 409 "El horario solicitado está fuera del
    horario efectivo del profesional."; 400 "La cita no puede empezar en el pasado."; 409 "El paciente no está
    activo.".
- Permiso `APPOINTMENT_CREATE`: muestra el botón "Nueva cita" y habilita el clic en un hueco.
- Las especialidades de cada profesional ya llegan en `GET /professionals` (`specialties[{id, name,
  defaultDurationMinutes}]`), que `AgendaStore` ya tiene cargado. No se vuelven a pedir.

## Archivos a tocar
```
src/app/
  shared/components/side-sheet/            + input `fullscreenBelowMd` (boolean): en < md ocupa toda la pantalla
                                             (100dvh, sin asa ni radio); el resto igual
  features/
    professionals/                          + SpecialtiesApi.list() → GET /specialties; modelo Specialty; exportar
                                              ambos en index.ts
    appointments/
      models/appointment.models.ts          + CreateAppointmentRequest, AvailableSlot { startAt, endAt }
      services/appointments.api.ts          + create(body) → Observable<Appointment>
      services/availability.api.ts          (nuevo) slots(professionalId, specialtyId, date) → AvailableSlot[]
      services/appointment-form.store.ts    (nuevo, lo provee la página) estado del formulario: especialidades,
                                              huecos (con switchMap por criterio), selectedSlot, saving, error;
                                              submit() → create → recarga los huecos si responde 409
      components/
        slot-picker/                        (nuevo, dumb) chips de hora agrupados en "Mañana" / "Tarde"
        appointment-form/                   (nuevo, dumb) formulario completo; inputs y outputs, sin servicios
        agenda-toolbar/                     + botón "Nueva cita" (.btn-accent, ícono +), output `create`
        agenda-grid/                        + output `slotSelected { professionalId, startAt }` (clic en el fondo
                                              libre de una columna)
      pages/reception-agenda/               el panel muestra el detalle de la cita o el formulario (uno a la vez);
                                              conecta el store del formulario, la búsqueda y la recarga de la agenda
```
Dependencias entre features:
- de `patients/index.ts`: `PatientSearchComponent`, `PatientSearchStore` (una instancia propia del formulario,
  provista por la página, no la del header) y `Patient`;
- de `professionals/index.ts`: `SpecialtiesApi`, `Specialty` y `Professional`.

## Criterios de aceptación
**Apertura**
1. "Nueva cita" (toolbar, `.btn-accent`, el único dorado de la pantalla) abre el formulario en `bd-side-sheet`
   (título "Nueva cita"). La fecha es la de la agenda si es hoy o futura; si es pasada, se usa hoy. Sin el permiso
   `APPOINTMENT_CREATE`, el botón no aparece.
2. **Clic en un hueco libre de la grilla:** clic en el fondo de la columna de un profesional, no sobre una tarjeta
   ni sobre una zona sombreada.
   - `agenda-grid` calcula la hora con `offsetY / (alto de la columna / totalHours)` y la redondea hacia abajo
     a 15 min. Emite `slotSelected` solo si esa hora es futura y está dentro de un turno (`domain/agenda-layout.ts`:
     función pura `slotAtOffset(...)`).
   - El formulario se abre con ese profesional, esa fecha y esa hora preseleccionados.
   - Si la hora no está entre los huecos que devuelve `/availability`, no se selecciona ninguna y se muestra
     "Esa hora no está libre; elige otra.".
   - El cursor es `pointer` solo en el fondo libre. Es un atajo de ratón o toque; con teclado se usa "Nueva cita".
3. Si el panel de detalle está abierto, "Nueva cita" o el clic en un hueco lo reemplazan por el formulario (nunca
   dos paneles a la vez). Cerrar el formulario con cambios sin guardar no pide confirmación (MVP).

**Formulario** (orden fijo de arriba abajo)
4. **Paciente:** `PatientSearchComponent` con `canRegister=false`. Al elegir un paciente se muestra como resumen
   ("David Pérez · 1712345678") con un botón "Cambiar" (≥ 44 px). Al abrir el formulario, el foco va siempre al
   buscador de paciente, también desde un hueco, porque el paciente nunca viene precargado.
5. **Especialidad:** `<select>` nativo con las especialidades de `GET /specialties` que tenga al menos un profesional
   cargado.
   - Si se abrió desde un hueco: solo las del profesional precargado. Si tiene una sola, queda elegida.
   - Junto al select: "Duración: 30 min" (`defaultDurationMinutes`).
6. **Profesional:** `<select>` con los profesionales que tienen la especialidad elegida, con su punto `colorTag`
   en el texto de ayuda.
   - Si solo hay uno, queda elegido.
   - Al cambiar de especialidad, si el profesional elegido no la tiene, se limpia.
7. **Fecha:** `<input type="date">` con `min` = hoy (`ClinicClock`) y botones rápidos "Hoy" y "Mañana" (≥ 44 px).
8. **Hora:** `slot-picker`.
   - Se pide `GET /availability` cuando están elegidos profesional, especialidad y fecha, y se vuelve a pedir si
     cambia cualquiera de los tres (`switchMap`: gana el último).
   - Chips `HH:mm` de 44 px de alto, agrupados en "Mañana" (< 12:00) y "Tarde".
   - Semántica: `role="radiogroup"` con `aria-label="Hora de la cita"`; cada chip es un `<input type="radio">` con
     su `<label>`, para que el teclado funcione de forma nativa.
   - Estados: cargando (`bd-skeleton` en fila); vacío ("Sin horas libres este día." y botón "Ver día siguiente",
     que suma un día a la fecha); error con el `message` y "Reintentar".
   - Antes de elegir los tres datos: "Elige profesional, especialidad y fecha para ver las horas libres.".
9. **Motivo** (opcional): `<input>` de una línea, máximo 255 caracteres. Sin campo de notas en el MVP.
10. **Guardar:**
    - `.btn-primary` "Agendar cita", fijo al pie del panel; deshabilitado hasta tener paciente, especialidad,
      profesional y hora.
    - Mientras guarda: carga, deshabilitado y sin doble envío.
    - Body exacto: `{ patientId, professionalId, specialtyId, startAt: slot.startAt, reason? }`. `startAt` se envía
      tal como vino de `/availability`; `reason` no se envía si está vacío.
11. **Éxito:**
    - se cierra el panel;
    - toast "Cita agendada: David Pérez, sáb 10 oct · 10:30" (pipes `clinicDate`/`clinicTime`);
    - si la cita es de otra fecha, la agenda cambia a esa fecha (y la URL); si no, se recarga la lista;
    - la tarjeta nueva aparece en su columna.
12. **Error:**
    - `bd-alert` arriba del botón con el `message` del backend;
    - con 409, además se limpia la hora elegida y se vuelve a pedir `/availability` (otro usuario o el bot pudo
      ocupar el hueco);
    - con 403: "No tienes permiso para esta acción.". Con status 0: "No se pudo conectar con el servidor.".
13. **Clean code:** la plantilla de `appointment-form` no pasa de ~150 líneas; si pasa, el bloque
    paciente/resumen va a un componente aparte. Reactive Forms tipados (`FormBuilder.nonNullable`). Sin `any`.

## Responsive
Revisar en **375, 768, 1024, 1366 y 1920**:
- `≥ lg`: formulario en el panel lateral no modal de 26rem (como el detalle). La grilla se estrecha y se puede
  hacer clic en otro hueco con el formulario abierto: actualiza profesional, fecha y hora, y conserva el paciente
  elegido.
- `md`–`lg`: hoja inferior modal (máx. 85vh), con el botón "Agendar cita" fijo al pie.
- `< md`: pantalla completa (`fullscreenBelowMd`); la fecha y los botones rápidos en una línea; los chips se
  ajustan en varias filas sin scroll horizontal.
- Con puntero táctil, los chips y los botones miden ≥ 44 px.

## Tests requeridos
Se amplía `reception-agenda.page.spec.ts` (no se crea otro spec) con **2 casos**, reutilizando las fixtures. Si
hace falta, se agregan `specialties` y `slots` a `testing/fixtures.ts`.
1. Clic en "Nueva cita":
   - escribir en el buscador → `GET /api/v1/patients?…` → elegir el paciente;
   - elegir especialidad y profesional → `GET /api/v1/availability` con `professionalId`, `specialtyId` y `date`
     correctos → clic en el chip "10:30";
   - "Agendar cita" → `POST /api/v1/appointments` con el body exacto del criterio 10 (sin `endAt` ni `reason`) →
     201;
   - nuevo `GET /api/v1/appointments` → la tarjeta del paciente aparece en la columna de su profesional y se ve el
     toast.
2. Mismo flujo hasta "Agendar cita" → el `POST` responde 409 con message "El profesional ya tiene una cita en ese
   horario." → el mensaje se ve en el formulario y se vuelve a pedir `GET /api/v1/availability`.

Los 10 tests existentes siguen pasando. El clic en un hueco de la grilla se prueba a mano (jsdom no calcula
`offsetY`).

## Prueba manual
Con el backend en `:8080` y `npx ng serve`, como secretaria (`secretaria@bellidental.local` / `Cambiar.2026!`):
1. "Nueva cita" → buscar un paciente → especialidad → profesional (se elige solo si hay uno) → Hoy → chip → Agendar →
   toast y tarjeta en la grilla. Contar los clics y anotarlos en el Resultado (dato para la TGA T3).
2. Clic en un hueco libre de la columna de un profesional → el formulario sale precargado con la hora marcada.
   Clic en una zona sombreada o en una hora pasada → no pasa nada.
3. Dos pestañas: abrir el mismo hueco en ambas y agendar en las dos → la segunda muestra el 409 y los huecos se
   recargan sin esa hora.
4. Agendar para mañana → la agenda salta a mañana y se ve la cita.
5. Teclado: Tab por el formulario; flechas entre los chips de hora; Enter en "Agendar cita".
6. Anchos 375 (pantalla completa), 1024 (hoja inferior) y 1366 (panel lateral, clic en otro hueco con el formulario
   abierto).

## Resultado

- **Archivos creados o modificados**:
  - `src/styles.scss`: Nueva clase base `.form-control` con tokens, `min-height: 44px`, borde `--slate-300`, `--radius-sm`, estado `:disabled` y foco con `--color-focus`.
  - `src/app/shared/components/side-sheet/side-sheet.component.ts`: Input `fullscreenBelowMd` para ocupar 100dvh sin borde redondeado ni asa en `< md`.
  - `src/app/features/professionals/models/professional.models.ts`: Modelo `Specialty` con `id: number`.
  - `src/app/features/professionals/services/specialties.api.ts`: Cliente `SpecialtiesApi` con método `list()`.
  - `src/app/features/professionals/index.ts`: Barrel exportando `Specialty`, `SpecialtiesApi` y `Professional`.
  - `src/app/features/appointments/models/appointment.models.ts`: `SpecialtyId: number` en `Appointment` y `CreateAppointmentRequest`; tipo `AvailableSlot`.
  - `src/app/features/appointments/services/appointments.api.ts`: Método `create(body)` hacia `POST /api/v1/appointments`.
  - `src/app/features/appointments/services/availability.api.ts`: Servicio `AvailabilityApi.slots(professionalId, specialtyId: number, date)`.
  - `src/app/features/appointments/services/appointment-form.store.ts`: Store con `selectedSpecialtyId: number | null`, captura de error en `initSpecialties()`, limpieza de paciente en `openFromSlot()`, comparación precisa de hora con `minutesOfDay()`, y recarga ante 409.
  - `src/app/features/appointments/components/slot-picker/slot-picker.component.ts`: Componente visual dumb con `role="radiogroup"` y `aria-labelledby`, uso de `ClinicTimePipe` y `minutesOfDay() < 720` para mañana/tarde, botones secundarios con `.btn-outline`.
  - `src/app/features/appointments/components/appointment-patient-field/appointment-patient-field.component.ts`: Componente dumb extraído para el bloque de paciente (resumen con "Cambiar" `.btn-outline` o buscador), manteniendo la plantilla principal bajo 150 líneas.
  - `src/app/features/appointments/components/appointment-form/appointment-form.component.ts`: Formulario limpio estructurado con `bd-field` para etiquetas y hints, `.form-control` para inputs y selects, aviso con `--gold-700`, sombra con `--blue-950` y plantilla de menos de 100 líneas.
  - `src/app/features/appointments/components/agenda-toolbar/agenda-toolbar.component.ts`: Botón "Nueva cita" (`.btn-accent`, ícono `+`) condicionado por `canCreate()`.
  - `src/app/features/appointments/components/agenda-grid/agenda-grid.component.ts`: Clic en columna libre conectado con `slotAtOffset(...)`.
  - `src/app/features/appointments/domain/agenda-layout.ts`: `slotAtOffset(...)` descartando fechas pasadas frente a `todayDateString` y calculando horas redondeadas a 15 min.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.ts`: Propiedad computada `isDetailOpen`, efecto que restablece `activePanel` a `null` si se cancela o vacía la cita, y binding numérico de especialidades.
  - `src/app/features/appointments/testing/fixtures.ts`: DTOs mock con `specialtyId: 1` y `2` como números.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.spec.ts`: Pruebas de integración con `specialtyId: 1` tanto en URL como en payload de creación.

- **Resultado del build tras correcciones**:
  - `npx ng build`: OK (0 errores, 0 advertencias de presupuesto).
  - Totales literales de `npx ng test --watch=false`:
```
 Test Files  3 passed (3)
      Tests  12 passed (12)
```

- **Anchos revisados y problemas visuales encontrados**:
  - 375 px: Al abrir "Nueva cita", el side-sheet ocupa la pantalla completa (`fullscreenBelowMd`, 100dvh) sin el asa superior; los botones rápidos "Hoy" y "Mañana" `.btn-outline` caben junto al input de fecha; los chips de hora se distribuyen fluidamente con touch target ≥ 44 px; botón "Agendar cita" accesible al pie con sombra suave.
  - 768 px: Presentación como hoja inferior modal (máximo 85vh) con esquinas redondeadas y backdrop, botón de acción fijo.
  - 1024 px: Hoja inferior modal con scroll vertical interno suave y ancho adaptado; selector de horas agrupado en columnas legibles.
  - 1366 px: Panel lateral derecho no modal de 26rem sobre la grilla. La grilla ajusta su margen (`padding-inline-end: 26rem`) permitiendo hacer clic en otros huecos libres de los profesionales para re-seleccionar la hora sin cerrar el formulario y manteniendo el paciente. Al cancelar una cita desde el panel de detalle, éste se cierra inmediatamente sin dejar espacio en blanco.
  - 1920 px: Layout amplio y despejado sin desplazamientos horizontales ni colisiones visuales.

- **Cómo levantar lo necesario para la Prueba manual**:
  1. Backend en `:8080` (Spring Boot activo con PostgreSQL).
  2. Levantar frontend: `npx ng serve`.
  3. Ingresar como secretaria: `secretaria@bellidental.local` / `Cambiar.2026!` (tiene permiso `APPOINTMENT_CREATE`).
  4. Clic en "Nueva cita" en el toolbar o en cualquier hueco libre de la grilla de un profesional.

- **Correcciones aplicadas de la Revisión 1**:
  1. Panel de detalle cerrado automáticamente si `store.selectedAppointment()` es nulo usando `isDetailOpen` y un `effect` en `ReceptionAgendaPage`.
  2. Clase `.form-control` agregada en `src/styles.scss`, botones secundarios cambiados a `.btn-outline`, uso de `bd-field` con hints para duración y licencia médica, y vinculación de `aria-labelledby` en paciente y hora.
  3. Colores corregidos: aviso con `var(--gold-700)` y sombra del pie con `color-mix(in srgb, var(--blue-950) 8%, transparent)`.
  4. Identificadores de especialidad tipados como `number` en modelos, APIs, store, formulario y fixtures de prueba.
  5. `openFromSlot` limpia el paciente y motivo previo; solo `updateSlotSelection` (clic con formulario abierto) lo preserva.
  6. `slotAtOffset` descarta fechas pasadas (`date < todayDateString`); `AppointmentFormStore` compara huecos con `minutesOfDay()`; `slot-picker` usa `ClinicTimePipe` y `minutesOfDay() < 720`.
  7. `initSpecialties` captura errores de red y los muestra mediante `bd-alert`.
  8. Extracción del campo de paciente a `AppointmentPatientFieldComponent`, dejando la plantilla de `appointment-form` en ~90 líneas.

## Revisión

**Revisión 1** — Estado: CORRECCIONES

Build OK y `ng test`: 12/12 (3 archivos). Se cumplen:
- el flujo del store y el body del POST (sin `endAt` y con `reason` solo si hay texto);
- la recarga de horas tras un 409;
- la elección automática de especialidad y profesional;
- `fullscreenBelowMd`;
- el radiogroup nativo;
- los 2 tests.

Hay que corregir:

1. **Regresión de la 003b: el panel de detalle queda abierto y vacío.** Ahora está abierto mientras
   `activePanel() === 'detail'`, pero el store borra `selectedAppointmentId` al **cancelar** la cita y cuando el
   refresco de 60 s ya no la trae. En esos dos casos el panel sigue abierto sin contenido y la grilla ya no le reserva
   espacio. El panel de detalle tiene que estar abierto con
   `activePanel() === 'detail' && !!store.selectedAppointment()`, o hay que poner `activePanel` en `null` cuando
   la selección se vacía.
2. **Clases de estilo que no existen.** `.btn-secondary`, `.form-label`, `.form-select` y `.form-input` no están
   en `styles.scss` ni en `shared/`, así que los selects, la fecha, el motivo y los botones "Cambiar", "Hoy",
   "Mañana", "Reintentar" y "Ver día siguiente" salen con el estilo del navegador.
   - Botones secundarios: usar `.btn-outline`, que ya existe.
   - Etiquetas, ayuda y error: usar `bd-field`. "Duración: 30 min" y la ayuda del profesional van como `hint`.
   - Crear en `src/styles.scss` una clase base `.form-control` para `input` y `select`, junto a las `.btn-*`:
     tokens, `min-height: 44px`, borde `--slate-300`, `--radius-sm`, foco con `--color-focus` y estado
     `:disabled`. Usarla en el formulario.
   - Etiqueta "Paciente": su `for="appt-patient-search"` apunta a un id que no existe. Hay que asociarla al input del
     combobox, o usar `aria-labelledby`.
   - Etiqueta "Hora": es un `<label>` sin control. Pasarla a un `<span id>` y referenciarla desde el radiogroup con
     `aria-labelledby`.
3. **Colores sueltos.** `var(--amber-700, #b45309)` (el token no existe, así que siempre usa el valor de respaldo)
   y `var(--black, #000)` en `appointment-form`. Usar `--gold-700` para el aviso y `--shadow-*` o `color-mix` con
   `--blue-950` para la sombra.
4. **Ids de especialidad como `string`.** Son un catálogo `bigint` del backend, y `clean-code` pide `number`.
   - Cambiar a `number`: `Specialty.id`, `CreateAppointmentRequest.specialtyId`, `selectedSpecialtyId` del store y
     `Appointment.specialtyId` si existe.
   - Los selects usan `[ngValue]`, o convierten el valor con `Number()`.
   - Las fixtures pasan de `'spec-1'` a `1`, para tener la forma real del DTO (`testing/SKILL.md`). El test verifica
     `specialtyId: 1` en el body y `specialtyId=1` en la query.
5. **El paciente anterior se queda al abrir desde un hueco.** `openFromSlot` no limpia `patient` ni el motivo:
   después de cerrar un formulario con paciente, abrir uno nuevo desde un hueco lo trae precargado. Tiene que
   limpiarlos como hace `openNew`. Solo `updateSlotSelection`, el clic en otro hueco con el formulario abierto,
   conserva el paciente.
6. **Horas y fechas.**
   - `slotAtOffset` solo descarta horas pasadas cuando la agenda está en hoy. Un día pasado tiene que devolver
     `null`, comparando la fecha con `todayDateString`.
   - La comparación de `pendingStartAt` con los huecos combina cuatro condiciones (`startsWith`, `slice`).
     Reemplazarla por la misma fecha y `clinicClock.minutesOfDay(a) === clinicClock.minutesOfDay(b)`.
   - `slot-picker`, en `parseSlotTime`: usar `ClinicTimePipe` para la etiqueta y `minutesOfDay() < 720` para
     separar "Mañana" y "Tarde". Nada de `getHours()`, que usa la hora local del navegador.
7. **Error silencioso.** `initSpecialties` tiene `error: () => {}`. Si falla `GET /specialties`, hay que mostrar
   el `message` con `bd-alert` en el formulario (regla "nunca un error silencioso").
8. **Plantilla de más de 150 líneas.** La de `appointment-form` tiene unas 170 (criterio 13). Sacar el bloque del
   paciente (resumen con "Cambiar" o el buscador) a `components/appointment-patient-field/`, un componente dumb.

Los 12 tests tienen que seguir pasando. Solo se ajustan las fixtures y las aserciones del punto 4.

**Revisión 2** — Estado: APROBADO

Build OK y `ng test`: 12/12 (3 archivos). Las 8 correcciones están aplicadas:
- el panel de detalle se cierra si la cita desaparece (`isDetailOpen` y un effect);
- `.btn-outline`, `bd-field` con `hint` y la etiqueta "Hora" referenciada desde el radiogroup;
- tokens `--gold-700` y `--blue-950`;
- ids de especialidad como `number` (en el test, `specialtyId: 1` en el body y en la query);
- `openFromSlot` limpia el paciente, y el motivo se vacía solo porque `bd-side-sheet` destruye el contenido al
  cerrarse;
- `slotAtOffset` descarta los días pasados y la comparación de horas usa `minutesOfDay`;
- el error de `GET /specialties` se muestra en el `bd-alert` del formulario;
- `appointment-patient-field` está extraído y la plantilla del formulario no pasa de 150 líneas.

Correcciones mínimas de Claude:
1. **`.input` en vez de `.form-control`.** La Revisión 1 pidió por error una clase nueva, pero `.input` (001) ya
   existía con los mismos estilos. Se borró `.form-control` de `styles.scss` y los 4 usos pasaron a `.input`.
2. **Selects:** cada `<option>` lleva `[selected]` comparando con `selectedSpecialtyId()` o con
   `selectedProfessionalId()`. Con solo `[value]` en el `<select>`, la elección automática se perdía cuando las
   opciones llegaban después del valor; pasaba con las especialidades, que se cargan de forma asíncrona.
3. **Resumen del paciente:** gana `role="group"`, porque un `aria-labelledby` en un `div` sin rol no se anuncia.

Se acepta como está: el input del combobox (002b) solo tiene `placeholder` como nombre accesible. Queda anotado para
cuando se toque `bd-combobox`.
