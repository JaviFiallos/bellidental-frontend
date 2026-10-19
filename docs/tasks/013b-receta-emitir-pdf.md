# 013b — Receta: emitir e imprimir (PDF), reimprimir y anular

> Plan §5.13 (P12, parte 2). Requiere la 013a. Backend 011a (`8dbfbd5`) y 011b (`a631bbb`).
> Perfil: ODONTOLOGO y DIRECTOR; solo el odontólogo que atiende.

## Brief de diseño (modo Operate)
- **Tarea principal:** del editor a la receta impresa en **1 clic**: "Emitir e imprimir" guarda, emite y abre el
  PDF en una pestaña nueva, lista para imprimir y firmar.
- Una receta emitida es inmutable y se ve distinta (estado "Emitida" con fecha y hora). Corregirla es "Anular y
  rehacer": se anula y se abre un borrador nuevo con los mismos datos.
- **Antigoals:** no dejar al odontólogo sin PDF si el navegador bloquea la pestaña (aparece el botón "Abrir PDF");
  sin "Eliminar".

## Contrato (backend 011a/011b)
- **`POST /api/v1/prescriptions/{id}/issue`** (`RECORD_UPDATE`) → `Prescription` ISSUED con `prescribedAt = now`.
  Solo DRAFT no anulada con ítems; si no → 409.
- **`GET /api/v1/prescriptions/{id}/pdf`** (`RECORD_READ`) → **binario** `application/pdf`, sin `ApiResponse`.
  Solo ISSUED no anulada; si no → 409 `{ message: "Solo se puede imprimir una receta emitida." }` (JSON, que con
  `responseType: 'blob'` llega como `Blob`). El PDF lleva la clínica, "CONFIDENCIAL", el paciente, el CIE-10, los
  ítems numerados, las indicaciones y la línea de firma y sello.
- **`POST /api/v1/prescriptions/{id}/void`** (`RECORD_UPDATE`), **sin body ni motivo** → `Prescription` con
  `voided: true`. DRAFT o ISSUED; ya anulada → 409. La lista de la atención excluye las anuladas.
- El PDF exige el `Authorization: Bearer`: **no** se puede abrir con un enlace `<a href>` ni con
  `window.open(url)`. Se descarga con `HttpClient` (el interceptor pone el token) como `Blob` y se abre con
  `URL.createObjectURL`.

## Objetivo
1. **`ApiClient.getBlob(url)`** en `core/api`: `HttpClient.get(url, { responseType: 'blob' })`. Si hay error y
   `err.error` es un `Blob`, lee su texto, lo parsea como JSON y usa su `message`; si no, usa los textos estándar
   (`api-error-messages.ts`). Devuelve `ApiError { status, message }`, como el resto.
2. **"Emitir e imprimir"** (en el editor de la 013a y en la fila de una receta DRAFT):
   - en el mismo clic, abre una pestaña vacía (`window.open('', '_blank')`; hacerlo después de una respuesta
     asíncrona lo bloquea el navegador);
   - desde el editor, primero guarda (POST o PUT); luego `issue`; luego `getBlob(pdf)`;
   - con el PDF, pone `URL.createObjectURL(blob)` en la pestaña y libera la URL a los 60 s;
   - si la pestaña no se abrió (`null`), la fila muestra "Abrir PDF", que lo abre desde un clic directo;
   - ante un error en cualquier paso, cierra la pestaña vacía y muestra el `message`. Si la receta ya quedó
     emitida, sigue "Emitida" y se puede usar "Imprimir".
3. **Receta emitida:** estado "Emitida · 19 oct 10:42", "Imprimir" (vuelve a pedir el PDF) y "Anular y rehacer".
4. **Anular** (DRAFT): `ConfirmDialog` sin motivo ("¿Anular este borrador?") → `POST …/void` → sale de la lista.
5. **Anular y rehacer** (ISSUED): `ConfirmDialog` ("La receta emitida quedará anulada y se abrirá un borrador con
   los mismos datos.") → `POST …/void` → se abre el editor de la 013a como **nueva receta**, con el diagnóstico, los
   ítems y las indicaciones de la anulada. No hay petición hasta guardar o emitir.
6. Toasts: "Receta emitida", "Receta anulada". En solo lectura, "Imprimir" sigue disponible (es lectura) y no hay
   ni Emitir ni Anular.

## Archivos a tocar
```
src/app/core/api/
  api-client.ts                                 + getBlob(url): Observable<Blob> con el error leído del Blob
  api-error-messages.ts                         (si hace falta) helper para el message de un Blob JSON
src/app/features/prescriptions/
  services/prescriptions.api.ts                 + issue(), void(), pdf()
  services/prescriptions.store.ts               + issueAndPrint(), print(), void(), voidAndRedo(); pdfFallback
                                                  por receta; estados de carga por acción
  services/pdf-window.ts                        (nuevo) abrir la pestaña vacía, poner el blob, liberar la URL
                                                  (sin estado de Angular)
  components/prescriptions-section/prescriptions-section.component.ts   acciones por estado, "Abrir PDF"
  components/prescription-editor/prescription-editor.component.ts       + "Emitir e imprimir"
src/app/features/clinical/pages/encounter/
  encounter.page.ts                             conecta las salidas nuevas
  encounter.page.spec.ts                        +2 casos
```

## Criterios de aceptación
1. La pestaña se abre en el clic del usuario y el PDF se descarga con el token (nunca una URL directa al backend).
2. "Emitir e imprimir" desde el editor hace guardar → emitir → PDF en ese orden, con un solo clic y sin doble envío.
3. Si la pestaña está bloqueada, aparece "Abrir PDF"; tras un error no queda ninguna pestaña vacía abierta.
4. El 409 del PDF muestra "Solo se puede imprimir una receta emitida." (leído del Blob).
5. ISSUED: sin "Editar"; "Anular y rehacer" abre un borrador nuevo con los mismos datos y no lo guarda solo.
6. Estado con color **y** texto; botones de 44 px; solo tokens.
7. La URL del blob se libera (`URL.revokeObjectURL`).

## Responsive
Revisar en **375, 768, 1024 y 1366**. En 375 las acciones de la fila van debajo del resumen, a todo el ancho.

## Tests requeridos
Se amplía `encounter.page.spec.ts` con **2 casos**. `window.open` y `URL.createObjectURL` son APIs del navegador
(jsdom no las implementa): se sustituyen con `vi.spyOn`/`vi.stubGlobal`; no se simula ningún servicio propio.
1. "Emitir e imprimir un borrador → queda Emitida y abre el PDF": la atención trae una receta DRAFT → "Emitir e
   imprimir" → `POST /api/v1/prescriptions/{id}/issue` → ISSUED → `GET /api/v1/prescriptions/{id}/pdf` → responder
   con un `Blob` `application/pdf` → se ve "Emitida" y la pestaña recibió la URL del blob.
2. "Emitir con la atención bloqueada → mensaje y sigue en borrador": `issue` → 409 con `message` → se ve el
   mensaje, la fila sigue en "Borrador", la pestaña vacía se cerró y no se pidió el PDF.

## Prueba manual
1. Nueva receta → agregar ítems → "Emitir e imprimir": se abre el PDF con "CONFIDENCIAL", la cédula, el CIE-10 y la
   firma; la fila dice "Emitida".
2. "Imprimir" de nuevo desde la fila.
3. Bloquear las ventanas emergentes en el navegador → "Emitir e imprimir" → aparece "Abrir PDF" y funciona.
4. "Anular y rehacer": la emitida desaparece y se abre el borrador con los mismos medicamentos → cambiar la dosis →
   emitir.
5. Anular un borrador.
6. Otro odontólogo: ve las recetas y puede imprimir, pero no emitir ni anular.
7. Anchos 375 y 1366.

## Resultado
**Archivos**
- `core/api/api-client.ts`: `getBlob(url)` (`responseType: 'blob'`); si el error trae un Blob con JSON `message`, usa ese mensaje.
- `core/api/api-error-messages.ts`: `readBlobErrorMessage(blob)`.
- `features/prescriptions/services/prescriptions.api.ts`: `issue()`, `void()`, `pdf()` (Blob).
- `features/prescriptions/services/pdf-window.ts` (nuevo): `openBlankPdfWindow`, `showPdfInWindow` (libera la URL a los 60 s), `closePdfWindow`.
- `features/prescriptions/services/prescriptions.store.ts`: `saveAndEmit`, `emit`, `print`, `openPendingPdf`, `voidPrescription`, `voidAndRedo`, `openRedo`; estados `busyPrescriptionId`, `actionError`, `pendingPdf`, `copiedFrom`. La pestaña se abre dentro del store, en el propio clic.
- `features/prescriptions/components/prescriptions-section/prescriptions-section.component.ts`: acciones por estado; "Emitida · fecha hora"; "Abrir PDF"; aviso de error.
- `features/prescriptions/components/prescription-editor/prescription-editor.component.ts`: botón "Emitir e imprimir" y entrada `copiedFrom` (cabecera de "Anular y rehacer").
- `features/clinical/pages/encounter/encounter.page.ts`: manejadores y confirmaciones (`ConfirmDialog` sin motivo).
- `features/clinical/pages/encounter/encounter.page.spec.ts`: 2 casos nuevos.

**Build:** `npx ng build` terminó sin errores ("Application bundle generation complete").

**Tests:**
- `Test Files  8 passed (8)`
- `Tests  42 passed (42)`

**Responsive:** no tengo DevTools, así que no revisé los anchos 375/768/1024/1366. Queda pendiente. Lo que sí está hecho: en la tarjeta de la receta, las acciones van a ancho completo bajo 30 rem (`@container`), y los botones miden `min-height: 44px`.

**Supuestos y decisiones**
- Desde el editor, un fallo al emitir deja el editor abierto con el mensaje. Un fallo de posterior (PDF) se muestra como aviso en la lista, porque el editor ya se cerró.
- Si `window.open` devuelve `null`, el PDF queda en memoria y la fila muestra "Abrir PDF", que vuelve a abrir la pestaña desde un clic directo.
- "Anular y rehacer" anula primero (POST `void`) y luego abre el editor con los datos copiados. No guarda nada hasta que el usuario guarda o emite.
- La fecha "Emitida" usa los pipes `clinicDate` y `clinicTime`, así que sale con el día de la semana ("lun 19 oct 10:42"), no solo "19 oct 10:42".
- Un error con cuerpo Blob usa su `message` aunque el status sea 403; con JSON normal sigue la regla anterior de `unwrap`.
- Los tests de jsdom: `window.open` y `URL.createObjectURL`/`revokeObjectURL` se sustituyen en el spec con un stub mínimo; `vi.restoreAllMocks()` se añadió al `afterEach`.

**Pendiente (prueba manual del usuario):** los pasos 1 a 7 de `## Prueba manual`, sobre todo el bloqueo de ventanas emergentes y el PDF real del backend.

**No tocado:** `prompt.txt` y `docs/IMPLEMENTATION-PLAN.md` ya tenían cambios antes de esta tarea; no los modifiqué. No hice commit.

## Revisión
Estado: APROBADO

Revisado por Claude (Opus; ejecutó Haiku). `npx ng build` OK; `npx ng test --watch=false` → 8 archivos, 42 tests.
Cumple los criterios:
- `ApiClient.getBlob` en core lee el `message` del error aunque llegue como `Blob`;
- la pestaña se abre en el mismo clic, antes de cualquier respuesta, y si el navegador la bloquea queda "Abrir PDF";
- la URL del blob se libera a los 60 s, y el token nunca viaja en la URL;
- anular va sin motivo, como pide el contrato;
- "Anular y rehacer" abre un borrador nuevo copiado y no lo guarda solo;
- los componentes siguen siendo presentacionales y la página orquesta las confirmaciones y los toasts.

Prueba manual pendiente con el PDF real y el bloqueador de ventanas emergentes (Chrome y Firefox). Responsive sin
verificar visualmente.
