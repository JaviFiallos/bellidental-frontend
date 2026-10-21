# 015b — Cobros: comprobante PDF y anular el abono recién registrado

> Plan §5.15 (P14, parte 2). Requiere la 015a. Backend 012 (`328c6fe`). Reutiliza `ApiClient.getBlob` (013b, F-13).
> Perfil: SECRETARIA (`BILLING_READ` imprime, `BILLING_CREATE` anula).

## Objetivo
Tras "Guardar abono" (015a), la sección "Estado de cuenta" muestra una franja **"Abono registrado"** con el
comprobante y dos acciones: **"Imprimir comprobante"** (PDF con línea de firma del paciente) y **"Anular"** (con
motivo obligatorio; nunca "Eliminar").

### Contrato (backend 012)
- **`GET /api/v1/payments/{id}/receipt`** (`BILLING_READ`) → **binario** `application/pdf` (A5), sin `ApiResponse`,
  `Content-Disposition: inline; filename="C-000045.pdf"`. 404 JSON si no existe (con `responseType: 'blob'` llega
  como `Blob`: `ApiClient.getBlob` ya lee su `message`). El PDF lleva clínica, «Comprobante interno — no válido como
  factura», «CONFIDENCIAL», número, fecha, paciente, método, monto, «Saldo pendiente actual», «Firma del paciente»
  y, si está anulado, «ANULADO — <motivo>».
- **`POST /api/v1/payments/{id}/void`** (`BILLING_CREATE`), body `{ "voidReason": "Monto mal digitado" }`
  (obligatorio, en blanco → 400) → `ApiResponse<Payment>` con `voided: true` y `voidReason`. Ya anulado → **409**
  `"El pago ya está anulado."`. El estado de cuenta excluye los pagos anulados (el saldo vuelve a subir).
- `Payment` (de `billing.models.ts`, 015a):
  `{ id, patientId, encounterId, amount, method, receiptNumber, paidAt, receivedBy, voided, voidReason }`.
- **Límite del backend (G-11):** no hay endpoint que liste los pagos de un paciente con su `id` ni
  `GET /payments/{id}`; `GET …/account` solo trae sumas por sesión. Por eso esta tarea solo actúa sobre el `Payment`
  que devolvió el `POST` de esta misma visita a la ficha.

### Comportamiento
1. **Franja "Abono registrado"** (componente nuevo `last-payment`, dentro de la sección, encima de la tabla) cuando
   `PatientAccountStore.lastPayment()` no es `null`:
   "Abono registrado · **C-000045** · $ 25,00 · Efectivo · 12:00" (`money`, `clinicTime`,
   `PAYMENT_METHOD_LABELS` de la 015a) con `role="status"`.
   - **"Imprimir comprobante"** (`btn btn-primary`, ícono `Printer`): en el **mismo clic** abre la pestaña vacía
     (`openBlankPdfWindow()`), pide `GET /api/v1/payments/{id}/receipt` con `BillingApi.receipt(id)`
     (`ApiClient.getBlob`) y pone el blob con `showPdfInWindow`. Si la pestaña no se abrió (`null`), guarda el blob y
     muestra "Abrir PDF" (abre desde un clic directo). Error → `closePdfWindow` y `bd-alert` con el `message`.
   - **"Anular"** (`btn btn-outline`, solo con `BILLING_CREATE` y si `!voided`): la **página** abre
     `ConfirmDialogService.open({ title: 'Anular abono', message: 'El abono C-000045 de $ 25,00 dejará de contar en el
     saldo. El comprobante quedará marcado como anulado.', confirmLabel: 'Anular abono', cancelLabel: 'Volver',
     tone: 'danger', reasonLabel: 'Motivo de la anulación', reasonRequired: true })`. Confirmado →
     `POST /api/v1/payments/{id}/void` con `{ voidReason: reason.trim() }` → la franja pasa a anulado, toast
     `"Abono anulado"` y se vuelve a pedir `GET …/account`.
   - Anulado: `bd-status-badge` tono `cancelled` con etiqueta "Anulado" + "Motivo: …"; "Imprimir comprobante" sigue
     (el PDF dice ANULADO); sin "Anular".
   - Botones con carga ("Abriendo…", "Anulando…") y sin doble envío.
2. La franja desaparece al cambiar de paciente o al registrar otro abono (se reemplaza por el nuevo).
3. **Utilidad compartida (F-21):** mover `src/app/features/prescriptions/services/pdf-window.ts` a
   `src/app/shared/utils/pdf-window.ts` **sin cambiar su contenido** (con `git mv`) y actualizar el import en
   `features/prescriptions/services/prescriptions.store.ts` (`'../../../shared/utils/pdf-window'`). Es el único
   archivo que lo importa hoy (verificado). Las recetas deben seguir funcionando igual.

### Estructura
- `billing` gana `components/last-payment/` (dumb) y amplía `BillingApi` y `PatientAccountStore`. El `index.ts` de
  `billing` no cambia (la sección ya está exportada).
- La página `patient-reception` conecta la salida `voidPayment` de la sección con el `ConfirmDialogService` (los
  componentes dumb no abren diálogos, como `onCancelAppointment` de esa misma página).

## Decisiones a revisar
1. **Solo el último abono de esta visita**: sin G-11 no se puede reimprimir ni anular un abono de otro día.
   Inconveniente real para el uso diario (p. ej. "reimprima el comprobante de la semana pasada"). Propuesta al
   backend: `GET /patients/{patientId}/payments` → `Payment[]` (con anulados). Con eso, una 015c agrega la lista de
   pagos con "Comprobante" y "Anular" por fila.
2. **"Imprimir" es un segundo clic**, no automático al guardar: así la pestaña siempre se abre desde un clic del
   usuario (no la bloquea el navegador) y la secretaria decide si imprime.
3. El motivo de la anulación es obligatorio en la UI aunque el backend también lo valida (ahorra un viaje).
4. `pdf-window.ts` pasa a `shared/utils` (lo usan dos features, regla de `clean-code/SKILL.md`).

## Archivos a tocar
```
src/app/
├── shared/utils/pdf-window.ts                          (movido con git mv desde prescriptions/services; sin cambios)
├── features/
│   ├── prescriptions/services/prescriptions.store.ts   (solo el import de pdf-window)
│   ├── billing/
│   │   ├── services/billing.api.ts                     + receipt(paymentId): Observable<Blob> (api.getBlob)
│   │   │                                                 + voidPayment(paymentId, voidReason): Observable<Payment>
│   │   ├── services/patient-account.store.ts           + lastPayment, printing, voiding, actionError,
│   │   │                                                 pendingReceipt; printReceipt(), openPendingReceipt(),
│   │   │                                                 voidLastPayment(reason)
│   │   └── components/
│   │       ├── last-payment/last-payment.component.ts  (nuevo, dumb) franja + acciones
│   │       └── patient-account-section/patient-account-section.component.ts   (monta la franja; reemite salidas)
│   └── patients/pages/patient-reception/
│       ├── patient-reception.page.ts                   (ConfirmDialog de anular → store.voidLastPayment)
│       └── patient-reception.page.spec.ts              (+2 casos)
```
- `BillingApi.voidPayment` → `api.post<Payment>(`/api/v1/payments/${id}/void`, { voidReason })`;
  `receipt` → `api.getBlob(`/api/v1/payments/${id}/receipt`)`.
- `PatientAccountStore.printReceipt()` llama a `openBlankPdfWindow()` **antes** de suscribirse a la petición (en
  el mismo tick del clic), igual que `PrescriptionsStore.print()` (`features/prescriptions/services/prescriptions.store.ts`,
  métodos `print`, `openPdf`, `openPendingPdf`): copiar ese patrón, no inventar otro.
- `LastPaymentComponent`: inputs `payment: Payment`, `canVoid`, `printing`, `voiding`, `hasPendingReceipt`,
  `errorMessage`; outputs `print`, `openPending`, `voidPayment`. Íconos `Printer` y `Ban` de `lucide-angular` vía
  `bd-icon` (`shared/components/icon/icon.component`). `bd-status-badge` de
  `shared/components/status-badge/status-badge.component` (tonos: `scheduled|waiting|in-progress|attended|no-show|cancelled`).

## Criterios de aceptación
- [ ] Tras guardar un abono aparece la franja con número, monto, método y hora.
- [ ] "Imprimir comprobante" abre la pestaña en el clic y carga el PDF descargado con el token (nunca un enlace
      directo al backend); la URL del blob se libera (`URL.revokeObjectURL`, ya lo hace `showPdfInWindow`).
- [ ] Pestaña bloqueada → "Abrir PDF"; error → no queda pestaña vacía y se ve el `message`.
- [ ] "Anular" pide motivo obligatorio, envía `{ voidReason }`, muestra "Anulado" con el motivo, recarga la cuenta
      y quita el botón "Anular". 409 → `message` visible.
- [ ] Recetas: "Emitir e imprimir" e "Imprimir" siguen funcionando (sus tests en verde) con `pdf-window` movido.
- [ ] Estado con color **y** texto; botones ≥ 44 px; solo tokens; sin "Eliminar".
- [ ] `npx ng build` y `npx ng test --watch=false` en verde.

## Responsive
Revisar en **375, 768, 1024 y 1366**. En `< 37.5rem` de contenedor el texto de la franja va en dos líneas y los
botones debajo, a todo el ancho; en más, en una fila con los botones a la derecha.

## Tests requeridos
Se amplía `patient-reception.page.spec.ts` (+**2 casos**). `window.open` y `URL.createObjectURL` /
`URL.revokeObjectURL` se sustituyen como en `stubPdfBrowserApis()` de
`features/clinical/pages/encounter/encounter.page.spec.ts` (solo APIs del navegador; ningún servicio propio).
Partir de una cuenta ya cargada (helper `openAs(secretaria)` + `flushInitialLoad()` de la 015a) y registrar un abono
como en el caso 1 de la 015a (POST → `Payment` `pay-1` `C-000045` → GET de la cuenta).
1. `'Imprimir comprobante del abono → GET /payments/{id}/receipt → la pestaña recibe el PDF'`: se ve
   "Abono registrado" y "C-000045" → clic "Imprimir comprobante" → `expectOne('/api/v1/payments/pay-1/receipt')`
   método GET → `flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }))` → `pdfWindow.location.href` es la URL
   del blob.
2. `'Anular el abono con motivo → POST /payments/{id}/void → Anulado y cuenta recargada'`: clic "Anular" → escribir
   "Monto mal digitado" en `.confirm-dialog__textarea` (evento `input` + `TestBed.inject(ApplicationRef).tick()`) →
   clic `.confirm-dialog .btn-danger` → `expectOne('/api/v1/payments/pay-1/void')` con body
   `{ voidReason: 'Monto mal digitado' }` → responder el `Payment` con `voided: true`, `voidReason: 'Monto mal
   digitado'` → `expectOne` del GET de la cuenta (responder con saldo 25,00) → se ve "Anulado", "Monto mal digitado"
   y ya no hay botón "Anular".

## Prueba manual
1. Registrar un abono → franja "Abono registrado · C-…" → "Imprimir comprobante" → PDF A5 con «Firma del paciente».
2. Bloquear ventanas emergentes → "Imprimir comprobante" → aparece "Abrir PDF" y funciona.
3. "Anular" sin motivo → el botón de confirmar no se habilita; con motivo → "Anulado", el saldo vuelve a subir;
   imprimir de nuevo → el PDF dice «ANULADO — motivo».
4. Recargar la página: la franja ya no está (limitación G-11, esperado).
5. Odontólogo: en una atención, "Emitir e imprimir" una receta sigue abriendo el PDF.
6. Anchos 375 y 1366.

## Resultado
**Archivos.** `git mv` de `prescriptions/services/pdf-window.ts` → `shared/utils/pdf-window.ts` (sin cambios de
contenido) y su import en `prescriptions.store.ts`. `billing/services/billing.api.ts` (+`receipt`, +`voidPayment`).
`billing/services/patient-account.store.ts` (+`lastPayment`, `printing`, `voiding`, `actionError`, `pendingReceipt`;
`printReceipt`, `openPendingReceipt`, `voidLastPayment`; `lastPayment` se guarda al registrar el abono y se limpia al
cambiar de paciente). Nuevo `billing/components/last-payment/last-payment.component.ts` (dumb).
`patient-account-section.component.ts` (monta la franja y reemite las salidas). `patients/.../patient-reception.page.ts`
(diálogo "Anular abono" con motivo obligatorio → `voidLastPayment(reason.trim())`) y `patient-reception.page.spec.ts` (+2 casos).

**Build y tests.** `npx ng build`: OK (solo el aviso previo de budget de `sidebar.component.scss`, +22 bytes, ajeno).
`npx ng test --watch=false`: `Test Files 10 passed (10)` · `Tests 52 passed (52)`.

**Responsive.** NO revisado visualmente: no tengo navegador en esta sesión. Queda para la prueba manual en 375, 768, 1024
y 1366. La franja usa `@container (min-width: 37.5rem)`: columna con botones a todo el ancho por debajo, fila con botones
a la derecha por encima.

**Problemas y supuestos.**
- Un error de anulación (p. ej. 409) se muestra en la franja y no recarga la cuenta.
- La franja de error de imprimir/anular usa `actionError` del store; se limpia al registrar otro abono o cambiar de paciente.
- El botón "Imprimir comprobante" pasa a "Abrir PDF" cuando la pestaña fue bloqueada (un solo botón, no dos).
- Sin cambios en `billing/index.ts` ni en el backend. Sin commit.

## Revisión
Estado: APROBADO (2026-10-21, Claude Opus)

- Contrato verificado contra `PaymentController`: `GET /payments/{id}/receipt` (`BILLING_READ`, `byte[]`),
  `POST /payments/{id}/void` (`BILLING_CREATE`, `VoidPaymentRequest(@NotBlank voidReason)`), `PaymentResponse` igual
  a `Payment`. `BillingApi` usa `getBlob` y `post` con URLs relativas.
- `printReceipt` abre la pestaña antes de suscribirse (patrón de `PrescriptionsStore`); bloqueo → `pendingReceipt` +
  "Abrir PDF"; error → `closePdfWindow` + `bd-alert`. Anular: diálogo en la página (dumb sin diálogos), motivo
  obligatorio, toast, `reload()`; 409 → `message` en la franja. "Anular" solo con `BILLING_CREATE` y `!voided`.
- `pdf-window.ts` movido con `git mv` (R100, sin cambios); único import en `prescriptions.store.ts` actualizado;
  tests de recetas en verde. `billing/index.ts` sin cambios (`Payment` ya se exporta vía modelos).
- Reglas: OnPush, `input()/output()`, sin `any`, solo tokens (`color-mix` sobre `--teal-700`), `money` y
  `clinicTime`, botones `min-height: 44px`, estado = badge con texto, sin "Eliminar".
- Correcciones mínimas de Claude en `last-payment.component.ts`: (1) `role="status"` pasa del contenedor a
  `.last-payment__info` (no anunciar los botones); (2) `flex-wrap: wrap` en la fila `@container ≥ 37.5rem` para que
  `.last-payment__error` (`flex-basis: 100%`) baje a su propia línea en lugar de comprimir la fila.
- `npx ng build`: OK (solo el aviso previo de budget de `sidebar.component.scss`, +22 B). `npx ng test --watch=false`:
  `Test Files 10 passed (10)` · `Tests 52 passed (52)`.
- Pendiente del usuario: responsive (375, 768, 1024, 1366) y prueba manual 1–6 (Haiku no tenía navegador).

## Decisiones a revisar (tras la revisión)
1. **G-11 sigue abierto**: solo se imprime/anula el abono registrado en esta visita a la ficha; al recargar la franja
   desaparece. Reimprimir comprobantes de otros días requiere `GET /patients/{id}/payments` en el backend (015c).
2. "Imprimir comprobante" y "Abrir PDF" son el mismo botón (se reemplaza tras un bloqueo), no dos botones.
3. Un error al anular (p. ej. 409) se muestra en la franja y no recarga la cuenta; si el 409 vino porque otro usuario
   ya lo anuló, la franja sigue mostrando el abono como vigente hasta recargar.
4. La impresión del comprobante no exige `BILLING_READ` en la UI: se asume que quien ve la sección ya lo tiene.
5. F-21 (pdf-window a `shared/utils`) queda aplicada; en el plan sigue como "Propuesta" hasta que la confirmes.
