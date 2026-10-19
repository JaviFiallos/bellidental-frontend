# 012b — Tratamiento ligado a un hallazgo: el rojo pasa a azul

> Plan §5.12 (P11, parte 2). Requiere la 012a. Backend 010b (`cf9a6c9`).
> Perfil: ODONTOLOGO y DIRECTOR, solo el odontólogo que atiende.

## Brief de diseño (modo Operate)
- **Tarea principal:** tratar lo que está pendiente en el odontograma en **4 acciones**: clic en la pieza, "Tratar"
  sobre el hallazgo rojo en el panel, elegir el tratamiento y "Registrar". La pieza, la cara y el hallazgo ya vienen
  puestos.
- El resultado se ve en el mismo sitio donde empezó: el odontograma pinta la cara o la pieza en azul.
- **Antigoals:** el odontólogo no tiene que registrar el hallazgo realizado a mano; nada cambia en el odontograma
  hasta que el backend responde.

## Contrato (backend 010b)
- `POST /api/v1/encounters/{id}/treatments` acepta `dentalFindingId` (hallazgo vigente del paciente, de esta
  atención o de una anterior).
  - Si el hallazgo está **PENDING**, el backend crea en esta atención el hallazgo **DONE** equivalente
    (CARIES → FILLING, EXTRACTION → MISSING_CARIES, el resto con la misma condición; D-14c pendiente de confirmar
    con la odontóloga). Si está DONE, solo lo liga.
  - Si `toothCode`/`surfaceCode` no llegan, el backend los copia del hallazgo.
  - Errores: 404 hallazgo inexistente; 409 "El hallazgo no pertenece a este paciente.", hallazgo anulado,
    "La condición del hallazgo no admite estado realizado.".
- Anular el tratamiento **no** anula el DONE creado (se anula en el odontograma si hace falta).
- `PerformedTreatment.dentalFindingId` vuelve en la respuesta.

## Objetivo
1. **Hallazgo pendiente** en el formulario de la 012a: un `<select>` opcional con los hallazgos **PENDING** vigentes
   del paciente (`OdontogramStore.findings()` con `status === 'PENDING'`). Etiqueta: "16 · Mesial · Caries", con
   la cara según la pieza (`surfaceLabel` del hallazgo). Si hay una pieza seleccionada, salen primero los de esa
   pieza y, si hay uno solo, viene elegido.
2. Con un hallazgo elegido, Pieza y Cara muestran las del hallazgo y quedan deshabilitadas; el body lleva
   `dentalFindingId` y **no** lleva `toothCode` ni `surfaceCode`.
3. **Atajo "Tratar"** en el panel de la pieza (`tooth-current-findings`): cada hallazgo PENDING vigente tiene un
   botón "Tratar" (solo si la atención es editable). Al pulsarlo, la página pasa el hallazgo a `TreatmentsStore`,
   hace scroll a la sección Tratamientos y pone el foco en su buscador con el hallazgo ya elegido.
4. Tras el 201 con un hallazgo PENDING: `odontogramStore.reload()`. La cara o la pieza se ve en azul y los índices
   CPO cambian.
5. En la lista, un tratamiento ligado a un hallazgo muestra un ícono de enlace con `aria-label` "Ligado al
   hallazgo de la pieza 16".
6. Errores 404/409 en línea con el `message` del backend.

## Estructura
- `odontogram` añade la salida `treatFinding: output<Finding>()` en `OdontogramComponent` (la reemite desde
  `tooth-panel` → `tooth-current-findings`). No importa de `treatments`.
- `treatments` recibe los hallazgos pendientes como `FindingOption { id, toothCode, surfaceCode, label }`; la página
  los mapea desde `OdontogramStore`. `treatments` no importa de `odontogram`.
- La página de la atención es la única que conoce los dos stores.

## Archivos a tocar
```
src/app/features/odontogram/
  components/tooth-current-findings/tooth-current-findings.component.ts   + botón "Tratar" en PENDING (editable)
  components/tooth-panel/tooth-panel.component.ts                         reemite treatFinding
  components/odontogram/odontogram.component.ts                           + output treatFinding
src/app/features/treatments/
  models/treatment.models.ts                    + FindingOption; RecordTreatmentRequest.dentalFindingId
  services/treatments.store.ts                  + pendingFindings (input de la página), selectedFinding,
                                                  focusRequest; record() con dentalFindingId; devuelve si hay que
                                                  recargar el odontograma
  components/treatment-form/treatment-form.component.ts   + select de hallazgo; pieza y cara bloqueadas
  components/treatment-list/treatment-list.component.ts   + ícono de enlace
src/app/features/clinical/pages/encounter/
  encounter.page.ts                             mapea los hallazgos PENDING → FindingOption; (treatFinding) →
                                                  store + scroll + foco; tras registrar con hallazgo → reload
  encounter.page.spec.ts                        +1 caso
```

## Criterios de aceptación
1. Con hallazgo: body `{ treatmentId, quantity, price, encounterDiagnosisId?, dentalFindingId }` sin pieza ni cara.
2. El select solo ofrece hallazgos PENDING vigentes; con una pieza seleccionada y un único pendiente en ella, viene
   elegido.
3. "Tratar" solo aparece en hallazgos PENDING y solo si la atención es editable; lleva al formulario con el foco en
   el buscador.
4. Tras registrar con un hallazgo PENDING, se pide de nuevo el odontograma y la cara se ve como realizada.
5. `odontogram` y `treatments` no se importan entre sí; los conecta la página.
6. Botones de 44 px, `aria-label` en el ícono de enlace, solo tokens.

## Responsive
Revisar en **375, 768, 1024 y 1366**. En < lg el panel de la pieza es una hoja inferior: "Tratar" la cierra antes de
hacer scroll a Tratamientos.

## Tests requeridos
Se amplía `encounter.page.spec.ts` con **1 caso**:
1. "Tratar una caries pendiente → la cara pasa a obturación realizada": odontograma con CARIES PENDING en 36 O →
   clic en la pieza 36 → "Tratar" → (catálogo) elegir D2330 → "Registrar" → `POST /api/v1/encounters/{id}/treatments`
   con `dentalFindingId` y **sin** `toothCode` → 201 → `GET /api/v1/patients/{id}/odontogram` (y lo que pida el
   `reload()` del store) → responder con FILLING DONE en 36 O → la cara tiene el `aria-label`
   "36 oclusal: obturación realizada" (o el texto que use el odontograma para DONE).

## Prueba manual
1. Registrar una caries en 36 O (rojo) → en el panel, "Tratar" → elegir resina → Registrar → la cara pasa a azul.
2. Extracción indicada en 48 → tratar con exodoncia → la pieza queda como perdida por caries.
3. Hallazgo de una atención anterior: abrir otra atención del mismo paciente y tratarlo desde el select.
4. Anular el tratamiento: el azul se queda (se anula aparte en el odontograma).
5. Tablet (768): "Tratar" cierra la hoja inferior y lleva al formulario.

## Resultado
- **Archivos modificados** (sin commit):
  - `odontogram`: `tooth-current-findings` (input `canTreat`, output `treatClick`, botón "Tratar" solo en PENDING);
    `tooth-panel` (input `canTreat`, output `treatFinding`); `odontogram.component` (output `treatFinding`,
    `onTreatFinding` cierra la selección de pieza y reemite).
  - `treatments`: `models/treatment.models.ts` (`FindingOption`, `dentalFindingId` en la petición);
    `services/treatments.store.ts` (`selectedFindingId`, `selectFinding()`, se limpia al registrar o cancelar);
    `components/treatment-form` (select "Hallazgo pendiente" si hay pendientes, orden por pieza, pieza y cara
    bloqueadas con las del hallazgo, body con `dentalFindingId` sin `toothCode`/`surfaceCode`, `findingChange`);
    `components/treatments-section` (inputs `pendingFindings`, `selectedFindingId`, output `findingChange`);
    `components/treatment-list` (+ `bd-icon` Link2 con aria-label "Ligado al hallazgo de la pieza N") y su scss.
  - `clinical/pages/encounter/encounter.page.ts`: `pendingFindingOptions` (PENDING → `FindingOption`, etiqueta
    `pieza · cara · condición`); `onTreatFinding` (preselecciona, en un `setTimeout` hace scroll al bloque de
    Tratamientos y foco al buscador); `onRegisterTreatment` recarga el odontograma si el hallazgo era PENDING.
    Envuelve `bd-treatments-section` en un `<div #treatmentsBlock>` para el scroll.
  - `clinical/pages/encounter/encounter.page.spec.ts`: +1 caso ("Tratar una caries pendiente → la cara pasa a
    obturación realizada").
- **Build**: `npx ng build` OK (bundle generado, sin errores).
- **Tests** (`npx ng test --watch=false`):
  `Test Files  8 passed (8)`
  `Tests  38 passed (38)`
  (El spec de clínica solo: `Test Files  1 passed (1)`, `Tests  11 passed (11)`.)
- **Responsive**: no verificado visualmente (sin DevTools). Reglas aplicadas: botones "Tratar" y "Anular" con
  `min-height: 44px`; el ícono de enlace tiene `aria-label`; solo tokens de color; el scroll de la página
  se hace al bloque de Tratamientos tras cerrar el panel de la pieza (en < lg la hoja inferior se cierra al
  pulsar "Tratar"). Pendiente de revisar a 375, 768, 1024 y 1366.
- **Supuestos y decisiones**:
  - El cierre del panel de la pieza lo hace `OdontogramComponent.onTreatFinding` (no la página): limpia la
    pieza y la cara seleccionadas antes de emitir `treatFinding`. No llama a `onClearSelection`, que devuelve
    el foco a la pieza y le quitaría el foco al buscador.
  - El foco y el scroll van en `setTimeout` porque el panel se cierra en el siguiente ciclo de detección de
    cambios. El test espera ese timer con un `setTimeout` real.
  - El aria-label de la cara en el test no es "obturación realizada" sino el `<title>` real del SVG
    (`36 · … : Obturación (Realizado)`); la aserción usa el fill `#1E88E5` y ese título.
  - Sin `focusRequest` en el store: la página llama a `focusSearch()` directamente.
  - Para hallazgos de prótesis (span), la etiqueta del select sale como `36 · de 36 a 38 · Prótesis` (el
    `toothCode` se repite). No está cubierto en la tarea; queda anotado.
  - La pieza y la cara bloqueadas se restauran a la pieza de la atención si se quita el hallazgo.
- **Problemas**: ninguno en build ni tests. `prompt.txt` ya venía modificado antes de esta tarea; no se tocó.
- **Para la prueba manual**: nada extra; usar un paciente con una caries PENDING en la atención abierta.

## Revisión

Estado: APROBADO

Revisado por Claude (Opus; ejecutó Haiku). `npx ng build` OK; `npx ng test --watch=false` → 8 archivos, 38 tests.
Cumple los criterios 1–6:
- con un hallazgo elegido, el body lleva `dentalFindingId` sin pieza ni cara;
- el select solo ofrece hallazgos PENDING, y con una pieza seleccionada que tiene un único pendiente, viene elegido;
- "Tratar" solo aparece si la atención es editable;
- después de registrar, se pide de nuevo el odontograma;
- `odontogram` y `treatments` no se importan entre sí.

Se acepta que el test verifique el `<title>` del SVG ("Obturación (Realizado)") en lugar del texto de la tarea, y que
sea `OdontogramComponent` quien cierra el panel.
Pendiente menor (sin bloquear): en prótesis (SPAN) la etiqueta del select no muestra la pieza final.
Responsive sin verificar visualmente: queda para la prueba manual del usuario.
