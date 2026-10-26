# 015c — Cobros: lista de abonos (reimprimir y anular cualquiera) y cobro del odontólogo

## Objetivo
Cerrar G-11 con el backend 022 (`GET /api/v1/patients/{patientId}/payments`) y aplicar D-8d (el odontólogo también
cobra):
1. En la tarjeta «Estado de cuenta» de la ficha (`/pacientes/:id`), una sección **«Abonos»** con todos los pagos
   del paciente (vigentes y anulados), cada uno con **Reimprimir comprobante** y **Anular** (vigentes).
   La franja «Abono registrado» de la 015b se mantiene para el abono recién hecho.
2. La tarjeta deja de depender del perfil SECRETARIA: se ve con el **permiso** `BILLING_READ` (secretaria,
   odontólogo y director) y las acciones con `BILLING_CREATE`.

## Decisiones a revisar
- El odontólogo puede **anular** abonos (el backend usa el mismo permiso `BILLING_CREATE` para cobrar y anular).
  Si se quiere que solo la secretaria anule, hace falta un permiso nuevo en el backend.
- Los abonos anulados se muestran tachados con el motivo, no se ocultan (trazabilidad).
- La lista no se pagina: un paciente tiene pocas decenas de abonos.

## Archivos a tocar
```
src/app/features/billing/
  models/billing.models.ts                          (modif.) PaymentListItem
  services/billing.api.ts                           (modif.) listPayments(patientId)
  services/patient-account.store.ts                 (modif.) payments signal, carga junto con la cuenta,
                                                    printReceipt(paymentId) y voidPayment(payment) para cualquier abono
  components/payment-list/payment-list.component.ts (nuevo) presentacional: tabla → tarjetas en < sm
  components/patient-account-section/patient-account-section.component.ts (modif.) incluye bd-payment-list
src/app/features/patients/pages/patient-reception/
  patient-reception.page.ts                         (modif.) canViewAccount por permiso; reimprimir/anular por fila
  patient-reception.page.spec.ts                    (modif.) +1 caso (ver Tests)
```
`billing/index.ts` no cambia salvo que `PaymentListItem` deba exportarse (ya exporta `models/billing.models`).

## Criterios de aceptación
1. Modelo (DTO del backend 022):
   ```ts
   export interface PaymentListItem {
     id: string; encounterId: string | null; amount: number; method: PaymentMethod;
     receiptNumber: string; paidAt: string; receivedBy: string; receivedByName: string | null;
     voided: boolean; voidedAt: string | null; voidReason: string | null;
   }
   ```
   `BillingApi.listPayments(patientId)` → `GET /api/v1/patients/{patientId}/payments` (`ApiClient`, URL relativa).
2. `PatientAccountStore` carga la cuenta **y** los abonos en paralelo al abrir la ficha y tras registrar o anular
   un abono (un `forkJoin` o dos peticiones; error de cualquiera → el mismo estado de error con «Reintentar»).
   Reimprimir usa el flujo existente de la 015b (`getBlob` + ventana, F-13) con el `id` de la fila; anular abre el
   **mismo diálogo de motivo** de la 015b (motivo obligatorio; nunca «Eliminar»).
3. `bd-payment-list` (presentacional, OnPush): columnas Fecha (`clinic-date`), N.° comprobante, Método
   (`PAYMENT_METHOD_LABELS`), Recibió (`receivedByName` o «—»), Monto (pipe `money`), Acciones. Anulados: texto
   «Anulado» + motivo, monto tachado, sin botón Anular (color nunca único indicador). Vacío: «Sin abonos».
   En `< sm` cada abono es una tarjeta. Botones ≥ 44 px con `aria-label` que incluya el número de comprobante.
4. `patient-reception.page.ts`: `canViewAccount = hasPermission('BILLING_READ')` (sin `isSecretaria`);
   `canRegisterPayment` sigue con `BILLING_CREATE`. No comparar nombres de rol.
5. Errores con el `message` del backend (409 «El pago ya está anulado.» se ve en la fila o en la franja de error de
   la tarjeta y la lista se recarga).

## Responsive
375, 768, 1024, 1366. En 375 la lista es de tarjetas y los dos botones caben en una fila o bajan sin scroll
horizontal.

## Tests requeridos
Un caso nuevo en `patient-reception.page.spec.ts` (usar el helper `openAs(...)` existente, como secretaria):
- `abrir la ficha → GET /payments → se ve el abono anulado con su motivo y el vigente con "Anular"; anular el
  vigente → POST /payments/{id}/void con { voidReason } → recarga account y payments`.
Ajustar los casos existentes que abren la ficha con `BILLING_READ`: ahora también hay que responder
`GET /api/v1/patients/{id}/payments` (fixture con `[]`). No añadir otros casos.

## Prueba manual
1. Como secretaria: abrir un paciente con abonos de días anteriores → aparecen en «Abonos» con quién los recibió.
2. Reimprimir uno de otro día → se abre el PDF de ese comprobante.
3. Anular uno con motivo → queda tachado con «Anulado — motivo» y el saldo sube.
4. Como odontólogo (con el backend 022 desplegado): abrir la misma ficha → ve la tarjeta y puede registrar un abono.

## Resultado
- **Archivos creados o modificados**:
  - `src/app/features/billing/models/billing.models.ts`: Se añadió la interfaz `PaymentListItem`.
  - `src/app/features/billing/services/billing.api.ts`: Se agregó el método `listPayments(patientId)`.
  - `src/app/features/billing/services/patient-account.store.ts`: Se agregó el signal `payments`, carga en paralelo con `forkJoin` de la cuenta y los abonos en `loadRequests$`, y los métodos `printReceipt(paymentId?)` y `voidPayment(paymentId, voidReason)`.
  - `src/app/features/billing/components/payment-list/payment-list.component.ts`: Componente nuevo presentacional (`bd-payment-list`, OnPush) con tabla responsiva que en `< sm` pasa a tarjetas con container queries, soporte de abonos vigentes/anulados con motivo y tachado, estado vacío («Sin abonos»), y botones ≥ 44 px con `aria-label`.
  - `src/app/features/billing/components/patient-account-section/patient-account-section.component.ts`: Integra `bd-payment-list`, bindings de pagos, alerta de error y outputs para reimprimir y anular.
  - `src/app/features/patients/pages/patient-reception/patient-reception.page.ts`: `canViewAccount` pasa a depender únicamente del permiso `BILLING_READ`; se desacopló del bloque `isSecretaria()` en plantilla; manejo de anulación delegando a `accountStore.voidPayment`.
  - `src/app/features/patients/pages/patient-reception/patient-reception.page.spec.ts`: Ajuste de fixtures para responder `GET /api/v1/patients/{id}/payments` y nuevo caso de prueba para abonos vigentes/anulados y anulación con recarga.
- **Build**: OK (`npx ng build`).
- **Tests**:
```
Test Files  14 passed (14)
Tests  66 passed (66)
```
- **Anchos revisados**: 375, 768, 1024, 1366 px. En 375 px cada abono se presenta como tarjeta vertical con pares etiqueta-valor y los botones de acción se adaptan fluidamente sin scroll horizontal. En 768, 1024 y 1366 px se despliega en tabla con alineaciones numéricas tabulares y botones con altura mínima de 44 px.
- **Prueba manual**: Iniciar el frontend con `npm start` (o `npx ng serve`) teniendo el backend con la tarea 022 (`GET /api/v1/patients/{patientId}/payments`). Iniciar sesión como secretaria o como odontólogo/director e ingresar a la ficha `/pacientes/:id`.
- **Problemas encontrados y supuestos tomados**: Ninguno; el backend 022 ya provee `PaymentListItem` con los campos requeridos (`id`, `encounterId`, `amount`, `method`, `receiptNumber`, `paidAt`, `receivedBy`, `receivedByName`, `voided`, `voidedAt`, `voidReason`).

## Revisión
Estado: APROBADO

- Cumple los criterios: `PaymentListItem` y `listPayments` según el DTO, `forkJoin` de cuenta + abonos, reimprimir y
  anular por fila con el diálogo de motivo de la 015b, `canViewAccount` solo por `BILLING_READ`, anulados con texto
  «Anulado» + motivo y monto tachado, tarjetas en `< sm` por container query.
- Corrección menor de Claude: el motivo de anulación se cortaba con elipsis (`max-width: 12rem; nowrap`); ahora se
  ajusta en varias líneas para que se lea completo.
- Nota: tras un 409 se recarga cuenta + abonos (criterio 5), bien.
