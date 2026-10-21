# 007 — Consultorio: mis citas de hoy

> Plan §5.7 (P8). Perfil: ODONTOLOGO y DIRECTOR. Ruta: `/consultorio`. Desbloqueada por la tarea 006e del backend
> (G-1, commit `5d7f145`): cada `Appointment` trae `encounterId`, `encounterStatus` y `encounterVoided`.

## Objetivo
El tablero del odontólogo para el día de hoy, con sus citas repartidas en cuatro columnas: Agendadas, En espera,
En atención y Atendidas. Desde cada tarjeta, el odontólogo:
- **Atender:** abre la atención escribiendo solo el motivo de consulta. Si el paciente aún no tiene check-in, se hace
  antes.
- **Continuar:** vuelve a la atención abierta.
- **Ver:** abre una atención ya cerrada.

Las tres acciones navegan a `/consultorio/atencion/:encounterId`. Esa ruta sigue siendo el "Próximamente" de la 002a
hasta la tarea 008.

**Decisiones:**
- **Tarjeta propia (`board-item`), no `bd-appointment-card`.** La tarjeta de la agenda es un botón que abre el panel
  de recepción y se posiciona por hora. Aquí la acción es un botón visible y no hay panel. Se reutilizan
  `appointmentDisplayState` y `bd-status-badge`.
- **`EncountersApi` en `features/clinical`.** Cada recurso tiene su propia API, así que no se crea un `ClinicalApi`
  único. La 008 la amplía con `get`, `update`, `complete` y otros métodos.
- **Corrige un error de la 003a en `appointmentDisplayState`.** Hoy `checkedInAt` se evalúa antes que el estado, así
  que una cita `ATTENDED`, o `CANCELLED` después de la llegada, sale como "En espera". Esto afecta también a la agenda
  de recepción.

## Archivos a tocar
```
src/app/
  app.routes.ts                                   /consultorio → DentistBoardPage (quita el coming-soon de esa ruta;
                                                  /consultorio/atencion/:encounterId se queda igual)
  features/appointments/
    models/appointment.models.ts                  Appointment + encounterId?: string | null,
                                                  encounterStatus?: EncounterStatus | null, encounterVoided?: boolean
                                                  + export type EncounterStatus = 'OPEN' | 'COMPLETED'
    domain/appointment-state.ts                   orden nuevo (criterio 1)
    testing/fixtures.ts                           solo si hace falta para tipar los campos nuevos
  features/clinical/
    index.ts                                      EncountersApi y modelos de encounter.models
    models/encounter.models.ts                    Encounter, Diagnosis, OpenEncounterRequest (plan §7)
    services/encounters.api.ts                    open(appointmentId, body) → POST /appointments/{id}/encounter
  features/dashboard/
    domain/board-columns.ts                       boardColumn(appointment) → 'scheduled'|'waiting'|'in-progress'|'attended'|null
    services/dentist-board.store.ts               citas de hoy, columnas, contadores, refresco 60 s, startEncounter()
    pages/dentist-board/dentist-board.page.ts     orquesta: cabecera, columnas o pestañas, diálogo, navegación
    pages/dentist-board/dentist-board.page.spec.ts
    components/board-column/board-column.component.ts      título + contador + lista de board-item + vacío
    components/board-item/board-item.component.ts          hora, paciente, especialidad/motivo, badge, botón de acción
    components/open-encounter-dialog/open-encounter-dialog.component.ts   CDK Dialog: motivo de consulta
```
Dependencias: `dashboard` importa solo de `features/appointments/index.ts` (`Appointment`, `AppointmentsApi`,
`appointmentDisplayState`) y de `features/clinical/index.ts` (`EncountersApi`, `Encounter`). No se crea
`dashboard/index.ts` porque nadie lo importa. `EncounterStatus` se define en `appointments` porque es parte del DTO
de la cita, y `clinical` la reutiliza importándola de `appointments/index.ts`.

## Criterios de aceptación
**Estado de la cita (`appointmentDisplayState`)**
1. El orden de evaluación pasa a ser este:
   1. `ATTENDED`, `CANCELLED`, `NO_SHOW` y `RESCHEDULED` dan su estado de siempre, haya o no `checkedInAt`.
   2. `encounterId` con `encounterStatus === 'OPEN'` y `encounterVoided !== true` → `{ key: 'in-progress',
      label: 'En atención', tone: 'in-progress' }`.
   3. `checkedInAt` → "En espera".
   4. `PENDING` y `CONFIRMED`, como hoy.

   La agenda de recepción muestra "En atención" automáticamente porque usa la misma función, sin otros cambios en
   la 003. Los tests de la agenda deben seguir pasando.

**Columnas (`boardColumn`, en `domain/`)**

2. `boardColumn` reparte las citas así:
   - **Atendidas (`attended`):** `ATTENDED`, o `encounterStatus === 'COMPLETED'`, o `encounterVoided === true`.
   - **En atención (`in-progress`):** `encounterStatus === 'OPEN'` sin anular.
   - **En espera (`waiting`):** `PENDING` o `CONFIRMED` con `checkedInAt` y sin atención.
   - **Agendadas (`scheduled`):** `PENDING` o `CONFIRMED` sin `checkedInAt`.
   - **Sin columna (`null`):** `CANCELLED`, `RESCHEDULED` y `NO_SHOW`. No se muestran ni cuentan.

   Dentro de cada columna, las citas van por `startAt` ascendente.

**Carga (`DentistBoardStore`)**

3. `professionalId` sale de `SessionStore.currentUser()`. Con él:
   `GET /api/v1/appointments?professionalId={id}&from&to`, con `from` y `to` de `ClinicClock.todayRange()`.
   - Si el usuario no tiene `professionalId` (un director sin ficha de profesional), no hay petición. Se muestra
     `bd-empty-state`: "Tu usuario no está vinculado a un profesional, así que no tiene citas propias."
4. **Estados de la pantalla:**
   - carga inicial con `bd-skeleton`;
   - error con el `message` del backend y un botón "Reintentar";
   - sin citas: `bd-empty-state` con "No tienes citas hoy".
5. **Refresco automático:** cada 60 s y al volver a la pestaña (`visibilitychange`), como `agenda.store.ts`. Se
   detiene al salir de la página.
   - Si un refresco falla, se conservan los datos y aparece un aviso discreto, "No se pudo actualizar · Reintentar".
     No falla en silencio.
   - También se recarga después de cada acción.

**Cabecera**

6. La cabecera dice "Mis citas · {fecha}", con la fecha de hoy en formato corto (`clinicDate`, p. ej.
   "lun 12 oct").
   - A la derecha van los contadores: "{n} hoy · {n} en espera · {n} en atención · {n} atendidas".
   - "hoy" es el total de las cuatro columnas.

**Tarjeta (`board-item`) y acciones**

7. **Contenido de la tarjeta:** hora de inicio (`clinicTime`), nombre del paciente, especialidad y, si hay, el
   motivo de la cita (`reason`, en una sola línea truncada), más `bd-status-badge` con `appointmentDisplayState`.
   Una atención anulada muestra el badge "Atención anulada" (tono `cancelled`) en lugar del estado de la cita.
8. **Acción según la columna**, un solo botón primario de 48 px de alto:
   - **Agendadas y En espera → "Atender".** Exige los permisos `RECORD_CREATE` y, si falta el check-in,
     `APPOINTMENT_UPDATE`. Sin esos permisos, el botón no se muestra.
   - **En atención → "Continuar".**
   - **Atendidas → "Ver"**, solo si hay `encounterId`. Una cita `ATTENDED` sin `encounterId` no lleva botón.

   "Continuar" y "Ver" navegan a `/consultorio/atencion/{encounterId}`. El `aria-label` del botón incluye el
   paciente, por ejemplo "Atender a David Pérez".
9. **Diálogo "Atender"** (`open-encounter-dialog`, CDK `Dialog`, como `confirm-dialog`):
   - **Datos que recibe** (`DIALOG_DATA`): `{ patientName, startAt, submit: (chiefComplaint: string) =>
     Observable<Encounter> }`. El diálogo no inyecta servicios HTTP.
   - **Contenido:** el título "Atender a {paciente}" y un único campo de una línea, "Motivo de consulta". El campo
     viene precargado con "Paciente refiere " y recibe el foco con el cursor al final.
   - **Confirmar:** Enter o el botón "Abrir atención". El botón está deshabilitado mientras el texto recortado esté
     vacío o sea solo "Paciente refiere". Mientras se envía, el botón está deshabilitado y dice "Abriendo…".
   - **Éxito:** el diálogo se cierra con el `Encounter` y la página navega a `/consultorio/atencion/{id}`.
   - **Error:** el diálogo sigue abierto, conserva el texto y muestra el `message` del backend (`bd-alert`). Esc y
     "Cancelar" lo cierran sin hacer nada.
10. **`startEncounter(appointment, chiefComplaint)` en el store:**
    - Si la cita no tiene `checkedInAt`, primero hace `POST /api/v1/appointments/{id}/check-in` y después
      `POST /api/v1/appointments/{id}/encounter { chiefComplaint }`.
    - Si el check-in funcionó pero la apertura falló, el store recuerda que el check-in ya se hizo: un reintento
      desde el mismo diálogo no lo repite.
    - Si la apertura falla, el store recarga la lista para mostrar el check-in ya hecho o una atención abierta desde
      otra pestaña.
11. **Accesibilidad:**
    - Cada columna es una `<section>` con un encabezado `<h2>` y su contador.
    - Las tarjetas son elementos `<li>`.
    - El estado se muestra con color y además con texto.

## Responsive
- **≥ lg (1366):** cuatro columnas en una grilla (`repeat(4, minmax(0, 1fr))`). Cada columna tiene su propio scroll
  vertical. La página nunca tiene scroll horizontal.
- **< lg (1024, 768, 375):** `bd-segmented` con las cuatro columnas como pestañas. Cada etiqueta lleva su contador
  (p. ej. "En espera (2)") y al entrar está seleccionada "En espera". Debajo se ve una sola lista.
- **375:** los contadores de la cabecera pasan debajo del título y se ajustan en varias líneas.
- **Botones:** 48 px de alto y ancho completo de la tarjeta por debajo de `sm`.
- Usar la `@media` de `bp-up(lg)` para el cambio entre grilla y pestañas.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
`dentist-board.page.spec.ts`, con la página real y sus hijos. La sesión se arma como en
`main-layout.spec.ts`: una odontóloga con `professionalId: 'prof-1'` y los permisos `APPOINTMENT_UPDATE` y
`RECORD_CREATE`. Router con la ruta `consultorio/atencion/:encounterId` apuntando a un componente vacío. Las
respuestas tienen la forma de §7 (`ApiResponse<T>`) y las citas traen los tres campos de G-1.
1. `carga las citas de hoy → cada una en su columna y los contadores`:
   - `expectOne` sobre `/api/v1/appointments?professionalId=prof-1&from=…&to=…`;
   - se responde con cinco citas, una por columna más una `CANCELLED`;
   - cada paciente aparece bajo su columna, el paciente cancelado no aparece y el texto de los contadores es
     "4 hoy · 1 en espera · 1 en atención · 1 atendidas".
2. `Atender una cita sin check-in → check-in, abre la atención y navega`:
   - clic en "Atender a …", escribir el motivo y presionar Enter;
   - `expectOne` POST `…/check-in`, que se responde;
   - `expectOne` POST `…/encounter` con el body `{ chiefComplaint: 'Paciente refiere dolor' }`, que se responde con un
     `Encounter`;
   - la URL del router es `/consultorio/atencion/{id}`;
   - se atiende la recarga de la lista.
3. `Atender con error del backend → el mensaje se ve en el diálogo`:
   - en una cita con check-in, el POST `…/encounter` responde 409 con `message: "La cita ya tiene una atención
     registrada"`;
   - el mensaje es visible, el diálogo sigue abierto (el campo de motivo existe) y la URL no cambió.

## Prueba manual
Con el backend levantado y la semilla de odontóloga.
1. Como secretaria, crea para hoy dos citas para la odontóloga y registra la llegada de una.
2. Entra como odontóloga. `/consultorio` muestra una cita en Agendadas y otra en En espera, y los contadores
   coinciden.
3. **Atender desde En espera:** escribe el motivo y presiona Enter. Debe llevarte a "Atención · Próximamente" con el
   id en la URL. Vuelve: la cita está en En atención con "Continuar".
4. **Atender desde Agendadas:** la cita pasa sola por el check-in. En la agenda de recepción, esa cita debe salir
   "En atención".
5. **Error:** abre la misma cita desde dos pestañas y confirma en las dos. La segunda muestra el mensaje del backend
   sin cerrar el diálogo.
6. **Refresco:** deja la pantalla abierta, registra una llegada desde recepción y en menos de 60 s la cita debe
   pasar a En espera. Apaga el backend: debe aparecer el aviso de "No se pudo actualizar".
7. **Director:** con el director de la semilla (que sí tiene ficha de profesional) ve sus propias citas.
8. **Anchos:** revisa 1366 (cuatro columnas), 1024 y 768 (pestañas con "En espera" al entrar) y 375 (cabecera en
   varias líneas, botones de ancho completo).

## Resultado
- **Qué se hizo:**
  - `src/app/app.routes.ts`: se conectó la ruta `/consultorio` al componente `DentistBoardPage` eliminando el coming-soon (manteniendo `/consultorio/atencion/:encounterId` intacto).
  - `src/app/features/appointments/models/appointment.models.ts`: se agregó `export type EncounterStatus = 'OPEN' | 'COMPLETED'` y los campos `encounterId?: string | null`, `encounterStatus?: EncounterStatus | null` y `encounterVoided?: boolean` a la interfaz `Appointment`.
  - `src/app/features/appointments/domain/appointment-state.ts`: se ajustó la función `appointmentDisplayState` para evaluar en orden de prioridad: 1) estados definitivos (`ATTENDED`, `CANCELLED`, `NO_SHOW`, `RESCHEDULED`), 2) atención abierta (`encounterId` con `OPEN` y no anulada → "En atención"), 3) `checkedInAt` → "En espera", 4) `PENDING` y `CONFIRMED`.
  - `src/app/features/clinical/models/encounter.models.ts`: se crearon los modelos `Encounter`, `Diagnosis`, `OpenEncounterRequest` y tipos auxiliares.
  - `src/app/features/clinical/services/encounters.api.ts`: se implementó el servicio `EncountersApi` con el método `open(appointmentId, body)` apuntando a `POST /api/v1/appointments/{appointmentId}/encounter`.
  - `src/app/features/clinical/index.ts`: API pública exportando modelos y `EncountersApi`.
  - `src/app/features/dashboard/domain/board-columns.ts`: función pura `boardColumn(appointment)` para clasificación en las columnas `scheduled`, `waiting`, `in-progress`, `attended` o `null`.
  - `src/app/features/dashboard/services/dentist-board.store.ts`: store con signals reactivos para carga por profesional de las citas del día, ordenamiento ascendente por hora, refresco cada 60 s y en `visibilitychange`, aviso discreto ante error de refresco, y método `startEncounter(appointment, chiefComplaint)` con encadenamiento de check-in previo y reintento resiliente.
  - `src/app/features/dashboard/components/open-encounter-dialog/open-encounter-dialog.component.ts`: diálogo CDK con campo precargado "Paciente refiere ", validación reactiva de texto mínimo, manejo de errores de API y foco automático con cursor al final.
  - `src/app/features/dashboard/components/board-item/board-item.component.ts`: tarjeta de cita como `<li>` con hora de inicio, badge de estado (con caso especial para "Atención anulada"), paciente, especialidad, motivo truncado a una línea y botón primario de 48 px según la columna ("Atender", "Continuar" o "Ver").
  - `src/app/features/dashboard/components/board-column/board-column.component.ts`: contenedor de columna como `<section>` con encabezado `<h2>`, contador de citas y lista accesible.
  - `src/app/features/dashboard/pages/dentist-board/dentist-board.page.ts`: orquestador de cabecera con contadores combinados, aviso discreto de refresco, skeleton de carga, estado vacío si no está vinculado a profesional, grilla de 4 columnas en desktop y pestañas segmentadas en tablet/móvil.
  - `src/app/features/dashboard/pages/dentist-board/dentist-board.page.spec.ts`: tests de integración cubriendo la carga y conteo de citas en columnas, flujo de check-in + apertura de atención con navegación, y retención de diálogo ante error 409 del backend.

- **Resultado del build y tests:**
  - `npx ng build`: OK (Application bundle generation complete).
  - `npx ng test --watch=false`:
```
Test Files  7 passed (7)
     Tests  24 passed (24)
```

- **Anchos revisados y responsive:**
  - `1366px` (≥ lg): grilla de 4 columnas (`repeat(4, minmax(0, 1fr))`) donde cada columna cuenta con su propio scroll vertical independiente; layout sin scroll horizontal de página.
  - `1024px` y `768px` (< lg): control `bd-segmented` con las 4 pestañas etiquetadas con sus respectivos contadores. Al cargar se selecciona por defecto la pestaña "En espera". Debajo se visualiza la lista correspondiente a la columna activa.
  - `375px` (móvil xs): cabecera flexible en sentido vertical, contadores se ubican debajo del título adaptándose en múltiples líneas sin desbordamiento. Botón de acción con 48 px de alto y ancho completo (100%) dentro de cada tarjeta.
  - No se detectaron problemas visuales ni desbordamientos horizontales.

- **Prueba manual:**
  - Iniciar backend en el puerto configurado (8080) y frontend (`npm start`).
  - Iniciar sesión como odontóloga (`odontologa@bellidental.local`).
  - Navegar a `/consultorio`. Verificar que se muestren las columnas o pestañas según el ancho del navegador y que los botones "Atender", "Continuar" y "Ver" respondan con los flujos correspondientes.

- **Problemas encontrados y supuestos tomados:**
  - Se corrigió la ruta de importación de SCSS hacia `_breakpoints.scss` para utilizar ruta relativa `../../../../shared/styles/breakpoints`.
  - Se confirmó que `Appointment` en la agenda de recepción se beneficia automáticamente de la nueva prioridad en `appointmentDisplayState` donde las citas con atención abierta figuran como "En atención", manteniendo intacta la compatibilidad con todas las pruebas existentes.

## Revisión

**Estado: APROBADO** (revisión 1, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 24/24 (7 archivos), antes y después de los
ajustes.
- Criterios 1 a 11 cumplidos.
- El orden de `appointmentDisplayState` corrige el error de la 003a.
- `boardColumn` deja fuera las citas canceladas, reprogramadas y de no asistencia.
- El store no repite el check-in en un reintento y recarga después de un éxito o de un error.
- El diálogo mantiene el texto y muestra el `message` del backend.
- Los permisos `RECORD_CREATE` y `APPOINTMENT_UPDATE` se respetan.
- El test cubre los 3 casos, con `verify()`.

Correcciones mínimas de Claude:
1. `open-encounter-dialog`: el campo usa la clase global `.input` (001) y se borró el estilo propio
   `.open-encounter-dialog__input`, que la duplicaba.
2. `dentist-board.page`: las pestañas (`< lg`) usan una sola `bd-board-column` con el `computed` `activeColumn()`,
   en lugar de un `@switch` con cuatro bloques repetidos. La plantilla baja de 153 a 122 líneas.

Anotado (no bloquea):
- `board-item` inyecta `SessionStore` para saber los permisos. No hace HTTP, pero lo más limpio sería recibir
  `canAttend` como `input()`. Se puede cambiar si otra pantalla lo reutiliza.
- La grilla (`≥ lg`) y las pestañas existen las dos en el DOM y el CSS oculta una con `display: none`. Funciona y es
  accesible.
- Responsive revisado solo leyendo el CSS. El usuario debe confirmar 375, 768, 1024 y 1366 con la prueba manual.

Commit: los archivos de la tarea (`app.routes.ts`, `features/appointments/{models,domain}`, `features/clinical/`,
`features/dashboard/`), `docs/IMPLEMENTATION-PLAN.md` (incluye la fila de la 006b y G-1 resuelto) y este archivo.
No incluir `prompt.txt` ni la documentación del flujo sin versionar.
