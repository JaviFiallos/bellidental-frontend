# 009a — Odontograma: estructura, caras, filas periodontales e índices (solo lectura)

> Plan §5.9 y §6 (P10, parte 1). La 009 se divide en dos:
> - **009a (esta tarea):** feature `odontogram` con datos, geometría, piezas con sus 5 caras, filas de recesión y
>   movilidad, e índices CPO/ceo, montado en la atención.
> - **009b:** símbolos de pieza (X, triángulo, corona…), prótesis en rango, leyenda, pestañas por cuadrante y
>   navegación con teclado.
>
> Perfil: ODONTOLOGO y DIRECTOR. Base visual: el boceto aprobado (`docs/mockups/bellidental-bocetos.html`, funciones
> `odontogram()`, `regionPaths()`, `toothSVG()` y `faceAt()`). El usuario pidió seguirlo tal cual.

## Brief de diseño (`/impeccable shape`, confirmado por el usuario el 2026-10-12)
- **Quién y dónde:** el odontólogo en la atención, en la laptop (1366×768) o en una tablet, con guantes. Modo
  **Operate**.
- **Qué tiene que lograr:** que el odontograma se lea como el 033 en papel. Debe permitir:
  - reconocer cada pieza por su número FDI;
  - distinguir sus 5 caras;
  - ver al instante qué está pendiente (rojo) y qué está hecho (azul).

  En esta tarea solo se lee. El registro llega en la 010.
- **Disposición del 033:**
  - de arriba abajo: Recesión, Movilidad, permanentes superiores, temporales superiores, temporales inferiores,
    permanentes inferiores, Movilidad y Recesión, en espejo (**F-11: Recesión es la fila exterior**);
  - perspectiva del paciente: su derecha queda a la izquierda del observador;
  - temporales siempre visibles (F-6).
- **Colores clínicos:** salen solo del `symbol` del backend (`#D32F2F` pendiente, `#1E88E5` realizado y `#000000`
  prótesis). No se inventan ni se pasan por la paleta (excepción explícita de clean-code).
- **Antigoals:**
  - sin dientes "anatómicos" dibujados: cuadrado o círculo de 5 regiones, como el 033;
  - sin colores clínicos propios;
  - sin animaciones;
  - sin depender del *hover* para entender un hallazgo.

## Objetivo
Crear el feature `features/odontogram` y mostrar en la pantalla de atención el odontograma vigente del paciente, en
solo lectura:
1. las 52 piezas en la disposición del 033;
2. las caras rellenas según sus hallazgos (caries, obturación) y el sellante como asterisco;
3. los grados de recesión y movilidad en sus filas;
4. los índices CPO y ceo debajo.

Se monta en la atención, entre la cabecera del paciente y el motivo (posición del boceto, decisión del usuario en la
008a). Reemplaza la franja reservada de la 008a.

**Decisiones de esta tarea:**
- **Componentes presentacionales y un store.** `OdontogramComponent` y sus hijos son dumb: reciben catálogo,
  hallazgos e índices por `input()`. Los datos los carga `OdontogramStore`, que provee la página anfitriona (la
  atención; en la 014, la ficha clínica). Así el mismo componente sirve para la 010 (registro) y la 014 (lectura).
- **SVG con componentes de selector de atributo** (`g[bdTooth]`, `g[bdPeriodontalRow]`). En Angular, un componente
  cuyo host es un elemento SVG escribe su plantilla con el prefijo `svg:` (`<svg:path>`, `<svg:text>`), porque si no
  los elementos se crean en el namespace HTML y no se dibujan.
- **Tamaños.** El usuario pidió seguir el boceto. Sobre él mandan las reglas del proyecto: texto ≥ 12 px reales y
  piezas tocables. La geometría de abajo da ≥ 12 px de texto y piezas de unos 33 px con el contenedor en 720 px.
  - Con la columna de etiquetas, a 768 no caben a la vez piezas de 36 px (lo que decía el plan) y texto de 12 px.
    Se prioriza el texto. En la 010 las caras también se eligen con los botones del panel, que miden ≥ 44 px.
  - Por debajo de 720 px de contenedor se usan pestañas por cuadrante (009b). En esta tarea, el SVG se ve completo
    en todos los anchos.
- **Caras del backend.** El backend solo usa `O`, `V`, `L`, `M` y `D`.
  - La cara de abajo de una pieza **superior** se guarda como `L` y se nombra "palatina".
  - La central de incisivos y caninos se guarda como `O` y se nombra "incisal".
  - Es la misma regla que `SurfaceLabelResolver` del backend: con un hallazgo, se usa su `surfaceLabel`; sin
    hallazgo, se calcula igual en el frontend.

## Archivos a tocar
```
src/app/
  features/odontogram/
    index.ts                                  OdontogramComponent, OdontogramStore, OdontogramApi, modelos
    models/odontogram.models.ts               DTO del backend (abajo)
    services/odontogram.api.ts                catalog() con caché de sesión · getByPatient(patientId)
    services/odontogram.store.ts              load(patientId): catálogo + odontograma; signals de estado
    domain/odontogram-layout.ts               geometría: columnas, filas, posiciones de piezas, etiquetas y viewBox
    domain/surface-layout.ts                  región (top/right/bottom/left/center) ↔ cara por pieza; nombres de cara
    domain/tooth-names.ts                     "Primer molar superior derecho"…
    domain/finding-symbol.ts                  hallazgos → marcas por cara y por fila periodontal (009b agrega pieza y rango)
    components/odontogram/odontogram.component.ts        <svg> con viewBox: etiquetas, línea media, filas y piezas
    components/tooth/tooth.component.ts                  g[bdTooth]: 5 regiones + relleno o asterisco + número
    components/periodontal-row/periodontal-row.component.ts   g[bdPeriodontalRow]: 16 casillas con el grado
    components/dental-indices/dental-indices.component.ts     CPO y ceo
  features/clinical/
    pages/encounter/encounter.page.ts         provee OdontogramStore; carga al tener patientId; reemplaza la franja
    pages/encounter/encounter.page.spec.ts    + 1 caso; los 5 casos existentes atienden las 2 peticiones nuevas
    testing/fixtures.ts                       + catálogo (52 piezas, 5 caras, 14 condiciones) y odontograma de ejemplo
```
Dependencias: `clinical` importa solo de `features/odontogram/index.ts`. `odontogram` no importa de otros features.
No se crea `odontogram.routes.ts`, porque el feature no tiene páginas propias.

## Contrato con el backend (verificado en `bellidental-backend`, `odontogram/api/dto`)
- `GET /api/v1/odontogram/catalog` → `ApiResponse<OdontogramCatalog>`.
- `GET /api/v1/patients/{id}/odontogram` → `ApiResponse<PatientOdontogram>`.
- Los dos piden el permiso `RECORD_READ`.
```ts
type Dentition = 'PERMANENT' | 'DECIDUOUS';      type Arch = 'UPPER' | 'LOWER';
type ToothType = 'INCISOR' | 'CANINE' | 'PREMOLAR' | 'MOLAR';
type ConditionCategory = 'DENTAL' | 'PERIODONTAL'; type ConditionScope = 'TOOTH' | 'SURFACE' | 'SPAN';
type FindingStatus = 'PENDING' | 'DONE';          type SurfaceCode = 'O' | 'V' | 'L' | 'M' | 'D';
type SymbolShape = 'ASTERISK' | 'CROSS' | 'CIRCLE' | 'CIRCLE_CROSS' | 'TRIANGLE' | 'DOUBLE_SQUARE' | 'RECTANGLE'
                 | 'SQUARES_LINE' | 'DOTS_PARENTHESES' | 'EQUALS' | 'NUMBER';
interface DentalSymbol { id: number; status: FindingStatus; shape: SymbolShape; color: string;
                         secondaryColor: string | null; filled: boolean; lineStyle: 'SOLID' | 'DOTTED'; }
interface Tooth { code: number; dentition: Dentition; arch: Arch; quadrant: number; position: number; type: ToothType; }
interface Surface { code: SurfaceCode; name: string; }
interface DentalCondition { id: number; code: string; name: string; category: ConditionCategory; scope: ConditionScope;
                            gradeMin: number | null; gradeMax: number | null; symbols: DentalSymbol[]; }
interface OdontogramCatalog { teeth: Tooth[]; surfaces: Surface[]; conditions: DentalCondition[]; }
interface Finding { id: string; toothCode: number; endToothCode: number | null; surfaceCode: SurfaceCode | null;
                    surfaceLabel: string | null; conditionId: number; status: FindingStatus; grade: number | null;
                    notes: string | null; createdAt: string; symbol: DentalSymbol; }
interface DentalIndices { cpoC: number; cpoP: number; cpoO: number; cpoTotal: number;
                          ceoC: number; ceoE: number; ceoO: number; ceoTotal: number; }
interface PatientOdontogram { patientId: string; findings: Finding[]; indices: DentalIndices;
                              cariesSurfaces: Record<string, number>; }   // Map<Short,Integer>: claves string
```
**Qué devuelve el backend** (`OdontogramStateCalculator`): solo el estado vigente.
- Hay como máximo un hallazgo por cara; el último gana, incluso entre condiciones distintas, así que un sellante
  reemplaza a una caries en la misma cara.
- Hay uno por pieza y condición: una pieza puede tener a la vez movilidad, endodoncia y corona.
- Hay uno por rango y condición.
- Si una pieza está perdida (`MISSING_CARIES` o `MISSING_OTHER`), de esa pieza solo llega ese hallazgo, más los
  rangos que la incluyan.
- `cariesSurfaces` no se usa en esta tarea.

Condiciones del catálogo (semilla V8):

| Id | Código | Ámbito | Símbolo (estado: forma, color) |
|---|---|---|---|
| 1 | MOBILITY | TOOTH (periodontal, 0–3) | DONE: NUMBER |
| 2 | RECESSION | TOOTH (periodontal, 1–4) | DONE: NUMBER |
| 3 | CARIES | SURFACE | PENDING: CIRCLE #D32F2F |
| 4 | FILLING | SURFACE | DONE: CIRCLE #1E88E5 |
| 5 | SEALANT | SURFACE | PENDING: ASTERISK rojo · DONE: ASTERISK azul |
| 6–14 | EXTRACTION, MISSING_*, ROOT_CANAL, CROWN, prótesis, OTHER | TOOTH o SPAN | 009b |

## Criterios de aceptación
**Datos (`OdontogramApi` y `OdontogramStore`)**
1. **`OdontogramApi.catalog()`:**
   - pide el catálogo una sola vez por sesión, en un servicio `providedIn: 'root'` con `shareReplay` de 1;
   - si la petición falla, no guarda el error en la caché: el siguiente intento vuelve a pedir;
   - `getByPatient(patientId)` no tiene caché.
2. **`OdontogramStore`** (`@Injectable()` sin `providedIn`; lo provee la página):
   - `load(patientId)` pide el catálogo y el odontograma en paralelo (`forkJoin`) y expone `catalog`,
     `odontogram`, `loading` y `error` (el `message` del backend);
   - `reload()` repite la carga con el último `patientId`; la 010 lo usa al registrar.
3. **Integración en la página de atención:**
   - `encounter.page` provee `OdontogramStore` y, cuando `EncounterStore.encounter()` tiene `patientId`, llama a
     `load(patientId)` una sola vez por paciente (`effect` que recuerda el último id);
   - si el odontograma falla, el resto de la atención sigue funcionando.

**Geometría (`domain/odontogram-layout.ts`, funciones puras sin Angular)**

4. **Unidades del `viewBox`** (constantes exportadas):
   - `TOOTH = 40` (lado del cuadrado permanente), `DECIDUOUS = 32` (diámetro del temporal, centrado en la columna);
   - `GAP = 6` entre columnas, `MIDLINE = 16` de separación extra entre las columnas 8 y 9;
   - `LABEL_WIDTH = 100` (columna de etiquetas a la izquierda), `RIGHT_PAD = 8`, `CELL_HEIGHT = 20`;
   - `FONT = 15` para todo el texto del SVG: números FDI, etiquetas y grados.
   - Columna `i` (0–15): `x(i) = LABEL_WIDTH + i·(TOOTH + GAP) + (i ≥ 8 ? MIDLINE : 0)`.
   - Ancho total `W = x(15) + TOOTH + RIGHT_PAD` (= 854).
5. **Columnas:**
   - superiores: `18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28`;
   - inferiores: `48 … 41 | 31 … 38`;
   - los temporales van bajo las columnas de su homólogo: `55…51` bajo `15…11`, `61…65` bajo `21…25`, `85…81` bajo
     `45…41` y `71…75` bajo `31…35`.
6. **Filas, con `y` en unidades** (se pueden ajustar ±4 si el texto se monta; se anota en Resultado):

   | Elemento | y |
   |---|---|
   | Recesión superior (casillas) | 4–24 |
   | Movilidad superior | 28–48 |
   | Banda de prótesis superior (reservada para la 009b) | 52–72 |
   | Número FDI superior (línea base del texto) | 90 |
   | Permanentes superiores | 96–136 |
   | Número del temporal superior (línea base) | 156 |
   | Temporales superiores | 162–194 |
   | Separador horizontal + etiqueta "LINGUAL" | 206 |
   | Temporales inferiores | 218–250 |
   | Número del temporal inferior (línea base) | 268 |
   | Permanentes inferiores | 276–316 |
   | Número FDI inferior (línea base) | 336 |
   | Banda de prótesis inferior (reservada para la 009b) | 342–362 |
   | Movilidad inferior | 366–386 |
   | Recesión inferior | 390–410 |

   `H = 414`, `viewBox = "0 0 854 414"`.
7. **Etiquetas de fila** a la izquierda (`x = LABEL_WIDTH − 10`, `text-anchor="end"`, color `--slate-500`,
   centradas en su fila): `RECESIÓN`, `MOVILIDAD`, `VESTIBULAR` (permanentes superiores), `TEMPORALES`,
   `LINGUAL` (en el separador), `TEMPORALES`, `VESTIBULAR` (permanentes inferiores), `MOVILIDAD` y `RECESIÓN`. Es
   igual que el boceto.
8. **Línea media:** una línea vertical discontinua (`--slate-300`, `stroke-dasharray="3 3"`) entre las columnas 8 y
   9, a todo el alto. El separador horizontal es una línea continua `--slate-200` desde `LABEL_WIDTH − 4` hasta
   `W − 4`.
9. **Función que usan el componente y la 009b:**
   `buildLayout(): { width, height, labels[], teeth: { code, x, y, size, shape: 'square' | 'circle', numberX,
   numberY }[], periodontalCells: { row: 'recU' | 'movU' | 'movL' | 'recL', column, x, y }[], midlineX, separatorY }`.
   La 009b le agrega el modo cuadrante.

**Caras (`domain/surface-layout.ts`)**

10. **Regiones del cuadrado**, con lado `s` y `k = 0.3·s`, como `regionPaths()` del boceto:
    - `top`, `right`, `bottom` y `left` son trapecios;
    - `center` es el cuadrado interior de lado `s − 2k`.

    **Regiones del círculo** (temporal), con radio `R = s/2` y radio interior `r = 0.22·s`:
    - cuatro sectores de anillo: `top` de −135° a −45°, `right` de −45° a 45°, `bottom` de 45° a 135° y `left` de
      135° a 225°;
    - `center` es el círculo de radio `r`.

    Las coordenadas se redondean a 2 decimales.
11. **Región → cara**, como `faceAt()` del boceto:
    - `center` → `O`;
    - `top` → `V` en la arcada superior y `L` en la inferior;
    - `bottom` → `L` en la superior (palatina) y `V` en la inferior;
    - en los cuadrantes 1, 4, 5 y 8: `left` → `D` y `right` → `M`;
    - en los cuadrantes 2, 3, 6 y 7: `left` → `M` y `right` → `D`.
12. **`surfaceName(toothCode, surfaceCode)`**, en minúsculas para las etiquetas:
    - `L` superior → "palatina"; `L` inferior → "lingual";
    - `O` en incisivo o canino (posición 1–3) → "incisal"; en el resto → "oclusal";
    - `V` → "vestibular", `M` → "mesial", `D` → "distal".

**Marcas (`domain/finding-symbol.ts`)**

13. **`buildMarks(findings, catalog)`** devuelve, por `toothCode`:
    - `faces: Partial<Record<SurfaceCode, { kind: 'fill' | 'asterisk'; color; conditionName; status }>>`:
      - `SURFACE` con `CIRCLE` → `fill` (la región se rellena con `symbol.color`; caries y obturación);
      - `SURFACE` con `ASTERISK` → `asterisk` (sellante).
    - `mobility?: { grade, color }` y `recession?: { grade, color }`: `TOOTH` con `NUMBER` y código `MOBILITY` o
      `RECESSION`.

    El nombre de la condición sale del catálogo por `conditionId`. Los hallazgos de `TOOTH` (con otra forma) y de
    `SPAN` se devuelven aparte en `pending009b: Finding[]`. No se dibujan todavía, pero sí entran en la descripción
    accesible de la pieza (criterio 17).

**Dibujo**

14. **`g[bdTooth]`.** Inputs: `tooth`, `x`, `y`, `size`, `shape`, `marks` y `label` (la descripción accesible).
    - Dibuja las 5 regiones con `fill` = color de la marca o `--white`, `stroke` `--slate-500` y `stroke-width` 1.
    - El asterisco del sellante son 3 segmentos de `0.36·s` que se cruzan a 0°, 60° y 120° en el centroide de la
      región, con `stroke-width` 2, `stroke-linecap="round"` y el color del símbolo.
    - Cada región lleva `data-tooth`, `data-surface` y, si tiene marca, `data-condition` (el código) y
      `data-status`, más un `<title>` "16 · mesial: Caries (Pendiente)" o "16 · mesial" si no tiene marca.
    - El número FDI va en `numberX`/`numberY` (centrado, `--slate-600`, peso 500).
15. **`g[bdPeriodontalRow]`.** Una casilla por columna (`TOOTH` × `CELL_HEIGHT`, `rx` 3, fondo `--white`, borde
    `--slate-300`).
    - Con valor: el grado centrado en negrita con el color del símbolo. Recesión en números romanos: 1→I, 2→II, 3→III
      y 4→IV.
    - Si una columna tiene valor en la permanente y en la temporal, se muestra el de la permanente, y la descripción
      accesible de las dos piezas lo incluye. Si solo la temporal tiene valor, se muestra el de la temporal.
16. **`OdontogramComponent`** (`bd-odontogram`). Inputs: `catalog`, `findings` e `indices`.
    - Dibuja un `<svg [attr.viewBox]>` con `width: 100%`, `height: auto` y `max-width: 56rem`, centrado.
    - Todo el texto del SVG usa `FONT` y `font-family: inherit`.
    - Con 720 px de contenedor, 15 unidades dan ≥ 12 px, porque la escala es ≥ 0.84.
17. **Accesibilidad de solo lectura:**
    - el `<svg>` lleva `role="group"` y `aria-label="Odontograma"`;
    - cada pieza es un `<g role="img">` con `aria-label` "{código} {nombre}: {lista de hallazgos}", por ejemplo
      "16 primer molar superior derecho: mesial Caries (Pendiente); oclusal Caries (Pendiente)", o
      "{código} {nombre}: sin hallazgos";
    - la lista incluye los grados ("movilidad 2", "recesión II") y, por ahora, los hallazgos de `pending009b` con su
      nombre y estado.

    El foco y el teclado llegan en la 009b, así que en esta tarea las piezas no son enfocables.

**Índices (`bd-dental-indices`)**

18. Debajo del SVG:
    - "**CPO {cpoTotal}** · C {cpoC} · P {cpoP} · O {cpoO}";
    - "**ceo {ceoTotal}** · c {ceoC} · e {ceoE} · o {ceoO}";
    - "Rojo = pendiente · azul = realizado · negro = prótesis", como nota (`--slate-500`).

    Va en una fila que se parte en varias líneas si no cabe, con fuente `--fs-sm`.

**Tarjeta en la atención**

19. **Ubicación y estados:**
    - Una sección `card` con el título "Odontograma", entre `patient-clinical-header` y `encounter-notes`. Se quita
      la franja "El odontograma se agrega en la próxima versión".
    - Mientras carga: `bd-skeleton` de unos 24rem de alto.
    - Si hay error: `bd-alert` con el `message` y el botón "Reintentar" (`reload()`).
    - Sin hallazgos: el odontograma en blanco y la nota "Sin hallazgos registrados" junto a los índices.

## Responsive
- **El SVG escala con su contenedor** (`viewBox`) y nunca provoca scroll horizontal en la página.
- **1366:** unos 56rem de ancho, con piezas de unos 42 px.
- **1024:** el ancho que deja el sidebar de íconos.
- **768:** el ancho completo menos los márgenes; piezas de unos 33 px y texto de ≥ 12 px.
- **375:** se ve completo y pequeño; las pestañas por cuadrante llegan en la 009b. Solo se comprueba que no haya
  scroll horizontal.
- Revisar en **375, 768, 1024 y 1366**, comparando con el boceto (pestaña "Atención" del archivo de bocetos).

## Tests requeridos
Un caso nuevo en `encounter.page.spec.ts`. Además, los 5 casos existentes deben atender las 2 peticiones nuevas:
agregar en `fixtures.ts` un helper `flushOdontogram(httpMock)` que responda las dos con datos vacíos. No es un test
nuevo: sin él, `verify()` falla.
1. `carga el odontograma → caras pintadas, grados e índices`:
   - con la atención cargada, `expectOne` GET `/api/v1/odontogram/catalog` (catálogo de fixtures con las 52 piezas,
     armadas por código: tipo según posición, arcada y cuadrante) y GET `/api/v1/patients/pat-1/odontogram` con:
     - caries `PENDING` en 16 M;
     - obturación `DONE` en 21 D;
     - movilidad grado 2 en 31;
     - recesión grado 2 en 41;
     - índices `cpoC 1, cpoO 1, cpoTotal 2`;
   - la región `[data-tooth="16"][data-surface="M"]` tiene `fill="#D32F2F"` y `data-condition="CARIES"`;
   - el `aria-label` de la pieza 16 contiene "mesial Caries (Pendiente)";
   - la casilla de movilidad de la columna 31 muestra "2" y la de recesión de la 41, "II";
   - el texto "CPO 2" es visible.

## Prueba manual
Sesión de odontóloga con una atención abierta. Para tener datos, registra hallazgos por API (Swagger o curl con el
token): `POST /api/v1/encounters/{id}/findings` con caries en 16 M y 16 O, obturación en 21 D, sellante pendiente en
36 O, movilidad 1 en 31 y recesión 2 en 41.
1. El odontograma aparece entre la cabecera y el motivo.
2. **Comparar con el boceto:**
   - la disposición de las filas (Recesión afuera);
   - los temporales bajo 15–11 y 21–25;
   - la línea media;
   - las etiquetas.
3. **Orientación:**
   - en 16 la cara roja está a la derecha (mesial, hacia la línea media);
   - en 21 la azul está a la derecha (distal);
   - en 36 el asterisco rojo está en el centro.
4. **Filas periodontales:** la casilla de movilidad de 31 dice "1" y la de recesión de 41 dice "II".
5. **Lector de pantalla:** pasa sobre la pieza 16 y escucha sus hallazgos.
6. **Anchos:** a 1366 la pieza mide unos 42 px; a 768, unos 33 px con números legibles; a 375 no hay scroll
   horizontal en la página.

## Resultado

### Qué se hizo
Se implementó el feature completo `features/odontogram` en modo solo lectura con arquitectura basada en señales y componentes SVG dumb, integrado en la pantalla de atención clínica:

1. **Modelos de datos (`models/odontogram.models.ts`):**
   - Definidos tipos y DTOs del backend (`Tooth`, `Surface`, `DentalCondition`, `DentalSymbol`, `Finding`, `DentalIndices`, `PatientOdontogram`, `OdontogramCatalog`, etc.).

2. **Capa de API y Store (`services/`):**
   - `OdontogramApi`: servicio `providedIn: 'root'` con petición a `/api/v1/odontogram/catalog` cacheada en sesión con `shareReplay({ bufferSize: 1, refCount: false })` y limpieza de caché ante errores; método `getByPatient(patientId)` sin caché.
   - `OdontogramStore`: store inyectable provisto en la página que ejecuta `forkJoin` para cargar catálogo y odontograma en paralelo, exponiendo signals `catalog`, `odontogram`, `loading`, `error`, `findings`, `indices` y método `reload()`.

3. **Cálculos de dominio y geometría (`domain/`):**
   - `odontogram-layout.ts`: constantes del `viewBox` (854×414), cálculo de posiciones de columnas `x(i)` con separación adicional de línea media en columnas 8 y 9 (`MIDLINE = 16`), disposición de las 52 piezas dentales (permanentes superiores e inferiores en espejo, temporales centrados bajo sus homólogos en arcadas superior e inferior), casillas periodontales (Recesión en filas exteriores `recU`/`recL`, Movilidad en `movU`/`movL`), etiquetas de fila y línea media discontinua.
   - `surface-layout.ts`: mapeo bidireccional región ↔ cara según arcada y cuadrante (respetando la regla clínica de que el paciente mira al observador, con mesial hacia la línea media); generación de trapecios para piezas cuadradas y sectores de anillo para piezas temporales; generación del trazo del asterisco de 3 segmentos a 0°, 60° y 120° en el centroide de la región para sellantes.
   - `tooth-names.ts`: nombres en español de cada pieza ("primer molar superior derecho", "incisivo central temporal...", etc.).
   - `finding-symbol.ts`: clasificador de hallazgos por pieza y cara, resolución de marcas visuales (`fill` para caries/obturación, `asterisk` para sellante, número para movilidad y número romano para recesión), preservación de hallazgos pendientes para 009b y generación del `aria-label` accesible.

4. **Componentes visuales (`components/`):**
   - `ToothComponent` (`g[bdTooth]`): selector de atributo SVG que dibuja las 5 regiones con atributos `data-tooth`, `data-surface`, `data-condition`, `data-status`, `<title>` descriptivo, asteriscos cuando corresponde, el número FDI centrado y accesibilidad `role="img"`.
   - `PeriodontalRowComponent` (`g[bdPeriodontalRow]`): 16 casillas por fila con rectángulos redondeados y grado centrado en negrita (números romanos para recesión, arábigos para movilidad).
   - `DentalIndicesComponent` (`bd-dental-indices`): muestra totales CPO y ceo, leyenda clínica ("Rojo = pendiente · azul = realizado · negro = prótesis") y aviso "Sin hallazgos registrados" si no existen hallazgos.
   - `OdontogramComponent` (`bd-odontogram`): componente presentacional que ensambla el SVG completo responsivo con `viewBox="0 0 854 414"`, `width: 100%`, `max-width: 56rem` y los índices inferiores.
   - `index.ts`: exportación pública de componentes, servicios, store y modelos para consumo desde otros features.

5. **Integración en la atención clínica (`features/clinical`):**
   - En `encounter.page.ts`: provisto `OdontogramStore`, reemplazada la franja reservada placeholder por una tarjeta de odontograma con título "Odontograma", manejo de estados (skeleton de 24rem, alert de error con botón de reintento, y componente `bd-odontogram` cuando está cargado), y efecto que dispara `odontogramStore.load(patientId)` al detectar el `patientId` de la atención.
   - En `fixtures.ts`: añadido `mockOdontogramCatalog` con 52 piezas y 14 condiciones, `mockPatientOdontogramWithFindings` y el helper `flushOdontogram(httpMock)`.
   - En `encounter.page.spec.ts`: incorporado el test unitario/integración `carga el odontograma → caras pintadas, grados e índices` y ajustada la atención de peticiones en los 5 tests preexistentes.

### Resultado del build y tests
- **Build:**
  `Application bundle generation complete. [21.975 seconds]` — Compilación exitosa sin errores ni advertencias de tipo.
- **Tests (copia literal de la consola):**
```
 Test Files  8 passed (8)
      Tests  30 passed (30)
```

### Anchos revisados y responsive
- **1366px:** El odontograma se despliega centrado con su `max-width: 56rem` (~896px), las piezas permanentes se dibujan a ~40-42 px, los números FDI y las etiquetas periodontales son claramente legibles y no se solapan.
- **1024px:** El contenedor principal aprovecha el ancho remanente al lado del sidebar colapsado, el SVG escala limpiamente sin recorte ni desbordamiento horizontal.
- **768px (Tablet):** Con el viewport ocupado por la vista de contenido, el SVG escala uniformemente manteniendo proporciones y alineación en espejo. El texto se mantiene nítido y legible.
- **375px (Mobile):** El SVG completo escala proporcionalmente dentro del ancho disponible (343 px visibles), sin generar scroll horizontal en la página de atención.

### Cómo levantar para prueba manual
1. Iniciar sesión con un usuario odontólogo (`odontologa@bellidental.local`).
2. Abrir o acceder a una atención activa en `/consultorio/atencion/{id}`.
3. Registrar hallazgos mediante API en la atención si se desean probar estados coloreados:
   - Caries en 16 mesial (`POST /api/v1/encounters/{id}/findings` con `toothCode: 16`, `surfaceCode: "M"`, `conditionId: 3`, `status: "PENDING"`).
   - Obturación en 21 distal (`surfaceCode: "D"`, `conditionId: 4`, `status: "DONE"`).
   - Movilidad en 31 (`toothCode: 31`, `conditionId: 1`, `grade: 2`).
   - Recesión en 41 (`toothCode: 41`, `conditionId: 2`, `grade: 2`).
4. Verificar visualmente la disposición de las piezas, las caras pintadas en rojo y azul, los números romanos en recesión y los totales CPO/ceo al pie.

### Problemas encontrados y supuestos tomados
- **Timing del efecto en tests:** Debido a que el `effect()` de carga en Angular se evalúa tras la detección de cambios, se invocó `fixture.detectChanges()` antes de llamar a `flushOdontogram(httpMock)` en las pruebas para asegurar que las peticiones HTTP del odontograma estuvieran activas en el mock controller antes de ser respondidas.
- **Colores clínicos:** Los colores de símbolos (`#D32F2F`, `#1E88E5`, `#000000`) se extraen directamente del catálogo/símbolo del backend sin mapearlos a la paleta corporativa de la aplicación, conforme a la excepción explícita estipulada en el plan y clean-code.

## Revisión

**Estado: APROBADO** (revisión 1, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 30/30 (8 archivos), antes y después del ajuste.
Revisé el dominio línea por línea:
- **`surface-layout`:**
  - las regiones del cuadrado y del círculo son idénticas a `regionPaths()` del boceto;
  - región ↔ cara sigue `faceAt()`: V/L según la arcada, D/M según el cuadrante y la `L` superior se nombra
    "palatina";
  - la `O` de las posiciones 1–3 se nombra "incisal".
- **`odontogram-layout`:**
  - `x(i)`, `W = 854`, `H = 414`;
  - las filas del criterio 6, con Recesión como la exterior (F-11);
  - los temporales bajo 15–11/21–25 y 45–41/31–35.
- **`finding-symbol`:**
  - cara → `fill` o `asterisk`;
  - movilidad y recesión (romano) en sus filas;
  - el resto queda en `pending009b` y entra en el `aria-label`.
- **`OdontogramApi`:** el catálogo se pide una vez y un error no queda en la caché.
- **Carga:** el store se provee en la página, que carga una vez por paciente con un `effect`.
- **Componentes:** los SVG usan `svg:` y el texto mide 15 unidades.
- **Test:** el caso nuevo cubre caras, grados e índices, y los 5 casos anteriores atienden las peticiones nuevas.

Corrección mínima de Claude: en `finding-symbol.ts`, un hallazgo sin `symbol` usaba `#D32F2F`, un rojo clínico
inventado que diría "pendiente". Ahora usa `var(--slate-500)`, que es neutro, y el `aria-label` conserva el
hallazgo.

Anotado para la 009b (no bloquea):
- En las regiones `top` y `bottom` del cuadrado (de 12 unidades de alto), el asterisco del sellante (14.4 unidades)
  sobresale unos 0.2 del borde. Conviene escalarlo al tamaño de la región: `min(0.36·s, 0.9·alto de la región)`.
- Si falta una pieza en el catálogo, `renderedTeeth` la arma con datos calculados. Funciona, pero sería mejor
  avisar en consola de desarrollo.

Commit: `features/odontogram/`, `features/clinical/{pages/encounter,testing}`, `docs/IMPLEMENTATION-PLAN.md` y este
archivo. No incluir `prompt.txt` ni la documentación del flujo sin versionar.
