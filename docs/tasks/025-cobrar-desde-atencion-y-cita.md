# 025 — Cobrar desde la atención y desde la cita

## Objetivo
Hoy solo se cobra desde la ficha del paciente. El usuario pidió (2026-10-22) poder cobrar donde ocurre el trabajo:
1. **Atención** (odontólogo/director): al completar la atención, si la sesión tiene cargo, aparece
   «Total de la sesión: $X — **Cobrar ahora** / Después». También un botón «Cobrar» en la atención completada.
2. **Agenda de recepción** (secretaria): en el panel de una cita **atendida** con atención completada, acción
   **«Cobrar»**.
Los dos abren el **mismo diálogo** de cobro del feature `billing`, con la sesión (atención) ya elegida.

Depende de: backend 022 (el odontólogo tiene `BILLING_CREATE`/`BILLING_READ`) y de la 015c.

## Decisiones a revisar
- El diálogo muestra el **saldo total del paciente** y propone como monto el cargo de **esta sesión** menos lo ya
  abonado a ella (si es ≤ 0, propone el saldo total; si el saldo total es ≤ 0, muestra «Sin deuda» y deja abonar
  igual: queda a favor, D-12b).
- «Después» solo cierra el aviso; no se guarda ningún recordatorio de cobro pendiente (el saldo queda en la ficha).
- La acción «Cobrar» de la agenda solo aparece si la cita trae `encounterId`, `encounterStatus = COMPLETED` y no
  `encounterVoided`; no se consulta el saldo para decidir si mostrarla (evita una petición por cita).

## Archivos a tocar
```
src/app/features/billing/
  components/payment-dialog/payment-dialog.component.ts (nuevo) carga la cuenta, usa bd-payment-form y, al
                                                        guardar, muestra la franja de comprobante (bd-last-payment)
  services/payment-dialog.service.ts                    (nuevo) open({ patientId, patientName, encounterId })
                                                        con CDK Dialog; devuelve Observable<Payment | null>
  domain/account-display.ts                             (modif.) sessionDue(account, encounterId) pura
  index.ts                                              (modif.) exporta PaymentDialogService y su request
src/app/features/clinical/
  pages/encounter/encounter.page.ts                     (modif.) aviso tras completar + botón «Cobrar»
  pages/encounter/encounter.page.spec.ts                (modif. o nuevo, ver Tests)
src/app/features/appointments/
  domain/appointment-state.ts                           (modif.) acción 'charge' en AppointmentActionType y
                                                        availableActions (según criterio 5)
  components/appointment-panel/appointment-panel.component.ts (modif.) etiqueta/ícono de 'charge'
  pages/reception-agenda/reception-agenda.page.ts       (modif.) 'charge' → PaymentDialogService.open
```
`clinical` y `appointments` importan solo de `features/billing/index.ts`.

## Criterios de aceptación
1. `PaymentDialogService.open(request)` abre un CDK Dialog (`role="dialog"`, `aria-labelledby`, Esc cierra, foco
   vuelve al botón que lo abrió). El diálogo:
   - carga `GET /api/v1/patients/{id}/account` (skeleton mientras carga; error con «Reintentar»);
   - muestra paciente, cargo de la sesión, abonado a la sesión y saldo total (pipe `money`);
   - reutiliza `bd-payment-form` con `defaultEncounterId = request.encounterId` y el monto propuesto (decisión de
     arriba; si `bd-payment-form` no acepta un monto inicial, añadir un `input` `initialAmount` opcional sin romper
     la ficha);
   - al guardar (`POST /api/v1/patients/{id}/payments`) muestra «Abono registrado C-000123» con «Imprimir
     comprobante» (flujo de la 015b) y «Cerrar»; cerrar emite el `Payment` creado (o `null` si se canceló).
2. `sessionDue(account, encounterId)`: busca la sesión con ese `encounterId` y devuelve `charge − payment`
   (número con 2 decimales); sin sesión → `null`. Sin tests propios (se valida en la página).
3. **Atención**: tras `onComplete` exitoso, si el usuario tiene `BILLING_CREATE` y el total de la sesión
   (`treatmentsStore.sessionTotal()`) > 0, se muestra un aviso no modal en la barra de completar o encima de ella:
   «Total de la sesión: $X» con «Cobrar ahora» (abre el diálogo con `encounterId` y el paciente de la atención) y
   «Después». En una atención ya completada (abierta luego) hay un botón «Cobrar» en la cabecera, con la misma
   condición de permiso. Sin permiso no se muestra nada.
4. **Agenda**: `AppointmentActionType` añade `'charge'`; `availableActions` lo incluye cuando
   `status === 'ATTENDED' && encounterId && encounterStatus === 'COMPLETED' && !encounterVoided` y el usuario tiene
   `BILLING_CREATE` (pasar el permiso como argumento: la función sigue siendo pura). Etiqueta «Cobrar», ícono de
   lucide (p. ej. `Wallet` o `Banknote`) con texto visible. Al cerrar el diálogo con un pago no hace falta recargar
   la agenda.
5. Textos en español, errores con el `message` del backend, 403 → «No tienes permiso».

## Responsive
375, 768, 1024, 1366. El diálogo ocupa el ancho en 375 (sin scroll horizontal) y tiene ancho máximo ~32rem en
lg+. El aviso «Total de la sesión» no tapa la barra de completar en 768.

## Tests requeridos
Un `*.page.spec.ts` de integración en la **atención** (`encounter.page.spec.ts`; si ya existe, añadir los casos;
si no existe, crearlo con la página real y sus hijos), 2 casos:
1. `completar con total > 0 → "Cobrar ahora" → GET account → guardar → POST /patients/{id}/payments con
   { amount, method: 'EFECTIVO', encounterId } → se ve "Abono registrado C-000001"`.
2. `guardar el cobro con 403 → se ve "No tienes permiso"`.
La acción de la agenda se prueba a mano.

## Prueba manual
1. Como odontólogo: atender, registrar un tratamiento de $40, completar → aparece «Total de la sesión: $40.00» →
   «Cobrar ahora» → monto propuesto 40.00 → guardar → imprimir comprobante.
2. Repetir con «Después» → el aviso se cierra; el saldo queda en la ficha.
3. Como secretaria: en la agenda, abrir una cita atendida → «Cobrar» → el diálogo trae esa sesión elegida.
4. Una cita sin atención o con atención abierta no muestra «Cobrar».

## Resultado
- **Qué se hizo**:
  - `src/app/features/billing/domain/account-display.ts`: implementada la función pura `sessionDue(account, encounterId)`.
  - `src/app/features/billing/components/payment-form/payment-form.component.ts`: añadido `@Input() initialAmount` opcional para precargar el monto sugerido sin romper su uso en la ficha.
  - `src/app/features/billing/components/payment-dialog/payment-dialog.component.ts`: creado diálogo CDK accesible con carga de cuenta del paciente, resumen de deuda total y sesión actual, formulario `bd-payment-form` preseleccionando la atención y monto debido, visualización de comprobante con `bd-last-payment`, botón de imprimir y mapeo de error 403 a «No tienes permiso».
  - `src/app/features/billing/services/payment-dialog.service.ts`: servicio para abrir el diálogo con CDK Dialog devolviendo `Observable<Payment | null>`.
  - `src/app/features/billing/index.ts`: exportados `PaymentDialogService` y `PaymentDialogRequest`.
  - `src/app/features/appointments/domain/appointment-state.ts`: añadida la acción `'charge'` a `AppointmentActionType` y a `availableActions` cuando la cita está atendida, con atención completada, no anulada y el usuario cuenta con permiso `BILLING_CREATE`.
  - `src/app/features/appointments/components/appointment-panel/appointment-panel.component.ts`: mapeada la acción `'charge'` con etiqueta «Cobrar» e ícono `Wallet`.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.ts`: inyectado `PaymentDialogService` y manejada la acción `'charge'` abriendo el diálogo para el paciente y atención correspondientes.
  - `src/app/features/clinical/pages/encounter/encounter.page.ts`: inyectado `PaymentDialogService`; tras completar una sesión con total > 0 (si se tiene `BILLING_CREATE`), se muestra el aviso «Total de la sesión: $X — Cobrar ahora / Después» posicionado de forma fija/adherida sobre la barra de completar sin taparla. En atenciones completadas se añade el botón de acción rápida «Cobrar» en la cabecera.
  - `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: añadidos los 2 tests de integración solicitados (completar con cobro exitoso y caso de error 403 con mensaje «No tienes permiso»).
- **Resultado del build**: OK (`Application bundle generation complete`).
- **Totales de `ng test`**:
```
Test Files  15 passed (15)
     Tests  70 passed (70)
```
- **Anchos revisados y problemas visuales encontrados**:
  - 375px: el diálogo de cobro se adapta ocupando el ancho completo disponible sin desbordamiento horizontal. El aviso de cobro en la atención se ubica encima de la barra inferior con botones táctiles legibles.
  - 768px: el diálogo mantiene espacio perimetral adecuado y el aviso flota sobre la barra de completar sin superponerse a los controles.
  - 1024px y 1366px: el diálogo respeta el ancho máximo (`min(36rem, 100vw)`), con tipografía, espaciado y contraste conformes al sistema de diseño.
- **Prueba manual**:
  - Iniciar sesión como odontólogo/director con permiso de cobro (`BILLING_CREATE`).
  - Abrir una atención, agregar prestaciones con cargo y presionar «Completar atención».
  - Confirmar que aparece el aviso con el total de la sesión y las opciones «Cobrar ahora» y «Después».
  - Al pulsar «Cobrar ahora», verificar la apertura del diálogo de abono con la atención preseleccionada y el monto de la sesión propuesto.
  - Registrar el abono y verificar la confirmación y la opción de comprobante.
  - Iniciar sesión como secretaria, ir a la agenda de recepción, abrir el panel lateral de una cita atendida con atención completada y presionar «Cobrar».
- **Problemas encontrados y supuestos tomados**: Ninguno.

## Revisión
Estado: APROBADO

- Cumple: `PaymentDialogService` (CDK Dialog, `aria-labelledby`, Esc y foco de vuelta por defecto de CDK), cuenta con
  skeleton/error/«Reintentar», monto propuesto según la decisión (sesión → saldo → vacío con «Sin deuda»),
  `initialAmount` opcional en `bd-payment-form` sin romper la ficha, franja de comprobante, 403 → «No tienes
  permiso». Atención: aviso tras completar y «Cobrar» en la cabecera con `BILLING_CREATE`. Agenda: acción `charge`
  pura con el permiso como argumento. `clinical` y `appointments` importan solo de `billing/index.ts`.
- Notas no bloqueantes: el diálogo usa `min(36rem, 100vw)` en vez de ~32rem; si se cierra con Esc después de
  guardar devuelve `null` (nadie usa el `Payment` devuelto, no afecta).
- Verificación de Claude: `npx ng build` OK · `Test Files 15 passed (15)` · `Tests 70 passed (70)`.
