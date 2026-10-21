# 016b — Estadísticas del director: gráficos de barras y tablas

> Plan §5.16 (P16, parte 2). Requiere la 016a (misma respuesta `DashboardSummary`; **sin peticiones nuevas**).
> Perfil: DIRECTOR. Sin librería de gráficos (plan §1): barras en HTML/CSS.

## Objetivo
Debajo de las tarjetas de la 016a, cinco paneles con lo que ya trae `GET /dashboard/summary`:
1. **Citas por estado** (barras): Agendadas (`PENDING`) · Confirmadas (`CONFIRMED`) · Atendidas (`ATTENDED`) ·
   No asistió (`NO_SHOW`) · Canceladas (`CANCELLED`) · Reprogramadas (`RESCHEDULED`), en ese orden.
2. **Citas por canal** (barras): Recepción (`RECEPTION`) · Profesional (`PROFESSIONAL`) · Bot de WhatsApp (`BOT`) ·
   Sin cita (`WALK_IN`), en el orden de `byChannel`.
3. **Cobrado por método** (barras, valores con `money`): Efectivo · Transferencia · Tarjeta (`billing.byMethod`).
4. **Por profesional** (tabla): Profesional · Atenciones completadas · Producción (suma de tratamientos de sus
   atenciones completadas, `revenue`, con `money`). Orden por atenciones desc. Pie de tabla: "La producción es lo
   registrado en tratamientos, no lo cobrado.".
5. **Top 5 tratamientos** (tabla): # · Tratamiento (`name`, y `code` en texto atenuado) · Cantidad · Monto (`money`).

### Contrato
El mismo `DashboardSummary` de la 016a (ver su `## Objetivo` › Contrato). Las claves de `byStatus`, `byMethod` y
`byChannel` llegan siempre (con 0). `topTreatments` tiene 0–5 elementos; `byProfessional` solo profesionales con
atenciones completadas en el rango (puede venir vacío).

### Comportamiento
- **`bar-list`** (componente presentacional reutilizable dentro de `management`): input `rows: BarRow[]` con
  `{ key: string; label: string; value: number; valueText: string; tone?: BarTone }`, input `ariaLabel`, input
  `emptyText`. Renderiza `<ul role="list" [attr.aria-label]>`; cada `<li>`: etiqueta, barra y `valueText` (el número
  siempre visible: el color nunca va solo). Ancho de la barra = `value / max * 100 %` (máx. de las filas; con
  `value > 0` mínimo 2 % para que se vea). Si todas valen 0 → `<p>` con `emptyText`
  ("Sin datos en el período"). La barra lleva `aria-hidden="true"`.
- **Tonos** (`BarTone`) solo con tokens de §2.3, iguales a los estados de cita: `scheduled` → `--blue-600`,
  `attended` → `--teal-500`, `no-show` → `--coral-500`, `cancelled` → `--slate-300`; sin tono → `--blue-400`.
  Pista de la barra `--blue-50`. Agendadas y Confirmadas `scheduled`; Atendidas `attended`; No asistió `no-show`;
  Canceladas y Reprogramadas `cancelled`. Canales y métodos sin tono.
- Mapeos y orden en `management/domain/stats-labels.ts` (puro): `appointmentStatusRows(byStatus)`,
  `channelRows(byChannel)`, `paymentMethodRows(byMethod, formatMoney)`; etiquetas en español. Las de método se
  importan de `billing` (**`PAYMENT_METHOD_LABELS`**, que esta tarea agrega al `index.ts` de `billing`); no se copian.
- Tablas con el patrón de tabla → tarjetas de la 015a (`container-type: inline-size`; con contenedor `< 37.5rem`,
  `thead` oculto y `data-label` en cada celda). Sin filas → `bd-empty-state` con texto corto ("Sin atenciones
  completadas en el período" / "Sin tratamientos en el período").
- Cada panel es una `.card` con `<h2>` (`--fs-md`, peso 600). La página los ordena en una grilla
  `repeat(auto-fit, minmax(min(100%, 22rem), 1fr))`.
- Mientras carga, los paneles muestran `bd-skeleton`; con error, solo el `bd-alert` de la 016a (no se duplican
  mensajes).

## Decisiones a revisar
1. **Barras horizontales en CSS** (no SVG): etiquetas largas legibles en 375 px y sin cálculo de ejes. Se reutiliza
   un solo componente `bar-list` para tres paneles.
2. **Sin `colorTag` por profesional**: el backend no lo trae en `byProfessional`; pedir `GET /professionals` solo
   para colorear no aporta. Tabla en vez de barras.
3. **"Producción"** para `revenue` (tratamientos registrados) vs. **"Cobrado"** para pagos: son cifras distintas y la
   nota al pie lo aclara.
4. **`PAYMENT_METHOD_LABELS` se exporta desde `billing/index.ts`** para no duplicar etiquetas (management depende de
   billing solo por su `index.ts`).

## Archivos a tocar
```
src/app/features/
├── billing/index.ts                                       (+ export de PAYMENT_METHOD_LABELS desde domain/account-display)
└── management/
    ├── models/dashboard.models.ts                         (+ tipos de claves: AppointmentStatusKey, ChannelKey)
    ├── domain/stats-labels.ts                             (nuevo, puro) filas y etiquetas
    ├── components/
    │   ├── bar-list/bar-list.component.ts                 (nuevo, dumb) BarRow, BarTone
    │   ├── professional-stats-table/professional-stats-table.component.ts   (nuevo, dumb)
    │   └── top-treatments-table/top-treatments-table.component.ts           (nuevo, dumb)
    └── pages/clinic-stats/clinic-stats.page.ts            (monta los 5 paneles con la respuesta del store)
```
- El `MoneyPipe` (`shared/pipes/money.pipe`) se usa en plantillas; para `valueText` de la lista de métodos la
  página/domain usa `new MoneyPipe().transform(valor)` (como `ClinicTimePipe` en `patient-reception.page.ts`).

## Criterios de aceptación
- [ ] Con la respuesta de ejemplo se ven los 5 paneles con sus etiquetas en español, valores visibles y barras
      proporcionales; los estados de cita llevan su color **y** su etiqueta.
- [ ] Todo en 0 o listas vacías → textos de vacío, sin barras rotas ni "NaN".
- [ ] Ninguna petición nueva (la 016a sigue haciendo una sola por período).
- [ ] Solo tokens; sin hex sueltos; sin `any`; OnPush; plantillas < ~150 líneas.
- [ ] `npx ng build` y `npx ng test --watch=false` en verde (el spec de la 016a no cambia).

## Responsive
Revisar en **375, 768, 1024 y 1366**. 375: paneles en una columna, barras a todo el ancho con la etiqueta encima
de la barra; tablas como tarjetas. 768–1024: 2 columnas de paneles. 1366: 2–3 columnas. Sin scroll horizontal;
texto ≥ 12 px (`--fs-xs` mínimo).

## Tests requeridos
Sin tests (sin llamada nueva a la API; `testing/SKILL.md`).

## Prueba manual
1. Director → Estadísticas (mes con datos) → comparar "Citas por estado" con la agenda y "Cobrado por método" con
   los abonos registrados.
2. Un día sin actividad → todos los paneles con su texto de vacío.
3. Revisar que la suma de "Citas por estado" coincide con la tarjeta "Citas".
4. Anchos 375, 768, 1024 y 1366.

## Resultado
- **Modificados:** `features/billing/index.ts` (export de `PAYMENT_METHOD_LABELS`); `management/models/dashboard.models.ts`
  (+ `AppointmentStatusKey`, `ChannelKey`); `management/pages/clinic-stats/clinic-stats.page.ts` (5 paneles con
  `card` + `<h2>`, grilla `auto-fit`, skeleton mientras carga, error solo con `bd-alert`).
- **Creados:** `management/domain/stats-labels.ts`; `management/components/bar-list/bar-list.component.ts`;
  `management/components/professional-stats-table/professional-stats-table.component.ts`;
  `management/components/top-treatments-table/top-treatments-table.component.ts`.
- **Sin peticiones nuevas:** sigue usando solo `GET /dashboard/summary` (store de la 016a sin cambios).
- **Build:** OK (`npx ng build`). Aviso preexistente, no de esta tarea: `sidebar.component.scss` supera el presupuesto de 4.00 kB en 22 bytes.
- **Tests:** `npx ng test --watch=false`:
  ` Test Files  11 passed (11)`
  `      Tests  54 passed (54)`
- **Anchos revisados:** NO. No tengo navegador disponible en esta ejecución; 375, 768, 1024 y 1366 quedan por revisar en DevTools.
- **Supuestos:**
  - `bar-list` pone la etiqueta y la cifra encima de la barra en todos los anchos (cumple 375 px; en anchos mayores no se pone en paralelo).
  - Las tablas usan `container-type` en el `:host` y pasan a tarjetas bajo 37.5rem del contenedor (como 015a).
  - `channelRows` mapea el array `byChannel` en su orden; un canal desconocido muestra su `source` como etiqueta.
  - `stats-labels.ts` importa el tipo `BarRow` desde el componente `bar-list` (`import type`), tal como pide la tarea.
- **Problemas:** ninguno de API. Sin commit.

## Revisión
Estado: APROBADO

- Arquitectura: `management` usa `billing` solo por su `index.ts` (`PAYMENT_METHOD_LABELS`, `PaymentMethod`);
  componentes dumb (solo `input()`), OnPush, sin `any`, sin hex (solo tokens de `_tokens.scss`), plantillas < 150
  líneas. Dinero con `money` (tablas) y `MoneyPipe.transform` (valueText de métodos).
- A11y: cada barra con etiqueta + cifra visible; barra `aria-hidden`; `<ul role="list" aria-label>`; paneles con
  `<section aria-labelledby>` y `<h2>`. Vacíos: `bar-list` usa `some(value > 0)` y `widthOf` evita división por 0
  (sin NaN); tablas con `bd-empty-state`.
- Sin peticiones nuevas: la página solo deriva `computed` del store de la 016a; el spec de la 016a no cambió.
- Build OK (solo el aviso preexistente de presupuesto de `sidebar.component.scss`, +22 B). Tests:
  `Test Files 11 passed (11)` · `Tests 54 passed (54)`.
- **Correcciones mínimas hechas por Claude:**
  1. `professional-stats-table`: el backend (`DashboardRepository.encountersAndRevenueByProfessional`) no tiene
     `ORDER BY`; se agregó `sortedRows` (`computed`, atenciones desc.) para cumplir el criterio de orden.
  2. `top-treatments-table`: nombre y código envueltos en un `<span>`; en modo tarjeta el `td` es `flex` con
     `space-between` y repartía etiqueta, nombre y código en tres columnas.
- Anchos 375/768/1024/1366 no revisados por el ejecutor (sin navegador): quedan para la prueba manual del usuario.

## Decisiones a revisar (tras la revisión)
1. **Tablas casi siempre en modo tarjeta:** el umbral pedido (contenedor < 37.5rem) y la grilla de paneles
   (`minmax(22rem, 1fr)`) hacen que en 1366 (3 columnas de ~22–24rem) las dos tablas se vean como tarjetas, no
   como tabla. Funciona, pero ocupa más alto. Si al probar se prefiere tabla en laptop, bajar el umbral a ~22rem
   (3–4 columnas cortas caben) o hacer que estos dos paneles ocupen 2 columnas.
2. **Orden de `byProfessional` en el frontend:** si se prefiere que lo garantice el backend, añadir
   `ORDER BY COUNT(...) DESC` a su consulta (cambio de backend, no bloqueante).
3. **Etiqueta encima de la barra en todos los anchos** (supuesto del ejecutor): en 1366 no va en paralelo
   etiqueta | barra | cifra. Es más simple y legible; cambiarlo solo si al probar se ve desaprovechado.
