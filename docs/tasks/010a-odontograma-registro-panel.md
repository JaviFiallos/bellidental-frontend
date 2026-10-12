# 010a — Odontograma: registro en la atención con el panel de la pieza

> Plan §5.10 y §6 (P10, parte 2). La 010 se divide en dos:
> - **010a (esta tarea):** selección de pieza y cara, panel de la pieza, registro por cara, por pieza y periodontal,
>   lo vigente con "Anular", y el teclado.
> - **010b:** prótesis en rango ("Elige la pieza final").
>
> Perfil: ODONTOLOGO y DIRECTOR, solo el odontólogo que atiende. Base visual: el boceto (`toothPanel()` y la
> selección en `toothSVG()`: cara con borde azul y pieza con anillo dorado) y `docs/reference/odontograma-completo.txt`.

## Brief de diseño (`/impeccable shape`; dirección confirmada con la 009: seguir el boceto)
- **Tarea principal:** registrar un hallazgo con **2 clics**: la cara (o el número de la pieza) y la condición. Se
  mide en la tarea T1 de la tesis.
- **Lo que hace sentir que es el 033:**
  - el panel ofrece solo las condiciones que aplican (de cara, de pieza o periodontales) y solo los estados que
    tienen símbolo;
  - lo registrado aparece al instante con su símbolo;
  - lo de atenciones anteriores no se borra: se registra el estado nuevo y el último gana (D-14).
- **Antigoals:**
  - sin modales para registrar: el panel está siempre a la vista, a la derecha o debajo;
  - sin "Guardar": cada clic en una condición es un registro;
  - sin borrar: "Anular" solo para lo de esta atención.

## Objetivo
Convertir el odontograma de la atención en editable, cuando la atención lo permite:
1. un clic en una cara selecciona la pieza y esa cara;
2. un clic en el número de una pieza, o en su casilla periodontal, selecciona la pieza;
3. el panel de la pieza ofrece las condiciones aplicables, y un clic registra el hallazgo
   (`POST /encounters/{id}/findings`);
4. el odontograma, los índices y el panel se actualizan;
5. el panel lista lo vigente en la pieza y deja anular lo registrado en esta atención.

Fuera de esta tarea: la prótesis en rango (010b).

## Contrato (verificado en `bellidental-backend`, `OdontogramService` y `FindingRules`)
- **`POST /api/v1/encounters/{encounterId}/findings`** (`RECORD_CREATE`) → `201 ApiResponse<Finding>`.
  - Body: `{ toothCode, endToothCode?, surfaceCode?, conditionId, status, grade?, notes? }`.
  - Reglas (400 `InvalidInputException` con su `message`):
    - `SURFACE` exige `surfaceCode` y no admite `endToothCode`;
    - `TOOTH` no admite ni `surfaceCode` ni `endToothCode`;
    - con `gradeMin`/`gradeMax`, el `grade` es obligatorio y debe estar en ese rango; sin ellos, `grade` debe ir
      `null`;
    - el `status` debe tener un símbolo en el catálogo ("Estado no permitido para esta condición");
    - `OTHER` exige `notes`.
- **Quién puede registrar.** Solo el profesional que atiende puede registrar o anular, aunque la atención esté
  `COMPLETED` (D-6). Si la atención es de otro profesional o está anulada, el backend responde 409.
- **`GET /api/v1/encounters/{id}/findings`** (`RECORD_READ`) → `ApiResponse<Finding[]>`: los hallazgos activos de
  esta atención. Sirve para saber cuáles se pueden anular.
- **`POST /api/v1/findings/{id}/void`** (`RECORD_UPDATE`) → `200 ApiResponse<Void>` con el message "Hallazgo
  anulado.". No lleva body ni motivo. Si el hallazgo ya estaba anulado, responde 409.
- **Estados por condición** (semilla V8):

  | Condición | Estados con símbolo |
  |---|---|
  | Caries | PENDING |
  | Obturación | DONE |
  | Sellante | PENDING y DONE |
  | Extracción indicada | PENDING |
  | Pérdida por caries | DONE |
  | Pérdida por otra causa | DONE |
  | Endodoncia | PENDING y DONE |
  | Corona | DONE |
  | Otro | PENDING y DONE |
  | Movilidad | DONE, con grado 0–3 |
  | Recesión | DONE, con grado 1–4 |

## Archivos a tocar
```
src/app/features/odontogram/
  domain/finding-request.ts                 (nuevo) estados permitidos, estado por defecto y armado del CreateFindingRequest
  models/odontogram.models.ts               + CreateFindingRequest
  services/odontogram.api.ts                + createFinding, encounterFindings, voidFinding
  services/odontogram.store.ts              + encounterId, encounterFindingIds, saving, actionError, lastAction;
                                              register(), void(), reload() con los hallazgos de la atención
  components/odontogram/odontogram.component.ts    + editable, selección (pieza, cara), panel, outputs
  components/tooth/tooth.component.ts              + clic en región o número, cara seleccionada y anillo de pieza
  components/periodontal-row/periodontal-row.component.ts   + clic en casilla (modo editable)
  components/tooth-panel/tooth-panel.component.ts            (nuevo) cabecera, caras y estado
  components/tooth-conditions/tooth-conditions.component.ts  (nuevo) botones de condición: cara, pieza, periodontal, Otro
  components/tooth-current-findings/tooth-current-findings.component.ts   (nuevo) "Vigente en la pieza" con "Anular"
  components/symbol-glyph/symbol-glyph.component.ts          color por defecto var(--slate-700) → var(--slate-600)
src/app/features/clinical/
  pages/encounter/encounter.page.ts         editable, encounterId, outputs → store; confirmación de anular
  pages/encounter/encounter.page.spec.ts    + 1 caso; flushOdontogram atiende también GET …/encounters/{id}/findings
  testing/fixtures.ts                       flushOdontogram + respuesta de hallazgos de la atención
```
Todos los componentes de `odontogram` siguen siendo presentacionales (inputs y outputs). La selección (pieza, cara y
estado) es estado de interfaz con signals dentro de `OdontogramComponent`. El HTTP vive en el store, y la confirmación
de anular, en la página, como en la 008b.

## Criterios de aceptación
**Datos y store**
1. **`OdontogramStore.load(patientId, encounterId?)`.** Con `encounterId`, pide en paralelo el catálogo (en caché),
   el odontograma y `GET /encounters/{id}/findings`, y expone `encounterFindingIds: Set<string>`. `reload()` repite
   las tres peticiones.
2. **`register(request)`:**
   - hace `POST …/findings` con `saving = true`;
   - si funciona: `lastAction` con el texto "Caries registrada en 16 mesial" y `reload()`;
   - si falla: `actionError` con el `message` del backend y sin recarga.
3. **`void(finding)`:**
   - hace `POST /findings/{id}/void`;
   - si funciona: `lastAction` "Hallazgo anulado" y `reload()`;
   - si falla: `actionError`.
4. **Página:**
   - pasa `[editable]`, que vale `!store.isReadOnly()` más el permiso `RECORD_CREATE`, y `[canVoid]` con
     `RECORD_UPDATE`;
   - pasa `[encounterFindingIds]`, `[saving]`, `[actionError]` y `[lastAction]`;
   - escucha `(registerFinding)` → `store.register` y `(voidFinding)` → `ConfirmDialogService` (título "Anular
     hallazgo", el texto "{condición} · {dónde} quedará anulado en esta atención.", tono `danger`, sin motivo) →
     `store.void`.

**Selección** (solo con `editable`; en solo lectura no cambia nada de la 009)

5. **Clic en una región** de una pieza:
   - selecciona esa pieza y esa cara;
   - la cara seleccionada se dibuja con `stroke` `var(--blue-800)` de 2.2, encima de las demás;
   - la pieza seleccionada tiene un anillo `var(--gold-400)` de 2.5 (rectángulo `x−3`, `y−3` y lado `s+6`;
     redondeado si es temporal), como el boceto;
   - el cursor es `pointer` y las regiones de una pieza perdida también se pueden pulsar.
6. **Otros clics:**
   - un clic en el **número FDI** de una pieza la selecciona sin cara;
   - un clic en una **casilla de recesión o movilidad** selecciona la pieza permanente de esa columna y el panel
     lleva el foco a su sección "Periodontal";
   - **Enter** sobre una pieza enfocada (`toothActivate` de la 009b) la selecciona sin cara y mueve el foco al
     primer botón de cara del panel;
   - **Esc** en el panel limpia la selección y devuelve el foco a la pieza.
6b. **Temporales (dientes de leche).** Todo lo de esta tarea vale igual para las 20 piezas temporales (51–55, 61–65,
    71–75 y 81–85):
    - sus regiones y su número se pueden pulsar;
    - el panel las nombra ("Primer molar temporal superior derecho");
    - el body lleva su código FDI (`toothCode: 54`);
    - lo registrado en ellas cuenta para el **ceo**.

    La casilla periodontal de una columna selecciona la pieza permanente. Para la movilidad o la recesión de una
    temporal, se selecciona la temporal y se usan los botones de grado del panel.
7. Al registrar o anular, la selección (pieza y cara) **se mantiene**, para registrar otra cosa en la misma pieza
   sin volver a tocarla.

**Panel de la pieza** (`tooth-panel`, `tooth-conditions` y `tooth-current-findings`)

8. **Ubicación:**
   - en `≥ lg` va a la derecha del SVG, dentro de la misma tarjeta (grilla `1fr` + `minmax(18rem, 22rem)`), como
     el `at-grid` del boceto;
   - en `< lg` va debajo del SVG, a todo el ancho;
   - sin pieza seleccionada muestra "Toca una cara o el número de una pieza para registrar".
   - En solo lectura no hay panel y el odontograma ocupa todo el ancho, como en la 009.
9. **Cabecera:** "Pieza {código}" y el nombre ("Primer molar superior derecho").
10. **"Cara":** 5 botones de ≥ 44 px con `aria-pressed`.
    - Etiquetas: `V`, `P` o `L` (palatina en la superior), `M`, `D` y `O` o `I` (incisal en la posición 1–3), con
      `title` y `aria-label` del nombre completo.
    - Envían el código del backend: `L` para palatina y `O` para incisal (`surface-layout`).
    - Los botones y el clic en el SVG cambian la misma selección.
11. **"Estado":** `bd-segmented` "Pendiente (rojo)" / "Realizado (azul)", con Pendiente por defecto.
    - Solo afecta a las condiciones con dos estados (sellante, endodoncia, otro).
    - En las demás, el botón usa siempre su único estado: `domain/finding-request.ts` → `allowedStatuses(condition)`
      y `effectiveStatus(condition, selected)`.
12. **Condiciones** (`tooth-conditions`), en tres grupos, cada botón con su `bd-symbol-glyph` en el color del estado
    efectivo y el nombre del catálogo:
    - **"En la cara {nombre}":** las `SURFACE` (caries, obturación, sellante). Si no hay cara elegida, están
      deshabilitados con el texto "Elige una cara".
    - **"Pieza completa":** las `TOOTH` sin grado ni `OTHER` (extracción indicada, pérdida por caries, pérdida por
      otra causa, endodoncia, corona), más "Otro…".
      - "Otro…" despliega en el panel un campo "Nota (obligatoria)" con "Registrar" (Enter) y "Cancelar" (Esc).
        Sin texto no se envía.
    - **"Periodontal":** "Movilidad" con un botón por grado (`gradeMin…gradeMax`: 0 1 2 3) y "Recesión" con un botón
      por clase (I II III IV, que envía 1–4).
      - El grado vigente de esa pieza se marca con `aria-pressed`.
    - Las `SPAN` no aparecen hasta la 010b.
    - Todos los botones miden ≥ 44 px.
13. **Un clic en una condición registra** (2 clics desde la cara):
    `createRequest({ tooth, surface, condition, status, grade, notes })` arma el body con las reglas del contrato:
    - `surfaceCode` solo en `SURFACE`;
    - `grade` solo en las condiciones con rango;
    - `notes` solo en `OTHER`;
    - `endToothCode` nunca, en esta tarea.

    Mientras `saving` está activo, los botones se deshabilitan.
14. **Respuesta:**
    - `lastAction` se anuncia en una región `aria-live="polite"` del panel ("Caries registrada en 16 mesial") y se
      ve unos 4 s;
    - `actionError` se muestra en el panel con `bd-alert` y el `message` del backend, y se limpia en la siguiente
      acción.
15. **"Vigente en la pieza"** (`tooth-current-findings`):
    - lista los hallazgos actuales de la pieza seleccionada, sacados de `findings` del odontograma: los de sus
      caras, los de pieza, los periodontales y los rangos que la incluyen;
    - cada fila dice "{condición} · {cara | 'pieza' | 'grado 2' | 'de 15 a 13'} · {Pendiente | Realizado}" e incluye
      su `bd-symbol-glyph`;
    - si el `id` está en `encounterFindingIds`: la etiqueta "Esta atención" y un botón "Anular" (≥ 44 px, solo con
      `canVoid`);
    - si no: "Registrado el {createdAt | clinicDate}", en solo lectura;
    - sin hallazgos: "Sin hallazgos registrados".

**Consistencia y limpieza**

16. Tras cada `reload()`, si la pieza seleccionada sigue en la vista, la selección se mantiene. Si el cambio de
    cuadrante (009b) la deja fuera, el panel sigue mostrando la pieza.
17. En `symbol-glyph`, el color por defecto `var(--slate-700)`, que no existe (regla de la 008c), pasa a
    `var(--slate-600)`.

## Responsive
- **1366:** el odontograma y el panel van lado a lado. El odontograma no baja de unos 40rem; si la tarjeta no da,
  el panel pasa abajo.
- **1024 y 768:** el panel va debajo del SVG. Los botones de cara y de condición van en filas que se ajustan, todos
  de ≥ 44 px.
- **375:** pestañas por cuadrante (009b) y el panel debajo. Las caras se eligen con el dedo en el SVG (piezas de unos
  33 px) o con los botones de cara del panel (≥ 44 px).
- Revisar en **375, 768, 1024 y 1366**. En una tablet real, registrar una caries con el dedo.

## Tests requeridos
Un caso nuevo en `encounter.page.spec.ts`. `flushOdontogram` pasa a atender también
`GET /api/v1/encounters/enc-1/findings` (con `[]`), así que los 6 casos actuales siguen pasando.
1. `registrar caries en la cara O de 36 → POST y la cara se pinta`:
   - con la atención editable cargada y un odontograma vacío, clic en `[data-tooth="36"][data-surface="O"]`;
   - clic en el botón "Caries" del panel;
   - `expectOne` POST `/api/v1/encounters/enc-1/findings` con el body exacto
     `{ toothCode: 36, surfaceCode: 'O', conditionId: 3, status: 'PENDING' }`, que se responde 201 con el
     `Finding`;
   - se atienden la recarga del odontograma (con esa caries) y `GET …/encounters/enc-1/findings` (con su id);
   - la región `[data-tooth="36"][data-surface="O"]` tiene `fill="#D32F2F"`;
   - el panel muestra "Caries · oclusal · Pendiente" con "Anular".

## Prueba manual
Sesión de odontóloga con una atención abierta.
1. **Caries en 2 clics:** cara O de 36 → "Caries". La cara se pinta de rojo, el CPO sube y el panel la lista con
   "Esta atención" y "Anular".
2. **Obturación en 21 D:** el botón no deja elegir "Pendiente", porque se registra como realizada.
3. **Sellante:** elige "Realizado" y registra en 46 O. Sale el asterisco azul.
4. **Pieza completa:**
   - clic en el número 26 → "Endodoncia" con "Realizado": triángulo azul;
   - 46 → "Extracción indicada": X roja;
   - 11 → "Otro…" con la nota "fractura": rectángulo rojo.
5. **Periodontal:** clic en la casilla de movilidad de 31 → grado 2. La casilla dice "2" y el panel marca el 2.
6. **Anular:** anula la caries de 36 con confirmación. La cara vuelve a blanco y el CPO baja.
6b. **Temporales:** caries en la cara O de 54 y extracción indicada en 75. Se pintan en los círculos, el panel dice
    "Primer molar temporal superior derecho" y sube el **ceo** (c 1, e 1), no el CPO.
7. **Antes y después:** abre la atención de otro día del mismo paciente. Lo anterior sale en "Vigente" sin "Anular".
   Registra "Obturación" en esa misma cara: gana el último (D-14).
8. **Solo lectura:** el director, con una atención de la odontóloga, no ve panel.
9. **Teclado:** Tab al odontograma → flechas hasta 16 → Enter. El foco pasa a los botones de cara: elige M y luego
   "Caries". Esc vuelve a la pieza.
10. **Anchos:** a 1366 el panel va a la derecha y a 1024, 768 y 375, debajo. Prueba una tablet con el dedo.

## Resultado
- **Qué se hizo:**
  - **Corrección 1 (Preservar odontograma en recargas):**
    - `src/app/features/odontogram/services/odontogram.store.ts`: Se introdujo la señal `refreshing` y se separó `load(patientId, encounterId)` de `reload()`. Durante recargas de fondo `loading` se mantiene en `false` para que la vista del odontograma no se desmonte ni parpadee. Si una recarga falla, el error se envía a `actionError` sin destruir el odontograma cargado.
    - `src/app/features/clinical/pages/encounter/encounter.page.ts`: Condición del skeleton actualizada a `@if (odontogramStore.loading() && !odontogramStore.odontogram())`, evitando desmontar `<bd-odontogram>` en recargas tras registro o anulación.
    - `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: Agregado `fixture.detectChanges()` inmediatamente tras `postReq.flush` en el test 7 antes de `flushOdontogram`, verificando que la vista y la selección en el panel se conservan activas.
  - **Corrección 2 (Plantillas concisas < 150 líneas):**
    - `src/app/features/odontogram/components/tooth/tooth-marks.component.ts`: Creado el subcomponente SVG `g[bdToothMarks]` para renderizar las figuras y marcas de pieza completa (rectángulo, doble cuadrado, triángulo, cruz, círculo con cruz). La plantilla de `ToothComponent` se redujo a 86 líneas.
    - `src/app/features/odontogram/components/tooth-conditions/other-note-form.component.ts`: Creado subcomponente para el formulario desplegable de nota obligatoria en hallazgos "Otro…".
    - `src/app/features/odontogram/components/tooth-conditions/periodontal-grades.component.ts`: Creado subcomponente para la selección de grados de movilidad (0–3) y recesión (I–IV). La plantilla de `ToothConditionsComponent` se redujo a 123 líneas.
    - `src/app/features/odontogram/components/odontogram/odontogram-quadrant-bar.component.ts`: Creado subcomponente para la barra selectora de cuadrantes móviles y su texto de orientación. La plantilla de `OdontogramComponent` se redujo a 129 líneas.
    - `src/app/features/odontogram/index.ts`: Exportación de los nuevos subcomponentes.
  - **Implementación base previa:**
    - `src/app/features/odontogram/domain/finding-request.ts`: Reglas de dominio para estados permitidos/efectivos, construcción de `CreateFindingRequest`, descripciones de hallazgos y ubicación textual.
    - `src/app/features/odontogram/models/odontogram.models.ts`: Tipo `CreateFindingRequest`.
    - `src/app/features/odontogram/services/odontogram.api.ts`: Endpoints `createFinding`, `encounterFindings` y `voidFinding`.
    - `src/app/features/odontogram/components/symbol-glyph/symbol-glyph.component.ts`: Color por defecto ajustado de `var(--slate-700)` a `var(--slate-600)`.
    - `src/app/features/odontogram/components/periodontal-row/periodontal-row.component.ts`: Soporte interactivo en modo editable (`cellClick`).
    - `src/app/features/odontogram/components/tooth-panel/tooth-panel.component.ts`: Panel lateral/inferior de la pieza con selector de cara, estado, condiciones y hallazgos vigentes.
    - `src/app/features/odontogram/components/tooth-current-findings/tooth-current-findings.component.ts`: Lista de hallazgos vigentes con insignia "Esta atención" y botón "Anular".
    - `src/app/features/clinical/testing/fixtures.ts`: Soporte en `flushOdontogram` para responder peticiones de hallazgos de atención.

- **Resultado del build:**
  - `npx ng build`: OK (0 errores).
  - Copia literal de la línea de totales de `npx ng test --watch=false`:
```
 Test Files  8 passed (8)
      Tests  31 passed (31)
```

- **Anchos revisados y problemas visuales encontrados:**
  - **1366 px:** Grilla con odontograma y panel lado a lado. Sin parpadeos ni desmontaje en recargas.
  - **1024 px y 768 px:** Odontograma completo y panel debajo con botones táctiles ≥ 44 px.
  - **375 px:** Vista móvil por cuadrantes con barra segmentada superior y panel accesible debajo.
  - Sin problemas visuales detectados.

- **Cómo levantar lo necesario para la Prueba manual:**
  - Backend: `mvn spring-boot:run` en `bellidental-backend` (puerto 8080).
  - Frontend: `npm start` en `bellidental-frontend` (puerto 4200).
  - Iniciar sesión como odontóloga con rol `ODONTOLOGO` (o director que atiende) y abrir una atención asignada desde `/consultorio`.

- **Problemas encontrados y supuestos tomados:**
  - Se confirmó que durante recargas de fondo (`reload`), mantener `loading = false` y gestionar `refreshing = true` previene cualquier parpadeo de skeleton y preserva el estado del DOM y de foco del odontograma.
  - Se modularizaron los componentes asegurando que todas las plantillas queden holgadamente por debajo de las 150 líneas sin romper contratos de inputs ni outputs.

## Revisión

**Estado: CORRECCIONES** (revisión 1, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 31/31 (8 archivos). Cumplen:
- `finding-request` (estados permitidos y efectivos; body sin `endToothCode`, `surfaceCode` solo en `SURFACE`,
  `grade` solo con rango y `notes` solo en `OTHER`);
- `load` con los hallazgos de la atención;
- `register`/`void` con `lastAction` (4 s) y `actionError`;
- la selección por cara, número, casilla y Enter;
- la confirmación de anular en la página;
- el color de `symbol-glyph` corregido.

Corregir:

1. **Cada registro o anulación destruye y vuelve a crear el odontograma** (incumple el criterio 7).
   - **Causa:** `reload()` llama a `load()`, que pone `loading = true`, y `encounter.page` muestra el `bd-skeleton`
     en lugar de `bd-odontogram` mientras `loading()`. En la app real, el componente se destruye: parpadea y se
     pierden la pieza y la cara seleccionadas, la pestaña de cuadrante (009b) y el foco.
   - **Por qué el test no lo detecta:** no corre `detectChanges()` entre el `flush` del POST y el de la recarga.
   - **Corrección:**
     - separar la carga inicial de la recarga, por ejemplo con un `refreshing` que no reemplaza la vista, o
       mostrando el skeleton solo si todavía no hay `odontogram()`;
     - un error de la recarga se muestra en el panel (`actionError`) sin quitar el odontograma;
     - en el test 7, agregar `fixture.detectChanges()` justo después del `flush` del POST, antes de
       `flushOdontogram`, para que cubra este caso. Las aserciones existentes, con el panel listando "Caries ·
       oclusal · Pendiente", comprueban que la selección se conserva.
2. **Plantillas sobre el límite de ~150 líneas** (clean-code; en la 008b y la 009b se pidió lo mismo):
   - `tooth-conditions` tiene 183: separar los grupos, por ejemplo un `condition-buttons` genérico para "En la cara"
     y "Pieza completa", `other-note-form` y `periodontal-grades`;
   - `tooth` tiene 161: pasar el dibujo de las marcas de pieza a `g[bdToothMarks]`;
   - `odontogram` tiene 162: pasar a un componente la cabecera de cuadrantes (pestañas + orientación) o el cuerpo
     del SVG.

Sin tests nuevos, salvo el ajuste del punto 1. Los 31 actuales deben seguir pasando.

**Estado: APROBADO** (revisión 2, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 31/31 (8 archivos). Las correcciones están
aplicadas:
1. La carga inicial (`loading`) y la recarga (`refreshing`) están separadas.
   - La página muestra el skeleton o el error solo si todavía no hay `odontogram()`, así que `bd-odontogram` no se
     destruye al registrar o anular, y se conservan la selección, la pestaña de cuadrante y el foco.
   - Un error de la recarga va a `actionError`.
   - El test 7 corre `detectChanges()` después del POST y comprueba que el panel sigue con la pieza seleccionada.
2. Las plantillas están bajo el límite:
   - `odontogram` (130) con `odontogram-quadrant-bar`;
   - `tooth` con `tooth-marks`;
   - `tooth-conditions` (115).

Commit: `features/odontogram/` (incluidos `finding-request`, `tooth-panel`, `tooth-conditions`,
`tooth-current-findings`, `tooth-marks` y `odontogram-quadrant-bar`), `features/clinical/{pages/encounter,testing}`,
`docs/IMPLEMENTATION-PLAN.md` y este archivo. No incluir `prompt.txt` ni la documentación del flujo sin versionar.
