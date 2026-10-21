# 010b — Odontograma: prótesis en rango ("Elige la pieza final")

> Plan §5.10 y §6 (punto 4 de la interacción), P10, parte 2b. Se construye sobre la 010a (`525688d`). El dibujo de
> las bandas ya existe desde la 009b (`span-band`), así que aquí solo se agrega el registro.
> Perfil: el odontólogo que atiende, igual que la 010a.

## Objetivo
Registrar prótesis que abarcan varias piezas (fija, removible, total) con el mismo ritmo de la 010a:
1. con la pieza inicial seleccionada, un clic en "Prótesis fija" (o removible, o total) activa el modo
   **"Elige la pieza final"**;
2. un clic en otra pieza de la misma arcada registra el hallazgo
   (`POST …/findings { toothCode, endToothCode, conditionId, status: 'DONE' }`);
3. la banda aparece sobre la arcada (superior) o bajo ella (inferior), dibujada por la 009b, y el panel la lista
   con "Anular".

## Contrato (verificado en `FindingRules`)
- **Body.** `SPAN` exige `endToothCode` y no admite `surfaceCode`.
- **Pieza final.** Debe ser de la **misma arcada** y **distinta** de la inicial. Si no, el backend responde 400
  "La pieza final debe ser de la misma arcada y distinta a la inicial".
- **Estados.** Las tres prótesis (ids 11, 12 y 13) solo tienen símbolo `DONE`.

**Decisión del frontend:** además de la misma arcada, la pieza final debe ser de la **misma dentición** (permanente
con permanente, temporal con temporal). El backend admitiría 15→55, pero las dos piezas comparten columna y la
banda tendría largo cero. Una prótesis entre temporales es rarísima, pero se permite.

## Archivos a tocar
```
src/app/features/odontogram/
  domain/finding-request.ts           createRequest: endToothCode solo en SPAN; validateSpanEnd(start, end);
                                      buildFindingDescription para rangos
  components/tooth-conditions/tooth-conditions.component.ts   + grupo "Prótesis (de una pieza a otra)" y su
                                                                estado "Eligiendo pieza final…"
  components/tooth-panel/tooth-panel.component.ts            pasa spanMode y startSpan/cancelSpan
  components/odontogram/odontogram.component.ts              spanMode (condición + pieza inicial); captura del
                                                             clic o Enter final; aviso sobre el SVG;
                                                             @media suelto → bp-up(lg)
  components/tooth/tooth.component.ts                        + input dimmed (otra arcada durante el modo)
src/app/features/clinical/
  pages/encounter/encounter.page.spec.ts   + 1 caso
```
Sin servicios ni endpoints nuevos: se reutiliza `registerFinding` → `OdontogramStore.register`.

## Criterios de aceptación
**Iniciar el modo**
1. **Grupo nuevo** en `tooth-conditions`: "Prótesis (de una pieza a otra)", con las condiciones `SPAN` del catálogo
   (Prótesis fija, Prótesis removible, Prótesis total).
   - Cada una es un botón de ≥ 44 px con su `bd-symbol-glyph` (tramo de banda) y el nombre del catálogo.
   - Solo están habilitados si hay una pieza seleccionada y no se está guardando.
2. **Al pulsar una prótesis**, el panel emite `startSpan(condition)` y `OdontogramComponent` entra en
   `spanMode = { condition, startCode: selectedToothCode }`:
   - se limpia la cara seleccionada y la pieza inicial conserva su anillo dorado;
   - el botón de esa prótesis se marca con `aria-pressed="true"` y dice "Eligiendo pieza final…";
   - aparece un botón "Cancelar".

**Durante el modo**

3. **Aviso:** sobre el SVG, dentro de la tarjeta, va un aviso (región `aria-live="polite"`, fondo
   `--gold-100` y texto `--gold-700`) que se ve en todos los anchos, porque en `< lg` el panel queda debajo:
   - "Prótesis fija desde la pieza 15: toca la pieza final de la misma arcada.", con un botón "Cancelar" de
     ≥ 44 px;
   - en la vista por cuadrante, si la otra mitad de la arcada está en la otra pestaña, el aviso agrega "Puedes
     cambiar a 21–28".
4. **Piezas que no sirven:** las de la otra arcada o de otra dentición se dibujan atenuadas (`dimmed`, `opacity`
   0.4) mientras dura el modo. Siguen siendo navegables con el teclado.
5. **Elegir la pieza final:** un clic en una región o en el número de una pieza, o Enter sobre una pieza enfocada,
   o un clic en una casilla periodontal (vale por la permanente de esa columna):
   - **Válida** (misma arcada, misma dentición y distinta de la inicial; `validateSpanEnd`): emite
     `registerFinding` con `createRequest({ toothCode: startCode, endToothCode, condition, status: 'DONE' })` y
     sale del modo.
   - **No válida:** el aviso cambia a "La pieza final debe ser de la misma arcada (y dentición) y distinta de la
     15." y el modo sigue activo.
   - El clic de elegir no cambia la pieza seleccionada: la selección sigue en la inicial.
6. **Cancelar:** Esc (en el SVG o en el panel), el botón "Cancelar" del aviso o del panel, o elegir otra condición
   del panel salen del modo sin registrar. Esc durante el modo solo cancela el modo; un segundo Esc limpia la
   selección, como en la 010a.
7. **Cuadrantes:** cambiar de cuadrante (009b) durante el modo lo mantiene, para elegir la final en la otra
   pestaña de la misma arcada.

**Después del registro**

8. **Respuesta:**
   - `lastAction`: "Prótesis fija registrada de 15 a 13" (`buildFindingDescription` con rango);
   - el store recarga sin destruir la vista (010a) y la banda aparece con la forma y el color del catálogo;
   - "Vigente en la pieza" la muestra en la pieza inicial y en las demás del rango ("Prótesis fija · de 15 a 13 ·
     Realizado"), con "Anular" si es de esta atención;
   - si hay error (400 o 409): sale del modo y muestra `actionError` con el `message` del backend.
9. **`createRequest`:**
   - agrega `endToothCode` solo si la condición es `SPAN`, y nunca `surfaceCode` en ese caso;
   - en `SURFACE` y `TOOTH` el body no cambia respecto de la 010a. Los tests de la 010a lo comprueban.

**Limpieza**

10. En `odontogram.component`, la grilla del panel usa `@include bp.bp-up(lg)` (de `shared/styles/breakpoints`)
    en lugar de `@media (min-width: 1200px)`.

## Responsive
- **1366:** el aviso va sobre el SVG y el panel a la derecha marca la prótesis en curso.
- **1024 y 768:** el aviso sobre el SVG es lo que guía; el panel queda debajo.
- **375:** el aviso cabe en dos líneas con "Cancelar" de ≥ 44 px. Cambiar de pestaña para elegir una final del otro
  lado funciona.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
Un caso nuevo en `encounter.page.spec.ts`. Los 7 casos actuales deben seguir pasando.
1. `prótesis fija de 15 a 13 → POST con endToothCode y aparece la banda`:
   - con la atención editable y un odontograma vacío, clic en el número de la pieza 15 y después en "Prótesis fija";
   - el aviso "toca la pieza final" es visible;
   - clic en el número de la pieza 13;
   - `expectOne` POST `/api/v1/encounters/enc-1/findings` con el body exacto
     `{ toothCode: 15, endToothCode: 13, conditionId: 11, status: 'DONE' }`, que se responde 201;
   - `detectChanges()` y recarga (`flushOdontogram`) con el hallazgo `SPAN` (`symbol` `SQUARES_LINE`, `#000000`,
     `DOTTED`);
   - existe `[role="img"][aria-label="Prótesis fija de 15 a 13 (Realizado)"]` y el aviso ya no está.

## Prueba manual
Sesión de odontóloga con una atención abierta.
1. **Prótesis fija:** pieza 15 → "Prótesis fija".
   - El aviso dorado aparece sobre el odontograma y la arcada inferior se atenúa.
   - Toca la 13: aparece la línea punteada con cuadrados negros sobre 15–13 y el panel la lista con "Anular".
2. **Pieza no válida:** pieza 24 → "Prótesis removible" → toca la 34 (otra arcada). Sale el mensaje y el modo
   sigue. Toca la 27: aparece "( · · · )".
3. **Cruzar la línea media:** pieza 16 → "Prótesis total" → 26. El "=" cruza la línea media.
4. **Cancelar:** inicia una prótesis y presiona Esc. No se registra nada y la pieza sigue seleccionada.
5. **Teclado:** pieza 45 con Enter → en el panel, "Prótesis fija" → flechas hasta 43 → Enter. Se registra.
6. **Anular:** anula la prótesis 15–13 desde la pieza 14 (está en el rango). La banda desaparece.
7. **375:** pieza 14 en la pestaña 18–11 → "Prótesis fija" → cambia a 21–28 → toca la 22. La banda se dibuja cortada
   en el borde de cada pestaña.

## Resultado

**Archivos (sin commit):**
- `src/app/features/odontogram/domain/finding-request.ts`: `createRequest` agrega `endToothCode` solo en `SPAN` (sin
  `surfaceCode`); `validateSpanEnd(start, end, teeth)` con un único mensaje para pieza igual, otra arcada u otra
  dentición; `buildFindingDescription` acepta `endToothCode` ("Prótesis fija registrada de 15 a 13"). Se corrigieron
  comillas escapadas en un comentario.
- `src/app/features/odontogram/services/odontogram.store.ts`: pasa `request.endToothCode` a `buildFindingDescription`
  (antes el `lastAction` de un rango no lo mostraba).
- `src/app/features/odontogram/components/odontogram/odontogram.component.ts`: `spanMode` / `spanError` / `spanPartnerHint`;
  inicio, cancelación, captura del clic en pieza, número, cara, casilla periodontal y Enter; `Esc` sobre el SVG
  (`onClearSelection`: primero sale del modo, luego limpia la selección); `onPanelRegister` sale del modo al registrar
  otra condición; `dimmed` por pieza con `validateSpanEnd`; `@media` reemplazado por `@include bp.bp-up(lg)` (1200 px,
  el mismo corte que tenía antes el `@media`; el borrador anterior tenía 1024 px y se corrigió).
- `src/app/features/odontogram/components/span-notice/span-notice.component.ts` (nuevo, presentacional): aviso
  `role="status"` `aria-live="polite"`, fondo `--gold-100`, texto `--gold-700`, borde `--gold-400`, botón "Cancelar" de
  44 px. Se extrajo del odontograma para que su plantilla quede en 149 líneas.
- `src/app/features/odontogram/components/tooth-conditions/tooth-conditions.component.ts`: grupo "Prótesis (de una pieza
  a otra)" con los `SPAN` del catálogo; `aria-pressed`, "Eligiendo pieza final…", `startSpan`; deshabilitado si
  `saving()` o `!canStartSpan()`.
- `src/app/features/odontogram/components/tooth-panel/tooth-panel.component.ts`: pasa `isSpanning`, `activeSpanConditionId`,
  `canStartSpan`; emite `startSpan` y `cancelSpan`; botón "Cancelar modo prótesis" mientras dura el modo.
- `src/app/features/odontogram/components/tooth/tooth.component.ts`: input `dimmed` → `opacity` 0.4.
- `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: caso nuevo "prótesis fija de 15 a 13 → POST con
  endToothCode y aparece la banda" (usa `flushOdontogram`). Los 7 casos previos no cambiaron.

**Totales (copiados de la consola):**
- `npx ng build`: "Application bundle generation complete" sin errores ni warnings.
- `npx ng test --watch=false`: `Test Files  8 passed (8)` / `Tests  32 passed (32)`.
- Spec de encounter por separado: `Tests  8 passed (8)`.

**Criterios 1–10:** cumplidos en código. Limitación: "elegir otra condición del panel" sale del modo al registrar una
condición normal; abrir el formulario "Otro" no sale del modo.

**Anchos revisados:** no tengo navegador, así que no lo probé visualmente. Lo revisé leyendo el CSS:
- 1366 y 1200+: el aviso va sobre el SVG a todo el ancho y el panel queda a la derecha (grid `bp-up(lg)`).
- 1024 y 768: el aviso es flex con texto que envuelve y el botón a 44 px; el panel queda debajo.
- 375: el aviso apila el texto con el botón (ancho del contenedor, `min-width: 0` en el texto). Revisar en DevTools.
- Pendiente de comprobación manual: el aviso en `< 720` px con pestaña 18–11 muestra "Puedes cambiar a 21–28".

**Supuestos:**
- La dentición se compara con `Tooth.dentition` del catálogo; si la pieza no está en el catálogo solo se valida arcada.
- El "Puedes cambiar a" se muestra cuando la pestaña activa es la del cuadrante de la pieza inicial y la vista es por
  cuadrante (`< 720` px).
- Los estados de prótesis (`DONE`) y el color negro vienen del catálogo, no de constantes en el código.
- No se tocaron `docs/IMPLEMENTATION-PLAN.md`, `prompt.txt` ni el backend. No hay commit.

## Revisión
**Estado: APROBADO** (revisión 1, Claude Opus)

> La ejecutó **Haiku** a pedido del usuario: a Gemini se le acabó la cuota a mitad de la tarea. Haiku completó el
> borrador de Gemini y Claude (Opus) revisó y corrigió.

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 32/32 (8 archivos), después de las correcciones.
Cumplen:
- `spanMode` con la pieza inicial;
- `validateSpanEnd`: misma arcada, misma dentición y distinta de la inicial;
- pieza final por clic, Enter o casilla periodontal;
- atenuado de las piezas que no sirven;
- aviso `span-notice` sobre el SVG con "Puedes cambiar a…" en la vista por cuadrante;
- Esc en dos niveles (primero cancela el modo, después la selección);
- salida del modo al registrar otra condición;
- `endToothCode` solo en `SPAN`;
- `lastAction` "… registrada de 15 a 13";
- `bp-up(lg)` en lugar de `@media` suelto;
- el test 8 con el body exacto y la banda.

Correcciones mínimas de Claude:
1. **Tokens inexistentes heredados de la 009b y la 010a** (no de esta tarea; no los detecté en esas revisiones):
   - `slate-400`, `slate-700` y `slate-900` en `periodontal-grades`, `other-note-form`, `surface-glyph`,
     `tooth-panel`, `odontogram-legend`, `tooth-current-findings` y `tooth-conditions`;
   - se reemplazaron por `slate-500`, `slate-600` y `slate-800` (tabla de la 008c);
   - el grep del criterio 1 de la 008c ya no devuelve ningún token sin definir en `src/`.
2. **Abrir "Otro…" durante el modo prótesis no salía del modo** (criterio 6). `tooth-conditions` emite
   `cancelSpan` al abrir el formulario y `tooth-panel` lo reenvía.
3. **El botón de cerrar del panel medía 36×36 px.** Ahora mide 44×44 (objetivos táctiles).

### `/impeccable audit` — odontograma (009a–010b)
Hecho sin navegador: el detector (`impeccable detect src/app/features/odontogram`) no encontró nada, más una
revisión del código. El contraste y el responsive real quedan para la prueba manual del usuario.

| # | Dimensión | Nota | Hallazgo principal |
|---|---|---|---|
| 1 | Accesibilidad | 3 | Bien: foco itinerante, `aria-label` por pieza y por rango, `aria-live` en el panel y en el aviso. Pendiente: probar con lector de pantalla real |
| 2 | Rendimiento | 3 | Bien: `computed` puros y recarga sin destruir la vista. `buildAccessibleToothLabel` recorre los rangos por cada pieza (52×rangos, despreciable) |
| 3 | Tokens y colores | 3 | Corregido aquí. Los colores clínicos salen solo del `symbol` |
| 4 | Responsive | 3 | Cuadrantes con < 720 px, objetivos de ≥ 44 px en el panel y piezas de unos 33 px en 768. Falta verlo en DevTools |
| 5 | Integridad | 4 | Coherente con el 033 y el boceto; dominio puro y testeable |
| **Total** | | **16/20** | Bueno |

**Patrón que se repite:** los tokens inexistentes volvieron a aparecer dos tareas después de la 008c. Recomendación
para las tareas siguientes: que el ejecutor corra el grep de la 008c antes del build y lo copie en Resultado.

Commit (cuando el usuario lo autorice): `features/odontogram/`, `features/clinical/pages/encounter/encounter.page.spec.ts`,
`docs/IMPLEMENTATION-PLAN.md` y este archivo. No incluir `prompt.txt` ni la documentación del flujo sin versionar.
