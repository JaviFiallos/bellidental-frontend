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
(lo llena el ejecutor)

## Revisión
