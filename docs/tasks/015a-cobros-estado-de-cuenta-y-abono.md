# 015a — Cobros: estado de cuenta y registrar abono (ficha de recepción)

> Plan §5.15 (P14, completa P5). Backend 012 (`328c6fe`). Requiere la 005b (ficha de recepción).
> Perfil: SECRETARIA. Objetivo TGA T2 (cobro): del buscador al abono guardado en **3 clics** (abrir ficha →
> "Registrar abono" → "Guardar abono"), con monto y método ya puestos.

## Objetivo
Feature nuevo `billing`. En `/pacientes/:id`, para la secretaria, una sección **"Estado de cuenta"** con la tabla
de la ficha rápida en papel (fecha, tratamientos, profesional, cargo, abono, saldo acumulado; sin Dg. ni "Estado",
F-3) y la acción **"Registrar abono"**. El saldo lo calcula el backend; el frontend nunca suma montos por su cuenta.

### Contrato (backend 012; DTO reales, montos `number` con 2 decimales)
- **`GET /api/v1/patients/{patientId}/account`** (`BILLING_READ`) → `ApiResponse<PatientAccount>`:
  ```json
  { "success": true, "message": "OK", "data": {
      "patientId": "pat-1", "patientName": "David Pérez",
      "totalCharges": 65.00, "totalPayments": 40.00, "balance": 25.00,
      "sessions": [
        { "encounterId": "enc-1", "date": "2026-10-03T09:10:00-05:00", "professionalName": "Daniel Vargas",
          "treatments": ["Profilaxis x1"], "charge": 25.00, "payment": 25.00, "runningBalance": 0.00 },
        { "encounterId": "enc-2", "date": "2026-10-08T10:40:00-05:00", "professionalName": "Daniel Vargas",
          "treatments": ["Resina compuesta 2 caras x1"], "charge": 40.00, "payment": 15.00, "runningBalance": 25.00 }
      ] } }
  ```
  - Una sesión por atención no anulada, en orden **ascendente**. `treatments` ya viene como texto «nombre xcantidad».
  - Si hay pagos sin atención (o de una atención anulada), al final va **una sesión con `encounterId: null`**,
    `professionalName: null`, `treatments: []`, `charge: 0` y `date` = fecha del pago más reciente de ese grupo.
  - `balance` y `runningBalance` pueden ser **negativos** (saldo a favor). 404 si el paciente no existe.
- **`POST /api/v1/patients/{patientId}/payments`** (`BILLING_CREATE`), body `{ amount, method, encounterId? }`:
  - `amount` ≥ 0.01, máx. 8 enteros y 2 decimales; `method` ∈ `EFECTIVO` | `TRANSFERENCIA` | `TARJETA`;
    `encounterId` opcional (se **omite** la clave si no hay sesión elegida).
  - → **201** `ApiResponse<Payment>`:
    ```json
    { "success": true, "message": "OK", "data": {
        "id": "pay-1", "patientId": "pat-1", "encounterId": null, "amount": 25.00, "method": "EFECTIVO",
        "receiptNumber": "C-000045", "paidAt": "2026-10-10T12:00:00-05:00", "receivedBy": "user-sec",
        "voided": false, "voidReason": null } }
    ```
  - Errores: 400 validación (`message` del backend), 404 paciente o atención inexistente, **409**
    `"La atención no pertenece a este paciente."` (también si la atención está anulada), 403 sin permiso.
  - Un abono puede superar el saldo (queda a favor): el backend no lo bloquea y el frontend tampoco.
- El ODONTOLOGO no tiene `BILLING_*` (403). El DIRECTOR (ADMIN) sí, pero ve la cuenta en su ficha clínica (014),
  no aquí.

### Comportamiento
1. **Visibilidad:** la sección se muestra solo si `SessionStore.profile() === 'SECRETARIA'` **y**
   `hasPermission('BILLING_READ')`. "Registrar abono" solo con `hasPermission('BILLING_CREATE')`.
2. **Orden en la ficha** (una sola columna, F-19): identificación → observaciones → **Estado de cuenta** → Citas.
3. **Cabecera de la sección:** título "Estado de cuenta" y resumen en una línea:
   "Cargos $ 65,00 · Abonos $ 40,00 · **Saldo pendiente $ 25,00**". Saldo con texto **y** color (nunca solo color):
   `balance > 0` → "Saldo pendiente" (texto `--color-text`, peso 600); `< 0` → "Saldo a favor" con el valor absoluto
   (`--teal-700`); `= 0` → "Sin saldo pendiente" (`--teal-700`). Botón **"Registrar abono"** (`btn btn-accent`,
   la única acción de acento de la pantalla).
4. **Tabla** (`<table aria-label="Estado de cuenta">`): columnas
   **Fecha · Tratamientos · Profesional · Cargo · Abono · Saldo**.
   - Fecha con `clinicDate` (corta: "sáb 3 oct"). Tratamientos unidos con ", ". Montos con el pipe `money`.
   - Cargo o abono en 0 → "—". Saldo negativo → "$ 5,00 a favor". Fila con `encounterId: null` → Tratamientos
     "Abonos sin atención", Profesional "—".
   - Montos alineados a la derecha (`text-align: end`, `font-variant-numeric: tabular-nums`).
   - Sin sesiones → `bd-empty-state` título "Sin movimientos", descripción "Aún no hay tratamientos ni abonos.".
   - Carga → `bd-skeleton`; error → `bd-alert` con el `message` y botón "Reintentar".
5. **"Registrar abono"** abre un formulario **en línea dentro de la tarjeta** (sin side-sheet ni diálogo), con el
   foco en el monto:
   - **Monto** (`input.input`, `type="text"`, `inputmode="decimal"`, prefijo visual "$"): por defecto el saldo si
     es > 0, escrito "25,00"; si no, vacío. Acepta "25", "25,5", "25.50"; sin separador de miles. Inválido o ≤ 0 →
     error en línea "Ingresa un monto mayor que 0 (hasta 2 decimales)." y no se envía.
   - **Método** con `bd-segmented`: Efectivo (por defecto) · Transferencia · Tarjeta.
   - **Sesión** (`select.input`, opcional): "Sin sesión (abono general)" + las sesiones con `encounterId`, de la
     más reciente a la más antigua, con texto "sáb 3 oct · Daniel Vargas · Profilaxis x1". Por defecto, la sesión
     cuya fecha (Guayaquil) es **hoy** (la última si hay varias); si no hay, "Sin sesión".
   - Si el monto supera el saldo, ayuda (no error): "Quedará un saldo a favor de $ 5,00.".
   - Botones: **"Guardar abono"** (`btn btn-accent`, deshabilitado y con texto "Guardando…" mientras se envía; sin
     doble envío) y "Cancelar" (`btn btn-ghost`, cierra el formulario sin petición).
   - Éxito → toast `NotificationService.success('Abono registrado · C-000045')`, se cierra el formulario y se
     **vuelve a pedir** `GET …/account` (no se recalcula en el cliente).
   - Error → `bd-alert` dentro del formulario con el `message` (409/400 tal cual; 403 y 0 con los textos de
     `api-error-messages.ts`); el formulario sigue abierto con lo escrito.
6. Al cambiar de paciente (otra `:id`) se descarta el estado anterior de la cuenta y del formulario.

### Estructura (según `architecture/SKILL.md`)
- `billing` usa `models/`, `services/`, `components/`, `domain/` e `index.ts`. **No** tiene páginas ni rutas
  (vive dentro de la ficha de `patients`).
- `billing/index.ts` exporta: `billing.models.ts` (tipos), `PatientAccountStore`, `PatientAccountSectionComponent`.
- `billing` depende solo de `core/` (`ApiClient`, `ApiError`, `ClinicClock`, `NotificationService`) y `shared/`.
  **No** importa de `patients`.
- `patients` (la página `patient-reception`) importa de `../../../billing` (su `index.ts`), nunca rutas internas.
- Patrón igual a `treatments` (012a): el componente de sección es **presentacional** (`input()`/`output()`), el
  estado y el HTTP viven en `PatientAccountStore` (`@Injectable()` **sin** `providedIn`, lo provee la página con
  `providers: [PatientAccountStore]`).

## Decisiones a revisar
1. **Una sola columna** (estado de cuenta antes de "Citas") en lugar de las 2 columnas del boceto de §5.5: la
   tabla de 6 columnas no cabe en media página de 64rem sin pasar a tarjetas en escritorio. (F-19)
2. **Sesión por defecto = la atención de hoy**, si existe; si no, "Sin sesión". Es lo más común (paga al salir) y
   evita un clic; si el abono es de una sesión anterior, la secretaria la elige. Alternativa: siempre "Sin sesión".
3. **Formulario en línea** dentro de la tarjeta, no en `bd-side-sheet`: es corto (3 campos) y así la tabla sigue
   visible al cobrar.
4. **Sin comprobante en esta tarea**: imprimir y anular van en la 015b. Tras guardar solo hay toast con el número.
5. **El director no ve la cuenta aquí**: el pedido decía mostrársela en su ficha clínica solo si ya existía; no
   existe (la 014 no está hecha; hoy `/pacientes/:id` le muestra solo la identificación). Queda anotado en §5.14.
6. **El odontólogo no ve la cuenta**: el backend le responde 403 (no tiene `BILLING_READ`); F-10 corregida.
7. Los fixtures de la cuenta van **dentro del spec de la página** de `patients` (no en `billing/testing/`), porque
   un spec de `patients` no debe importar rutas internas de `billing`.
8. El spec existente crea la página en el `beforeEach` con la secretaria; se cambia a un helper `openAs(user)`
   para que la 017 pueda abrir la ficha como director sin duplicar la configuración.

## Archivos a tocar
```
src/app/
├── features/
│   ├── billing/
│   │   ├── .gitkeep                                         (borrar)
│   │   ├── index.ts                                         (nuevo) export * de models, store y sección
│   │   ├── models/billing.models.ts                         (nuevo) PaymentMethod, AccountSession,
│   │   │                                                      PatientAccount, CreatePaymentRequest, Payment
│   │   ├── services/
│   │   │   ├── billing.api.ts                               (nuevo, providedIn root) getAccount, registerPayment
│   │   │   └── patient-account.store.ts                     (nuevo, @Injectable() sin providedIn)
│   │   ├── domain/account-display.ts                        (nuevo, puro) balanceStatus, parseAmount,
│   │   │                                                      formatAmountInput, PAYMENT_METHOD_LABELS
│   │   └── components/
│   │       ├── patient-account-section/patient-account-section.component.ts   (nuevo, dumb) tarjeta completa
│   │       ├── account-table/account-table.component.ts                       (nuevo, dumb) tabla → tarjetas
│   │       └── payment-form/payment-form.component.ts                         (nuevo, dumb) Reactive Forms
│   └── patients/pages/patient-reception/
│       ├── patient-reception.page.ts                        (provee PatientAccountStore; carga y muestra la sección)
│       └── patient-reception.page.spec.ts                   (helper openAs; flush de la cuenta; +2 casos)
```
Detalle de piezas:
- `billing.models.ts`:
  ```ts
  export type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
  export interface AccountSession { encounterId: string | null; date: string; professionalName: string | null;
    treatments: string[]; charge: number; payment: number; runningBalance: number; }
  export interface PatientAccount { patientId: string; patientName: string; totalCharges: number;
    totalPayments: number; balance: number; sessions: AccountSession[]; }
  export interface CreatePaymentRequest { amount: number; method: PaymentMethod; encounterId?: string; }
  export interface Payment { id: string; patientId: string; encounterId: string | null; amount: number;
    method: PaymentMethod; receiptNumber: string; paidAt: string; receivedBy: string; voided: boolean;
    voidReason: string | null; }
  ```
- `BillingApi` (usa `ApiClient` de `core/api/api-client`):
  `getAccount(patientId)` → `api.get<PatientAccount>(`/api/v1/patients/${patientId}/account`)`;
  `registerPayment(patientId, request)` → `api.post<Payment>(`/api/v1/patients/${patientId}/payments`, request)`.
- `PatientAccountStore` (signals): `account`, `loading`, `error`, `formOpen`, `saving`, `saveError`;
  computed `defaultEncounterId` (sesión de hoy: compara `clinicClock.addDays(new Date(session.date), 0)` con
  `clinicClock.todayDateString()`; nunca `new Date()` para "hoy"). Métodos `load(patientId)`, `reload()`,
  `openForm()`, `closeForm()`, `registerPayment(request)`. `load` cancela la carga anterior (`switchMap` sobre un
  `Subject`, como `MyEncountersStore`). `registerPayment` ignora un segundo envío si `saving()`.
- `account-display.ts` (sin Angular): `balanceStatus(balance)` → `{ label, amount, tone: 'due' | 'credit' |
  'settled' }`; `parseAmount(text)` → `number | null` (regex `^\d{1,8}([.,]\d{1,2})?$`, > 0);
  `formatAmountInput(value)` → `"25,00"`; `PAYMENT_METHOD_LABELS: Record<PaymentMethod, string>` =
  Efectivo / Transferencia / Tarjeta.
- `PaymentFormComponent`: `FormBuilder.nonNullable` (`amount: string`, `method: PaymentMethod`,
  `encounterId: string` con `''` = sin sesión). Inputs: `balance`, `sessions`, `defaultEncounterId`, `saving`,
  `errorMessage`. Outputs: `submitted: CreatePaymentRequest`, `cancelled`. Arma el request sin la clave
  `encounterId` cuando es `''`.
- `PatientAccountSectionComponent`: inputs `account`, `loading`, `error`, `canRegister`, `formOpen`, `saving`,
  `saveError`, `defaultEncounterId`; outputs `retry`, `openForm`, `closeForm`, `submitPayment`. Usa
  `AccountTableComponent` y `PaymentFormComponent`. Plantillas < ~150 líneas cada una.
- Componentes compartidos que se usan (rutas reales): `shared/components/alert/alert.component` (`bd-alert`),
  `empty-state/empty-state.component` (`bd-empty-state`), `skeleton/skeleton.component` (`bd-skeleton`),
  `segmented/segmented.component` (`bd-segmented`, `SegmentedOption`), `field/field.component` (`bd-field`);
  pipes `shared/pipes/money.pipe` (`money`) y `clinic-date.pipe` (`clinicDate`). Clases globales `.card`, `.btn`,
  `.btn-accent`, `.btn-ghost`, `.input`.

## Criterios de aceptación
- [ ] Como secretaria, `/pacientes/:id` pide `GET /api/v1/patients/{id}/account` y muestra el resumen y la tabla
      con fecha, tratamientos, profesional, cargo, abono y saldo acumulado; la sesión sin atención dice
      "Abonos sin atención".
- [ ] Saldo con texto **y** color: "Saldo pendiente", "Saldo a favor" (valor absoluto) o "Sin saldo pendiente".
- [ ] "Registrar abono" abre el formulario con el monto = saldo ("25,00"), Efectivo y la sesión de hoy (o "Sin
      sesión"); "Guardar abono" envía `POST /api/v1/patients/{id}/payments` con `amount` numérico, `method` y
      `encounterId` solo si se eligió sesión.
- [ ] Tras guardar: toast con el número de comprobante, formulario cerrado y la cuenta se vuelve a pedir.
- [ ] Monto inválido → error en línea sin petición. 409/400 → `message` del backend en el formulario, que sigue
      abierto. Sin doble envío.
- [ ] Odontólogo y director: la sección no aparece y no se pide la cuenta.
- [ ] Sin "Eliminar" en ningún lado. Solo tokens (`--teal-700`, `--color-text`, …), sin hex; sin `any`; OnPush;
      `billing` no importa de `patients`; `patients` importa de `billing` solo por su `index.ts`.
- [ ] `npx ng build` sin errores; `npx ng test --watch=false` en verde (incluidos los 2 casos existentes de la
      ficha, adaptados al helper).

## Responsive
Revisar en **375, 768, 1024 y 1366**.
- La sección declara `container-type: inline-size`. Con el contenedor `< 37.5rem` la tabla pasa a **tarjetas**
  (mismo patrón que `.table-cards` de `patients/components/patient-appointments`: `thead` oculto, cada `td` con
  `data-label` como etiqueta). En 768 y más, tabla.
- Formulario: en `< 37.5rem` los campos apilados y los botones a todo el ancho; en más, monto y método en una fila.
- Botones e inputs ≥ 44 px de alto. Sin scroll horizontal de la página.

## Tests requeridos
Se amplía `features/patients/pages/patient-reception/patient-reception.page.spec.ts` (+**2 casos**; respuestas
`ApiResponse<T>` con la forma exacta del contrato; sin mocks de servicios propios).
- **Preparación:** mover `setCurrentUser` + `RouterTestingHarness.create('/pacientes/pat-1')` del `beforeEach` a
  un helper `async function openAs(user: CurrentUser)`; los 2 casos existentes empiezan con
  `await openAs(secretaria)`. A los permisos de la secretaria añadir `'BILLING_READ', 'BILLING_CREATE'`.
  `flushInitialLoad()` también responde `GET /api/v1/patients/pat-1/account` con la cuenta del contrato (saldo
  25,00). Reloj fijo 2026-10-10 (ya está): ninguna sesión es de hoy.
1. `'Registrar abono con el saldo → POST /payments → la cuenta se recarga sin saldo pendiente'`: se ve
   "Saldo pendiente" y "$ 25,00"; clic "Registrar abono" → el monto vale "25,00" → clic "Guardar abono" →
   `expectOne('/api/v1/patients/pat-1/payments')` con método POST y body exactamente
   `{ amount: 25, method: 'EFECTIVO' }` → responder el `Payment` del contrato → `expectOne` del GET de la cuenta →
   responder `balance: 0`, `totalPayments: 65` y la sesión `enc-2` con `payment: 40`, `runningBalance: 0` → se ve
   "Sin saldo pendiente" y ya no está el botón "Guardar abono".
2. `'Abono a una sesión que no corresponde → 409 → mensaje en el formulario'`: abrir el formulario, elegir en el
   select la sesión `enc-2` → "Guardar abono" → body `{ amount: 25, method: 'EFECTIVO', encounterId: 'enc-2' }` →
   responder 409 `{ success: false, message: 'La atención no pertenece a este paciente.', data: null }` → se ve el
   mensaje y el formulario sigue abierto; no hay otro GET de la cuenta (`verify()`).

Durante el desarrollo: `npx ng test --watch=false --include='src/app/features/patients/**/*.spec.ts'`.

## Prueba manual
1. Secretaria → buscar un paciente con atenciones y tratamientos → la ficha muestra "Estado de cuenta" con las
   sesiones en orden y el saldo.
2. "Registrar abono" → monto = saldo, Efectivo → "Guardar abono" → toast "Abono registrado · C-…" y "Sin saldo
   pendiente".
3. Abono mayor que el saldo → aviso "Quedará un saldo a favor…" → guardar → "Saldo a favor".
4. Abono "Sin sesión" → aparece la fila "Abonos sin atención" al final.
5. Montos "0", "abc", "12,345" → error en línea, sin petición.
6. Paciente sin atenciones → "Sin movimientos".
7. Entrar como odontólogo y como director a la misma ficha: no aparece la sección.
8. Anchos 375 (tarjetas), 768, 1024, 1366.

## Resultado
**Archivos creados** (feature `billing`, sin `.gitkeep`):
- `billing/models/billing.models.ts`, `billing/services/billing.api.ts` (`BillingApi`, `providedIn: root`),
  `billing/services/patient-account.store.ts` (`PatientAccountStore`, `@Injectable()`), `billing/domain/account-display.ts`,
  `billing/components/patient-account-section/…`, `billing/components/account-table/…`, `billing/components/payment-form/…`,
  `billing/index.ts`.
**Archivos modificados**: `patients/pages/patient-reception/patient-reception.page.ts` (provee el store, sección entre
notas y Citas, permisos `canViewAccount` / `canRegisterPayment`, `store.load(id)` en `loadPatient`) y
`patient-reception.page.spec.ts` (helper `openAs`, flush de la cuenta, +2 casos).
**Borrado**: `billing/.gitkeep`.

**Build**: OK (`Application bundle generation complete`; único aviso ajeno: budget de `sidebar.component.scss`, ya existía).
**Tests** (`npx ng test --watch=false`, copiado de consola):
` Test Files  10 passed (10)` y `      Tests  50 passed (50)`. Los del spec de ficha: 4 (2 existentes adaptados + 2 nuevos), todos verdes.

**Anchos revisados**: NO. No tengo navegador en esta sesión: 375/768/1024/1366 no se revisaron en DevTools. Quedan
implementados con container queries (`37.5rem`: tarjetas en la tabla, formulario apilado; el contenedor es la sección).
Pendiente de revisión manual por el usuario.

**Cómo probar a mano**: secretaria con permisos `BILLING_READ`/`BILLING_CREATE` (el backend 012 ya los da), paciente con atenciones.

**Problemas y supuestos**:
1. El spec existente de "Citas anteriores" usaba `querySelector('table')`; ahora hay otra tabla antes, así que se
   cambió a `table[aria-label="Citas anteriores del paciente"]`. Es el único cambio de los casos existentes aparte del helper.
2. `PatientAccountStore.reload()` muestra la tabla sin skeleton (el skeleton solo sale si aún no hay cuenta).
3. `defaultEncounterId` compara la fecha de la sesión con `clinicClock.addDays(new Date(...), 0)`, como indica la tarea.
4. El formulario muestra el error de monto solo al enviar y lo limpia al escribir.
5. Sin cambios en backend ni en alcance; no hay commit.

## Revisión
**Estado: APROBADO** (revisó Claude Opus, 2026-10-21).

- Build OK (solo el aviso previo de budget de `sidebar.component.scss`, +22 bytes, ajeno). Tests: `Test Files 10 passed
  (10)` · `Tests 50 passed (50)`.
- Contrato verificado contra el backend (`AccountResponse`, `AccountSessionResponse`, `CreatePaymentRequest`,
  `PaymentResponse`, `PaymentController`: rutas y permisos `BILLING_READ`/`BILLING_CREATE`): coincide.
- Criterios: los 8 se cumplen. Visibilidad con `profile() === 'SECRETARIA'` + `hasPermission`; odontólogo/director no
  llaman a `load()`. Monto por defecto "25,00", `encounterId` omitido si `''`, doble envío bloqueado (botón
  deshabilitado + guarda en el store), recarga con GET tras guardar, error en el formulario abierto. `billing` no importa
  de `patients`; la página importa solo de `../../../billing`. Sin `any`, sin hex, OnPush, sin "Eliminar", montos con
  `money`, "hoy" con `ClinicClock`. Botones ≥ 44 px; tabla → tarjetas con `@container` < 37.5rem.
- Corrección mínima hecha por Claude: `role="alert"` en el error en línea del monto (`payment-form.component.ts`), para
  que el lector de pantalla lo anuncie al enviar.
- Pendiente del usuario: revisión visual en 375/768/1024/1366 (Haiku no tuvo navegador).

## Decisiones a revisar (tras la revisión)
1. Las 8 decisiones de arriba siguen vigentes (una columna, sesión de hoy por defecto, formulario en línea, sin
   comprobante hasta la 015b, director y odontólogo sin cuenta en esta pantalla).
2. Si falla la **recarga** de la cuenta (no la carga inicial), el `bd-alert` reemplaza la tabla hasta "Reintentar". Es
   aceptable para el MVP.
3. Para la 015b: hoy el store no guarda el `Payment` devuelto (solo usa `receiptNumber` en el toast); la 015b debe
   añadir un signal `lastPayment` para la franja "Abono registrado · Imprimir · Anular".
4. El hint "Quedará un saldo a favor de $ X" con saldo previo a favor muestra el total a favor resultante (monto +
   crédito previo), no solo el excedente de este abono. Es correcto contablemente; confirmar que el texto se entiende.
