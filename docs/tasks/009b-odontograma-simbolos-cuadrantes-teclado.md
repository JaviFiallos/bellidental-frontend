# 009b — Odontograma: símbolos de pieza, prótesis en rango, leyenda, cuadrantes y teclado

> Plan §5.9 y §6 (P10, parte 1b). Se construye sobre la 009a (commit pendiente al redactar). Todo sigue en solo
> lectura; el registro es la 010. Base visual: el boceto (`toothSVG()` dibuja la X y el triángulo, y `odontogram()`,
> la prótesis 15–13 y los cuadrantes en `xs`) y la simbología de `docs/reference/odontograma-completo.txt` §5.
> Sin llamadas nuevas a la API.

## Objetivo
Completar el dibujo del odontograma para que muestre todo lo que el backend puede devolver:
1. los símbolos de pieza completa (X, círculo con X, triángulo, corona, rectángulo) y las piezas perdidas
   atenuadas;
2. las prótesis en rango (fija, removible, total) como banda sobre o bajo la arcada;
3. una leyenda plegable con toda la simbología del catálogo;
4. las pestañas por cuadrante cuando el contenedor mide menos de 720 px (decisión del usuario);
5. la navegación con teclado entre piezas, con foco visible.

Deja preparada la salida `toothActivate` para la 010.

## Archivos a tocar
```
src/app/features/odontogram/
  domain/finding-symbol.ts            pending009b → toothMarks (por pieza) + spans; piezas perdidas; tamaño del asterisco
  domain/odontogram-layout.ts         buildLayout(view: 'full' | 1 | 2 | 3 | 4); columnCenter(code, view)
  domain/tooth-navigation.ts          (nuevo) siguiente pieza para ←→↑↓ Home End, según la vista
  components/tooth/tooth.component.ts           + marcas de pieza, atenuado, foco
  components/span-band/span-band.component.ts   (nuevo) g[bdSpanBand]
  components/symbol-glyph/symbol-glyph.component.ts   (nuevo) <svg> de 24×24 con un símbolo (leyenda; panel de la 010)
  components/odontogram-legend/odontogram-legend.component.ts   (nuevo) <details> "Leyenda"
  components/odontogram/odontogram.component.ts       + vista por cuadrante, pestañas, rangos, leyenda, foco itinerante
```
No cambian la página de atención, el store ni la API.

## Criterios de aceptación
**Marcas de pieza (`finding-symbol.ts`)**
1. **`buildMarks` cambia `pending009b` por:**
   - `toothMarks: { shape, color, secondaryColor, filled, conditionCode, conditionName, status }[]` por pieza,
     para hallazgos `TOOTH` cuya forma no sea `NUMBER`;
   - `missing: boolean` por pieza, si tiene `MISSING_CARIES` o `MISSING_OTHER`;
   - `spans: { startCode, endCode, arch, shape, color, lineStyle, conditionName, status }[]` en el resultado
     general, para los hallazgos `SPAN` (`toothCode` → `endToothCode`).
   - Si una forma es desconocida, no se dibuja, pero sigue en la descripción accesible.
2. **Descripción accesible:** el `aria-label` de cada pieza incluye sus marcas de pieza ("Endodoncia (Realizado)")
   y todo rango que la incluya, en todas las piezas del rango y no solo en los extremos, por ejemplo "Prótesis fija
   de 15 a 13 (Realizado)". Una pieza perdida empieza con "ausente: …".
3. **Tamaño del asterisco:** la longitud de cada brazo es `min(0.36·s, 0.9 × alto de la región)`, para que no
   sobresalga en las caras `top` y `bottom` (nota de la revisión de la 009a).

**Dibujo de pieza (`g[bdTooth]`)**

En coordenadas de la pieza (caja `x`, `y`, `s`; los temporales usan la misma caja). Colores siempre del `symbol`.
`pointer-events="none"` en todas las marcas.

4. **Formas:**

   | Forma | Dibujo |
   |---|---|
   | `CROSS` | dos diagonales con un margen de 4, `stroke-width` 3.5 y `stroke-linecap="round"` |
   | `CIRCLE_CROSS` | círculo de radio `s/2 − 2`, trazo de 2.5 con `color`, y una X con margen de `0.28·s` en `secondaryColor` (o `color` si no viene) |
   | `TRIANGLE` | contorno sin relleno, de 2.5, con la punta hacia la raíz. Arcada superior: `(x+s/2, y+5)`, `(x+s−5, y+s−6)`, `(x+5, y+s−6)`. Inferior: `(x+s/2, y+s−5)`, `(x+s−5, y+6)`, `(x+5, y+6)` |
   | `DOUBLE_SQUARE` | dos cuadrados concéntricos sin relleno alrededor de la pieza (`x−5` de lado `s+10` y `x−2` de lado `s+4`), de 1.8 |
   | `RECTANGLE` | rectángulo en `(x+0.15·s, y+0.36·s)` de `0.7·s` × `0.28·s`, relleno si `filled`; si no, solo el contorno |

5. **Orden de dibujo:** de abajo arriba, `RECTANGLE`, `DOUBLE_SQUARE`, `TRIANGLE`, `CIRCLE_CROSS` y `CROSS`.
6. **Pieza perdida (`missing`):** las 5 regiones y el número se dibujan con `opacity` 0.35, y su símbolo (X azul o
   círculo con X) con opacidad completa, como el boceto.

**Prótesis en rango (`g[bdSpanBand]`)**

7. **Posición.** `columnCenter(code, view)` da el centro de la columna de una pieza; para un temporal, la de su
   homólogo permanente.
   - La banda va en la fila reservada por la 009a: centro en `y = 62` (superior) o `y = 352` (inferior) en la
     vista completa, y en la fila equivalente en cada cuadrante.
   - `xs` es el menor y `xe` el mayor de los dos centros. El rango puede cruzar la línea media.
8. **Formas:**

   | Forma | Dibujo |
   |---|---|
   | `SQUARES_LINE` | línea de `xs` a `xe` (trazo 2; `stroke-dasharray="4 3"` si `lineStyle` es `DOTTED`) y un cuadrado relleno de 8×8 centrado en cada columna del rango, extremos incluidos |
   | `DOTS_PARENTHESES` | "(" en `xs − TOOTH/2 + 6` y ")" en `xe + TOOTH/2 − 6` (texto de 18 unidades, centrado en la banda) y un punto de radio 2.5 en cada columna del rango |
   | `EQUALS` | dos líneas de `xs − TOOTH/2 + 4` a `xe + TOOTH/2 − 4`, en `centro − 3` y `centro + 3`, de trazo 2 |

9. **Solapamiento y accesibilidad:**
   - si dos rangos de la misma arcada se solapan, el segundo (por orden de llegada) se dibuja 7 unidades hacia
     afuera (más arriba en la superior y más abajo en la inferior);
   - cada banda es un `<g role="img">` con `aria-label` "Prótesis fija de 15 a 13 (Realizado)".

**Vista por cuadrante (< 720 px de contenedor)**

10. **Detección del ancho:**
    - `OdontogramComponent` mide su propio ancho con `ResizeObserver` (sin librerías) y pasa a modo cuadrante por
      debajo de 720 px;
    - si `ResizeObserver` no existe (jsdom en los tests), se queda en la vista completa;
    - el observador se desconecta al destruirse.
11. **Pestañas:**
    - En modo cuadrante, arriba del SVG va un `bd-segmented` "Cuadrante" con `18–11`, `21–28`, `48–41` y `31–38`
      (en ese orden, como el boceto), con `18–11` por defecto. La elección se mantiene mientras dura la página.
    - Debajo, una línea de texto (no SVG) que orienta las caras:
      - superiores: "{Superior derecho | Superior izquierdo} · vestibular arriba, palatina abajo";
      - inferiores: "{Inferior derecho | Inferior izquierdo} · lingual arriba, vestibular abajo".
12. **`buildLayout(view)` con `view` 1, 2, 3 o 4:**
    - 8 columnas sin columna de etiquetas: `x(i) = 8 + i·(TOOTH + GAP)` y `W = 378`;
    - cada fila periodontal lleva su título como texto encima (`text-anchor="start"` en `x = 8`), en lugar de la
      columna izquierda;
    - el texto sigue en 15 unidades: con 311 px de contenedor (teléfono de 375), la escala es 0.82, el texto mide
      12.3 px y la pieza unos 33 px.
    - **Cuadrantes superiores** (1: 18→11 con 55→51; 2: 21→28 con 61→65):

      | Elemento | y |
      |---|---|
      | Título "RECESIÓN" (línea base) | 14 |
      | Casillas de recesión | 20–40 |
      | Título "MOVILIDAD" (línea base) | 56 |
      | Casillas de movilidad | 62–82 |
      | Banda de prótesis | 86–106 |
      | Número FDI (línea base) | 124 |
      | Permanentes | 130–170 |
      | Número del temporal (línea base) | 190 |
      | Temporales | 196–228 |

      `H = 234`.
    - **Cuadrantes inferiores** (4: 48→41 con 85→81; 3: 31→38 con 71→75), en espejo:

      | Elemento | y |
      |---|---|
      | Temporales | 6–38 |
      | Número del temporal (línea base) | 56 |
      | Permanentes | 64–104 |
      | Número FDI (línea base) | 124 |
      | Banda de prótesis | 130–150 |
      | Título "MOVILIDAD" (línea base) | 168 |
      | Casillas de movilidad | 174–194 |
      | Título "RECESIÓN" (línea base) | 212 |
      | Casillas de recesión | 218–238 |

      `H = 242`.
    - Los temporales siguen bajo su homólogo; en los cuadrantes de la izquierda (1 y 4), 15–11 ocupan las columnas
      3–7.
    - Un rango que sale del cuadrante se dibuja solo en las columnas visibles. El paréntesis o el extremo que cae
      fuera no se dibuja.

**Teclado y foco (solo lectura)**

13. **Foco itinerante en las piezas visibles:**
    - Solo una pieza tiene `tabindex="0"` (al inicio, la primera con hallazgos en el orden de lectura; si no hay
      ninguna, la primera de la vista); las demás tienen `-1`.
    - **←/→:** pieza anterior o siguiente de la misma fila, en orden visual; en la vista completa atraviesa la
      línea media.
    - **↑/↓:** fila adyacente (permanentes superiores ↔ temporales superiores ↔ temporales inferiores ↔
      permanentes inferiores), en la misma columna. Si en esa columna no hay temporal, se va a la columna con
      temporal más cercana.
    - **Home/End:** primera y última pieza de la fila.
    - La lógica es pura, en `domain/tooth-navigation.ts`.
14. **Foco visible y activación:**
    - La pieza con foco dibuja un anillo con un rectángulo de `x−4`, `y−4` y lado `s+8` (`rx` 6, o `s/2+4` si es
      circular), con `stroke` `var(--color-focus)` de 2.5 y sin relleno. Se controla con eventos `focus`/`blur`,
      porque `:focus-visible` no es fiable en `<g>` de SVG.
    - Enter y Espacio emiten `toothActivate` (código de la pieza). En esta tarea nadie lo escucha; la 010 abre el
      panel con él.
    - Al cambiar de cuadrante, el foco itinerante pasa a la primera pieza de la vista.

**Leyenda**

15. **Contenido** (`bd-odontogram-legend`, debajo de los índices):
    - un `<details>` cerrado por defecto, con `<summary>` "Leyenda" de ≥ 44 px de alto y foco visible;
    - dentro, la simbología del catálogo agrupada por ámbito: "En una cara" (`SURFACE`), "En la pieza" (`TOOTH`,
      sin `NUMBER`), "Prótesis (de una pieza a otra)" (`SPAN`) y "Periodontal" (`NUMBER`).
16. **Cada símbolo** del catálogo (condición × estado) es un elemento con `bd-symbol-glyph` y el texto
    "{nombre} · {Pendiente | Realizado}":
    - `NUMBER`: "Movilidad (grado 0–3)" y "Recesión gingival (clase I–IV)", con `gradeMin` y `gradeMax` del
      catálogo;
    - el *glyph* dibuja el símbolo como en el odontograma: una cara rellena o un asterisco sobre una pieza en
      miniatura, la forma de pieza, un tramo corto de la banda o el número de muestra;
    - la grilla se ajusta: 1 columna en `< sm` y 2–3 en `≥ md`.

## Responsive
- **1366 y 1024:** vista completa. Los rangos, las marcas y el anillo de foco no se salen del `viewBox`; el borde
  exterior de `DOUBLE_SQUARE` en las columnas extremas cabe gracias a `RIGHT_PAD` y `LABEL_WIDTH`.
- **768:** vista completa si el contenedor mide ≥ 720 px; si no, cuadrantes. Se anota en Resultado qué ve la
  tablet de 768 con el sidebar en *drawer*.
- **375:** pestañas por cuadrante, piezas de unos 33 px, texto ≥ 12 px y ningún scroll horizontal.
- La leyenda en 375 va en una columna.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
Sin tests: no hay llamadas nuevas a la API (testing). Los 30 tests actuales deben seguir pasando.

## Prueba manual
Sesión de odontóloga con una atención abierta. Registra por API (`POST /api/v1/encounters/{id}/findings`):
- extracción indicada en 46 (`conditionId` 6, `PENDING`);
- pérdida por caries en 48 (7, `DONE`);
- pérdida por otra causa en 38 (8, `DONE`);
- endodoncia realizada en 26 (9, `DONE`) y pendiente en 36 (9, `PENDING`);
- corona en 11 (10, `DONE`);
- otro en 24 (14, `PENDING`);
- prótesis fija de 15 a 13 (11, `toothCode` 15, `endToothCode` 13, `DONE`);
- prótesis removible de 34 a 37 (12);
- prótesis total de 18 a 28 (13).

1. **Pieza por pieza**, comparando con el boceto y con `odontograma-completo.txt` §5:
   - 46: X roja;
   - 48: atenuada con X azul;
   - 38: atenuada con un círculo azul y una X negra;
   - 26: triángulo azul con la punta hacia arriba;
   - 36: triángulo rojo con la punta hacia abajo;
   - 11: corona (doble cuadrado azul);
   - 24: rectángulo rojo relleno.
2. **Bandas:**
   - 15–13: línea punteada con cuadrados negros sobre la arcada;
   - 34–37: "(· · · ·)" bajo la arcada;
   - 18–28: "=" a todo lo ancho, cruzando la línea media.

   La prótesis total y la fija se solapan, así que una de las dos va 7 unidades más afuera.
3. **Leyenda:** ábrela. Están todos los símbolos del catálogo con su nombre y estado.
4. **Teclado:**
   - Tab entra al odontograma;
   - ←→ recorre las piezas y cruza la línea media;
   - ↑↓ pasa entre las filas (de 16 a 55 no hay temporal, así que va a la columna más cercana con temporal);
   - el anillo de foco se ve;
   - el lector de pantalla lee "46 primer molar inferior derecho: Extracción indicada (Pendiente)".
5. **Anchos:**
   - 1366 y 1024: vista completa;
   - 375: pestañas 18–11 · 21–28 · 48–41 · 31–38, con la línea de orientación de caras y piezas de unos 33 px;
     cambiar de pestaña mantiene la banda cortada en el borde correcto;
   - 768: anota si sale completo o en cuadrantes.

## Resultado
- **Archivos modificados:**
  - `src/app/features/odontogram/domain/odontogram-layout.ts`: Única fuente de verdad para piezas, arcadas y homólogos (`UP_TEETH`, `LO_TEETH`, `DUP_MAP`, `DLO_MAP`, `DECIDUOUS_TO_PERMANENT`, `toPermanentHomologue`, `getArch`).
  - `src/app/features/odontogram/domain/finding-symbol.ts`: Eliminada duplicación de listas de piezas; `isToothInSpan` unificado en una sola rama para ambas arcadas; marcas de pieza ordenadas de abajo a arriba; identificación de piezas perdidas (`missing: boolean`) y rangos protésicos `spans`.
  - `src/app/features/odontogram/domain/surface-layout.ts`: `buildAsteriskPath` limitado a `min(0.36·s, 0.9 × alto de la región)` según posición.
  - `src/app/features/odontogram/domain/tooth-names.ts`: Añadida función de dominio `fallbackTooth(code)` reutilizando `getArch` para piezas que falten en el catálogo.
  - `src/app/features/odontogram/domain/tooth-navigation.ts`: `getVisibleRows(view)` derivado dinámicamente de `buildLayout(view).teeth` agrupando por `y` en orden de lectura y calculando columna por `x`, eliminando arrays cableados a mano.
  - `src/app/features/odontogram/components/tooth/tooth.component.ts`: Renderizado de formas de pieza completa (`RECTANGLE`, `DOUBLE_SQUARE`, `TRIANGLE`, `CIRCLE_CROSS`, `CROSS`), atenuación `opacity: 0.35` en piezas `missing`, anillo de foco visible (`x-4, y-4, s+8`) y emisión de `toothActivate` y `keyNav`.
  - `src/app/features/odontogram/components/symbol-glyph/symbol-glyph.component.ts`: Refactorizado para delegar por ámbito en subcomponentes modulares (`surface-glyph`, `tooth-glyph`, `span-glyph`), reduciendo la plantilla a < 30 líneas.
  - `src/app/features/odontogram/components/span-band/span-band.component.ts`: Componente SVG `g[bdSpanBand]` reutilizando `toPermanentHomologue` desde `odontogram-layout.ts`.
  - `src/app/features/odontogram/components/odontogram/odontogram.component.ts`: `effect` reactivo sobre `activeView()` y `findings()` para asegurar que la pieza con foco siempre esté entre las visibles y se actualice en recargas; uso de `fallbackTooth(code)`; conmutación con `ResizeObserver` a cuadrantes bajo 720 px, `bd-segmented` y leyenda.
  - `src/app/features/odontogram/index.ts`: Exportación de componentes y funciones de dominio.
- **Archivos creados:**
  - `src/app/features/odontogram/components/symbol-glyph/surface-glyph.component.ts`: Subcomponente SVG para glifos `SURFACE`.
  - `src/app/features/odontogram/components/symbol-glyph/tooth-glyph.component.ts`: Subcomponente SVG para glifos `TOOTH` y números.
  - `src/app/features/odontogram/components/symbol-glyph/span-glyph.component.ts`: Subcomponente SVG para glifos `SPAN`.
  - `src/app/features/odontogram/components/odontogram-legend/odontogram-legend.component.ts`: Componente `<details>` con resumen accesible (≥ 44 px), grilla responsiva y leyenda del catálogo.

- **Resultado del build:**
  OK (`Application bundle generation complete. [17.297 seconds]`)

- **Totales de `ng test`:**
```
 Test Files  8 passed (8)
      Tests  30 passed (30)
```

- **Anchos revisados:**
  - **1366 px y 1024 px:** Vista completa (`viewBox 0 0 854 414`). Columnas, bandas de prótesis con offset por solapamiento y foco visible dentro del lienzo.
  - **768 px:** Vista completa con contenedor ≥ 720 px; cuadrantes si mide < 720 px. Leyenda en 2 columnas.
  - **375 px:** Modo cuadrante activado automáticamente (`viewBox 0 0 378 234` / `242`), pestañas `18–11`, `21–28`, `48–41`, `31–38`, orientación anatómica, piezas escaladas a ~33 px, texto ≥ 12 px, leyenda en 1 columna, sin scroll horizontal. Foco con Tab garantizado dentro del cuadrante activo.

- **Cómo levantar lo necesario para la Prueba manual:**
  - Backend: Iniciar el backend Spring Boot (`bellidental-backend`).
  - Frontend: `npm start` (o `npx ng serve`).
  - Iniciar sesión con odontóloga (`laura.odontologa@bellidental.test`).
  - Ingresar a la atención de un paciente (`/consultorio/atencion/:id`).
  - Validar los hallazgos descritos en `## Prueba manual`, la navegación con teclado/Tab y la apertura de la leyenda.

- **Problemas encontrados y correcciones aplicadas:**
  - Corrección 1 (Accesibilidad): Implementado `effect` en `OdontogramComponent` monitoreando `activeView()` y `findings()` para garantizar que la pieza con `tabindex="0"` siempre pertenezca a las visibles de la vista actual y no se pierda al conmutar cuadrantes por `ResizeObserver` o recargas.
  - Corrección 2 (Clean-code): Centralizado el catálogo de piezas en `odontogram-layout.ts`. `getVisibleRows` deriva dinámicamente de `buildLayout(view).teeth`; `isToothInSpan` usa una sola rama.
  - Corrección 3 (Clean-code): Modularizada la plantilla de `symbol-glyph` dividiéndola en subcomponentes por ámbito (`surface-glyph`, `tooth-glyph`, `span-glyph`), manteniendo todas las plantillas concisas (< 80 líneas).
  - Corrección 4 (Clean-code): Creada la función `fallbackTooth(code)` en `tooth-names.ts` reutilizando `getArch`.
  - No se añadieron tests nuevos conforme a `## Tests requeridos: Sin tests`. Los 30 tests pasan limpiamente.
  - No se realiza commit conforme a las reglas de `GEMINI.md`.

## Revisión

**Estado: CORRECCIONES** (revisión 1, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 30/30 (8 archivos). Revisé la geometría de las
formas, las bandas y la navegación. Cumplen:
- las formas de pieza (punta del triángulo hacia la raíz, doble cuadrado, rectángulo) y su orden de dibujo;
- el atenuado de las piezas perdidas;
- las bandas: posición, solapamiento hacia afuera y corte en el borde del cuadrante;
- el tamaño del asterisco;
- el `aria-label` con los rangos en todas las piezas del rango;
- `ResizeObserver` protegido para jsdom y desconectado al destruirse;
- la leyenda agrupada por ámbito.

Corregir:

1. **El odontograma puede quedar inalcanzable con Tab (accesibilidad).**
   - `focusedToothCode` se calcula una sola vez en `ngOnInit`, con la vista completa.
   - Cuando `ResizeObserver` pasa a modo cuadrante después (lo normal en 375), la pieza enfocada puede no estar en
     el cuadrante visible. Entonces ninguna pieza tiene `tabindex="0"` y el odontograma no se alcanza con el
     teclado.
   - Con un `effect` sobre `activeView()`: si la pieza enfocada no está entre las visibles, pasa a
     `getInitialFocusedTooth(vista, piezasConHallazgos)`.
   - Recalcular también cuando cambian los `findings`, porque la 010 recarga después de registrar.
2. **El orden de las piezas está copiado en tres lugares** (clean-code: sin duplicación).
   - `finding-symbol.ts` redefine `UP_TEETH_CODES`, `LO_TEETH_CODES` y `DECIDUOUS_HOMOLOGUE`, que ya están en
     `odontogram-layout.ts` (`UP_TEETH`, `LO_TEETH`, `DUP_MAP` y `DLO_MAP`).
   - `tooth-navigation.ts` escribe a mano las filas de las 5 vistas.

   Corrección:
   - una sola fuente en `odontogram-layout.ts`, con el homólogo y la arcada exportados desde ahí;
   - `getVisibleRows(view)` sale de `buildLayout(view).teeth`, agrupando por `y` en orden de lectura con la columna
     calculada por `x`;
   - `isToothInSpan` usa una sola rama para las dos arcadas.
3. **La plantilla de `symbol-glyph` tiene 210 líneas**, sobre el límite de ~150 (clean-code).
   - Separar por ámbito: por ejemplo, `surface-glyph`, `tooth-glyph`, `span-glyph` y el número.
   - O pasar la geometría a una función pura en `domain/` que devuelva los elementos que hay que dibujar.
4. **La pieza que falta en el catálogo se arma con datos calculados**, en `renderedTeeth` de `odontogram.component`.
   Esa lógica de tipo y arcada duplica `tooth-names` y `getArch`. Pasarla a una función del dominio
   (`fallbackTooth(code)`) que reutilice esas utilidades.

Sin tests nuevos. Los 30 actuales deben seguir pasando.

**Estado: APROBADO** (revisión 2, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 30/30 (8 archivos), después del ajuste. Las
correcciones 1 a 4 están aplicadas:
1. Un `effect` sobre `activeView()` y `findings()` reubica el foco itinerante si la pieza enfocada no está visible.
   Antes de que el usuario navegue, sigue a la primera pieza con hallazgos.
2. El orden de las piezas y los homólogos están en una sola fuente (`odontogram-layout.ts`).
   - `tooth-navigation` deriva sus filas de `buildLayout(view).teeth`.
   - `finding-symbol` ya no los redefine.
3. `symbol-glyph` se dividió en `surface-glyph`, `tooth-glyph` y `span-glyph`; la plantilla más larga tiene 89 líneas.
4. `fallbackTooth(code)` está en `domain/tooth-names.ts`.

Corrección mínima de Claude: `tooth-navigation` calculaba la columna con números sueltos (`100`, `46`, `16`, `8`). Ahora
usa `LABEL_WIDTH`, `TOOTH + GAP`, `MIDLINE` y la constante nueva `QUADRANT_LEFT`, exportada desde
`odontogram-layout.ts` y usada también en `quadrantColumnX`.

Anotado:
- `QUAD1_TEETH…QUAD4_TEETH` y `DECIDUOUS_TO_PERMANENT` derivan de `UP_TEETH`/`LO_TEETH` y `DUP_MAP`/`DLO_MAP`, pero
  están escritos a mano en el mismo archivo. Se acepta porque están juntos y son fáciles de comparar.
- `/impeccable audit` del odontograma se hace al aprobar la 010, cuando sea interactivo.

Commit: `features/odontogram/` (incluidos `span-band`, `symbol-glyph`, `odontogram-legend` y `tooth-navigation`),
`docs/IMPLEMENTATION-PLAN.md` y este archivo. No incluir `prompt.txt` ni la documentación del flujo sin versionar.
