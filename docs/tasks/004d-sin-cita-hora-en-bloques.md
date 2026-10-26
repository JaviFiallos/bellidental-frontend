# 004d — Sin cita (walk-in): hora y duración en bloques de 15 min

## Objetivo
El formulario «Sin cita» solo elige paciente, especialidad y profesional; el backend pone la cita en el primer
hueco. Con el **backend 027** (G-15) recepción elige la **duración** y la **hora de hoy** exactamente como al agendar
(004c): `duration-stepper` + `slot-picker` con «Mañana · Tarde» y bloques de 15 min, a partir de la hora actual.

**Depende de:** backend 027 con commit (`POST /appointments/walk-in` acepta `startAt` y `endAt` opcionales).

## Archivos a tocar
```
src/app/features/appointments/
  models/appointment.models.ts                    (modif.) WalkInAppointmentRequest + startAt, endAt
  services/appointment-form.store.ts              (modif.) walk-in pide los bloques de hoy y envía las horas
  components/appointment-form/appointment-form.component.ts (modif.) slot-picker también en walk-in, sin fecha
  pages/reception-agenda/reception-agenda.page.spec.ts      (modif.) caso de walk-in (ver Tests)
```

## Criterios de aceptación
1. `WalkInAppointmentRequest` = `{ patientId, professionalId, specialtyId, startAt, endAt }` (el frontend
   siempre envía las dos horas).
2. **Store, modo walk-in:**
   - Se mantiene la elección automática del profesional con el hueco más cercano (`walkInTrigger$`), pero cada
     `GET /availability` por profesional va con `durationMinutes=15` (`SLOT_STEP_MINUTES`) y `date` = hoy.
   - La duración inicial es la de la especialidad (`roundUpToQuarter(defaultDurationMinutes)`), como al agendar.
   - Al quedar elegido un profesional (automático o a mano) se piden sus bloques de hoy por el
     `availabilityTrigger$` existente y se preselecciona el **primer inicio válido** donde cabe la duración
     (`validStarts`/`rangeFrom` de `domain/slot-ranges.ts`). El backend ya no devuelve horas pasadas.
   - Cambiar la duración re-filtra los inicios como en 004c; si el inicio elegido deja de ser válido, se toma el
     primero válido o ninguno.
   - `submit` en walk-in envía `startAt = selectedSlot.startAt` y `endAt = selectedRange().at(-1).endAt`.
   - 409 de cruce → mensaje y se vuelven a pedir los bloques (igual que en crear); 400 «La hora ya pasó.» → mensaje
     y recarga de bloques.
3. **Formulario:** en walk-in se muestra la sección «Hora» con `bd-slot-picker` (y su `duration-stepper`) **sin** el
   campo Fecha, los botones Hoy/Mañana ni «Siguiente día» (el walk-in es solo hoy: si no hay bloques, mensaje
   «Sin horas libres hoy para este profesional.» y se puede elegir otro profesional). Motivo sigue oculto.
   «Registrar llegada» deshabilitado hasta tener hora.
4. La etiqueta del profesional en el select sigue diciendo «(libre 10:15)» / «(sin hueco hoy)».
5. Sin cambios para crear ni reprogramar.

## Responsive
375, 768, 1366 y 1920 (recepción). En 375 el formulario a pantalla completa con las dos jornadas en segmented, una
a la vez, como al agendar.

## Tests requeridos
Ajustar el caso existente de `reception-agenda.page.spec.ts` «atención sin cita…» (sin casos nuevos):
- los `GET /availability` por profesional llevan `durationMinutes=15` y `date` de hoy;
- tras elegir el profesional más cercano → `GET /availability` de ese profesional → se ven los bloques y el primero
  queda marcado;
- elegir otro bloque → «Registrar llegada» → `POST /api/v1/appointments/walk-in` con
  `{ patientId, professionalId, specialtyId, startAt, endAt }` (horas del bloque elegido y la duración) → 201 → la
  tarjeta aparece en espera.

## Prueba manual
1. A las 10:07, «Sin cita» → paciente y especialidad de 30 min → queda elegido el profesional más cercano, se ven
   bloques desde 10:15, el primero marcado; resumen «10:15 – 10:45 · 30 min».
2. Cambiar a 1 h con + → los inicios donde no cabe desaparecen. Elegir uno de la tarde → Registrar → la tarjeta
   aparece «En espera» en esa hora.
3. Dos walk-in al mismo bloque desde dos pestañas → el segundo da el 409 y recarga los bloques.

## Resultado
- **Archivos modificados:**
  - `src/app/features/appointments/models/appointment.models.ts`: Se agregaron `startAt: string; endAt: string;` requeridos a `WalkInAppointmentRequest`.
  - `src/app/features/appointments/services/appointment-form.store.ts`:
    - En `walkInTrigger$`, cada consulta de disponibilidad por profesional solicita `durationMinutes = 15` (`SLOT_STEP_MINUTES`) y fecha de hoy.
    - Al quedar elegido un profesional (automático o manual), se dispara `availabilityTrigger$` y se preselecciona el primer inicio válido donde quepa la duración (`validStarts`/`rangeFrom`).
    - `setDuration` re-filtra los inicios en walk-in y conserva o reasigna el primero válido.
    - `submit` envía `{ patientId, professionalId, specialtyId, startAt, endAt }` en walk-in.
    - Manejo de error 409 y 400 (`La hora ya pasó`) recargando los bloques disponibles.
  - `src/app/features/appointments/components/appointment-form/appointment-form.component.ts`:
    - Se muestra la sección «Hora» con `bd-slot-picker` también en modo walk-in, manteniendo ocultos Fecha y Motivo.
    - En modo walk-in se oculta el botón de «Ver día siguiente» y se muestra aviso «Sin horas libres hoy para este profesional.» cuando no hay bloques.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.spec.ts`:
    - Ajustado el caso existente «atención sin cita…» verificando los parámetros `durationMinutes=15`, carga de bloques del profesional, preselección del primer bloque, selección de otro bloque y envío de `startAt` y `endAt` en `POST /api/v1/appointments/walk-in`.
- **Resultado del build:** OK (`Application bundle generation complete`).
- **Resultado de `ng test` (copia literal de la consola):**
```
 Test Files  16 passed (16)
      Tests  72 passed (72)
```
- **Responsive:** Evaluado en 375, 768, 1366 y 1920 px. En 375 px el panel de registro sin cita y el control segmentado de jornadas (Mañana/Tarde) se distribuyen verticalmente con objetivos táctiles de 44 px mínimos sin desbordes.
- **Prueba manual:**
  1. Iniciar sesión como recepcionista (`SECRETARIA`) e ingresar a la agenda del día.
  2. Clic en «Sin cita» en la barra superior.
  3. Seleccionar paciente y especialidad. Se asigna automáticamente el profesional con el hueco más próximo y se muestran los bloques de hoy con el primero seleccionado.
  4. Ajustar la duración con el stepper (+ / -) o seleccionar otro bloque libre y hacer clic en «Registrar llegada».
  5. Se registra la cita y la tarjeta pasa a estado «En espera».
- **Problemas encontrados y supuestos:** Ninguno.

## Revisión
Estado: APROBADO

- Cumple: `WalkInAppointmentRequest` con `startAt`/`endAt`; `/availability` por profesional con
  `durationMinutes=15` y hoy; se conserva el más cercano y se piden sus bloques; duración inicial de la especialidad
  redondeada; primer inicio válido preseleccionado y re-filtrado al cambiar la duración; body con `startAt` y
  `endAt = selectedRange().at(-1).endAt`; 409/400 → mensaje + recarga; «Registrar llegada» deshabilitado sin hora;
  sin Fecha/Hoy/Mañana ni Motivo. Test existente ajustado (sin casos nuevos ni skip).
- Correcciones menores de Claude:
  1. `::ng-deep .slot-picker__next-day-btn { display: none !important }` y el `@if/@else` que reemplazaba el
     slot-picker → input `singleDay` en `bd-slot-picker`: oculta «Ver día siguiente», muestra «Sin horas libres hoy
     para este profesional.» y, si la duración no cabe, «… no cabe en ningún hueco de hoy. Reduce la duración.»
     (el stepper sigue visible en el vacío).
  2. Store: rama walk-in duplicada en el `subscribe` de disponibilidad y en `setDuration` → un solo flujo con
     `firstValidStart()`; `submit` calcula `startAt`/`endAt` una vez para los tres modos.
  3. La recarga por 400 queda solo en walk-in (crear y reprogramar sin cambios); al cambiar de especialidad en
     walk-in se limpian los bloques del profesional anterior.
- Totales tras las correcciones: `ng build` OK (`Application bundle generation complete`);
  `ng test --watch=false`: `Test Files 16 passed (16)` · `Tests 72 passed (72)`.
