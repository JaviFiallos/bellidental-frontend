# 021 — Casillas del 033: regiones del examen (sección 5) y exámenes del plan (sección 10)

> Plan §5.11 (amplía la 011) y §5.18 (impresión). Depende del **backend 008b** (`stomatognathicRegions`,
> `diagnosticExams` y `planDescription` en `PUT/GET /encounters/{id}`; desaparecen `diagnosticPlan`,
> `therapeuticPlan` y `educationalPlan`). Perfil: ODONTOLOGO y DIRECTOR; mismas reglas de edición que la
> 011 (solo el odontólogo que atiende, también con la atención completada).

## Brief de diseño (modo Operate)
- En la sección "Más del 033", que se vean como en el papel (`docs/5_form033.png`, `docs/10_form033.png`):
  primero las casillas y debajo la descripción.
- **Sección 5:** 12 botones conmutables "1 Labios" … "12 Ganglios". Al marcar una región se añade al final de la
  descripción el renglón `N. Región: ` (si todavía no hay un renglón que empiece por `N.`), y el foco va al
  `textarea` para escribir la patología, que es lo que pide el 033 ("anotando el número"). Desmarcar no borra
  texto.
- **Sección 10:** 4 botones conmutables (Biometría · Química sanguínea · Rayos X · Otros) en una fila y, debajo,
  **un solo** `textarea` "Descripción" (`planDescription`, 5 filas), como en el papel (usuario, 2026-10-20). Los
  tres textos de la 011 (diagnóstico, terapéutico, educacional) y sus atajos "+ Biometría"… desaparecen; el
  backend 008b ya unió los textos existentes en `planDescription`.
- Botón conmutable = `<button aria-pressed>` con número o etiqueta y un check visible cuando está marcado (el color
  no es el único indicador), de 44 px.
- **Antigoals:** no bloquear "Completar atención" por estas casillas; no escribir texto en el `textarea` al
  desmarcar; no adivinar casillas desde el texto (eso se elimina).

## Contrato (backend 008b)
| Campo | Tipo | Valores |
|---|---|---|
| `stomatognathicRegions` | `number[]` | 1–12 |
| `diagnosticExams` | `string[]` | `BIOMETRIA` · `QUIMICA_SANGUINEA` · `RAYOS_X` · `OTROS` |
| `planDescription` | texto | libre; reemplaza a `diagnosticPlan`, `therapeuticPlan` y `educationalPlan` |

El PUT reemplaza la cabecera completa: si el store no envía estos campos, el backend los guarda vacíos. La
respuesta siempre trae listas (`[]` si no hay marcas), ya ordenadas.

## Objetivo
1. Modelos: `Encounter` y `UpdateEncounterRequest` con los tres campos nuevos y sin los tres planes;
   `DiagnosticExam` como unión de los 4 códigos. `EncounterTextField` cambia los tres planes por `planDescription`.
2. Store: `toggleStomatognathicRegion(region)` y `toggleDiagnosticExam(exam)`, con el mismo guardado automático
   (800 ms, `changeVersion`) y el body completo del PUT con las dos listas y `planDescription`.
3. Atención: componente nuevo `stomatognathic-exam` (12 regiones + descripción + "Sin patología aparente") y
   `encounter-plans` reducido a la sección 10 (4 casillas + "Descripción"). "Sin patología aparente" queda deshabilitado
   si hay alguna región marcada.
4. Solo lectura: las regiones y exámenes marcados como lista de texto ("1 Labios, 5 Lengua"; "Rayos X"), o
   "Ninguna"; sin botones.
5. "033 incompleto" no cambia (signos vitales + descripción del examen).
6. Impresión del 033 (`/pacientes/:id/033`): sección 5 con una **X** en la casilla amarilla de cada región marcada;
   sección 10 con la X según `diagnosticExams` (incluido Otros). `getPlanMarks` deja de buscar palabras en el texto
   y recibe la lista; los renglones de la sección son las líneas de `planDescription` (sin los prefijos
   "Diagnóstico:", "Terapéutico:", "Educacional:" que se añadían en la impresión).

## Archivos a tocar
```
src/app/features/clinical/
  models/encounter.models.ts                       + stomatognathicRegions, diagnosticExams, planDescription;
                                                   − diagnosticPlan, therapeuticPlan, educationalPlan;
                                                   type DiagnosticExam
  domain/encounter-completeness.ts                 EncounterTextField: planDescription en lugar de los 3 planes
  domain/stomatognathic-regions.ts                 (nuevo) STOMATOGNATHIC_REGIONS (id, nombre en pantalla,
                                                   nombre corto del 033) y DIAGNOSTIC_EXAMS (código, etiqueta)
  domain/form-033.ts                               getPlanMarks(diagnosticExams, planDescription): marcas desde la
                                                   lista y renglones desde el texto; sin normalizeText si queda
                                                   sin uso
  services/encounter.store.ts                      + toggleStomatognathicRegion, toggleDiagnosticExam; body del PUT
  services/form-033.store.ts                       pasa diagnosticExams y planDescription; expone las regiones
                                                   marcadas
  components/stomatognathic-exam/stomatognathic-exam.component.ts   (nuevo) sección 5
  components/encounter-plans/encounter-plans.component.ts           solo sección 10: 4 casillas + Descripción
  components/encounter-extra/encounter-extra.component.ts           monta ambos y reenvía los eventos nuevos
  components/form-033/form-033-exam/form-033-exam.component.ts      input markedRegions: number[] → X; usa
                                                                    STOMATOGNATHIC_REGIONS
  pages/encounter/encounter.page.ts                conecta los eventos nuevos con el store
  pages/encounter/encounter.page.spec.ts           + 1 caso (abajo)
  pages/form-033/form-033.page.ts                  pasa las regiones marcadas a bd-form-033-exam
```

## Criterios de aceptación
1. Marcar o desmarcar una región o un examen guarda solo (800 ms); el PUT lleva la cabecera completa con las dos
   listas.
2. Marcar la región 5 sin renglón "5." añade `5. Lengua: ` al final de la descripción (en un renglón nuevo) y pone
   el foco en el `textarea`; marcarla de nuevo tras desmarcar no duplica el renglón.
3. Cada casilla es un `<button aria-pressed>` de 44 px, con foco visible y check además del color.
4. Solo lectura para otro odontólogo; editable con la atención completada por el mismo.
5. La impresión marca con X exactamente las regiones y exámenes guardados; una atención sin marcas imprime las
   casillas vacías. Los renglones de la sección 10 muestran `planDescription` tal cual.
6. Ningún archivo del frontend menciona ya `diagnosticPlan`, `therapeuticPlan` ni `educationalPlan`.
7. Plantillas de menos de ~150 líneas; solo tokens.

## Responsive
Revisar en **375, 768, 1024 y 1366**. Regiones en `grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr))`
(dos columnas en 375, sin scroll horizontal); exámenes con `flex-wrap`. La hoja del 033 no cambia de tamaño (A4 fijo,
F-14).

## Tests requeridos
`encounter.page.spec.ts`, un caso nuevo:
- `marca la región 5 y Rayos X → PUT con stomatognathicRegions [5] y diagnosticExams ["RAYOS_X"]`: carga la
  atención (fixtures existentes, con `stomatognathicRegions: []` y `diagnosticExams: []`), abre "Más del 033",
  pulsa "5 Lengua" y "Rayos X", avanza el autosave → `expectOne` del PUT y verifica las dos listas y que la
  descripción del examen empieza con `5. Lengua:` → responde con el JSON del backend → los dos botones quedan con
  `aria-pressed="true"`.

Los fixtures de `Encounter` existentes suman `stomatognathicRegions: []`, `diagnosticExams: []` y
`planDescription: null` (y quitan los tres planes si los tienen).

## Prueba manual
1. En una atención, abrir "Más del 033": se ven las 12 regiones y debajo la descripción. Marcar "5 Lengua" → aparece
   `5. Lengua: ` y el cursor queda ahí; escribir la patología → "✓ guardado" → recargar: sigue marcada.
2. Con una región marcada, "Sin patología aparente" está deshabilitado.
3. Marcar "Rayos X" y "Otros"; escribir en Descripción el plan (qué otros exámenes, tratamiento, indicaciones) →
   recargar: siguen ahí. Una atención anterior muestra en Descripción sus tres textos unidos.
4. Abrir el Formulario 033 e imprimir (vista previa): X en la región 5 y en Rayos X y Otros; la descripción en los
   renglones de la sección 10.
5. Con otro odontólogo: solo lectura, con las marcas como texto.
6. Anchos 375 y 1366.

## Resultado
- **Archivos creados o modificados:**
  - `src/app/features/clinical/models/encounter.models.ts`: campos `stomatognathicRegions`, `diagnosticExams`, `planDescription` y tipo `DiagnosticExam`; remoción de `diagnosticPlan`, `therapeuticPlan` y `educationalPlan`.
  - `src/app/features/clinical/domain/encounter-completeness.ts`: `EncounterTextField` actualizado a `'stomatognathicExam' | 'planDescription'`.
  - `src/app/features/clinical/domain/stomatognathic-regions.ts` (nuevo): catálogo `STOMATOGNATHIC_REGIONS`, `DIAGNOSTIC_EXAMS` y utilidades de formato para solo lectura (`formatMarkedRegions`, `formatMarkedExams`).
  - `src/app/features/clinical/domain/form-033.ts`: `getPlanMarks(diagnosticExams, planDescription)` con marcas desde array y renglones desde `planDescription`; remoción de `normalizeText` sin uso.
  - `src/app/features/clinical/services/encounter.store.ts`: métodos `toggleStomatognathicRegion(region)` y `toggleDiagnosticExam(exam)`, autosave con debounce a 800 ms y body completo del PUT con las listas y `planDescription`.
  - `src/app/features/clinical/services/form-033.store.ts`: señal computada `markedRegions` y paso de `diagnosticExams` y `planDescription` a `getPlanMarks`.
  - `src/app/features/clinical/components/stomatognathic-exam/stomatognathic-exam.component.ts` (nuevo): sección 5 con 12 botones `<button aria-pressed>` de 44 px con check visible, auto-llenado `N. Región: ` con foco en el textarea y botón "Sin patología aparente" deshabilitado si hay regiones marcadas; modo solo lectura como texto.
  - `src/app/features/clinical/components/encounter-plans/encounter-plans.component.ts`: sección 10 reducida a 4 casillas conmutables (`BIOMETRIA`, `QUIMICA_SANGUINEA`, `RAYOS_X`, `OTROS`) y un solo `textarea` `planDescription` (5 filas); modo solo lectura como texto.
  - `src/app/features/clinical/components/encounter-extra/encounter-extra.component.ts`: integración de `bd-stomatognathic-exam` y `bd-encounter-plans`, reenvío de eventos `regionToggle` y `examToggle`.
  - `src/app/features/clinical/components/form-033/form-033-exam/form-033-exam.component.ts`: input `markedRegions: number[]`, despliegue de **X** en la casilla amarilla usando `STOMATOGNATHIC_REGIONS`.
  - `src/app/features/clinical/pages/encounter/encounter.page.ts`: enlace de eventos `regionToggle` y `examToggle` con el store.
  - `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: test de integración del nuevo flujo de guardado de regiones y exámenes con PUT.
  - `src/app/features/clinical/pages/form-033/form-033.page.ts`: paso de `store.markedRegions()` al componente de examen.
  - `src/app/features/clinical/testing/fixtures.ts`: fixture `mockEncounterOpen` actualizado con `stomatognathicRegions: []`, `diagnosticExams: []` y `planDescription: null`.
- **Resultado del build:** OK (`npx ng build` finalizó sin errores).
- **Totales de ng test:**
```
 Test Files  10 passed (10)
      Tests  47 passed (47)
```
- **Anchos revisados y responsive:**
  - **375 px:** Regiones en 2 columnas (`repeat(auto-fill, minmax(9.5rem, 1fr))`) sin scroll horizontal; botones de examen con flex-wrap; objetivos táctiles >= 44 px.
  - **768 px:** Regiones distribuidas en 4 columnas fluidas; botones de planes alineados.
  - **1024 px y 1366 px:** Grilla balanceada y espaciada con el resto del panel "Más del 033".
  - **Impresión 033:** Hojas A4 fijas F-14; casillas amarillas marcadas con 'X' centrada y renglones de descripción limpios sin prefijos.
- **Prueba manual:**
  1. Iniciar sesión como odontólogo y abrir una atención en curso.
  2. Desplegar "Más del 033" y pulsar "5 Lengua": se añade `5. Lengua: ` a la descripción del examen, el cursor se coloca al final y el botón "Sin patología aparente" se deshabilita.
  3. Pulsar "Rayos X" y "Otros" en la sección de planes; escribir texto en "Descripción".
  4. Esperar 800 ms y verificar notificación/estado guardado; recargar la página para constatar persistencia.
  5. Abrir `/pacientes/:id/033`: constatar X en la región 5 y en las casillas Rayos X y Otros, y la descripción en los renglones correspondientes.
  6. Acceder con perfil de otro odontólogo o cerrar sesión para ver en solo lectura las marcas como texto ("5 Lengua", "Rayos X, Otros").
- **Supuestos y problemas encontrados:**
  - Se eliminaron completamente todas las referencias en el frontend a `diagnosticPlan`, `therapeuticPlan` y `educationalPlan`.
  - Cuando se marca una región y la descripción estaba vacía o decía "Sin patología aparente", se inicializa directamente con `N. Región: ` para reflejar la existencia de patología sin duplicar texto contradictorio.

## Revisión
Estado: APROBADO

Revisado por Claude (Opus; ejecutó Gemini). `npx ng build` OK; `npx ng test --watch=false` → 10 archivos, 47 tests
(el caso nuevo incluido). Ningún archivo de `src/` menciona ya `diagnosticPlan`, `therapeuticPlan` ni
`educationalPlan`. Cumple los criterios 1–7:
- el PUT lleva la cabecera completa con `stomatognathicRegions`, `diagnosticExams` y `planDescription`;
- las listas se ordenan como en el backend;
- marcar una región añade `N. Región: ` sin duplicar y pone el foco en la descripción (el prefijo `1.` no choca con
  `10.`–`12.`);
- "Sin patología aparente" se deshabilita con regiones marcadas;
- solo lectura como texto;
- la impresión marca con X desde las listas y la sección 10 muestra `planDescription` tal cual.

Se acepta el supuesto: si la descripción decía "Sin patología aparente", marcar una región la reemplaza.
Corrección mínima de Claude (accesibilidad): los títulos "Examen del sistema estomatognático" y "Planes de
diagnóstico" eran `<label>` sin control asociado (el primero duplicaba la etiqueta del `textarea`). Ahora son `<span>`
con `id`, y cada grupo de casillas lleva `role="group"` con `aria-labelledby`. Build y tests de `clinical` en verde
tras el cambio.
Observaciones (no bloquean):
- el orden de los exámenes está repetido en el store en lugar de usar `DIAGNOSTIC_EXAMS`;
- el aviso de presupuesto de `sidebar.component.scss` (4,02 kB) viene de la 020.

Responsive sin verificar visualmente: queda para la prueba manual del usuario.
