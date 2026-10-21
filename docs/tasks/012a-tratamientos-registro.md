# 012a — Tratamientos en la atención: catálogo, registro, total y anular

> Plan §5.12 (P11). Backend listo: 010a (`10abf5f`) y 010b (`cf9a6c9`). La 012 se divide en dos:
> - **012a (esta tarea):** feature `treatments`, buscar en el catálogo, registrar con precio y cantidad, ligar a un
>   diagnóstico, total de la sesión y anular con motivo.
> - **012b:** ligar el tratamiento a un hallazgo del odontograma (el rojo pasa a azul) y el atajo "Tratar" en el
>   panel de la pieza.
>
> Perfil: ODONTOLOGO y DIRECTOR; solo el odontólogo que atiende registra o anula (D-6, también con la atención
> completada). Se mide en T1 de la tesis: pocos clics.

## Brief de diseño (modo Operate)
- **Tarea principal:** registrar un tratamiento en **3 acciones**: abrir el buscador, elegir el tratamiento y pulsar
  "Registrar". El precio, la cantidad 1 y el diagnóstico ya vienen puestos.
- La sección va bajo "Diagnósticos", como una tarjeta igual a las demás de la atención (`.card`, mismo encabezado).
- Lo registrado aparece al instante en la lista con su total, y el **total de la sesión** siempre está visible al pie.
- **Antigoals:** sin modales para registrar (la confirmación solo aparece al anular), sin "Eliminar" y sin
  recalcular precios en el cliente (el `total` viene del backend).

```
┌ Tratamientos ─────────────────────────────────────────────────────────────────────┐
│ [🔍 Código o nombre: "resina", "D23"…                                         ▾]  │
│ ┌ D2330 · Resina compuesta, 1 superficie ───────────────────────────────────────┐ │
│ │ Cantidad [ 1 ]  Precio [$ 30,00]  Pieza [  ]  Cara [—▾]  Diagnóstico [K02.1 ▾] │ │
│ │ Nota (opcional) [                                       ]   [Cancelar] [Registrar] │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│ Código  Tratamiento            Pieza  Cant.  Precio    Total                       │
│ D2330   Resina compuesta …     16 M     2    $ 30,00   $ 60,00   [Anular]          │
│ D1110   Profilaxis             —        1    $ 25,00   $ 25,00   [Anular]          │
│                                             Total de la sesión   $ 85,00           │
└───────────────────────────────────────────────────────────────────────────────────┘
```

## Contrato (verificado en `bellidental-backend`: `TreatmentController` y DTO)
- **`GET /api/v1/treatments?query=`** (`RECORD_READ`) → `ApiResponse<Treatment[]>`
  `Treatment { id: number, code, name, description, basePrice: number }`. Sin `query` devuelve todo el catálogo
  activo ordenado por código (unos 12, la clínica lo ampliará); con 1 carácter → 400.
- **`POST /api/v1/encounters/{id}/treatments`** (`RECORD_CREATE`) → 201 `ApiResponse<PerformedTreatment>`.
  - Body `{ treatmentId, quantity?, price?, encounterDiagnosisId?, toothCode?, surfaceCode?, notes?, dentalFindingId? }`
    (`dentalFindingId` es de la 012b). `quantity ≥ 1` (por defecto 1); `price ≥ 0` (si no llega se copia `basePrice`).
  - Errores: 400 tratamiento inactivo, pieza o cara inexistente; 409 "El diagnóstico no pertenece a este paciente.",
    "El diagnóstico está anulado." o atención no modificable (otro profesional o anulada).
  - `PerformedTreatment { id, encounterId, treatmentId, treatmentCode, treatmentName, encounterDiagnosisId,
    dentalFindingId, toothCode, surfaceCode, quantity, price, total, notes, createdAt }`.
- **`GET /api/v1/encounters/{id}/treatments`** (`RECORD_READ`) → tratamientos no anulados de la atención.
- **`POST /api/v1/performed-treatments/{id}/void`** (`RECORD_UPDATE`) body `{ voidReason }` (obligatorio, si no →
  400) → `ApiResponse<Void>` con `message`. Ya anulado → 409.

## Objetivo
1. Al cargar la atención, `GET /encounters/{id}/treatments` llena la lista (en paralelo con lo demás; no bloquea la
   pantalla: la sección tiene su propio skeleton y su error con "Reintentar").
2. **Buscador** (`bd-combobox`): la primera vez que recibe el foco pide `GET /treatments` (sin `query`) y guarda el
   catálogo en el store durante la sesión. Filtra en el cliente por prefijo de código o por nombre (sin distinguir
   mayúsculas ni tildes). Cada opción muestra "D2330 · Resina compuesta, 1 superficie · $ 30,00".
3. Al elegir, aparece el **formulario del tratamiento elegido** (Reactive Form tipado):
   - Cantidad: entero ≥ 1, por defecto 1.
   - Precio: número ≥ 0 con 2 decimales, por defecto `basePrice`, editable (descuentos).
   - Pieza: opcional, número FDI. Si el odontólogo tiene una pieza seleccionada en el odontograma
     (`toothActivate`), viene precargada.
   - Cara: opcional (O, V, L, M, D, con la etiqueta de la pieza si la hay), solo si hay pieza.
   - Diagnóstico: `<select>` con los diagnósticos activos de la atención ("K02.1 · Caries de la dentina") y la
     opción "Sin diagnóstico". Por defecto el primero activo.
   - Nota: opcional.
   - "Registrar" envía el body; los opcionales vacíos se omiten. Después: toast "Tratamiento registrado", el
     formulario se cierra, el buscador se vacía y recibe el foco (para registrar otro).
4. **Lista:** código, nombre, pieza y cara ("16 M" o "—"), cantidad, precio, total (pipe `money`), "Anular". Al pie,
   "Total de la sesión" = suma de los `total` de la lista.
5. **Anular:** `ConfirmDialog` con motivo **obligatorio** ("Motivo de la anulación") → `POST …/void` → la fila se
   quita y el total se recalcula. Toast con el `message` del backend.
6. **Solo lectura** (`editMode` `other_professional` o `voided`): lista y total sin buscador ni "Anular". Con la
   atención completada por el mismo odontólogo, todo sigue disponible (D-6).
7. Errores 400/409 en línea dentro del formulario o de la sección, con el `message` del backend.

## Estructura (según `architecture/SKILL.md`)
- Nuevo feature `treatments`. Expone en su `index.ts`: `TreatmentsStore`, `TreatmentsSectionComponent` y los modelos.
- `clinical` (página de la atención) importa solo de `features/treatments/index.ts`. `treatments` **no importa de
  `clinical`**: recibe los diagnósticos como `DiagnosisOption { id, label }` y la página hace el mapeo.
- `TreatmentsStore` lo provee la página (como `OdontogramStore`). Los componentes son presentacionales.

## Archivos a tocar
```
src/app/shared/
  pipes/money.pipe.ts                           (nuevo) number → "$ 25,00" (es-EC, 2 decimales)
  components/confirm-dialog/confirm-dialog.component.ts   + reasonRequired?: boolean (deshabilita "Confirmar"
                                                  con el motivo vacío o en blanco)
src/app/features/treatments/                    (nuevo)
  index.ts                                      TreatmentsStore, TreatmentsSectionComponent, modelos
  models/treatment.models.ts                    Treatment, PerformedTreatment, RecordTreatmentRequest, DiagnosisOption
  services/treatments.api.ts                    catalog(), record(), listByEncounter(), void()
  services/treatments.store.ts                  encounterId, items, catalog (caché), loading, saving, errors,
                                                  sessionTotal (computed), selectedTooth; load(), record(), void()
  components/treatments-section/treatments-section.component.ts   tarjeta: buscador + formulario + lista + total
  components/treatment-form/treatment-form.component.ts           tratamiento elegido: cantidad, precio, pieza,
                                                  cara, diagnóstico, nota
  components/treatment-list/treatment-list.component.ts|scss      tabla → tarjetas en < sm (`.table-cards`)
src/app/features/clinical/
  pages/encounter/encounter.page.ts             provee TreatmentsStore, monta la sección bajo diagnósticos,
                                                  (toothActivate) → treatmentsStore.selectTooth()
  pages/encounter/encounter.page.spec.ts        +2 casos; los casos existentes responden GET …/treatments con []
  testing/fixtures.ts                           + catálogo y PerformedTreatment de ejemplo
```
Sin dependencias nuevas.

## Criterios de aceptación
1. Las peticiones y los bodies son exactamente los del contrato; los opcionales vacíos no se envían.
2. El catálogo se pide una sola vez por sesión (al primer foco), no en cada tecla.
3. Precio por defecto = `basePrice` y cantidad por defecto = 1; con precio < 0 o cantidad < 1 "Registrar" está
   deshabilitado y el campo muestra el error.
4. Diagnóstico por defecto: el primero activo; "Sin diagnóstico" envía la petición sin `encounterDiagnosisId`.
5. La pieza seleccionada en el odontograma se precarga en el formulario.
6. "Total de la sesión" usa los `total` del backend y se actualiza al registrar y al anular.
7. Anular exige motivo (el botón no se activa con el motivo vacío); nunca dice "Eliminar".
8. En solo lectura no hay buscador ni "Anular".
9. Dinero con el pipe `money`; solo tokens de `_tokens.scss`; botones de 44 px; la tabla pasa a tarjetas en < 600.
10. `treatments` no importa de `clinical`; `clinical` importa solo del `index.ts` de `treatments`.
11. Plantillas de menos de ~150 líneas cada una.

## Responsive
Revisar en **375, 768, 1024 y 1366**.
- 375: el formulario va en una columna, la lista como tarjetas y el total visible al pie de la tarjeta.
- 768 y 1024: formulario en 2–3 columnas (`@container`) y la tabla sin scroll horizontal.
- 1366: una fila de campos donde quepa; con el panel de la pieza abierto, la tarjeta no desborda.

## Tests requeridos
Se amplía `encounter.page.spec.ts` con **2 casos**. Los casos existentes solo añaden la respuesta
`GET /api/v1/encounters/{id}/treatments` → `[]` (con un helper en `fixtures.ts`).
1. "Registrar tratamiento → aparece con su total": foco en el buscador → `GET /api/v1/treatments` → escribir
   "resina" → elegir D2330 (basePrice 30) → cantidad 2 → "Registrar" → `POST /api/v1/encounters/{id}/treatments`
   con `{ treatmentId, quantity: 2, price: 30, encounterDiagnosisId }` → 201 → se ve la fila "D2330" y
   "Total de la sesión $ 60,00".
2. "Anular tratamiento con motivo → se quita de la lista": con un tratamiento en la lista → "Anular" → escribir el
   motivo → confirmar → `POST /api/v1/performed-treatments/{id}/void` con `{ voidReason }` → 200 → la fila ya no
   está y el total es "$ 0,00".

## Prueba manual
1. Odontólogo → abrir una atención → en Tratamientos, buscar "resina" → elegir → Registrar: aparece con el total.
2. Registrar otro con descuento (precio 20) y cantidad 2: el total de la sesión suma bien.
3. Seleccionar la pieza 16 en el odontograma y registrar un tratamiento: la pieza viene precargada.
4. Elegir "Sin diagnóstico": se registra igual.
5. Anular: sin motivo el botón no se activa; con motivo la fila desaparece.
6. Completar la atención y volver: se puede registrar y anular (D-6). Con otro odontólogo: solo lectura.
7. Pieza inexistente (p. ej. 19) → mensaje del backend.
8. Anchos 375, 1024 y 1366.

## Resultado
Ejecutado por Haiku 5.5 (sustituye a Gemini por encargo explícito del usuario). Segunda pasada: correcciones de la Revisión.

**Correcciones aplicadas**
1. `TreatmentsSectionComponent` es presentacional: sin `inject`. Estado por `input()` (items, isLoading, loadError,
   sessionTotal, actionError, voiding, query, results, catalogLoading, catalogError, selectedTreatment, selectedTooth,
   saving, saveError, diagnoses, isReadOnly) y salidas `catalogRequest`, `queryChange`, `pick`, `cancel`, `register`,
   `voidRequest`, `retryLoad`. Método público `focusSearch()`.
   `onRegisterTreatment` y `onVoidTreatment` (ConfirmDialogService + NotificationService) están en `encounter.page.ts`.
   La página llama `focusSearch()` tras registrar vía `viewChild(TreatmentsSectionComponent)`.
   La página pasa los datos del `TreatmentsStore` a la sección; no hay cambios en tests.
2. Validador de `toothCode`: `Validators.min(11)` y `Validators.max(85)`; mensaje y hint actualizados (temporales 51–85).

**Archivos creados**
- `src/app/shared/pipes/money.pipe.ts`
- `src/app/features/treatments/index.ts`, `models/treatment.models.ts`, `services/treatments.api.ts`, `services/treatments.store.ts`
- `src/app/features/treatments/components/treatments-section/treatments-section.component.ts`
- `src/app/features/treatments/components/treatment-form/treatment-form.component.ts`
- `src/app/features/treatments/components/treatment-list/treatment-list.component.ts` y `.scss`

**Archivos modificados**
- `src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`: `reasonRequired?: boolean`.
- `src/app/features/clinical/pages/encounter/encounter.page.ts`: providers, `<bd-treatments-section>` con bindings y salidas, `toothActivate`, `diagnosisOptions`, `treatmentsSection` viewChild, `onRegisterTreatment`, `onVoidTreatment`, `load` en `ngOnInit`.
- `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: +2 casos; los 8 existentes con `flushTreatments`.
- `src/app/features/clinical/testing/fixtures.ts`: catálogo, `mockPerformedResina`, `flushTreatments`.
- `docs/tasks/012a-tratamientos-registro.md`: esta sección.

**Totales (copiados de la consola)**
- `npx ng build`: exit 0, `Application bundle generation complete.`
- `npx ng test --watch=false`: `Test Files  8 passed (8)` / `Tests  37 passed (37)`

**Responsive (no verificado visualmente)**
Sin DevTools. Formulario: 1 columna; `@container (min-width: 36rem)` → 3; `(min-width: 60rem)` → 6. Lista: tarjetas con `@container (max-width: 37.49rem)`. Inputs y botones con `min-height: 44px`.

**Pendiente**
Revisión manual en 375, 768, 1024 y 1366, y teclado en "Registrar". No hice commit.

## Revisión

Estado: CORRECCIONES

Revisado por Claude (Opus). Store, API, pipe `money`, `reasonRequired` y tests (37/37) están bien; `treatments` no
importa de `clinical`. Faltan dos cosas:

1. **`TreatmentsSectionComponent` no puede inyectar servicios** (`architecture/SKILL.md`: los componentes son
   presentacionales; la tarea lo pedía). Además, la 012b necesita que la página sepa cuándo se registró un
   tratamiento, para recargar el odontograma. Cambios:
   - la sección recibe por `input()` lo que hoy lee del store (items, loading, loadError, results, catalogLoading,
     catalogError, selectedTreatment, selectedTooth, saving, saveError, actionError, sessionTotal) y emite
     `catalogRequest`, `queryChange`, `pick`, `cancel`, `register`, `voidRequest` y `retryLoad`;
   - `onRegister` y `onVoidRequested` (con `ConfirmDialogService` y `NotificationService`) pasan a
     `encounter.page.ts`, igual que `onRegisterFinding`/`onVoidFinding` del odontograma;
   - el foco en el buscador tras registrar: la sección expone un método público `focusSearch()` y la página lo llama
     con `viewChild(TreatmentsSectionComponent)`.
   - Los tests no deberían cambiar.
2. **Piezas temporales:** el validador de `toothCode` admite de 11 a 48 y deja fuera las temporales (51–85), que
   el backend sí acepta. Cambiar a `min(11)`/`max(85)` (el backend valida que la pieza exista).

### Ronda 2
Estado: APROBADO

Correcciones 1–2 aplicadas:
- la sección ya no inyecta servicios;
- registrar y anular los orquesta la página, que también llama a `focusSearch()`;
- `toothCode` acepta de 11 a 85.

`npx ng build` OK; `npx ng test --watch=false` → 8 archivos, 37 tests.
Pendiente del usuario: responsive y teclado en la prueba manual (Haiku no tiene DevTools).
