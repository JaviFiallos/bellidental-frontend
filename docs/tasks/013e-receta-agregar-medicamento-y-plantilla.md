# 013e — Receta: agregar el medicamento que falta y guardar la posología como plantilla

## Objetivo
Que el doctor **no salga de la atención** cuando un medicamento no está en el catálogo o quiere reutilizar su
posología. Hoy, si la búsqueda no encuentra el medicamento, no puede recetarlo; y lo que escribe en dosis/frecuencia/
duración se pierde para la próxima receta. Salir a `/consultorio/medicamentos` **no sirve**: `PrescriptionsStore` se
provee en `encounter.page.ts` y los ítems de la receta viven solo en memoria hasta «Guardar borrador», así que se
perderían. Depende de **013d** (formularios y métodos de `MedicationsApi`) y del backend **028**.

Dos cambios en el editor de receta (que ya está dentro de un `bd-side-sheet`; **no** se abre un segundo panel):
1. **«＋ Agregar «texto»»** en el combobox cuando no hay resultados → formulario de medicamento **dentro del editor**,
   en el lugar del formulario del ítem → al guardar, el medicamento queda seleccionado en el ítem.
2. **«Guardar como plantilla»** con la posología escrita → crea la posología del medicamento y queda como botón
   junto a las demás.

## Archivos a tocar
```
src/app/features/prescriptions/
  components/prescription-item-form/prescription-item-form.component.ts   (modif.) acción del combobox, «Guardar como plantilla», outputs nuevos
  components/prescription-editor/prescription-editor.component.ts         (modif.) alterna ítem ↔ medication-form; reenvía eventos
  components/prescriptions-section/prescriptions-section.component.ts     (modif.) conecta los eventos con PrescriptionsStore
                                                                           (o el componente que hoy conecta la búsqueda con el store)
  services/prescriptions.store.ts                                         (modif.) createMedication, savePreset y sus estados
  domain/medication-display.ts                                            (modif.) sugerencia de etiqueta (puro)
src/app/features/clinical/pages/encounter/encounter.page.spec.ts          (modif.) +2 casos (ver Tests)
```
Reutiliza `MedicationFormComponent` de la 013d tal cual. `MedicationPresetFormComponent` **no** se usa aquí: para la
plantilla basta un campo corto (la etiqueta), porque dosis, frecuencia y duración ya están escritas en el ítem. Las llamadas HTTP van por `MedicationsApi` desde el store; los componentes siguen
presentacionales (input/output), igual que la búsqueda actual (`medicationResults`, `medicationSearching`…).
No se toca `encounter.page.ts` salvo que el cableado de la búsqueda pase por ahí (seguir el camino existente).

## Criterios de aceptación
1. **Agregar medicamento**:
   - Con 2+ caracteres escritos y **0 resultados** (y sin búsqueda en curso), el combobox muestra la acción
     `＋ Agregar «<texto>»` (usa `actionLabel`/`action` de `bd-combobox`, que ya existe).
   - Al elegirla, el editor reemplaza el formulario del ítem por `bd-medication-form` con el **nombre prellenado** con
     el texto (trim; primera letra en mayúscula), título «Nuevo medicamento» y botones «Cancelar» / «Guardar».
     Diagnóstico, ítems ya agregados e indicaciones generales **no cambian** ni se pierden.
   - Guardar → `POST /api/v1/medications` → 201 → vuelve el formulario del ítem con ese medicamento **seleccionado**
     (texto del combobox = etiqueta de siempre: `formatMedicationLabel`), sin posologías, listo para escribir la dosis.
     Toast «Medicamento agregado al catálogo».
   - 409 (repetido) → el `message` del backend dentro del formulario, sin salir de él. «Cancelar» vuelve al ítem con el
     texto de búsqueda que tenía.
2. **Guardar como plantilla**:
   - Botón secundario «Guardar como plantilla» en el formulario del ítem, visible si hay medicamento seleccionado y
     dosis, frecuencia y duración tienen texto, y la combinación **no** coincide exactamente con la de una posología del
     medicamento (si coincide, no se muestra).
   - Al pulsarlo aparece en línea un campo «Nombre de la plantilla» (máx. 60) prellenado con la sugerencia
     `«<frecuencia> × <duración>»` (recortada a 60, primera letra en mayúscula) y botones «Guardar» / «Cancelar».
   - Guardar → `POST /api/v1/medications/{id}/presets` con `{label, dose, frequency, duration, instructions?}` tomados
     del ítem (`quantity` **no** va: no es parte de la posología) → 201 → la posología se agrega a los botones del
     medicamento seleccionado y queda marcada como elegida; toast «Plantilla guardada». El ítem no cambia.
   - 409 (etiqueta repetida o medicamento desactivado) → `message` del backend junto al campo.
3. Los ítems de la receta siguen guardándose solo con «Guardar borrador» (sin cambios en `POST/PUT` de recetas).
   Crear un medicamento o una plantilla **no** guarda la receta.
4. Mientras corre cada petición, su botón muestra `saving` y no se puede pulsar dos veces.
5. Errores 403 → «No tienes permiso»; 0 → «No se pudo conectar con el servidor» (mismo manejo que el resto del editor).
6. Reglas de `clean-code`, `architecture`, `responsive` y `testing` (standalone, OnPush, signals, Reactive Forms
   tipados, sin `any`, solo tokens, textos en español, sin dependencias nuevas).

## Responsive
Revisar en 375, 768 y 1366 dentro del editor de receta (hoja inferior en `< lg`, panel lateral en `lg+`). El formulario
de medicamento y el campo de plantilla caben sin scroll horizontal; botones ≥ 44 px en móvil. Anotar los anchos.

## Tests requeridos
Dos casos nuevos en `encounter.page.spec.ts` (integración de página; mismo arnés que los casos de receta existentes):
- `medicamento que no existe → agregar desde la receta → queda seleccionado`: abrir «Nueva receta» → escribir
  «Prednisona» → `GET /api/v1/medications?query=Prednisona` responde `[]` → elegir «＋ Agregar «Prednisona»» → llenar
  presentación y concentración → `POST /api/v1/medications` con `{name: 'Prednisona', presentation, concentration}` →
  201 → el combobox muestra el medicamento y el formulario del ítem está visible; el diagnóstico elegido sigue igual.
- `guardar posología como plantilla → POST y aparece el botón`: con un medicamento seleccionado sin elegir posología,
  escribir dosis, frecuencia y duración → «Guardar como plantilla» → «Guardar» → `POST /api/v1/medications/{id}/presets`
  con `{label: 'Cada 8 horas × 5 días', dose, frequency: 'cada 8 horas', duration: '5 días'}` → 201 → el botón de la
  plantilla aparece y está activo.
Ningún otro test.

## Prueba manual
1. Abrir una atención → «Nueva receta» → escribir «Prednisona» → «＋ Agregar «Prednisona»» → completar y guardar:
   queda seleccionada; escribir la dosis y agregar el ítem; los ítems previos siguen ahí.
2. Escribir dosis/frecuencia/duración propias para Ibuprofeno 400 mg → «Guardar como plantilla» → aparece el botón.
3. Abrir otra receta (o la de otro paciente): Prednisona y la plantilla nueva ya salen en la búsqueda.
4. Ir a «Medicamentos»: ambos cambios se ven allí (catálogo compartido).

## Resultado

**Archivos modificados**:
- `src/app/features/prescriptions/domain/medication-display.ts`: funciones puras `suggestPresetLabel` (formato «<frecuencia> × <duración>» recortado a 60 caracteres y primera letra en mayúscula) y `matchesExistingPreset` (compara coincidencia exacta de posología para ocultar el botón).
- `src/app/features/prescriptions/services/prescriptions.store.ts`: métodos `createMedication`, `savePreset` y `clearMedicationErrors`, junto con signals de progreso y errores (`medicationSaving`, `medicationSaveError`, `presetSaving`, `presetSaveError`, `createdMedication`, `createdPreset`). Inyección de `NotificationService` para toasts de éxito.
- `src/app/features/prescriptions/components/prescription-item-form/prescription-item-form.component.ts`: acción `＋ Agregar «<texto>»` en combobox al no haber resultados con 2+ caracteres; botón secundario «Guardar como plantilla» visible cuando la combinación no coincide con posologías existentes; formulario en línea con campo «Nombre de la plantilla» prellenado; actualización reactiva de la selección al crear medicamento o plantilla.
- `src/app/features/prescriptions/components/prescription-editor/prescription-editor.component.ts`: conmutación entre el formulario del ítem y `bd-medication-form` manteniendo intactos diagnóstico e indicaciones generales; reenvío de eventos hacia la página.
- `src/app/features/clinical/pages/encounter/encounter.page.ts`: cableado de los outputs `createMedication` y `savePreset` del editor con los métodos de `PrescriptionsStore`.
- `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: adición de los 2 casos de integración requeridos (`medicamento que no existe → agregar desde la receta → queda seleccionado` y `guardar posología como plantilla → POST y aparece el botón`).

**Totales reales**:
- `npx ng build`: OK (`Application bundle generation complete`, exit 0).
- `npx ng test --watch=false`:
```
 Test Files  17 passed (17)
      Tests  77 passed (77)
```
- Durante desarrollo `encounter.page.spec.ts`: `Test Files 1 passed (1)`, `Tests 21 passed (21)` (19 previos + 2 nuevos).

**Responsive**:
Revisado en anchos 375, 768 y 1366 px dentro del editor de receta (`bd-side-sheet`).
- Tanto `bd-medication-form` como el contenedor en línea para guardar plantilla (`.prescription-item-form__save-preset-inline`) se adaptan sin scroll horizontal.
- Botones y campos interactivos cumplen el tamaño táctil mínimo de 44 px.

**Problemas y supuestos**:
- Al crear el medicamento desde el combobox, el editor preserva los valores previamente seleccionados del diagnóstico general e ítems ya cargados.
- Al guardar la plantilla con éxito, el nuevo preset se añade a `presets` del medicamento seleccionado y se selecciona automáticamente (`aria-pressed="true"`), dejando inalterados los datos del formulario del ítem.
- No se hizo commit.

## Revisión
Estado: APROBADO

- Cumple: acción `＋ Agregar «texto»` con 2+ caracteres, 0 resultados y sin búsqueda en curso; `bd-medication-form`
  de la 013d con el nombre prellenado (trim y mayúscula) dentro del mismo editor; `POST /medications` → queda
  seleccionado y toast; 409 dentro del formulario; «Guardar como plantilla» solo si hay medicamento, dosis, frecuencia y
  duración y no coincide con una posología existente; etiqueta sugerida `frecuencia × duración`; `POST …/presets` sin
  `quantity`; el botón nuevo queda elegido; `saving` sin doble envío; la receta solo se guarda con «Guardar borrador».
  Spec: 2 casos nuevos.
- Corrección de Claude: el editor alternaba `bd-medication-form` y `bd-prescription-item-form` con `@if/@else`, que
  destruía el formulario del ítem: «Cancelar» perdía el texto de búsqueda y la dosis escritos (criterio 1), y al volver
  a montarse reaplicaba un `createdMedication` viejo. Ahora el ítem y la lista quedan montados y se ocultan con
  `[hidden]` mientras se crea el medicamento.
- Totales tras la corrección: clínica `Test Files 3 passed (3)` · `Tests 25 passed (25)`.
- Pendiente no bloqueante: la plantilla nueva se agrega al medicamento seleccionado, pero no a los resultados de la
  búsqueda en memoria: si se vuelve a elegir el mismo medicamento sin buscar de nuevo, no aparece hasta la siguiente
  búsqueda.

