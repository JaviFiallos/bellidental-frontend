# 008d — Atención: cabecera en dos grupos y panel de antecedentes con los márgenes de la receta

## Objetivo
1. En la cabecera de la atención (`bd-patient-clinical-header`), `div.patient-clinical-header__chips` mezcla todo
   en una sola fila. Se divide en **dos grupos**:
   - **Clínico:** botón «Antecedentes» / «Registrar antecedentes» + chips de alerta (o «No refiere antecedentes»
     o «Antecedentes sin registrar») + chip de medicación.
   - **Documentos:** «Formulario 033» + «Historial de cambios» (este solo si `canViewChanges`).
2. El panel de antecedentes (`bd-history-panel` en `bd-side-sheet`) está «pegado a los bordes» (`padding:
   var(--space-md)`), mientras el editor de receta usa `--space-xl`. Se crea una estructura común de formulario en
   panel lateral, `.sheet-form`, que usan los dos (y la 012c para tratamientos).
Sin backend, sin API nueva.

## Archivos a tocar
```
src/styles.scss                                                   (modif.) clases globales .sheet-form*
src/app/features/clinical/
  components/patient-clinical-header/patient-clinical-header.component.ts  (modif.) dos grupos
  components/history-panel/history-panel.component.ts            (modif.) usa .sheet-form
  pages/encounter/encounter.page.ts                              (modif.) alerta general del panel dentro del panel
src/app/features/prescriptions/
  components/prescription-editor/prescription-editor.component.ts (modif.) usa .sheet-form (sin cambio visual)
```

## Criterios de aceptación
1. **`.sheet-form` en `styles.scss`** (tokens de §2.3, se toman los valores actuales de `prescription-editor`):
   - `.sheet-form` → `display: flex; flex-direction: column; gap: var(--space-md); padding: var(--space-xl)
     var(--space-xl) var(--space-lg); box-sizing: border-box;` y en `< sm` (`bp-down` o el mixin que exista;
     si no existe, `@media` con el token `sm`) `padding: var(--space-lg) var(--space-md)`.
   - `.sheet-form__title` → igual que `.prescription-editor__title` (fuente de títulos, `--fs-lg`, 600,
     `--blue-950`, `padding-right: 2.5rem` para el ✕ de la hoja).
   - `.sheet-form__section` → bloque con `gap: var(--space-sm)`; `.sheet-form__subtitle` como
     `.prescription-editor__subtitle`.
   - `.sheet-form__footer` → como `.prescription-editor__footer` (borde superior, botones a la derecha, ≥ 44 px).
2. **`prescription-editor`**: reemplaza sus reglas de contenedor, título, subtítulo, bloque y pie por las clases
   `.sheet-form*` (borra las propias que queden repetidas). **Visualmente idéntico** al actual.
3. **`history-panel`**: el contenedor usa `.sheet-form` y el título `.sheet-form__title` (mismo tamaño que el de
   la receta); sus secciones usan `.sheet-form__section`/`__subtitle`. Se quitan `padding: var(--space-md)` y los
   estilos de título propios. Las filas de condiciones y el formulario de entrada no cambian de lógica.
4. **Alerta general del panel**: en `encounter.page.ts` la `bd-alert` de `historyStore.generalError()` hoy queda
   fuera del padding. Pasa como input `generalError` a `bd-history-panel`, que la muestra bajo el título (dentro
   del padding). Sin cambio de comportamiento.
5. **Cabecera**: `__line2` contiene `.patient-clinical-header__clinical` y `.patient-clinical-header__documents`.
   - `≥ md`: una fila, `justify-content: space-between`; clínico a la izquierda (con `flex-wrap: wrap`, ya no
     scroll horizontal con `nowrap`), documentos a la derecha sin partirse.
   - `< md`: documentos debajo del grupo clínico, alineados a la izquierda; los chips siguen pudiendo envolver.
   - El orden en el DOM es: botón Antecedentes primero, después los chips (el botón queda al inicio del grupo).
   - Los botones de ambos grupos miden ≥ 44 px de alto en `pointer: coarse` (como hoy en tablet).
   - El grupo documentos lleva `role="group" aria-label="Documentos del paciente"`; el clínico
     `aria-label="Antecedentes del paciente"`.

## Responsive
375, 768, 1024, 1366. Revisar la cabecera con 0, 1 y 4 antecedentes y con medicación larga; y el panel de
antecedentes (pantalla completa en `< md`, lateral en `lg+`) junto al editor de receta: mismos márgenes y título.

## Tests requeridos
Sin tests nuevos (solo estilos y estructura). Los casos actuales de `encounter.page.spec.ts` deben seguir pasando
(cabecera con antecedentes, registrar antecedente, «No refiere» con 409: el mensaje sigue visible).

## Prueba manual
1. Atención de un paciente con 3 antecedentes y medicación → a la izquierda Antecedentes + chips; a la derecha
   Formulario 033 (y, con el director, Historial de cambios).
2. Abrir Antecedentes y luego Nueva receta → mismos márgenes, mismo tamaño de título, el ✕ no pisa el título.
3. Provocar el 409 de «No refiere» → el mensaje se ve dentro del panel con margen.
4. 375 px: los grupos se apilan, nada se corta.

## Resultado
**Archivos modificados**
- `src/styles.scss`: clases globales `.sheet-form`, `__title`, `__subtitle`, `__section`, `__footer` (`bp-down(sm)` para el padding reducido).
- `features/clinical/components/patient-clinical-header/patient-clinical-header.component.ts`: `__line2` con dos grupos (`__clinical` con botón Antecedentes primero y chips; `__documents` con Formulario 033 e Historial de cambios). `role="group"` con los `aria-label` pedidos. Se quitó `overflow-x: auto` y el `nowrap`.
- `features/clinical/components/history-panel/history-panel.component.ts`: contenedor `history-panel sheet-form`, título `sheet-form__title`, secciones `sheet-form__section`. Input nuevo `generalError` que muestra `bd-alert` bajo el título. Se quitaron padding y estilos de título propios.
- `features/clinical/pages/encounter/encounter.page.ts`: la `bd-alert` de `generalError` sale de la hoja y se pasa como `[generalError]` a `bd-history-panel`.
- `features/prescriptions/components/prescription-editor/prescription-editor.component.ts`: usa `sheet-form*`; se borraron sus reglas de contenedor, título, subtítulo, bloque y pie. Se mantuvo la clase `prescription-editor` en la raíz (sin estilos) porque `encounter.page.spec.ts` la consulta.

**Tests**
- `npx ng test --watch=false --include='src/app/features/clinical/**/*.spec.ts'`: `Test Files  3 passed (3)` / `Tests  23 passed (23)`.
- `prescriptions`: no hay archivos `*.spec.ts` en ese feature; no se ejecutó nada ahí.
- Completa, una vez: `Test Files  15 passed (15)` / `Tests  70 passed (70)`.
- `npx ng build`: OK (exit 0, sin errores ni warnings).

**Responsive (no hay navegador: la verificación visual la hace el usuario)**
- Cabecera: `< md` (menos de 900 px) columna con los grupos apilados y alineados a la izquierda. `≥ md` fila con `space-between`, clínico con `flex-wrap`, documentos con `nowrap` y `flex-shrink: 0`. Chip de medicación con `max-width: 100%` y `overflow-wrap: anywhere` para textos largos. Botones con `min-height: 44px` (ya existía).
- Panel de antecedentes y receta: `.sheet-form` con padding `xl xl lg` y, por debajo de 600 px, `lg md`. Título con `padding-right: 2.5rem` para el ✕.

**Supuestos**
- El padding reducido por debajo de `sm` ahora también aplica a la receta (antes era fijo), tal como pide el criterio 1. Es el único cambio visual en el editor de receta.
- El `sheet-form__section` usa gap `sm` (antes el panel de antecedentes tenía `xs` entre secciones), así que hay un poco más de aire entre bloques del panel.
- El `<header>` del panel de antecedentes se reemplazó por el `h2` directo (mismo `id`). Se quitó el borde inferior del encabezado.

**Prueba manual**
Los pasos de la sección `## Prueba manual` del archivo de la tarea.

**Ajenos**
Ninguno: el build y la suite completa pasaron en esta ejecución.

## Revisión
Estado: APROBADO

- Cumple: `.sheet-form*` en `styles.scss` copia exactamente los valores del editor de receta (padding `xl xl lg`,
  título `--font-heading`/`--fs-lg`/600/`padding-right: 2.5rem`, subtítulo, bloque `gap sm`, pie con borde) y usa
  `bp.bp-down(sm)` de `_breakpoints.scss`; el editor no conserva reglas duplicadas y la clase raíz
  `prescription-editor` sin estilos se justifica porque `encounter.page.spec.ts` la consulta.
- Cabecera: grupos `__clinical` / `__documents` con `role="group"` y los `aria-label` pedidos, botón Antecedentes
  primero, `flex-wrap` sin scroll `nowrap`, fila con `space-between` en `bp-up(md)` y columna alineada a la
  izquierda debajo; botones con `min-height: 44px` (como antes).
- `history-panel` recibe `generalError` como input y lo muestra bajo el título; la página ya no pinta la alerta
  fuera. Solo tokens existentes.
- Sin correcciones de Claude. Cambios visuales asumidos y aceptados: padding reducido `< sm` también en la receta,
  `gap sm` entre secciones del panel y sin borde bajo el título de antecedentes.
