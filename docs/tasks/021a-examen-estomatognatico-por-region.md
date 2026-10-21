# 021a — Examen estomatognático: un campo por región marcada

> Corrige el diseño de la sección 5 de la 021 (pedido del usuario, 2026-10-20). Solo frontend: **el backend 008b ya
> lo soporta** (revisado): el PUT reemplaza `stomatognathicRegions` completa, así que desmarcar = enviar la lista sin
> esa región; la descripción sigue en `stomatognathicExam` (un texto), con el formato de abajo. Sin cambios en la
> sección 10 ni en la impresión.

## Problema
Hoy cada región marcada añade un renglón `N. Región: ` a **un solo** `textarea`, y todo se edita ahí mezclado. El
usuario quiere:
- un **campo propio por cada región marcada** (con su etiqueta "5 · Lengua"), para editar solo esa patología;
- al **desmarcar** una región con texto, una confirmación ("se borrará su descripción");
- que "Sin patología aparente" también genere su propio campo, editable.

## Formato del texto (`stomatognathicExam`, sin cambio en el backend)
Se sigue guardando un solo texto, igual que hoy, para que el 033 impreso no cambie (los renglones salen tal cual):
```
Sin patología aparente            ← bloque general (opcional), antes de las regiones
5. Lengua: saburra en el dorso
8. Carrillos: línea alba bilateral
   continúa en otro renglón       ← un renglón que no empieza por "N. " pertenece a la región anterior
```
- `domain/stomatognathic-exam-text.ts` (nuevo, funciones puras):
  - `parseStomatognathicExam(text, markedRegions)` → `{ general: string; regions: Record<number, string> }`.
    Un renglón `^(\d{1,2})\.\s*[^:]*:\s?(.*)$` cuyo número está en `markedRegions` abre el bloque de esa región;
    los renglones siguientes que no abren otro bloque se le suman. Lo anterior a la primera región es `general`.
    Un renglón `N. …:` de una región **no** marcada se queda como texto general (no se pierde).
  - `serializeStomatognathicExam(general, regions, markedRegions)` → texto: `general` (si no está vacío) y luego
    `N. Nombre: texto` por cada región marcada, en orden numérico. Una región marcada sin texto se guarda como
    `N. Nombre:` (para que el 033 la nombre). Todo vacío → `null`.
  - Ida y vuelta estable: `serialize(parse(t))` no cambia un texto ya normalizado.
- Los datos que ya existen se leen bien: "5. Lengua:  Esta Sucia\n8. Carrillos: …" → dos campos; un texto libre
  sin regiones → campo general.

## Objetivo (UI, `stomatognathic-exam`)
1. Las 12 casillas siguen igual (`<button aria-pressed>` con ✓, 44 px).
2. Debajo, **un campo por región marcada**, en orden numérico: etiqueta "5 · Lengua" asociada a un `textarea` de
   2 filas (`id` único por región). Al marcar una región aparece su campo vacío con el foco puesto. Desaparece el
   `textarea` único.
3. **Desmarcar**:
   - campo vacío → se desmarca sin preguntar;
   - campo con texto → `ConfirmDialogService.open({ title: 'Desmarcar 5 · Lengua', message: 'Se borrará la
     descripción de esta región. ¿Continuar?', confirmLabel: 'Desmarcar', tone: 'danger' })`; si confirma, se quita
     la región y su texto; si cancela, no cambia nada.
4. **"Sin patología aparente"** (solo con ninguna región marcada): crea el campo general con la etiqueta
   "Observación general" y el texto "Sin patología aparente", editable (p. ej. "Sin patología aparente; leve
   halitosis"). El campo tiene un botón "Quitar" (con la misma confirmación si el texto cambió).
   - Si existe el campo general y se marca una región: el campo general se mantiene (no se borra nada) y el botón
     "Sin patología aparente" queda deshabilitado mientras haya regiones.
   - Un texto libre antiguo sin regiones también se muestra en "Observación general".
5. Cada cambio (escribir, marcar, desmarcar, quitar) emite el texto completo serializado (`textChange`) y, si toca,
   `regionToggle`; el store no cambia (mismo autosave de 800 ms con la cabecera completa).
6. Solo lectura: lista "5 · Lengua — saburra en el dorso" por región, más la observación general; sin controles.
7. "033 incompleto" no cambia: el examen cuenta como hecho si `stomatognathicExam` no está vacío.

## Archivos a tocar
```
src/app/features/clinical/
  domain/stomatognathic-exam-text.ts                                (nuevo) parse / serialize
  components/stomatognathic-exam/stomatognathic-exam.component.ts   campos por región, campo general, confirmación
                                                                    (ConfirmDialogService de shared); si pasa de
                                                                    ~150 líneas de plantilla, extraer
                                                                    components/exam-region-field/ (presentacional)
  pages/encounter/encounter.page.spec.ts                            el caso de la 021 se ajusta + 1 caso (abajo)
```
Sin cambios en el store, la sección 10, el `form-033` ni el backend.

## Criterios de aceptación
1. Marcar "5 Lengua" muestra el campo "5 · Lengua" con el foco; escribir "saburra" → el PUT lleva
   `stomatognathicRegions: [5]` y `stomatognathicExam: "5. Lengua: saburra"`.
2. Marcar 8 y luego 5 → los campos y el texto quedan en orden 5, 8.
3. Desmarcar una región con texto pide confirmación; cancelar no cambia nada; confirmar quita la región y su renglón
   del texto. Una región vacía se desmarca sin preguntar.
4. "Sin patología aparente" crea "Observación general" editable; "Quitar" la elimina (confirmando si se editó).
5. Una atención guardada con la 021 ("5. Lengua:  Esta Sucia\n8. Carrillos: …") se ve con sus dos campos y sus
   textos; guardar no pierde nada.
6. El 033 impreso muestra los mismos renglones que antes (`N. Nombre: texto`).
7. Etiquetas asociadas a sus `textarea`, foco visible, 44 px; solo tokens; plantilla de menos de ~150 líneas.

## Responsive
Revisar en **375, 768, 1024 y 1366**. Campos por región a ancho completo en una columna; desde 1024,
`repeat(auto-fill, minmax(18rem, 1fr))` (dos columnas si caben). Sin scroll horizontal.

## Tests requeridos
`encounter.page.spec.ts` (sin archivos nuevos de test):
1. Ajustar el caso de la 021 ("marca la región 5 y Rayos X…"): tras pulsar "5 Lengua", escribir "saburra" en el
   `textarea` con etiqueta "5 · Lengua" → el PUT lleva `stomatognathicRegions: [5]`, `diagnosticExams: ["RAYOS_X"]`
   y `stomatognathicExam: "5. Lengua: saburra"`.
2. Caso nuevo `desmarcar una región con texto → confirma → PUT sin la región ni su renglón`: atención cargada con
   `stomatognathicRegions: [5, 8]` y `stomatognathicExam: "5. Lengua: saburra\n8. Carrillos: línea alba"` → pulsar
   "5 Lengua" → aparece el diálogo → "Desmarcar" → PUT con `[8]` y `"8. Carrillos: línea alba"`.

## Prueba manual
1. Marcar 5 y 8: aparecen dos campos con su etiqueta; escribir en cada uno → "✓ guardado" → recargar: siguen.
2. Desmarcar 5 con texto → pregunta; Cancelar → sigue; Desmarcar → desaparece su campo.
3. Sin regiones: "Sin patología aparente" → campo "Observación general" con ese texto; editarlo; Quitar.
4. Abrir la atención del 20-10 del paciente 819eb655… (regiones 5, 8, 12): cada región con su texto.
5. Formulario 033 (sesión 2): los renglones del punto 5 como antes.
6. Anchos 375 y 1366.

## Resultado
**Archivos**
- `src/app/features/clinical/domain/stomatognathic-exam-text.ts` (nuevo): `parseStomatognathicExam` y `serializeStomatognathicExam`.
- `src/app/features/clinical/components/stomatognathic-exam/stomatognathic-exam.component.ts`: un `textarea` por región marcada (etiqueta "N · Nombre", foco al marcar), campo "Observación general" con "Quitar", confirmación al desmarcar/quitar con texto (`ConfirmDialogService`), lista de solo lectura. Se mantiene en un solo componente (la plantilla queda en ~140 líneas), sin `exam-region-field` extra.
- `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: el caso de la 021 ajustado (escribe "saburra" en "5 · Lengua" → PUT con `"5. Lengua: saburra"`) y el caso nuevo de desmarcar con confirmación.

**Build** (`npx ng build`): `Application bundle generation complete. [19.251 seconds]`. Aviso ya existente, no tocado por esta tarea: `sidebar.component.scss exceeded maximum budget ... by 22 bytes`.

**Tests** (`npx ng test --watch=false`):
```
 Test Files  10 passed (10)
      Tests  48 passed (48)
```
Durante el desarrollo, una ejecución con carga hizo timeout de 5 s en dos tests de `encounter.page.spec.ts` y en `form-033.page.spec.ts`; al repetirlos solos pasaron (17/17 en encounter) y la suite completa pasa.

**Responsive**: no revisé en navegador (sin DevTools en esta ejecución). Lo implementado: campos en una columna; desde `64rem` (1024 px) `repeat(auto-fill, minmax(18rem, 1fr))`; sin scroll horizontal por construcción. Pendiente revisar en 375, 768, 1024 y 1366.

**Supuestos y pendientes**
- "Sin patología aparente" queda deshabilitado también cuando ya existe el campo general (no solo cuando hay regiones), para no sobrescribir su texto.
- El campo general se mantiene abierto mientras el usuario escribe, aunque quede vacío; "Quitar" pide confirmación solo si el texto es distinto de "Sin patología aparente".
- El parser respeta la regla de la tarea: un renglón `N. …:` de una región no marcada pasa a la observación general. Si el usuario escribe en un campo de región una línea que empiece así, ese texto se mueve al campo general al re-parsear.
- El texto se conserva byte a byte (no se recortan espacios), así que un valor como `"5. Lengua:  Esta Sucia"` muestra un espacio inicial en el campo.
- Sin cambios en el store, la sección 10, `form-033`, `encounter-extra`, `prompt.txt` ni el backend. No se hizo commit.

## Revisión
Estado: APROBADO

Revisado por Claude (Opus; ejecutó Haiku, retomado tras un cierre del programa). `npx ng build` OK;
`npx ng test --watch=false` → 10 archivos, 48 tests. Cumple los criterios 1–7:
- `parse`/`serialize` siguen el formato de la tarea: los renglones de continuación se suman a la región anterior, y un
  `N. …:` de una región no marcada queda como texto general;
- el texto de la 021 ("5. Lengua:  Esta Sucia…") se lee por región;
- hay un campo por región, en orden numérico, con etiqueta asociada y foco al marcar;
- se pide confirmación solo si la región tiene texto, y "Quitar" la pide solo si el texto cambió;
- "Sin patología aparente" crea "Observación general" y se deshabilita si hay regiones o si ya existe ese campo.

El store, el 033 y el backend no se tocaron.
Observaciones (no bloquean):
- en "Observación general", un texto de solo espacios no se guarda;
- en un run con carga, dos tests superaron el timeout de 5 s; al repetirlos pasan, igual que la suite completa.

Responsive sin verificar visualmente: queda para la prueba manual del usuario.
