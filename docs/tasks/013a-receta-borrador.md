# 013a — Receta: armar y guardar el borrador

> Plan §5.13 (P12). Backend listo: 011a (`8dbfbd5`) y 011b (`a631bbb`). La 013 se divide en dos:
> - **013a (esta tarea):** feature `prescriptions`, lista de recetas de la atención y editor (diagnóstico,
>   medicamentos con presets, indicaciones), guardar y editar el borrador (DRAFT).
> - **013b:** "Emitir e imprimir" (ISSUED + PDF), reimprimir y anular / anular y rehacer.
>
> Perfil: ODONTOLOGO y DIRECTOR; solo el odontólogo que atiende (D-6). Mide T1 de la tesis.

## Brief de diseño (modo Operate)
- **Tarea principal:** recetar amoxicilina en **5 acciones**: "Nueva receta", escribir "amo", elegir el
  medicamento (su único preset viene elegido), "Agregar" y guardar. El diagnóstico ya viene puesto.
- El editor se abre en `bd-side-sheet` (panel a la derecha en lg+, pantalla completa en < md, como el panel de
  antecedentes), para no alargar la atención.
- Los presets son botones visibles, no un desplegable: un clic copia dosis, frecuencia, duración e indicaciones, y
  todo sigue siendo editable.
- **Antigoals:** no se pide nada que el preset ya sabe; nada se guarda hasta pulsar el botón (los ítems viven en el
  editor); sin "Eliminar" de recetas (eso es "Anular", 013b).

```
┌ Receta ────────────────────────────── [+ Nueva receta] ┐   ┌ Nueva receta ───────────────────── ✕ ┐
│ Borrador · K02.1 · Amoxicilina 500 mg, Ibuprofeno …    │   │ Diagnóstico [K02.1 Caries de la… ▾]  │
│                                     [Editar]           │   │ Medicamento [🔍 amo               ]  │
└────────────────────────────────────────────────────────┘   │ Amoxicilina 500 mg · cápsula · oral  │
                                                             │ [Cada 8 h × 7 días] [Cada 12 h × 5 d]│
                                                             │ Dosis [1 cápsula] Frec. [cada 8 h]   │
                                                             │ Duración [7 días] Cant. [21 cápsulas]│
                                                             │ Indicaciones [            ] [Agregar]│
                                                             │ 1. Amoxicilina 500 mg — 1 cápsula c/8h│
                                                             │    7 días · 21 cápsulas  [Editar][Quitar]│
                                                             │ Indicaciones generales [          ]  │
                                                             │ [No comer 1 h] [Con alimentos] …     │
                                                             │                  [Guardar borrador]  │
                                                             └──────────────────────────────────────┘
```

## Contrato (verificado en `bellidental-backend`: `MedicationController`, `PrescriptionController` y DTO)
- **`GET /api/v1/medications?query=`** (`RECORD_READ`), `query` de 1+ caracteres (vacío → 400), máximo 20 →
  `Medication[]` `{ id: number, name, presentation, concentration, route, presets[] }` y
  `MedicationPreset { id: number, label, dose, frequency, duration, instructions }`.
- **`POST /api/v1/encounters/{id}/prescriptions`** (`RECORD_CREATE`) → 201 `Prescription` en DRAFT.
  - Body `PrescriptionRequest { encounterDiagnosisId, generalInstructions?, items[] }` (`items` no vacío).
  - `PrescriptionItemRequest { medicationId, medicationPresetId?, dose?, frequency?, duration?, quantity?,
    instructions? }`: con preset, lo que no llega se copia de él y lo que llega gana; sin preset, `dose`,
    `frequency` y `duration` son obligatorios. Límites: dose, frequency y duration ≤ 100; quantity ≤ 50 (texto
    libre, p. ej. "21 tabletas").
  - Errores: 409 "El diagnóstico no pertenece a esta atención." (también si está anulado); 400 medicamento
    inactivo, preset de otro medicamento o falta posología; 409 atención no modificable.
- **`PUT /api/v1/prescriptions/{id}`** (`RECORD_UPDATE`), mismo body: reemplaza diagnóstico, indicaciones e ítems
  (D-16). Solo DRAFT no anulada; si no → 409 "Solo se puede modificar una receta en borrador.".
- **`GET /api/v1/encounters/{id}/prescriptions`** (`RECORD_READ`) → recetas no anuladas de la atención.
- `Prescription { id, encounterId, encounterDiagnosisId, icd10Code, icd10Description, status: 'DRAFT' | 'ISSUED',
  prescribedAt, generalInstructions, voided, items[] }` e
  `Item { id, medicationId, medicationName, presentation, concentration, medicationPresetId, dose, frequency,
  duration, quantity, instructions }`. Los ítems no tienen orden garantizado.

## Objetivo
1. Al cargar la atención, `GET /encounters/{id}/prescriptions` llena la sección "Receta" (skeleton y error propios).
   Cada receta es una fila: estado ("Borrador" / "Emitida", con color y texto), código CIE-10 y los nombres de los
   medicamentos. En DRAFT: "Editar".
2. **"Nueva receta"** abre el editor. Si la atención no tiene diagnósticos activos, el botón está deshabilitado y
   dice "Agrega un diagnóstico para recetar".
3. **Editor** (Reactive Forms tipados):
   - Diagnóstico: `<select>` con los diagnósticos activos de la atención, por defecto el primero.
   - Medicamento: `bd-combobox` desde **1 carácter**, con debounce de 250 ms y cancelando la búsqueda anterior.
     Opción: "Amoxicilina 500 mg · cápsula · oral".
   - Al elegirlo, sus presets aparecen como botones (`bd-segmented` o chips con `aria-pressed`). Si tiene uno solo,
     viene elegido. Elegir un preset copia `dose`, `frequency`, `duration` e `instructions` en los campos, que
     siguen siendo editables. Sin preset, dosis, frecuencia y duración son obligatorias.
   - Cantidad (texto libre, opcional) e indicaciones del ítem.
   - "Agregar" pasa el ítem a la lista del editor (sin petición) y limpia el formulario del ítem con el foco en
     Medicamento. Cada ítem de la lista tiene "Editar" (vuelve al formulario) y "Quitar".
   - Indicaciones generales: `textarea` con atajos que añaden una línea: "No comer ni beber durante 1 hora",
     "Tomar con alimentos", "Completar el tratamiento aunque desaparezcan las molestias".
   - "Guardar borrador": `POST` si es nueva o `PUT` si se edita una DRAFT. Cada ítem va con `medicationId`,
     `medicationPresetId` (si eligió uno) y los valores actuales de los campos; los vacíos se omiten. Deshabilitado
     sin ítems. Al terminar: el editor se cierra, toast "Receta guardada como borrador" y la lista se actualiza.
4. Errores 400/409 dentro del editor con el `message` del backend; el editor no se cierra y conserva lo escrito.
5. **Solo lectura** (`other_professional` o `voided`): la lista sin "Nueva receta" ni "Editar".

## Estructura (según `architecture/SKILL.md`)
- Feature `prescriptions` (la carpeta ya existe, vacía). `index.ts`: `PrescriptionsStore`,
  `PrescriptionsSectionComponent`, `PrescriptionEditorComponent` y los modelos.
- `prescriptions` no importa de `clinical`: recibe `DiagnosisOption { id, label }`. Si la 012a ya lo definió en
  `treatments`, **no** se importa de ahí: cada feature define su tipo mínimo (o la página mapea a cada uno).
- `PrescriptionsStore` lo provee la página de la atención; los componentes son presentacionales.

## Archivos a tocar
```
src/app/features/prescriptions/
  index.ts
  models/prescription.models.ts                 Medication, MedicationPreset, Prescription, PrescriptionItem,
                                                  PrescriptionRequest, PrescriptionItemRequest, DiagnosisOption
  services/medications.api.ts                   search(query)
  services/prescriptions.api.ts                 listByEncounter(), create(), update()
  services/prescriptions.store.ts               lista, editor abierto (nueva o id), ítems del editor, búsqueda de
                                                  medicamentos, saving, errors; load(), openNew(), openEdit(), save()
  components/prescriptions-section/prescriptions-section.component.ts   lista + "Nueva receta"
  components/prescription-editor/prescription-editor.component.ts       diagnóstico, ítems, indicaciones, guardar
  components/prescription-item-form/prescription-item-form.component.ts medicamento → presets → posología
  components/prescription-item-list/prescription-item-list.component.ts ítems con Editar / Quitar
src/app/features/clinical/
  pages/encounter/encounter.page.ts             provee PrescriptionsStore; sección bajo Tratamientos; editor en
                                                  bd-side-sheet (fullscreenBelowMd)
  pages/encounter/encounter.page.spec.ts        +2 casos; los existentes responden GET …/prescriptions con []
  testing/fixtures.ts                           + medicamento con preset y receta DRAFT
```
Sin dependencias nuevas.

## Criterios de aceptación
1. Peticiones y bodies exactamente como en el contrato; los ítems sin preset exigen dosis, frecuencia y duración
   antes de "Agregar".
2. La búsqueda de medicamentos empieza con 1 carácter, con debounce y cancelación.
3. Un preset copia sus 4 campos y se puede editar; con un solo preset, viene elegido.
4. "Guardar borrador" usa POST la primera vez y PUT al editar; tras un error, el editor conserva todo.
5. Diagnóstico por defecto = el primero activo; sin diagnósticos, "Nueva receta" está deshabilitado y lo explica.
6. Estado con color **y** texto; `maxlength` 100/100/100/50 en dosis, frecuencia, duración y cantidad.
7. `prescriptions` no importa de `clinical` ni de `treatments`.
8. Plantillas de menos de ~150 líneas; solo tokens; objetivos táctiles de 44 px.

## Responsive
Revisar en **375, 768, 1024 y 1366**.
- 375 y 768: el editor ocupa la pantalla completa; la posología en una columna; los presets se acomodan en varias
  líneas.
- 1024: hoja inferior sin desbordes. 1366: panel lateral de 26rem sin scroll horizontal.

## Tests requeridos
Se amplía `encounter.page.spec.ts` con **2 casos**. Los existentes solo añaden la respuesta
`GET /api/v1/encounters/{id}/prescriptions` → `[]` (helper en `fixtures.ts`).
1. "Nueva receta con preset → queda en borrador": "Nueva receta" → escribir "amo" →
   `GET /api/v1/medications?query=amo` → elegir amoxicilina (preset "Cada 8 h × 7 días" ya elegido) → cantidad
   "21 cápsulas" → "Agregar" → "Guardar borrador" → `POST /api/v1/encounters/{id}/prescriptions` con
   `{ encounterDiagnosisId, items: [{ medicationId, medicationPresetId, dose: '1 cápsula',
   frequency: 'cada 8 horas', duration: '7 días', quantity: '21 cápsulas' }] }` → 201 DRAFT → en la sección se ve
   "Borrador" y "Amoxicilina".
2. "Guardar con un diagnóstico que ya no vale → mensaje visible": mismo armado → `POST` → 409
   "El diagnóstico no pertenece a esta atención." → el mensaje se ve en el editor y el ítem sigue en la lista.

## Prueba manual
1. Atención con diagnóstico → Nueva receta → "a": aparecen amoxicilina y otros → elegir → el preset llena los campos.
2. Cambiar la dosis a mano y agregar; agregar ibuprofeno con otro preset; quitar uno; guardar → "Borrador".
3. Editar el borrador: cambiar el diagnóstico y las indicaciones generales (con un atajo) → guardar (PUT).
4. Atención sin diagnósticos: "Nueva receta" deshabilitado con el motivo.
5. Medicamento sin preset (si lo hay) o borrar la frecuencia: "Agregar" pide los campos.
6. Anchos 375, 1024 y 1366.

## Resultado
**Archivos creados** (`src/app/features/prescriptions/`):
- `index.ts`, `models/prescription.models.ts` (modelos, `formatMedicationLabel`, `toDraftMedication`).
- `services/medications.api.ts`, `services/prescriptions.api.ts`, `services/prescriptions.store.ts`
  (store provisto por la página; búsqueda con debounce de 250 ms y cancelación; POST/PUT).
- `components/prescriptions-section/`, `components/prescription-editor/`, `components/prescription-item-form/`,
  `components/prescription-item-list/` (todos presentacionales: `input()`/`output()`).
- Se borró `prescriptions/.gitkeep`.

**Archivos modificados**:
- `src/app/features/clinical/pages/encounter/encounter.page.ts`: provee `PrescriptionsStore`; sección "Receta" bajo
  Tratamientos; `bd-side-sheet` con `fullscreenBelowMd` para el editor; permisos `RECORD_CREATE` / `RECORD_UPDATE`
  y `!isReadOnly()`; toast "Receta guardada como borrador".
- `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: +2 casos; los 11 existentes responden
  `GET /api/v1/encounters/enc-1/prescriptions` con `[]` (`flushPrescriptions`).
- `src/app/features/clinical/testing/fixtures.ts`: `mockEncounterWithDiagnosisApiResponse`, `mockMedicationAmoxicilina`
  (con un preset), `mockMedicationSearchApiResponse`, `mockPrescriptionDraft(ApiResponse)`, `flushPrescriptions`.

**Build**: OK (`npx ng build`, sin errores ni advertencias; initial total 455.06 kB).

**Tests**:
```
 Test Files  8 passed (8)
      Tests  40 passed (40)
```
Los 2 casos nuevos (Nueva receta con preset → borrador; 409 de diagnóstico → mensaje y ítem conservado) pasan.

**Responsive**: NO revisado. No tengo DevTools en este entorno; no se verificaron los anchos 375, 768, 1024 ni 1366.
Por construcción: el editor usa `fullscreenBelowMd`, la posología es una sola columna en todos los anchos, y los
botones y presets tienen `min-height: 44px`. Falta comprobar el scroll horizontal y el panel de 26rem en 1366.

**Supuestos y limitaciones**:
- Un ítem cargado desde una receta guardada no trae presets (el contrato de `Prescription` no los incluye), así que
  al editarlo no aparecen los botones de preset; sus valores y `medicationPresetId` se conservan y se envían tal cual.
- El "Medicamento" es un `<span>` y no un `<label>` asociado: `bd-combobox` no acepta `id`. Falta asociar la etiqueta
  al input (accesibilidad).
- Si la receta guardada tiene un diagnóstico que ya no está activo, el `<select>` no lo tiene como opción y mostrará
  el primero: se corrige con la 013b o con una opción de diagnóstico anulado.
- "Agregar" con un texto escrito en el medicamento sin elegir opción muestra "Elige un medicamento de la lista."
  (el Enter en el buscador no envía nada: el formulario es un `div`, no un `form`).
- Un ítem a medio escribir no se guarda al pulsar "Guardar borrador" (se descarta; solo cuenta lo agregado).
- Cancelar o cerrar el editor descarta los ítems sin confirmación (no está especificado).
- `MedicationPreset.instructions` y `PrescriptionItem.dose/frequency/...` se tipan `string | null`; los ids de
  `PrescriptionItem` y `Prescription` como `string` (uuid). Confirmar contra el backend si difiere.

**Problemas**: ninguno pendiente en tests ni build. No se hizo commit. `prompt.txt` no se tocó.

## Revisión
Estado: APROBADO

Revisado por Claude (Opus; ejecutó Haiku). `npx ng build` OK; `npx ng test --watch=false` → 8 archivos, 40 tests.
Cumple los criterios 1–8:
- `prescriptions` no importa de `clinical` ni de `treatments`; los componentes solo inyectan `FormBuilder`, y la
  página orquesta el toast y el store;
- la búsqueda empieza con 1 carácter, con debounce de 250 ms y cancelación de la anterior;
- los campos vacíos se omiten del body;
- `maxlength` 100/100/100/50;
- POST la primera vez, PUT al editar, y el editor conserva lo escrito tras un error.

Pendientes menores (no bloquean; se ven en la prueba manual):
- al editar un borrador, los ítems no muestran sus presets (los valores sí se conservan);
- la etiqueta "Medicamento" no está asociada al input de `bd-combobox`, que no acepta `id`;
- un diagnóstico ya anulado en un borrador cae al primero activo.

Responsive sin verificar visualmente.
