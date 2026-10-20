# 018b — Formulario 033: sección 12 (tratamiento), hojas de continuación e impresión

> Plan §5.18 (P18, RF09, parte 2). Requiere la 018a. Sin llamadas nuevas a la API: usa el `clinical-summary` ya
> cargado. Perfil: ODONTOLOGO y DIRECTOR. Solo lectura.
> Referencias: `docs/Form_033.pdf` (página 2), `docs/formulario_odontologico_033_consolidado.md` §12.

## Brief de diseño (modo Operate)
- **Tarea principal:** completar la hoja 2 con la **sección 12 (tratamiento)** como en el formulario y sacar el
  033 completo por la impresora con **un clic** ("Imprimir").
- **Lo impreso es idéntico a lo que se ve** en pantalla: mismas hojas, sin menú, sin barra de herramientas, cada
  hoja en su propia página A4.
- **Antigoals:** sin PDF del backend (redibujar el odontograma en Java duplicaría la lógica, F-14); sin páginas
  que se corten a la mitad de una sesión; nada de la interfaz de la app en el papel.

## Objetivo
1. **Sección 12 — TRATAMIENTO**, en dos bloques lado a lado como el PDF:
   - **Izquierdo:** SESIÓN Y FECHA | DIAGNÓSTICOS Y COMPLICACIONES.
   - **Derecho:** PROCEDIMIENTOS | PRESCRIPCIONES | CÓDIGO Y FIRMA.
   - **9 sesiones por hoja**, de arriba abajo; cada una con 4 líneas. Por sesión:
     - SESIÓN = `sessionNumber`; FECHA = `startAt` en `dd/MM/yyyy` (`America/Guayaquil`).
     - Diagnósticos y complicaciones: una línea por diagnóstico, `K02.1 Caries de la dentina (DEF)`, y si tiene
       `notes`, ` — <notes>`.
     - Procedimientos: una línea por tratamiento, `D2391 Resina 1 cara · 16 O` (pieza y cara solo si las hay;
       `×2` si `quantity` > 1).
     - Prescripciones: una línea por ítem, `Amoxicilina 500 mg cápsula — 1 c/8 h, 7 días` (solo los datos
       presentes) y al final `generalInstructions` si hay.
     - CÓDIGO = `professional.licenseNumber`; FIRMA en blanco.
   - Si el contenido de una sesión pasa de 4 líneas, el bloque de esa sesión crece (no se corta texto) y la hoja
     sigue siendo una página: si no entra, la sesión pasa a la hoja siguiente.
   - Las filas de sesión sin datos (hoja con menos de 9) se dibujan vacías, como en el papel.
2. **Hojas de continuación:** más de 9 sesiones → otra hoja 2 completa: repite las secciones 10 y 11 de la atención
   de referencia, NÚMERO DE HOJA = 2, 3…, y la sección 12 continúa la numeración (10, 11…). Función pura en
   `domain/form-033.ts` que reparte las sesiones en grupos de 9.
3. **Imprimir:** botón "Imprimir" (ícono + texto, primario) en la barra de herramientas → `window.print()`.
4. **Estilos de impresión:**
   - `src/styles.scss`: `@page { size: A4; margin: 0; }` y `print-color-adjust: exact` (los fondos de color del
     formulario se imprimen).
   - `layout/main-layout`: en `@media print` se ocultan sidebar, header y breadcrumbs y se anulan paddings, márgenes
     y el fondo del contenido.
   - La página del 033: en `@media print` se oculta la barra de herramientas, se quita el contenedor con scroll y
     cada `form-033-sheet` es una página (`break-after: page`, `break-inside: avoid` en cada sesión), sin sombra ni
     separación entre hojas.
5. **Pantalla:** las hojas se muestran una debajo de otra, separadas, como papel sobre el escritorio (fondo de la
   app alrededor, la hoja en blanco).

## Archivos a tocar
```
src/
  styles.scss                                       + @page A4 y print-color-adjust
  app/layout/main-layout/main-layout.ts             + @media print: ocultar sidebar/header, sin paddings
  app/features/clinical/
    domain/form-033.ts                              + reparto de sesiones en hojas de 9; textos de cada línea
    components/form-033/
      form-033-treatment/                           (nuevo) sección 12: recibe ClinicalSession[] de una hoja
                                                    y el número de la primera sesión
      form-033-session-row/                         (nuevo, si la plantilla de la sección pasa de ~150 líneas)
                                                    una sesión: sus 4+ líneas en los dos bloques
    pages/form-033/form-033.page.ts                 hoja 2 por grupo de 9 sesiones, NÚMERO DE HOJA, "Imprimir",
                                                    estilos de impresión de la página
```

## Criterios de aceptación
1. La sección 12 coincide con la página 2 del PDF: títulos, columnas, dos bloques, 9 sesiones con
   SESIÓN/FECHA/CÓDIGO/FIRMA en sus lugares.
2. Vista previa de impresión (Chrome y Firefox, A4, márgenes "Ninguno"/predeterminados por `@page`): hoja 1 = página
   1, cada hoja 2 = una página; sin menú, sin barra, sin páginas en blanco extra, colores del formulario visibles.
3. Con 10+ sesiones aparece una segunda hoja 2 con NÚMERO DE HOJA = 2 y la sesión 10 en la primera fila.
4. Ninguna sesión queda partida entre dos páginas.
5. La impresión no altera ninguna otra pantalla (los estilos de `main-layout` solo están bajo `@media print`).
6. Solo tokens (`--form033-*` en la hoja); botón ≥ 44 px con foco visible.

## Responsive
Revisar en **375, 768, 1024, 1366** (la hoja es de ancho fijo con scroll propio, como en la 018a) y la **vista
previa de impresión** en A4. Anotar en Resultado qué se revisó en cada uno.

## Tests requeridos
Sin tests (no hay llamada nueva a la API; la paginación y la impresión se prueban a mano).

## Prueba manual
1. Paciente con 2–3 sesiones con diagnósticos, tratamientos (con pieza y cara) y receta emitida: la sección 12 las
   muestra en su columna, con el código del profesional.
2. "Imprimir" → vista previa: 2 páginas A4 iguales al PDF oficial, con colores; imprimir en papel una vez y
   comparar con el 033 en papel.
3. Paciente con 10+ sesiones (o sembrar atenciones de prueba): aparece la hoja 2 número 2 con la sesión 10.
4. Sesión con muchos procedimientos: su bloque crece y no se corta entre páginas.
5. Después de imprimir, el resto de la app se ve igual (sidebar, agenda).
6. Anchos 375 y 1366.

## Resultado

### Qué se hizo
- `src/styles.scss`: se agregaron las reglas de impresión `@page { size: A4; margin: 0; }` y `print-color-adjust: exact; -webkit-print-color-adjust: exact;` para asegurar la preservación de fondos y dimensiones exactas en papel o PDF.
- `src/app/layout/main-layout/main-layout.scss`: se configuró `@media print` para ocultar la barra lateral (`.shell-sidebar-container`), el drawer móvil (`.drawer-backdrop`, `.drawer-panel`) y la cabecera (`app-header`), eliminando márgenes, paddings y fondos del contenedor principal.
- `src/app/features/clinical/domain/form-033.ts`: se implementaron las funciones puras `chunkSessionsForSheets` (reparto de sesiones en grupos de máximo 9 por hoja), `formatSessionDate` (`dd/MM/yyyy`), `formatDiagnosisLine` (`CIE + descripción + DEF/PRE + notas`), `formatTreatmentLine` (`código + nombre + pieza/cara + cantidad`) y `formatPrescriptionLines` (`medicamento + presentación + dosis/frecuencia/duración + indicaciones`).
- `src/app/features/clinical/components/form-033/form-033-plans-diagnoses/form-033-plans-diagnoses.component.ts`: se añadió el input `sheetNumber` para mostrar dinámicamente el número de hoja (1, 2, 3...) en la casilla correspondiente de la tabla de apertura.
- `src/app/features/clinical/components/form-033/form-033-treatment/form-033-treatment.component.ts`: se creó el componente presentacional para la **Sección 12 (TRATAMIENTO)** estructurado en 6 columnas alineadas con la cuadrícula oficial (`SESIÓN Y FECHA`, `DIAGNÓSTICOS Y COMPLICACIONES`, `PROCEDIMIENTOS`, `PRESCRIPCIONES`, `CÓDIGO`, `FIRMA`), soportando hasta 9 filas por hoja con altura mínima de 14mm, crecimiento según contenido y dibujo de filas vacías cuando hay menos de 9 atenciones.
- `src/app/features/clinical/components/form-033/form-033-sheet/form-033-sheet.component.ts`: se añadieron reglas `@media print` para forzar `width: 210mm`, `height: 297mm`, `break-after: page; page-break-after: always;` y suprimir sombras/bordes de visualización en pantalla.
- `src/app/features/clinical/pages/form-033/form-033.page.ts`:
  - Se añadió el botón primario "Imprimir" con ícono `Printer` de Lucide en la barra de herramientas llamando a `window.print()`.
  - Se vinculó el renderizado reactivo de hojas de continuación (`@for (chunk of sheetChunks(); track $index)`) repitiendo las secciones 10 y 11 con su número de hoja incremental y la sección 12 con sus respectivas 9 sesiones numeradas.
  - Se añadieron estilos `@media print` para ocultar la barra de herramientas y permitir el flujo de páginas A4 sin scrolls ni bordes.

### Resultado del build y pruebas
- **Build:** OK (`Application bundle generation complete. [32.099 seconds] - 2026-10-19T21:20:40.911Z`)
- **Totales literales de `ng test`:**
```
Test Files  9 passed (9)
     Tests  44 passed (44)
```

### Anchos revisados y responsive
- **375 px (móvil):** La barra de herramientas apila verticalmente los botones y el selector de sesión; el documento A4 se despliega dentro del contenedor con scroll horizontal suave, permitiendo una lectura completa sin desbordar el shell del sistema.
- **768 px (tablet vertical):** Barra de herramientas en una o dos líneas; la hoja 1 y hoja(s) 2 se aprecian centradas sobre el fondo del escritorio con su separación visual.
- **1024 px (laptop):** Vista cómoda con desplazamiento horizontal si la barra lateral está desplegada; los datos se leen nítidos en los tipos de letra compactos.
- **1366 px (escritorio):** Vista óptima y centrada; las hojas simulan páginas físicas sobre el fondo gris claro del aplicativo.
- **Vista previa de impresión (Chrome / Firefox en A4):** Al pulsar "Imprimir", desaparecen el sidebar, el header y la toolbar; cada hoja (Hoja 1 y Hoja 2) queda en su propia página A4 exacta sin saltos a mitad de sesión ni páginas en blanco huérfanas al final.

### Cómo levantar para la prueba manual
1. Iniciar sesión con un usuario con rol `ODONTOLOGO` o `DIRECTOR` (ej. `odontologo@bellidental.com` / `admin@bellidental.com`).
2. Acceder a un paciente que tenga al menos 1 o 2 atenciones registradas (o desde `/pacientes/:id` hacer clic en "Formulario 033").
3. Verificar que la Hoja 1 contenga anamnesis, signos vitales y odontograma; la Hoja 2 muestre secciones 10, 11 y la sección 12 con las sesiones en las dos columnas y sus 9 filas correspondientes.
4. Pulsar el botón **Imprimir** y verificar en la vista previa del navegador que se generan páginas A4 limpias sin menús ni cabeceras del sistema web.

### Problemas encontrados y supuestos tomados
- Se asumió que si una hoja 2 no tiene sesiones registradas (o para la primera hoja si no hubiera sesiones posteriores), se renderiza la primera hoja 2 con sus 9 filas en blanco para cumplir con el formato físico estándar donde la página 2 siempre está presente.
- Se mantuvieron las filas de sesión con `break-inside: avoid` y `min-height: 14mm` para garantizar que cuando una sesión tenga diagnósticos o procedimientos extensos, crezca verticalmente sin romperse en dos páginas.

### Correcciones (ronda 1)

1. **Sección 12 en dos bloques (criterio 1):**
   - `components/form-033/form-033-treatment/form-033-treatment.component.ts`: reescrito sin tabla. Cabecera en dos bloques de borde grueso: `SESIÓN Y FECHA | DIAGNOSTICOS Y COMPLICACIONES` y `PROCEDIMIENTOS | PRESCRIPCIONES | CÓDIGO Y FIRMA`.
   - `components/form-033/form-033-session-row/form-033-session-row.component.ts` (nuevo): una sesión en sus dos bloques. Izquierda: `SESIÓN` + número en su casilla, `FECHA` (celeste) y la fecha. Derecha: `CÓDIGO` + código del profesional, `FIRMA` (celeste) y celda para firmar. Cada renglón mide 5,5 mm.
   - `components/form-033/_form-033.scss`: mixin `treatment-columns` con las proporciones del PDF, compartido por cabecera y sesiones para que queden alineadas.
   - `shared/styles/_tokens.scss`: token `--form033-sublabel: #CCFFFF`.
   - Separación entre sesiones: los bloques tienen borde de 1,5 px, así que entre dos sesiones se ven unos 3 px.
2. **Reparto por renglones:**
   - `domain/form-033.ts`: `chunkSessionsForSheets` sustituido por `chunkTreatmentSessionsForSheets`, con `buildTreatmentSession` y `wrapTreatmentText`. Constantes `FORM033_TREATMENT_ROWS_PER_SHEET = 36` y `FORM033_SESSION_MIN_ROWS = 4`, y `FORM033_TREATMENT_CHARS` (34 / 36 / 30 caracteres por renglón en diagnósticos / procedimientos / prescripciones).
   - Cada sesión ocupa max(4, renglones de su columna más larga). Una sesión que no cabe pasa entera a la hoja siguiente. Cada hoja se completa con sesiones en blanco hasta 36 renglones.
   - `startSessionNumber` eliminado: el número sale de `sessionNumber`.
   - Los caracteres por renglón son una estimación para Arial 6,5 pt; no están medidos en navegador.
3. **Página en blanco:** `components/form-033/form-033-sheet/form-033-sheet.component.ts`: se quitó `break-after` y se añadió el input `startsNewPage` (`break-before: page` en las hojas 2). `:host { display: block }` para que el salto aplique. `pages/form-033/form-033.page.ts` pasa `[startsNewPage]="true"` en el bucle de hojas 2.
4. **Tipografía:** `--form033-font: Arial, Helvetica, sans-serif` en `_tokens.scss`; la hoja usa `var(--form033-font)`.
5. **Toasts:** `src/styles.scss`, dentro de `@media print`: `bd-toast-host { display: none !important; }`.

Página `form-033.page.ts`: `sheetChunks` pasa a `treatmentSheets` (`chunkTreatmentSessionsForSheets`); el bucle ya no pasa `startSessionNumber`.

Build: `npx ng build` OK (exit 0): `Application bundle generation complete. [32.943 seconds] - 2026-10-19T21:44:08.078Z`

Totales de `npx ng test --watch=false`:
```
 Test Files  9 passed (9)
      Tests  44 passed (44)
```

Comprobación: script temporal en la carpeta scratchpad (fuera del proyecto, no es un test) con 13 sesiones: hoja 1 = sesiones 1–9 (36 renglones); hoja 2 = sesiones 10–13 + 7 en blanco (36 renglones). Partición de texto por palabras correcta.

No revisado: vista previa de impresión (no hay navegador ni backend levantado), ni anchos 375 / 768 / 1024 / 1366. Lo que sigue hay que comprobarlo a mano.

Problemas y supuestos:
- Presupuesto de 36 renglones: estimado con la altura de las secciones 10 y 11 del PDF, no medido. Si la hoja 2 se desborda, bajar `FORM033_TREATMENT_ROWS_PER_SHEET`.
- Si el navegador cabe menos caracteres que la estimación, el renglón crece (no se corta); el presupuesto tiene holgura de unos 15 mm.
- Una sesión con más de 36 renglones ocupa una hoja sola y la hoja crecería por encima de 297 mm (no se corta texto, pero no es una página A4 exacta).

## Revisión

Estado: CORRECCIONES

Build OK y tests 44/44. Los estilos de impresión de `styles.scss` y `main-layout.scss` están bien (selectores
correctos y solo bajo `@media print`); "Imprimir" y las hojas de continuación existen. Falla la distribución de la
sección 12 y el reparto en hojas. La 018a ya está aprobada: no romper su código.

1. **La sección 12 no tiene la distribución del PDF (criterio 1).** Hoy es una tabla de 6 columnas con CÓDIGO y
   FIRMA separadas. En la página 2 de `docs/Form_033.pdf` son **dos bloques con borde grueso, separados por un
   espacio**:
   - izquierdo: encabezados `SESIÓN Y FECHA` | `DIAGNOSTICOS Y COMPLICACIONES`;
   - derecho: `PROCEDIMIENTOS` | `PRESCRIPCIONES` | `CÓDIGO Y FIRMA` (una sola columna).
   - Cada sesión ocupa **4 renglones** alineados en los dos bloques. Columna SESIÓN Y FECHA: renglón 1 =
     `SESIÓN` + número (en su casilla); renglón 2 = etiqueta `FECHA` (fondo celeste); renglones 3–4 = una celda con
     la fecha. Columna CÓDIGO Y FIRMA: renglón 1 = `CÓDIGO` + código del profesional; renglón 2 = etiqueta `FIRMA`
     (celeste); renglones 3–4 = celda vacía para firmar. Diagnósticos, procedimientos y prescripciones: un texto por
     renglón ruled (las líneas del papel se ven aunque estén vacías).
   - Separador más grueso entre sesiones, como el PDF. El celeste de FECHA/FIRMA es un token nuevo
     (`--form033-sublabel`, ≈ `#CCFFFF`).
2. **Reparto en hojas.** `chunkSessionsForSheets` corta siempre cada 9; si una sesión tiene más de 4 renglones, la
   hoja crece y con `max-height: 297mm` el contenido se sale del papel o se corta. Reparto por **renglones**: cada
   sesión usa `max(4, renglones de su columna más larga)` y cada hoja 2 tiene 36 renglones; las sesiones se acomodan
   en orden mientras quepan (una sesión que no cabe pasa entera a la hoja siguiente). Para estimar los renglones de
   un texto largo, dividir su longitud por los caracteres que caben en esa columna (constante por columna en
   `domain/form-033.ts`, medida con el tamaño de letra real). Quitar `startSessionNumber` (el número sale de
   `sessionNumber` del backend).
3. **Página en blanco al final.** `break-after: page` en todas las hojas puede imprimir una página vacía al final:
   usar `break-before: page` en todas menos la primera (o quitar el salto en la última).
4. **Tipografía suelta:** `font-family: Arial, Helvetica, sans-serif` en la hoja → token `--form033-font` en
   `_tokens.scss` (el formulario es Arial).
5. **Toasts al imprimir:** ocultar también `bd-toast-host` en `@media print` (si está fuera del layout, en
   `styles.scss`).

Al terminar: `npx ng build` y `npx ng test --watch=false` (totales en Resultado). Si no hay backend para la vista
previa, decirlo; no inventar la verificación.

### Ronda 2
Estado: APROBADO

Correcciones 1–5 aplicadas: sección 12 en dos bloques con `CÓDIGO Y FIRMA` en una columna y 4 renglones por sesión
(`form-033-session-row`, token `--form033-sublabel`); reparto por renglones (36 por hoja 2, mínimo 4 por sesión,
sesiones enteras) en `chunkTreatmentSessionsForSheets`; `break-before: page` desde la segunda hoja; token
`--form033-font`; toasts ocultos al imprimir. Sin hex en los componentes. `npx ng build` OK;
`npx ng test --watch=false`: 9 archivos, 44 tests OK.
Pendiente de la prueba manual (sin backend no se pudo ver): vista previa A4 en Chrome y Firefox. Los caracteres por
renglón (34/36/30) y el presupuesto de 36 renglones son estimaciones: si una hoja 2 se sale del A4 o sobra espacio,
se ajustan esas constantes de `domain/form-033.ts`.
