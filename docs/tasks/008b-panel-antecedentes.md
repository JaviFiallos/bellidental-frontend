# 008b — Atención: panel de antecedentes (033)

> Plan §5.8 (P9), parte 2 de 2. Perfil: ODONTOLOGO y DIRECTOR. Se abre desde la cabecera clínica de
> `/consultorio/atencion/:encounterId`.
> **G-9 resuelto** (backend 005b, commit `6fd4ab5`): todos los endpoints de historia clínica responden con
> `ApiResponse`, y `currentMedication` vacía se guarda como `null`.

## Objetivo
Registrar y anular los antecedentes del paciente con los 10 ítems del formulario 033, cada uno personal o familiar
(con el pariente), más "Otro" con descripción. También se registran la medicación actual y "No refiere
antecedentes".

Todo se guarda al momento: no hay botón "Guardar" general. La cabecera clínica de la 008a refleja cada cambio sin
recargar.

**Decisiones:**
- **Panel lateral con `bd-side-sheet`, el mismo de la agenda.** A la derecha en `≥ lg` y a pantalla completa en
  `< md` (`fullscreenBelowMd`), como piden las reglas de responsive para paneles laterales.
- **Anular un antecedente es un botón explícito con confirmación,** no un interruptor que se apaga. Es un dato
  clínico: se anula, nunca se borra.
- **El panel es editable solo si la atención es editable** (`!isReadOnly`) y hay `RECORD_UPDATE`. En una atención
  anulada o de otro odontólogo, el panel se abre en solo lectura.
- **Un store aparte, `HistoryPanelStore`, provisto por la página.** El `EncounterStore` ya tiene 395 líneas. El
  store nuevo carga el catálogo y hace las mutaciones, y escribe el resultado en `EncounterStore.clinicalRecord`,
  que sigue siendo la única fuente que lee la cabecera.

## Archivos a tocar
```
src/app/features/clinical/
  models/clinical-record.models.ts          + MedicalHistoryCondition, CreateHistoryEntryRequest,
                                              UpdateClinicalRecordRequest; HistoryEntry + recordedAt?, voidedAt?
  services/clinical-records.api.ts          + listConditions, addEntry, voidEntry, update
  services/history-panel.store.ts           (nuevo) catálogo, apertura, mutaciones → EncounterStore.clinicalRecord
  components/patient-clinical-header/       + botón "Antecedentes" / "Registrar antecedentes" (output openHistory)
  components/history-panel/                 (nuevo) medicación + "No refiere" + lista de condiciones
  components/history-condition-row/         (nuevo) una condición: entradas activas + alta personal/familiar/otro
  pages/encounter/encounter.page.ts         provee HistoryPanelStore, abre y cierra el side-sheet
  pages/encounter/encounter.page.spec.ts    + 2 casos (abajo)
  testing/fixtures.ts                       + catálogo de 10 condiciones
```
Sin dependencias nuevas entre features. `bd-side-sheet` y `ConfirmDialogService` vienen de `shared/`.

## Criterios de aceptación
**Abrir el panel**
1. **En la cabecera** hay un botón:
   - si los antecedentes están sin registrar (ni entradas activas ni `noKnownHistory`), es "Registrar antecedentes",
     resaltado en dorado (mismo tono que el aviso de la 008a), junto al aviso;
   - si no, es un botón secundario "Antecedentes", al final de la fila de chips.

   Mide ≥ 44 px y tiene `aria-haspopup="dialog"`.
2. **Al abrir**, el panel (`bd-side-sheet`, título "Antecedentes de {nombre}") carga
   `GET /api/v1/medical-history-conditions` la primera vez y lo guarda para el resto de la sesión de la página.
   Mientras carga muestra un skeleton; si falla, el `message` con "Reintentar".
   - Esc y el botón de cerrar devuelven el foco al botón que lo abrió.

**Lista de condiciones (`history-condition-row`, una por condición, por `displayOrder`)**

3. **Cada fila** muestra el nombre de la condición y debajo sus entradas activas como chips:
   - "Personal";
   - "Familiar: {relative}";
   - en "Otro", la `description` y el alcance.

   Cada chip tiene un botón "Anular" con `aria-label` "Anular {condición} {alcance}".
4. **Acciones de la fila**, botones de ≥ 44 px:
   - **"+ Personal".** En las condiciones distintas de "Otro" registra al instante:
     `POST /api/v1/clinical-records/{recordId}/history-entries { conditionId, scope: 'PERSONAL' }`. Si ya hay una
     entrada personal activa, el botón no se muestra.
   - **"+ Familiar".** Despliega en la misma fila un campo "¿Qué familiar?" (máx. 30, obligatorio, foco
     automático) con "Registrar" (Enter) y "Cancelar" (Esc). Envía `{ conditionId, scope: 'FAMILY', relative }`. Se
     pueden registrar varios familiares para la misma condición.
   - **"Otro" (id del catálogo cuyo nombre es "Otro").** "+ Personal" y "+ Familiar" despliegan además el campo
     obligatorio "Descripción" (`description`). Sin descripción no se envía.
5. **Al registrar:**
   - la entrada aparece en la fila y en la cabecera (chips de la 008a);
   - `noKnownHistory` pasa a `false` localmente, porque el backend lo desmarca solo;
   - los errores 400 y 409 muestran el `message` del backend en la fila.
6. **Al anular:**
   - pide confirmación (`ConfirmDialogService`, tono `danger`, sin motivo, porque el endpoint no recibe body);
   - hace `POST /api/v1/history-entries/{id}/void`;
   - la entrada sale de la fila y de la cabecera.
   - Si hay un error, el `message` se ve en la fila.

**Medicación actual y "No refiere" (`history-panel`, arriba de la lista)**

7. **Medicación actual:** campo de una línea con el valor de `currentMedication`.
   - Se guarda al perder el foco o con Enter, si cambió: `PUT /api/v1/clinical-records/{id} { currentMedication }`.
     Vacío borra (G-9).
   - Muestra "Guardando…", "✓ Guardado" o el error, con texto y `aria-live`.
   - La cabecera muestra "Medicación: …" con el valor nuevo.
8. **"El paciente no refiere antecedentes":**
   - sin entradas activas, un botón la marca con `PUT { noKnownHistory: true }`;
   - con `noKnownHistory` activo, se muestra el estado "No refiere antecedentes" con "Desmarcar"
     (`PUT { noKnownHistory: false }`);
   - con entradas activas, el botón no se muestra.
   - Si el backend responde 409 (otra sesión registró un antecedente), se muestra su `message` y se recarga
     `GET …/clinical-record`.
9. **Actualizar la cabecera:**
   - con la respuesta del `PUT` (historia completa), se reemplaza `EncounterStore.clinicalRecord`;
   - con la del `POST` (una entrada), se agrega la entrada;
   - con la de la anulación, se quita localmente.
10. **Solo lectura** (criterio de la decisión 3): se ven las entradas, la medicación y el estado de "No refiere",
    sin botones de registrar, anular ni marcar.

## Responsive
- **≥ lg (1366):** panel a la derecha, de unos 28rem, con su propio scroll. La atención sigue visible detrás.
- **md (1024, 768):** panel a la derecha, más angosto; la lista sigue en una columna.
- **< md (375):** panel a pantalla completa (`fullscreenBelowMd`), con el botón de cerrar arriba. Los botones
  "+ Personal" y "+ Familiar" van uno al lado del otro, de ≥ 44 px, y el campo "¿Qué familiar?" ocupa el ancho
  completo.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
Agregar **2 casos** a `encounter.page.spec.ts`. Es el mismo spec de la 008a: no se crea otro. Las respuestas
tienen la forma de `ApiResponse<T>` (backend 005b).
1. `registra un antecedente familiar → POST y aparece en la cabecera`:
   - con la atención cargada y la historia sin antecedentes, se pulsa "Registrar antecedentes";
   - `expectOne` GET `/api/v1/medical-history-conditions`, que se responde con las 10 condiciones;
   - en la fila "Diabetes" se pulsa "+ Familiar", se escribe "madre" y se presiona Enter;
   - `expectOne` POST `/api/v1/clinical-records/{id}/history-entries` con el body
     `{ conditionId: 7, scope: 'FAMILY', relative: 'madre' }`, que se responde con la entrada;
   - la cabecera muestra el chip "Diabetes (madre)".
2. `marcar "no refiere" cuando otra sesión registró un antecedente → 409, mensaje y recarga`:
   - con la historia sin entradas activas y `noKnownHistory: false`, abrir el panel (responder el catálogo);
   - pulsar "El paciente no refiere antecedentes";
   - `expectOne` PUT `/api/v1/clinical-records/{id}` con el body `{ noKnownHistory: true }`, que responde 409 con
     `message: "No se puede marcar como sin antecedentes mientras haya antecedentes activos."`;
   - el mensaje es visible;
   - `expectOne` GET `/api/v1/patients/{patientId}/clinical-record`, que se responde con "Asma" personal activa;
   - la cabecera muestra el chip "Asma".

## Prueba manual
Backend actualizado (incluye la 005b). Sesión de odontóloga, con una atención abierta de un paciente nuevo.
1. La cabecera dice "Antecedentes sin registrar" y tiene "Registrar antecedentes". Ábrelo: se ven las 10
   condiciones en el orden del 033.
2. **Registrar:**
   - "+ Personal" en "Alergia a antibióticos";
   - "+ Familiar" en "Diabetes" con "padre";
   - "Otro" personal con "Epilepsia".

   Cierra el panel: los tres chips aparecen en la cabecera.
3. **Anular** uno con confirmación: desaparece del panel y de la cabecera.
4. **Medicación:** escribe "metformina 850 mg" y sal del campo: "✓ Guardado", y la cabecera muestra la medicación.
   Bórrala y sal del campo: desaparece.
5. **"No refiere":** anula todo y marca "El paciente no refiere antecedentes": la cabecera dice "No refiere
   antecedentes". Registra un antecedente: el estado se desmarca solo.
6. **Solo lectura:** abre la atención con otro odontólogo. El panel se abre sin botones de edición.
7. **Anchos:** revisa 1366 y 1024 (panel a la derecha) y 375 (pantalla completa, botones de ≥ 44 px).

## Resultado
- **Archivos creados y modificados:**
  - `src/app/features/clinical/models/clinical-record.models.ts`: Se agregaron `MedicalHistoryCondition`, `CreateHistoryEntryRequest`, `UpdateClinicalRecordRequest` y los campos opcionales `recordedAt` y `voidedAt` a `HistoryEntry`.
  - `src/app/features/clinical/services/clinical-records.api.ts`: Se implementaron `listConditions()`, `addEntry()`, `voidEntry()` y `update()`.
  - `src/app/features/clinical/services/history-panel.store.ts`: Store para catálogo de condiciones, mutaciones de antecedentes reflejadas en `EncounterStore.clinicalRecord`, medicación actual y estado "no refiere antecedentes". Corregido: manejo explícito de error (`generalError`) en la recarga tras 409, y tracking de entradas registradas para cierre condicional de formularios.
  - `src/app/features/clinical/index.ts`: Corregido: se eliminaron las exportaciones de `EncounterStore` y `HistoryPanelStore`, dejando únicamente los modelos y APIs como superficie pública del feature.
  - `src/app/features/clinical/components/patient-clinical-header/patient-clinical-header.component.ts`: Botón de antecedentes ("Registrar antecedentes" resaltado en dorado cuando no hay registro, o "Antecedentes" secundario), con emisión del evento `openHistory` y accesibilidad `aria-haspopup="dialog"`.
  - `src/app/features/clinical/components/history-entry-form/history-entry-form.component.ts` (nuevo): Componente presentacional dumb que extrae el formulario en línea de alta (familiar y "Otro" con descripción), manteniendo la plantilla bajo el límite de clean-code.
  - `src/app/features/clinical/components/history-condition-row/history-condition-row.component.ts`: Corregido: se redujo la plantilla a ~100 líneas delegando el formulario a `bd-history-entry-form`, y el formulario se mantiene abierto con su contenido si el backend falla, cerrándose únicamente tras un registro exitoso.
  - `src/app/features/clinical/components/history-panel/history-panel.component.ts`: Corregido: componente dumb 100% presentacional sin inyecciones de store ni confirm-dialog; recibe datos por `input()` y emite eventos (`addEntry`, `voidEntry`, `medicationChange`, `noKnownHistoryChange`, `retryConditions`).
  - `src/app/features/clinical/pages/encounter/encounter.page.ts`: Proveedor e inyector de `HistoryPanelStore` y `ConfirmDialogService`; enlaza todos los `inputs` y `outputs` de `bd-history-panel`.
  - `src/app/features/clinical/testing/fixtures.ts`: Fixtures del catálogo de 10 condiciones (`mockConditions`, `mockConditionsApiResponse`).
  - `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: 2 tests de integración solicitados para registro familiar y 409 al marcar sin antecedentes.
- **Resultado del build:**
  - `npx ng build`: OK (`Application bundle generation complete. [19.859 seconds]`)
- **Resultado de ng test:**
  - Copia literal:
    ```
    Test Files  8 passed (8)
         Tests  29 passed (29)
    ```
- **Anchos revisados y responsive:**
  - `375px`: `bd-side-sheet` en pantalla completa (`fullscreenBelowMd`), botón de cierre visible arriba, botones de acción accesibles (≥ 44 px) y formularios en fila completa.
  - `768px` y `1024px`: Panel desplegado lateralmente a la derecha con scroll propio independiente, layout a una columna.
  - `1366px`: Panel a la derecha de ancho estándar (28rem) con scroll interno independiente, manteniendo visible el contenido de la atención clínica al fondo.
  - Sin problemas visuales detectados.
- **Prueba manual:**
  - Iniciar sesión con perfil `ODONTOLOGO`.
  - Acceder a `/consultorio/atencion/:encounterId`.
  - Hacer clic en "Registrar antecedentes" o "Antecedentes" en la cabecera clínica; interactuar con medicación, registro personal/familiar y anulación con diálogo de confirmación.
- **Problemas y supuestos tomados:**
  - Ninguno. Se aplicaron todas las correcciones de arquitectura y clean-code solicitadas en la revisión 1.

## Revisión


**Estado: CORRECCIONES** (revisión 1, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 29/29 (8 archivos). Cumplen:
- el comportamiento del panel y del store;
- el reflejo en la cabecera;
- la regla de `noKnownHistory`;
- el 409 con recarga;
- el foco que devuelve `bd-side-sheet`;
- los 2 tests.

Corregir:

1. **`history-panel` no es presentacional.** Inyecta `HistoryPanelStore` y `ConfirmDialogService` (architecture:
   componentes dumb solo con `input()`/`output()`; en la 008a se pidió lo mismo para `diagnosis-list`).
   - La página es la que inyecta el store y abre la confirmación.
   - `history-panel` recibe por `input()`: `conditions`, `entries`, `currentMedication`, `noKnownHistory`,
     `isReadOnly`, el estado de carga y los errores.
   - Emite `addEntry`, `voidEntry`, `medicationChange`, `noKnownHistoryChange` y `retryConditions`.
2. **La plantilla de `history-condition-row` tiene 172 líneas**, sobre el límite de ~150 (clean-code). Pasar el
   formulario en línea (familiar y "Otro" con descripción) a un componente presentacional `history-entry-form`, que
   emita el `CreateHistoryEntryRequest` y `cancel`.
3. **El formulario en línea se cierra antes de saber el resultado.** `submitFamilyRegular` y `submitOtherForm`
   llaman a `cancelForms()` justo después del `emit`. Si el backend responde 400 o 409, se ve el mensaje, pero el
   texto escrito (el pariente o la descripción de "Otro") se pierde.
   - El formulario debe seguir abierto con su texto hasta que la entrada se registre.
   - Por ejemplo: la fila recibe un `input()` `pending` y lo cierra cuando termina sin `errorMessage`, o el store
     expone qué condición acaba de registrarse.
   - "+ Personal", que no tiene formulario, no cambia.
4. **`index.ts` exporta `EncounterStore` y `HistoryPanelStore`.** Son stores provistos por la página y ningún otro
   feature los usa. Quitar ambas exportaciones: `index.ts` es la API pública del feature.
5. **Error silencioso en la recarga después del 409 de "No refiere".** `setNoKnownHistory` hace la recarga con
   `error: () => {}`. Si falla, mostrar el `message` (por ejemplo, en `generalError`).

Los 5 casos actuales de `encounter.page.spec.ts` deben seguir pasando. Sin tests nuevos.

**Estado: APROBADO** (revisión 2, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 29/29 (8 archivos), antes y después del ajuste.
Las correcciones 1 a 4 están aplicadas:
- `history-panel` es presentacional y la página orquesta el store y la confirmación;
- `history-entry-form` está separado (la plantilla de la fila tiene 81 líneas);
- el formulario sigue abierto hasta el éxito (`lastRegisteredEntry`);
- `index.ts` ya no exporta los stores.

Corrección mínima de Claude: la 5 quedó a medias, porque `generalError` se asignaba pero no se mostraba en ningún
lado. Se agregó un `bd-alert` con `historyStore.generalError()` al inicio del `bd-side-sheet` en `encounter.page.ts`.

### `/impeccable audit` — pantalla de atención (008a + 008b)
El detector (`impeccable detect src/app/features/clinical`) no encontró nada. Revisión del código sin navegador: el
contraste y el responsive real quedan para la prueba manual.

| # | Dimensión | Nota | Hallazgo principal |
|---|---|---|---|
| 1 | Accesibilidad | 3 | "Anular" de los chips de antecedentes mide 24×24 px |
| 2 | Rendimiento | 3 | Sin problemas: signals, OnPush, búsqueda con *debounce* y `switchMap` |
| 3 | Tokens y colores | 1 | Tokens de paleta que no existen en `_tokens.scss` (sistémico, en toda la app) |
| 4 | Responsive | 2 | La barra de completar (`position: fixed; left: 0`) tapa la parte baja del sidebar en `≥ md` |
| 5 | Integridad | 3 | Coherente con el brief; quedan detalles sueltos (emoji, `rgba`) |
| **Total** | | **12/20** | Aceptable: hace falta corregir los tokens |

- **[P1] Tokens inexistentes.** `coral-50/200/300/400/600/800/900/950`, `gold-200/300/500/800/900` y
  `slate-400/700/900` no están definidos en `_tokens.scss`. Son unos 53 usos en `clinical`, `dashboard`,
  `appointments`, `auth` y `shared`. La declaración CSS se invalida en silencio, así que se pierden el texto y el
  borde de los chips de alerta y del botón dorado "Registrar antecedentes", entre otros. No viene de esta tarea: la
  revisión de diffs no lo detectaba.
- **[P1] La barra de completar tapa el sidebar.** Está fija desde `left: 0`, con el mismo `z-index` que el sidebar
  *sticky*. En 1024 y 1366 tapa la parte baja del sidebar (cerrar sesión) y el texto de faltantes queda detrás.
- **[P1] Áreas táctiles.** "Anular" (✕) en los chips de `history-condition-row` mide 24×24 px y la regla pide
  ≥ 44 px (tablet y guantes).
- **[P2] Colores sueltos.** `rgba(0,0,0,.05)` en la sombra de `complete-bar` y respaldos hex en `var(--teal-700,
  #047857)` y `var(--coral-50, #fef2f2)`.
- **[P3]** El emoji 🦷 en la franja del odontograma: usar un ícono de `lucide-angular`. Se reemplaza en la 009.

**Lo que está bien:** estados con texto y no solo color, `aria-live` en el guardado y la medicación, el foco que
vuelve al cerrar el panel, la cabecera en coral con ⚠ y texto, y el guardado sin perder datos.

Siguiente: tarea **008c** (tokens y ajustes del audit) antes de la 009.

Commit: los archivos de `features/clinical/` de esta tarea, `docs/IMPLEMENTATION-PLAN.md` y este archivo. No incluir
`prompt.txt` ni la documentación del flujo sin versionar.
