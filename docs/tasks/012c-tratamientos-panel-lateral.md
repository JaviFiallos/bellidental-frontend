# 012c — Atención: tratamientos con el formulario en el panel lateral

## Objetivo
Hoy `bd-treatments-section` es una tarjeta con el buscador del catálogo y el formulario del tratamiento dentro.
Pasa a comportarse **como la receta**: en la página queda la lista, el total de la sesión y un botón «Registrar
tratamiento»; el buscador y el formulario se abren en `bd-side-sheet` desde la derecha (pantalla completa en
`< md`), con la estructura `.sheet-form` de la 008d. Sin backend; mismos endpoints de la 012a/012b.

**Depende de:** 008d (`.sheet-form`).

## Archivos a tocar
```
src/app/features/treatments/
  index.ts                                        (modif.) exporta TreatmentEditorComponent
  components/treatment-editor/treatment-editor.component.ts  (nuevo) buscador + treatment-form, dumb, .sheet-form
  components/treatments-section/treatments-section.component.ts (modif.) sin buscador ni formulario; botón
  services/treatments.store.ts                    (modif.) editorOpen, openEditor(findingId?), closeEditor()
src/app/features/clinical/
  pages/encounter/encounter.page.ts               (modif.) bd-side-sheet del editor; "Tratar" abre el panel
  pages/encounter/encounter.page.spec.ts          (modif.) los casos de tratamientos abren el panel primero
```
`treatment-form` y `treatment-list` no cambian salvo lo que pida el contenedor nuevo.

## Criterios de aceptación
1. **`TreatmentsStore`**: `editorOpen = signal(false)`; `openEditor(findingId: string | null = null)` limpia
   `saveError` y la selección, pone `selectedFindingId = findingId` y abre; `closeEditor()` cierra y llama a
   `clearSelection()` y `setQuery('')`. `record()` exitoso **cierra el panel** (como guardar la receta).
2. **`bd-treatment-editor`** (dumb, `input()`/`output()`): título «Registrar tratamiento»
   (`id="treatment-editor-title"`, `.sheet-form__title`); el `bd-combobox` del catálogo (mismo template de opción,
   `catalogRequest` al enfocar, foco inicial en el buscador al abrir); debajo el `bd-treatment-form` del tratamiento
   elegido; si hay `selectedFindingId`, el formulario ya llega con el hallazgo elegido (comportamiento de 012b).
   Botón «Cancelar» en `.sheet-form__footer` → `close`. Errores de guardado dentro del panel.
3. **`bd-treatments-section`**: tarjeta con título «Tratamientos», botón «Registrar tratamiento» (`btn-primary`,
   ≥ 44 px, oculto si `isReadOnly`) en la cabecera como «Nueva receta» en `prescriptions-section`; lista, vacío,
   error de carga, `actionError` y total de la sesión como hoy. Se quitan los inputs/outputs que pasan al editor
   (`query`, `results`, `catalog*`, `selectedTreatment`, `selectedTooth`, `selectedFindingId`, `saving`, `saveError`,
   `pick`, `cancel`, `findingChange`, `register`, `queryChange`, `catalogRequest`) y se añade `openEditor` (output).
4. **Página de la atención**:
   - Nuevo `bd-side-sheet [isOpen]="treatmentsStore.editorOpen()" [fullscreenBelowMd]="true"
     titleId="treatment-editor-title" (closed)="treatmentsStore.closeEditor()"` con el editor, junto a los de
     antecedentes y receta.
   - **Un solo panel abierto a la vez**: abrir antecedentes, receta o tratamiento cierra los otros dos (helper en la
     página, p. ej. `openSheet('history' | 'prescription' | 'treatment')`).
   - «Tratar» del panel de la pieza (`onTreatFinding`) → `treatmentsStore.openEditor(finding.id)`. Se borran el
     `scrollIntoView`, el `setTimeout`, `#treatmentsBlock` y `treatmentsBlock`.
   - Tras registrar: toast «Tratamiento registrado» y recarga del odontograma si iba ligado a un hallazgo (como hoy);
     ya no se enfoca el buscador (el panel se cerró): el foco vuelve al botón «Registrar tratamiento».
   - El clic en una pieza (`toothActivate`) sigue precargando la pieza del formulario.
5. En `lg+` el panel no es modal y la página reserva el espacio como con la receta (mismo comportamiento de
   `bd-side-sheet`).

## Responsive
375, 768, 1024, 1366. En 375/768 el editor ocupa toda la pantalla; en 1366 a la derecha con el odontograma visible.
Revisar con 0 y con 6 tratamientos en la lista.

## Tests requeridos
Sin casos nuevos. En `encounter.page.spec.ts` se ajustan los 3 casos de tratamientos para interactuar como el usuario:
- «registra un tratamiento → aparece con su total»: clic en «Registrar tratamiento» → buscar → elegir → registrar →
  `POST …/treatments` (mismo body) → el panel se cierra y la fila aparece con su total.
- «anula tratamiento con motivo…»: sin cambio de flujo (la anulación sigue en la lista).
- «Tratar una caries pendiente…»: «Tratar» abre el panel con el hallazgo elegido → registrar → la cara pasa a
  obturación realizada.

## Prueba manual
1. Registrar un tratamiento desde el botón → se cierra el panel, aparece en la lista y el total cambia.
2. Odontograma → pieza con caries → «Tratar» → el panel se abre con el hallazgo → registrar → azul.
3. Con el panel de tratamiento abierto, abrir «Antecedentes» → se cierra el de tratamiento.
4. Atención de otro odontólogo (solo lectura) → no hay botón «Registrar tratamiento».

## Resultado
- Archivos creados: `src/app/features/treatments/components/treatment-editor/treatment-editor.component.ts`.
- Archivos modificados: `treatments/services/treatments.store.ts` (`editorOpen`, `openEditor(findingId?)`,
  `closeEditor()`; `record()` exitoso cierra el panel), `treatments/components/treatments-section/treatments-section.component.ts`
  (tarjeta con botón «Registrar tratamiento» en la cabecera; sin buscador ni formulario; `openEditor` output y
  `focusOpenButton()`), `treatments/index.ts` (exporta `TreatmentEditorComponent`),
  `clinical/pages/encounter/encounter.page.ts` (`bd-side-sheet` del editor; helper `openSheet()` para que solo un panel
  esté abierto; «Tratar» abre el panel con el hallazgo; se quitan `scrollIntoView`, `setTimeout` y `#treatmentsBlock`),
  `clinical/pages/encounter/encounter.page.spec.ts` (3 casos de tratamientos ajustados: clic en «Registrar tratamiento»
  y el buscador dentro de `.treatment-editor`; el de registro comprueba que el panel se cierra).
- `treatment-form` y `treatment-list` sin cambios.
- Build: OK (`npx ng build`, sin errores ni avisos).
- `ng test` (suite completa):
  `Test Files  15 passed (15)`
  `Tests  70 passed (70)`
- Specs de clínica (`--include='src/app/features/clinical/**/*.spec.ts'`): 3 archivos, 23 tests, todos OK.
- Anchos revisados: no hay navegador en este entorno, así que no se revisó visualmente. Por diseño: en 375 y 768
  (y 1024 por debajo de `md`/`lg` según `bd-side-sheet`) el editor ocupa pantalla completa; en 1366 es panel lateral
  no modal con el odontograma visible. Con 0 y con 6 tratamientos en la lista, el botón queda en la cabecera de la
  tarjeta (`flex-wrap`), ≥ 44 px. Esto debe confirmarlo el usuario a mano.
- Cómo levantar la prueba manual: nada extra (usa la atención en curso con diagnóstico activo y un hallazgo pendiente
  para el caso «Tratar»).
- Supuestos:
  - El editor tiene dos «Cancelar»: el del formulario (vuelve al buscador, como antes) y el del pie `.sheet-form__footer`
    (cierra el panel). Se dejó así para no tocar `treatment-form`.
  - Abrir antecedentes o receta cierra el editor de tratamiento y, si estaba abierto, descarta el borrador de la receta
    (y viceversa); es lo que pide el criterio «un solo panel abierto».
  - «Anular y rehacer» abre el editor de receta tras la anulación: en ese momento también se cierran los otros paneles.
  - El foco inicial al abrir va al buscador (`afterNextRender`); tras registrar, el foco vuelve a «Registrar tratamiento».
  - Los estilos de `.treatment-option` se movieron del section al editor (ahí se renderiza el catálogo).
  - Las carpetas `history-panel.component.ts` y `patient-clinical-header.component.ts` ya tenían cambios sin commit antes de
    esta tarea; no se tocaron.

## Revisión
Estado: APROBADO

- Cumple: store (`editorOpen`, `openEditor(findingId)`, `closeEditor()` limpia selección y query, `record()` exitoso
  cierra), `bd-treatment-editor` dumb con `.sheet-form` y foco inicial en el buscador, sección sin los inputs/outputs
  movidos y con `openEditor`, side-sheet con `titleId="treatment-editor-title"`, «Tratar» abre el panel con el hallazgo
  (sin `scrollIntoView`/`setTimeout`/`#treatmentsBlock`), foco al botón tras registrar, `toothActivate` sigue
  precargando la pieza (`clearSelection()` no toca `selectedTooth`), botón oculto en solo lectura, sin `focusSearch`
  muerto. Los 3 casos de tests interactúan como el usuario; ninguno borrado ni en skip.
- Corrección de Claude (pérdida de trabajo clínico): con el editor de receta abierto, «Antecedentes», «Registrar
  tratamiento» y «Tratar» descartaban el borrador sin aviso. Ahora `openSheet(sheet, open)` pide confirmar con
  `ConfirmDialogService` («Descartar el borrador de la receta», `danger`, «Descartar») antes de cambiar de panel; se
  confirma siempre que la receta esté abierta (el encabezado vive en el componente dumb y la página no sabe si cambió).
  El cierre sin confirmación queda en `closeOtherSheets()` para abrir la receta y «Anular y rehacer». Nuevos handlers
  `onOpenHistory()` y `onOpenTreatmentEditor(findingId?)`. Un tratamiento a medio llenar se descarta sin preguntar.
- Totales tras la corrección: clínica `Test Files 3 passed (3)` · `Tests 23 passed (23)`; `npx ng build` OK.
- Prueba manual extra: receta con ítems abierta → «Antecedentes» → aparece el diálogo; «Cancelar» la deja intacta.
