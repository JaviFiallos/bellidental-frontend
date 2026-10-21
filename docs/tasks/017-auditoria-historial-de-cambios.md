# 017 — Auditoría: "Historial de cambios" en contexto (y retiro de /direccion/auditoria)

> Plan §5.17 (P17, RNF02). Backend 013 (`64b68fd`). Requiere la 016a (crea `features/management`) y la 015a
> (helper `openAs` en el spec de la ficha). Perfil: DIRECTOR.

## Objetivo
El backend **no** tiene lista de auditoría (G-7 sin resolver): solo el historial de **un registro** por entidad e
id. Por eso (F-15) no hay pantalla `/direccion/auditoria`; en su lugar, un **diálogo reutilizable "Historial de
cambios"** que el director abre desde el registro que está mirando:
- **Ficha del paciente** (`/pacientes/:id`, que el director hoy ve con la identificación) → entidad `patients`.
- **Cabecera de la atención** (`/consultorio/atencion/:encounterId`) → entidad `encounters`.

Además se quitan la ruta provisional `/direccion/auditoria` y el ítem "Auditoría" del menú.

### Contrato (backend 013)
- **`GET /api/v1/audit/{entity}/{id}`** (`hasRole('ADMIN')`; otros perfiles 403) →
  `ApiResponse<AuditEntry[]>`, de la revisión **más antigua a la más reciente**. `entity` ∈ `clinical-records`,
  `medical-history-entries`, `encounters`, `encounter-diagnoses`, `dental-findings`, `performed-treatments`,
  `prescriptions`, `prescription-items`, `payments`, `appointments`, `patients` (otra → 404). Registro creado antes
  de activar la auditoría o sin cambios → `[]`.
  ```json
  { "success": true, "message": "OK", "data": [
      { "revision": 10, "at": "2026-10-02T14:05:00Z", "userId": "33333333-3333-3333-3333-333333333333",
        "username": "secretaria", "type": "ADD",
        "changes": [
          { "field": "active", "oldValue": null, "newValue": "true" },
          { "field": "firstName", "oldValue": null, "newValue": "David" },
          { "field": "id", "oldValue": null, "newValue": "pat-1" },
          { "field": "phoneE164", "oldValue": null, "newValue": "593987654321" } ] },
      { "revision": 15, "at": "2026-10-09T15:42:10Z", "userId": "33333333-3333-3333-3333-333333333333",
        "username": "secretaria", "type": "MOD",
        "changes": [
          { "field": "phoneE164", "oldValue": "593987654321", "newValue": "593991112233" },
          { "field": "updatedAt", "oldValue": "2026-10-02T09:05-05:00", "newValue": "2026-10-09T10:42:10-05:00" } ] } ] }
  ```
  - `at` es un instante UTC (`…Z`): se muestra en America/Guayaquil.
  - `field` es el **nombre del campo Java** de la entidad; valores siempre texto (`String.valueOf`): fechas
    `OffsetDateTime` (a veces sin segundos: `2026-10-02T09:05-05:00`), `LocalDate` (`2007-03-02`), booleanos
    `"true"/"false"`, enums (`COMPLETED`, `EFECTIVO`…), arrays `"[1, 3]"`, relaciones como su id.
  - `username` `null` = proceso sin usuario (tareas programadas); `"bot_whatsapp"` = el bot.
  - `type`: `ADD` (creó), `MOD` (modificó), `DEL` (eliminó; no debería pasar, se anula).

### Comportamiento
1. **`AuditHistoryDialogService.open({ entity, id, title })`** (en `management/services`, `providedIn: 'root'`,
   exportado en `management/index.ts`): abre con `Dialog` de `@angular/cdk/dialog` el componente
   `AuditHistoryDialogComponent` pasando por `DIALOG_DATA` `{ title, entries$ }`, donde
   `entries$ = AuditApi.history(entity, id)` (patrón de `OpenEncounterDialogData` en
   `features/dashboard/components/open-encounter-dialog`). Opciones: `ariaLabelledBy: 'audit-history-title'`,
   `hasBackdrop: true`, `backdropClass: 'cdk-overlay-dark-backdrop'`, `width: 'min(40rem, 100vw)'`,
   `maxHeight: '90vh'`.
2. **Diálogo** (`role="dialog"` lo pone el CDK; contenido con clase raíz `.audit-history`):
   - Título `<h2 id="audit-history-title">` = `title` (p. ej. "Historial de cambios · David Pérez") y botón
     "Cerrar" (`btn btn-ghost`, también Esc).
   - Carga → `bd-skeleton` (3 bloques); error → `bd-alert` con el `message` (403 → "No tienes permiso para esta
     acción."); vacío → `bd-empty-state` "Sin cambios registrados" / "Los registros anteriores a la auditoría no
     tienen historial.".
   - Lista de revisiones de la **más reciente a la más antigua** (`<ol>`). Cada una:
     encabezado "**Modificó** · secretaria · 9 de octubre de 2026 · 10:42" (`clinicDate:'long'` y `clinicTime` de
     `shared/pipes`; acción con `bd-status-badge`: Creó → tono
     `scheduled`, Modificó → `waiting`, Anuló → `cancelled`, Eliminó → `no-show`; la etiqueta siempre visible).
   - **MOD / Anuló:** `<dl>` con una fila por cambio visible: etiqueta en español + "antes → después"
     ("0987654321 → 0991112233"; `null` → "—"). Si todos los cambios estaban ocultos: "Sin cambios visibles".
   - **ADD:** "Creó el registro" + `<details><summary>Ver datos iniciales (n)</summary>` con "campo: valor" (solo
     `newValue`).
3. **Reglas de presentación** en `management/domain/audit-display.ts` (puro, sin Angular):
   - `HIDDEN_AUDIT_FIELDS`: `id`, `dentalFindingId`, `createdAt`, `updatedAt`, `deletedAt`, `googleEventId` y las
     referencias internas `patientId`, `patient`, `encounterId`, `appointmentId`, `professionalId`, `specialtyId`,
     `treatmentId`, `icd10Id`, `encounterDiagnosisId`, `dentalConditionId`, `condition`, `clinicalRecord`,
     `prescriptionId`, `medicationId`, `medicationPresetId`, `openedBy`, `receivedBy`, `createdBy`,
     `rescheduledFromId` (son UUID o ids que el director no puede leer).
   - `AUDIT_FIELD_LABELS` (un solo mapa; si falta, se muestra el nombre del campo tal cual):
     `chiefComplaint` Motivo de consulta · `currentIllness` Enfermedad actual · `bpSystolic` Presión sistólica ·
     `bpDiastolic` Presión diastólica · `heartRate` Frecuencia cardiaca · `temperature` Temperatura ·
     `respiratoryRate` Frecuencia respiratoria · `stomatognathicExam` Examen estomatognático ·
     `stomatognathicRegions` Regiones del examen · `periodontalDisease` Enfermedad periodontal · `malocclusion`
     Maloclusión · `fluorosis` Fluorosis · `diagnosticExams` Exámenes del plan · `planDescription` Descripción del
     plan · `status` Estado · `startAt` Inicio · `endAt` Fin · `closedAt` Cerrada el · `voidedAt` Anulado el ·
     `voidReason` Motivo de anulación · `documentType` Tipo de documento · `documentNumber` Número de documento ·
     `firstName` Nombres · `lastName` Apellidos · `birthDate` Fecha de nacimiento · `sex` Sexo · `bloodType` Tipo de
     sangre · `phoneE164` Teléfono · `email` Correo · `adminNotes` Observaciones · `emergencyContactName` Contacto
     de emergencia · `emergencyContactPhoneE164` Teléfono de emergencia · `active` Activo · `amount` Monto ·
     `method` Método de pago · `receiptNumber` N.º de comprobante · `paidAt` Fecha de pago · `source` Origen ·
     `reason` Motivo · `notes` Notas · `checkedInAt` Llegada · `certainty` Certeza · `toothCode` Pieza ·
     `endToothCode` Pieza final · `surfaceCode` Cara · `grade` Grado · `quantity` Cantidad · `price` Precio ·
     `prescribedAt` Emitida el · `generalInstructions` Indicaciones generales · `dose` Dosis · `frequency`
     Frecuencia · `duration` Duración · `instructions` Indicaciones · `recordNumber` N.º de historia clínica ·
     `openedAt` Abierta el · `noKnownHistory` No refiere antecedentes · `currentMedication` Medicación actual ·
     `scope` Tipo · `relative` Pariente · `description` Descripción · `recordedAt` Registrado el.
   - `formatAuditValue(field, value)`: `null`/`""` → "—"; `"true"`/`"false"` → "Sí"/"No"; campos `phoneE164` y
     `emergencyContactPhoneE164` → `toEcuadorLocal()` de `shared/utils/e164.ts`; texto que empieza con
     `YYYY-MM-DDT` y `new Date(valor)` válido → "9/10/2026, 10:42" con `Intl.DateTimeFormat('es-EC', { timeZone:
     'America/Guayaquil', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
     hour12: false })` (formateador creado una sola vez); `YYYY-MM-DD` solo → "2/3/2007" (sin zona: armar
     el texto a mano, no `new Date`); enums con `AUDIT_ENUM_LABELS` (`OPEN` Abierta, `COMPLETED` Completada,
     `PENDING` Pendiente, `CONFIRMED` Confirmada, `ATTENDED` Atendida, `CANCELLED` Cancelada, `NO_SHOW` No asistió,
     `RESCHEDULED` Reprogramada, `DONE` Realizado, `DRAFT` Borrador, `ISSUED` Emitida, `PRESUMPTIVE` Presuntivo,
     `DEFINITIVE` Definitivo, `EFECTIVO` Efectivo, `TRANSFERENCIA` Transferencia, `TARJETA` Tarjeta, `RECEPTION`
     Recepción, `PROFESSIONAL` Profesional, `BOT` Bot, `WALK_IN` Sin cita, `PERSONAL` Personal, `FAMILY` Familiar);
     el resto tal cual.
   - `auditActionLabel(entry)`: `ADD` → "Creó"; `DEL` → "Eliminó"; `MOD` con un cambio `voidedAt` de `null` a valor
     → "Anuló"; si no → "Modificó".
   - `auditUserLabel(username)`: `null` → "Sistema"; `"bot_whatsapp"` → "Bot de WhatsApp"; si no, el `username`.
4. **Entradas** (solo `SessionStore.profile() === 'DIRECTOR'`; no hay permiso de auditoría en `/auth/me`):
   - `PatientReceptionPage`: botón **"Historial de cambios"** (`btn btn-outline`, ícono `History`, 44 px) en
     `.patient-reception__actions`, junto a "Formulario 033" → `open({ entity: 'patients', id: patient.id, title:
     'Historial de cambios · ' + patient.fullName })`.
   - `PatientClinicalHeaderComponent` (`features/clinical/components/patient-clinical-header`): input nuevo
     `canViewChanges = input<boolean>(false)` y output `viewChanges = output<void>()`; con `true`, botón
     "Historial de cambios" después del enlace "Formulario 033" (mismo estilo que ese enlace). `EncounterPage`
     (`features/clinical/pages/encounter/encounter.page.ts`, ya inyecta `SessionStore`) pasa
     `[canViewChanges]="isDirector()"` y abre `{ entity: 'encounters', id: <encounterId de la ruta>, title:
     'Historial de cambios de la atención' }`.
5. **Retiro:** en `app.routes.ts` borrar la entrada `direccion/auditoria` (la de `ComingSoonPage`); en
   `layout/nav-items.ts` quitar `{ label: 'Auditoría', … }` y el import `ShieldCheck`. Un enlace viejo a
   `/direccion/auditoria` cae en `**` → inicio.

### Estructura
```
features/management/
  index.ts                                   (nuevo) export AuditHistoryDialogService y tipos de audit.models
  models/audit.models.ts                     AuditEntityName, AuditRevisionType, AuditFieldChange, AuditEntry,
                                             AuditHistoryRequest { entity, id, title }
  services/audit.api.ts                      history(entity, id) → api.get<AuditEntry[]>(`/api/v1/audit/${entity}/${id}`)
  services/audit-history-dialog.service.ts   open(request)
  domain/audit-display.ts                    reglas del punto 3
  components/audit-history-dialog/audit-history-dialog.component.ts   (contenido del diálogo; recibe datos por DIALOG_DATA)
```
`patients` y `clinical` importan **solo** de `../../../management` (su `index.ts`). `management` no importa de
`patients` ni de `clinical`.

## Decisiones a revisar
1. **Sin página `/direccion/auditoria`**: con solo "tipo + id", el director tendría que conocer UUID que la UI no
   muestra; no le sirve. Si el backend agrega una lista (G-7, p. ej. `GET /audit?patientId=&from=&to=`), vuelve la
   página (017b). Inconveniente: no hay vista "todo lo que hizo X usuario hoy".
2. **Entradas solo en paciente y atención.** Los cambios de diagnósticos, hallazgos, tratamientos y recetas son
   registros aparte (`encounter-diagnoses`, `dental-findings`, …): **no** salen en el historial de la atención (el
   backend no los agrupa). Agregar un botón por ítem recargaría la atención; se deja fuera. Pagos (`payments`):
   cuando el director vea la cuenta (014). Citas (`appointments`): el director no ve la agenda.
3. **Campos internos ocultos** (ids, `createdAt/updatedAt`): `updatedAt` cambia en cada edición y solo mete ruido.
4. **Diálogo CDK** (no `bd-side-sheet`): se abre desde dos features con una sola línea y sin tocar sus plantillas
   de panel.
5. **Perfil y no permiso**: `/auth/me` no tiene un permiso de auditoría (el backend usa `hasRole('ADMIN')`); se usa
   `profile() === 'DIRECTOR'`, como permite `architecture/SKILL.md`.
6. Se usa el nombre del feature **`management`** (lista de `architecture/SKILL.md`: "estadísticas y auditoría del
   director") en vez de crear un feature `audit` nuevo.

## Archivos a tocar
```
src/app/
├── app.routes.ts                                       (quitar direccion/auditoria)
├── layout/nav-items.ts                                 (quitar "Auditoría" e import ShieldCheck)
├── features/management/
│   ├── index.ts                                        (nuevo)
│   ├── models/audit.models.ts                          (nuevo)
│   ├── services/audit.api.ts                           (nuevo)
│   ├── services/audit-history-dialog.service.ts        (nuevo)
│   ├── domain/audit-display.ts                         (nuevo)
│   └── components/audit-history-dialog/audit-history-dialog.component.ts   (nuevo)
├── features/patients/pages/patient-reception/
│   ├── patient-reception.page.ts                       (botón para DIRECTOR)
│   └── patient-reception.page.spec.ts                  (+2 casos como director)
└── features/clinical/
    ├── components/patient-clinical-header/patient-clinical-header.component.ts   (input/output nuevos)
    └── pages/encounter/encounter.page.ts               (isDirector + abrir el diálogo)
```
Compartidos (rutas reales): `shared/components/alert/alert.component`, `empty-state/empty-state.component`,
`skeleton/skeleton.component`, `status-badge/status-badge.component`, `icon/icon.component`; ícono `History` de
`lucide-angular`.

## Criterios de aceptación
- [ ] Director: "Historial de cambios" en la ficha del paciente y en la cabecera de la atención; secretaria y
      odontólogo no lo ven.
- [ ] El diálogo pide `GET /api/v1/audit/{entity}/{id}` y muestra revisiones de la más reciente a la más antigua,
      con acción (color + texto), usuario legible y fecha/hora de Guayaquil.
- [ ] Cambios como "Teléfono: 0987654321 → 0991112233"; sin `id`, `updatedAt` ni UUID a la vista; "Anuló" cuando
      `voidedAt` pasa de vacío a fecha.
- [ ] Carga, vacío y error (403 → "No tienes permiso para esta acción.") visibles; Esc y "Cerrar" cierran; el foco
      vuelve al botón que lo abrió (CDK).
- [ ] `/direccion/auditoria` y el ítem "Auditoría" ya no existen; "Estadísticas" sigue en el menú.
- [ ] `patients` y `clinical` solo importan de `management/index.ts`; solo tokens; sin `any`; OnPush.
- [ ] `npx ng build` y `npx ng test --watch=false` en verde.

## Responsive
Revisar en **375, 768, 1024 y 1366**. El diálogo ocupa `min(40rem, 100vw)` con scroll interno (`max-height: 90vh`,
el cuerpo con `overflow-y: auto`); en 375, "antes → después" se parte en dos líneas (antes arriba, después abajo
con la flecha). En la cabecera de la atención el botón nuevo se envuelve con los demás sin scroll horizontal.
Botones ≥ 44 px.

## Tests requeridos
Se amplía `features/patients/pages/patient-reception/patient-reception.page.spec.ts` (+**2 casos**) usando el
helper `openAs()` de la 015a con un director:
`{ userId: '11111111-1111-1111-1111-111111111111', email: 'director@bellidental.local', roles: ['ADMIN','ODONTOLOGO'],
permissions: ['PATIENT_READ','RECORD_READ','BILLING_READ'], professionalId: '55555555-5555-5555-5555-555555555555' }`.
Como director la página solo pide `GET /api/v1/patients/pat-1` (ni citas ni cuenta). El diálogo vive en el overlay
del CDK: buscar en `document` (`document.querySelector('.audit-history')`) y cerrar los diálogos en `afterEach`
con `TestBed.inject(Dialog).closeAll()` si quedan abiertos.
1. `'director abre Historial de cambios → GET /audit/patients/{id} → revisiones de la más reciente a la más antigua'`:
   clic "Historial de cambios" → `expectOne('/api/v1/audit/patients/pat-1')` (GET) → responder el JSON del
   contrato → en `.audit-history` el primer elemento de la lista contiene "Modificó" y "Teléfono"; el texto incluye
   "Creó" y "secretaria"; no aparece "updatedAt".
2. `'historial sin permiso → 403 → mensaje en el diálogo'`: clic → responder 403
   `{ success: false, message: 'No tiene permisos para realizar esta acción.', data: null }` → `.audit-history`
   contiene "No tienes permiso para esta acción.".

## Prueba manual
1. Director → buscar un paciente → "Historial de cambios" → ver su alta y las ediciones de la secretaria (cambiar el
   teléfono antes como secretaria).
2. Director → una atención propia → cambiar el motivo → "Historial de cambios" → "Motivo de consulta: antes → después".
3. Paciente creado antes de activar la auditoría → "Sin cambios registrados".
4. Secretaria y odontólogo: no ven el botón. El menú del director ya no tiene "Auditoría".
5. Anchos 375 y 1366 (diálogo con scroll interno).

## Resultado
**Archivos creados** (`features/management`): `index.ts`, `models/audit.models.ts`, `services/audit.api.ts`,
`services/audit-history-dialog.service.ts`, `domain/audit-display.ts`,
`components/audit-history-dialog/audit-history-dialog.component.ts`.

**Archivos modificados:** `app.routes.ts` (quitada la ruta `direccion/auditoria`), `layout/nav-items.ts` (quitado
"Auditoría" y el import `ShieldCheck`), `patients/pages/patient-reception/patient-reception.page.ts` (botón
"Historial de cambios" solo DIRECTOR, junto a "Formulario 033"), `patient-reception.page.spec.ts` (+2 casos),
`clinical/components/patient-clinical-header/...component.ts` (inputs/outputs `canViewChanges`/`viewChanges`),
`clinical/pages/encounter/encounter.page.ts` (`isDirector`, `onOpenChangesHistory`).

**Build:** `npx ng build` OK (bundle generado). Aviso no bloqueante: `sidebar.component.scss` supera el presupuesto
de 4 kB en 22 bytes (archivo no tocado en esta tarea).

**Tests:** `Test Files 11 passed (11)` · `Tests 56 passed (56)` (la suite completa). Reception spec: 8 passed (8).

**Anchos revisados:** NO. No tengo navegador en esta sesión; la revisión visual en 375/768/1024/1366 queda pendiente
para el usuario (ver Prueba manual).

**Problemas y supuestos:**
- `management/index.ts` no existía (la 016a/016b no lo creó); se crea con `AuditHistoryDialogService` y los modelos.
- `AuditEntry.userId` tipado como `string | null` (el contrato muestra string; se dejó nullable por seguridad).
- El botón de la cabecera de la atención reutiliza la clase `btn-form-033` (mismo estilo que el enlace 033).
- `patient-reception__btn-033` renombrado a `patient-reception__btn` (aplica a ambos botones).
- `layout/coming-soon/coming-soon.page.ts` queda sin uso; no se borró (fuera de alcance).
- Tono de la acción: `Creó`→scheduled, `Modificó`→waiting, `Anuló`→cancelled, `Eliminó`→no-show (el `bd-status-badge`
  ya tiene esos tonos).
- Sin cambios en backend ni en otros features; sin commit.

**Cómo probar:** levantar backend con auditoría activa y un usuario DIRECTOR (roles ADMIN + ODONTOLOGO) para ver los
botones; `/direccion/auditoria` ya no existe.

## Revisión
Estado: APROBADO

- Contrato verificado contra `AuditController`/`AuditEntryResponse`/`AuditService` del backend: ruta, nombres de
  entidad y campos coinciden (`userId` `UUID` nullable → `string | null` correcto).
- Criterios: botón solo con `profile() === 'DIRECTOR'` en ficha y cabecera de la atención (sin nombres de rol);
  revisiones invertidas (más reciente primero), badge con color + texto, `clinicDate`/`clinicTime` y formateador
  con `America/Guayaquil`; campos internos ocultos; "Anuló" por `voidedAt` null → valor; carga/vacío/error con el
  mensaje de `api-error-messages` (403 → "No tienes permiso para esta acción."); CDK Dialog con `ariaLabelledBy`,
  Esc y restauración de foco por defecto; ruta y menú retirados. `patients`/`clinical` importan solo de
  `../../../management` (index.ts); `management` no importa de ellos. Solo tokens, sin `any`, OnPush.
- Corrección del revisor: borrado `src/app/layout/coming-soon/coming-soon.page.ts` (huérfano, sin referencias en
  `src/` ni en tareas pendientes); plan §2/§5.2 actualizado.
- `npx ng build`: OK (aviso previo: `sidebar.component.scss` excede 4 kB por 22 bytes, no es de esta tarea).
  `npx ng test --watch=false`: Test Files 11 passed (11) · Tests 56 passed (56).

## Decisiones a revisar (tras la revisión)
1. **Responsive sin revisar**: Haiku no tuvo navegador; el usuario debe probar el diálogo en 375 y 1366 (scroll
   interno, "antes → después" en dos líneas) y la cabecera de la atención con el botón extra.
2. **F-15 sigue "Propuesta"** en el plan (§10): confirmar que no se quiere pantalla `/direccion/auditoria` hasta G-7.
3. Los cambios de diagnósticos, hallazgos, tratamientos y recetas **no** aparecen en el historial de la atención
   (son entidades aparte en el backend); si se necesitan, harían falta botones por ítem o un endpoint agrupado.
4. Se borró `layout/coming-soon/`: una tarea futura que necesite una ruta provisional tendrá que recrearlo.
