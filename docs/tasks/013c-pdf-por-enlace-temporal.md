# 013c — Receta y comprobante: PDF por enlace temporal (sin `blob:`)

## Objetivo
Hoy la receta y el comprobante se descargan con `ApiClient.getBlob` y se muestran con `URL.createObjectURL` en una
pestaña abierta en el clic (F-13). En móviles y tablets el `blob:` en otra pestaña falla (pestaña en blanco,
descarga que no arranca, el visor del sistema no lo abre). Con el **backend 026** (G-14) el frontend pide un enlace
temporal firmado y la pestaña navega a una URL https normal del mismo origen, que el visor del dispositivo puede
abrir, descargar y compartir (F-22).

**Depende de:** backend 026 con commit. Antes de empezar, confirmar en el backend la forma exacta de la respuesta.

## API (backend 026)
- `POST /api/v1/prescriptions/{id}/pdf-link` → `ApiResponse<{ url: string; expiresAt: string }>`, con
  `url = "/api/v1/prescriptions/{id}/receta.pdf?t=…"` (relativa, válida 5 min). Receta no emitida → 409.
- `POST /api/v1/payments/{id}/receipt-link` → igual, `url = "/api/v1/payments/{id}/comprobante.pdf?t=…"`.

## Archivos a tocar
```
src/app/shared/utils/pdf-window.ts                       (modif.) showPdfUrlInWindow(target, url); sin blob
src/app/shared/models/document-link.ts                   (nuevo) interface DocumentLink { url; expiresAt }
                                                         (si shared/ no tiene models/, va en shared/utils/pdf-window.ts)
src/app/features/prescriptions/services/prescriptions.api.ts   (modif.) pdfLink(id) en vez de pdf(id)
src/app/features/prescriptions/services/prescriptions.store.ts (modif.) pendingPdf con DocumentLink
src/app/features/prescriptions/components/prescriptions-section/prescriptions-section.component.ts (modif.) «Abrir PDF» = <a>
src/app/features/billing/services/billing.api.ts               (modif.) receiptLink(id) en vez de receipt(id)
src/app/features/billing/services/patient-account.store.ts     (modif.) idem
src/app/features/billing/components/payment-dialog/payment-dialog.component.ts (modif.) idem
src/app/core/api/api-client.ts                                  (modif.) borrar getBlob y su lectura de errores si quedan sin uso
src/app/features/clinical/pages/encounter/encounter.page.spec.ts            (modif.) caso de emitir e imprimir
src/app/features/patients/pages/patient-reception/patient-reception.page.spec.ts (modif.) caso del comprobante
```

## Criterios de aceptación
1. **Flujo en el clic** (sin cambio para el usuario): se abre la pestaña vacía en el clic (`openBlankPdfWindow`),
   se pide el enlace (`POST …-link`) y la pestaña navega con `target.location.href = link.url`
   (`showPdfUrlInWindow`). Sin `createObjectURL`, `revokeObjectURL` ni `setTimeout`. Error → se cierra la pestaña y
   se muestra el `message` del backend como hoy (409 «no emitida», 403, 0).
2. **Emitir e imprimir** sigue siendo un clic: guardar → `issue` → `pdf-link` → navegar.
3. **Pestaña bloqueada** (`openBlankPdfWindow()` devuelve `null`): se guarda `pendingPdf = { prescriptionId, link }`
   (o el equivalente del comprobante) y el botón «Abrir PDF» pasa a ser un enlace `<a class="btn btn-primary"
   [href]="link.url" target="_blank" rel="noopener">` (un `<a>` real no lo bloquea el navegador). Si al hacer clic
   `expiresAt` ya pasó, se cancela el clic (`preventDefault`), se pide un enlace nuevo y se muestra «El enlace venció;
   vuelve a pulsar Abrir PDF.» con el enlace ya renovado.
4. Lo mismo para el comprobante en `patient-account.store.ts` y `payment-dialog.component.ts` (los 3 sitios que hoy
   usan `showPdfInWindow`). Comentario de cabecera de `pdf-window.ts` actualizado (ya no hay blob).
5. `ApiClient.getBlob` y `readBlobErrorMessage` se borran si ya nadie los usa (sin código muerto). §2.4 del plan:
   la fila de `getBlob` se actualiza al aprobar.
6. Nunca se construye la URL a mano ni se pone el token de sesión en ella: siempre la `url` que devuelve el backend.

## Responsive
Sin cambios de layout. Probar en 375 (móvil real si es posible), 768 (tablet) y 1366.

## Tests requeridos
Sin casos nuevos; se ajustan los dos que hoy esperan el binario:
- `encounter.page.spec.ts` «Emitir e imprimir un borrador → queda Emitida y abre el PDF»: después del `issue`,
  `expectOne` de `POST /api/v1/prescriptions/rx-1/pdf-link` → responder `{ url, expiresAt }` → la pestaña falsa
  (`window.open` espiado como hoy) recibe `location.href` = esa `url`.
- `patient-reception.page.spec.ts` «Imprimir comprobante del abono…»: `POST /api/v1/payments/pay-1/receipt-link` →
  la pestaña recibe la `url`.

## Prueba manual
1. Laptop: emitir e imprimir una receta → la pestaña muestra el PDF; la URL es `…/receta.pdf?t=…`.
2. Móvil Android y iPhone/iPad (en producción o con `ng serve --host` en la red local): imprimir receta y comprobante
   → se abre el visor, se puede descargar y compartir.
3. Bloquear ventanas emergentes → aparece «Abrir PDF» → abre el PDF. Esperar 6 min y pulsarlo → aviso de vencido y
   el siguiente clic funciona.
4. Copiar la URL y abrirla 6 min después → «El enlace del documento venció o no es válido.» (lo responde el backend).

## Resultado
Ejecutado por el agente (Haiku 5.5) en lugar de Gemini, a petición del usuario.

**Archivos modificados**
- `src/app/shared/utils/pdf-window.ts`: `DocumentLink` (interface; `shared/models/` no existe, se define aquí), `showPdfUrlInWindow(target, url)`, `isLinkExpired(link)`. Se borran `showPdfInWindow` y el uso de blob.
- `src/app/core/api/api-client.ts`: borrados `getBlob`, `toBlobApiError` y sus imports sin uso.
- `src/app/core/api/api-error-messages.ts`: borrado `readBlobErrorMessage` (ya no tenía usos en `src/`).
- `src/app/features/prescriptions/services/prescriptions.api.ts`: `pdf(id)` → `pdfLink(id)` (`POST …/pdf-link`).
- `src/app/features/prescriptions/services/prescriptions.store.ts`: `pendingPdf` guarda `{ prescriptionId, link }`; `openPendingPdf(event)` cancela el clic si el enlace venció, pide uno nuevo y muestra «El enlace venció; vuelve a pulsar Abrir PDF.».
- `src/app/features/prescriptions/components/prescriptions-section/prescriptions-section.component.ts`: «Abrir PDF» es `<a target="_blank" rel="noopener">`; nuevo input `pendingPdfUrl`.
- `src/app/features/clinical/pages/encounter/encounter.page.ts`: pasa `pendingPdfUrl` y `openPendingPdf($event)`.
- `src/app/features/billing/services/billing.api.ts`: `receipt(id)` → `receiptLink(id)` (`POST …/receipt-link`).
- `src/app/features/billing/services/patient-account.store.ts`, `src/app/features/billing/components/payment-dialog/payment-dialog.component.ts`: mismo patrón que recetas (`pendingReceipt` con `link`, expiración en el clic).
- `src/app/features/billing/components/last-payment/last-payment.component.ts`, `payment-list/payment-list.component.ts`, `patient-account-section/patient-account-section.component.ts`, `src/app/features/patients/pages/patient-reception/patient-reception.page.ts`: el «Abrir PDF» pendiente pasa a `<a>` con `[href]`; inputs `hasPendingReceipt` reemplazado por `pendingReceiptUrl`.
- Specs: `encounter.page.spec.ts` («Emitir e imprimir…» → `POST …/pdf-link`; y «Emitir con la atención bloqueada» ahora comprueba `…/pdf-link`; se quitan los stubs de `URL.createObjectURL`/`revokeObjectURL`), `patient-reception.page.spec.ts` («Imprimir comprobante del abono…» → `POST …/receipt-link`, el título se actualizó al endpoint).

**Totales de tests (copia de la consola)**
- `--include='src/app/features/clinical/**/*.spec.ts'`: `Test Files  3 passed (3)` / `Tests  23 passed (23)`
- `--include='src/app/features/patients/**/*.spec.ts'`: `Test Files  2 passed (2)` / `Tests  11 passed (11)`
- Completo `npx ng test --watch=false`: `Test Files  15 passed (15)` / `Tests  70 passed (70)`

**Build: ERROR (ajeno a esta tarea)**. `npx ng build` falla con dos errores en `src/app/features/management/components/professional-form/professional-form.component.ts`: `DocumentType` no exportado por `features/professionals` (línea 26) y `string | null | undefined` no asignable a `string | undefined` (línea 457, `phoneE164`). Son trabajo en curso de otra tarea (professionals/management); no se tocaron. Ningún error apunta a los archivos de esta tarea.

**Revisión en anchos (xs 375, sm 768, 1366)**: no revisado. No hay navegador ni móvil en este entorno; la prueba en dispositivos (visor del móvil, descarga, compartir, bloqueo de ventanas emergentes y enlace vencido) la hace el usuario según la `## Prueba manual`.

**Supuestos**
- El «Abrir PDF» pendiente, al ser un enlace, no se limpia al hacer clic (el navegador navega); se limpia en la siguiente emisión/impresión exitosa o al recargar, como antes.
- `isLinkExpired` usa `Date.now()` contra `expiresAt` (instante absoluto, no hace falta zona de la clínica).
- En `last-payment` se mantuvo la semántica previa: cualquier comprobante pendiente se muestra en la franja del último abono.
- `pdf-window.ts` queda como utilidad de `shared/utils` importada por `features/prescriptions` y `features/billing` (como indica la tarea al no existir `shared/models/`).
- Nada de commit ni push.

## Revisión
Estado: APROBADO

- Cumple: contrato confirmado en el backend (`DocumentLinkResponse { url, expiresAt }`); la pestaña se abre en el clic
  y navega a `link.url` (sin `createObjectURL`/`revokeObjectURL`/`setTimeout`); error → `closePdfWindow` + `message`;
  «Emitir e imprimir» en un clic (`persist` → `issue` → `pdf-link`); «Abrir PDF» pendiente es `<a [href] target="_blank"
  rel="noopener">` en recetas y en los 3 sitios del comprobante, con `preventDefault` + enlace nuevo + aviso «El enlace
  venció; vuelve a pulsar Abrir PDF.» si venció; `getBlob`/`toBlobApiError`/`readBlobErrorMessage` borrados sin usos;
  URL siempre la del backend; cabecera de `pdf-window.ts` actualizada; componentes de billing siguen dumb
  (solo `input`/`output`); `Date.now()` en `isLinkExpired` aceptable (instante absoluto).
- Tests: solo los dos casos ajustados (`expectOne` de `POST …-link` con método verificado); ninguno nuevo, borrado ni en skip.
- Corrección menor de Claude: `src/styles.scss`, `.btn-primary:hover` fija `color: var(--white)`; en un
  `<a class="btn btn-primary">` el `a:hover` global ponía el texto en `--color-accent-hover` sobre el fondo primario.
- Totales tras la corrección: clinical `Test Files 3 passed (3)` / `Tests 23 passed (23)`; patients
  `Test Files 2 passed (2)` / `Tests 11 passed (11)`; `npx ng build`: «Application bundle generation complete».
- Pendiente no bloqueante: el `<a>` pendiente ya no se deshabilita mientras se anula (un `<a>` no tiene `disabled`);
  revisión en 375/768/1366 y en móvil real la hace el usuario (Prueba manual).
