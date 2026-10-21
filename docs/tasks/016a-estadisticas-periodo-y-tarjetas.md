# 016a — Estadísticas del director: ruta, período, API y tarjetas

> Plan §5.16 (P16, parte 1). Backend 020 (`81ee53d`). Requiere la 019 (período día/semana/mes y `bd-date-nav`
> con `label`/`unit`). Perfil: DIRECTOR. La 016b agrega los gráficos y tablas.

## Objetivo
Reemplazar la página provisional de `/direccion/estadisticas` por la pantalla real, con selector de período y
**6 tarjetas** de cifras clave. El director la abre también desde el móvil (375 px).

### Contrato (backend 020)
- **`GET /api/v1/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`** (`hasRole('ADMIN')`) →
  `ApiResponse<DashboardSummary>`. Fechas **de la clínica** (America/Guayaquil), **inclusivas**, sin hora. Las dos o
  ninguna (sin ellas: mes actual hasta hoy). Una sola → 400; `from > to` → 400 "La fecha inicial no puede ser
  posterior a la final"; más de **366 días** → 400 "El rango no puede superar 366 días". **El frontend envía siempre
  las dos.**
- Respuesta de ejemplo (todas las claves de los mapas vienen siempre, aunque valgan 0; montos con 2 decimales):
  ```json
  { "success": true, "message": "OK", "data": {
      "from": "2026-10-01", "to": "2026-10-31",
      "patients": { "totalActive": 312, "newInRange": 14 },
      "appointments": { "total": 86,
        "byStatus": { "PENDING": 20, "CONFIRMED": 9, "ATTENDED": 48, "CANCELLED": 4, "NO_SHOW": 3, "RESCHEDULED": 2 },
        "noShowRate": 5.9, "completedEncounters": 47 },
      "billing": { "collected": 845.50,
        "byMethod": { "EFECTIVO": 610.00, "TRANSFERENCIA": 180.50, "TARJETA": 55.00 },
        "outstandingBalance": 420.00 },
      "topTreatments": [ { "code": "PRO", "name": "Profilaxis", "quantity": 21, "amount": 525.00 } ],
      "byProfessional": [
        { "professionalId": "55555555-5555-5555-5555-555555555555", "name": "Director Médico", "encounters": 20, "revenue": 600.00 },
        { "professionalId": "66666666-6666-6666-6666-666666666666", "name": "Odontóloga Principal", "encounters": 27, "revenue": 710.00 } ],
      "byChannel": [ { "source": "RECEPTION", "appointments": 51 }, { "source": "PROFESSIONAL", "appointments": 3 },
                     { "source": "BOT", "appointments": 22 }, { "source": "WALK_IN", "appointments": 10 } ] } }
  ```
  Significado: `appointments.*` cuenta citas por `startAt` en el rango (todas, también futuras); `noShowRate` = %
  de "No asistió" sobre las citas **pasadas** no canceladas ni reprogramadas (0–100, 1 decimal);
  `completedEncounters` = atenciones completadas (por fecha de cierre); `billing.collected` = pagos no anulados del
  rango; `outstandingBalance` = saldo por cobrar de **todos** los pacientes, **histórico** (no depende del rango);
  `patients.totalActive` = activos en total (no depende del rango).

### Comportamiento
1. **Ruta:** en `app.routes.ts`, `direccion/estadisticas` (ya con `profileGuard('DIRECTOR')`) pasa de
   `ComingSoonPage` a `loadComponent` de `ClinicStatsPage`; quitar su `data`.
2. **Período en la URL** (F-20): `?periodo=dia|semana|mes|rango&fecha=YYYY-MM-DD&desde=YYYY-MM-DD&hasta=YYYY-MM-DD`.
   Por defecto **mes** actual (`ClinicClock.todayDateString()`).
   - `bd-segmented` "Período": **Día · Semana · Mes · Rango**.
   - Día/Semana/Mes: igual que "Mis atenciones" (019): `bd-date-nav` con `[date]`, `[label]`, `[unit]`, `[isToday]`,
     ‹ › y "Hoy"; semana = lunes a domingo; mes completo (del 1 al último día, aunque sean días futuros).
   - **Rango:** dos `<input type="date" class="input">` "Desde" y "Hasta" (con `bd-field`) + botón "Aplicar"
     (`btn btn-primary`). Al elegir "Rango" en el selector se navega con `desde`/`hasta` = el período que se estaba
     viendo (el formulario queda precargado). Validación en el cliente antes de navegar (mensaje en línea, sin
     petición): falta una fecha → "Elige las dos fechas."; desde > hasta → "La fecha inicial no puede ser posterior a
     la final."; más de 366 días (inclusivos) → "El rango no puede superar 366 días.". Etiqueta del rango
     "1 ene – 10 oct 2026".
   - URL inválida (fechas mal formadas o rango inválido) → cae en el mes actual.
3. **Carga** (`ClinicStatsStore`, provisto por la página): cada cambio de período pide
   `GET /api/v1/dashboard/summary` con `params: { from, to }` (strings `YYYY-MM-DD`, sin hora) y descarta la
   respuesta anterior (`switchMap`). Carga → `bd-skeleton` en las tarjetas; error → `bd-alert` con el `message`
   (403 → "No tienes permiso para esta acción.", 0 → "No se pudo conectar con el servidor.") y "Reintentar".
4. **Encabezado:** `bd-page-header` título "Estadísticas", subtítulo = etiqueta del período ("octubre 2026").
5. **Tarjetas** (componente `stats-kpis`, presentacional), en este orden, cada una con título, cifra grande y una
   línea secundaria:
   | Título | Cifra | Línea secundaria |
   |---|---|---|
   | Atenciones completadas | `appointments.completedEncounters` | "en el período" |
   | Citas | `appointments.total` | "{byStatus.ATTENDED} atendidas" |
   | Inasistencia | `noShowRate` como "5,9 %" | "{byStatus.NO_SHOW} no asistieron" |
   | Pacientes nuevos | `patients.newInRange` | "{totalActive} activos en total" |
   | Cobrado | `billing.collected` con `money` | "pagos no anulados del período" |
   | Saldo por cobrar | `billing.outstandingBalance` con `money` | "total histórico de la clínica" |
   Cifras con `font-variant-numeric: tabular-nums`. Sin colores de estado en las tarjetas (no hay umbrales).
6. **Feature `management`** (nuevo, previsto en `architecture/SKILL.md`): en esta tarea **no** tiene `index.ts`
   (nadie lo importa todavía; lo crea la 017). Solo lo carga la ruta.
7. **Utilidad compartida (F-20):** `src/app/features/clinical/domain/encounter-period.ts` se **mueve** con `git mv` a
   `src/app/shared/utils/calendar-period.ts` y se renombra lo exportado:
   `EncounterPeriodKind` → `CalendarPeriodKind`, `EncounterPeriod` → `CalendarPeriod`, `buildEncounterPeriod` →
   `buildCalendarPeriod`, `parseEncounterPeriod` → `parseCalendarPeriod`, `shiftEncounterAnchor` →
   `shiftCalendarAnchor` (`addCalendarDays` e `isValidDateString` no cambian). La función privada `weekLabel(from, to)`
   pasa a exportarse como `rangeLabel(from, to)` (ya sirve para cualquier rango) y `weekLabel` deja de existir
   (`buildCalendarPeriod` usa `rangeLabel`). Actualizar los dos únicos importadores (verificado):
   `features/clinical/pages/my-encounters/my-encounters.page.ts` y `features/clinical/services/my-encounters.store.ts`.
   "Mis atenciones" debe seguir igual (su spec en verde).

### Estructura
```
features/management/
  models/dashboard.models.ts       DashboardSummary y subtipos (nombres de campo del backend)
  services/dashboard.api.ts        summary(from, to) — usa ApiClient (core/api/api-client)
  services/clinic-stats.store.ts   @Injectable() sin providedIn; signals summary, loading, error; load(), retry()
  domain/stats-period.ts           StatsPeriod (día/semana/mes vía calendar-period + rango), parseStatsPeriod,
                                   validateStatsRange, formatPercent ("5,9 %", Intl es-EC 1 decimal)
  components/stats-period-bar/     segmented + date-nav o formulario de rango (dumb)
  components/stats-kpis/           6 tarjetas (dumb)
  pages/clinic-stats/              página (lee la URL, orquesta)
```
Depende de `core/` (`ApiClient`, `ApiError`, `ClinicClock`), `shared/utils/calendar-period.ts` y `shared/components`
(`page-header`, `segmented`, `date-nav`, `field`, `alert`, `skeleton`) y `shared/pipes/money.pipe`. No importa de
otros features.

## Decisiones a revisar
1. **"Día" en vez de "Hoy"** en el selector: con ‹ › se puede ver cualquier día, y "Hoy" ya es un botón de
   `bd-date-nav`. Por defecto se abre el **mes** actual (lo mismo que el backend sin fechas).
2. **Mes completo** (1–31) aunque haya días futuros: así el rango no cambia cada día; las citas futuras ya agendadas
   cuentan en "Citas" (el backend las cuenta por `startAt`). La inasistencia solo usa citas pasadas.
3. **Se mueve `encounter-period.ts` a `shared/utils`** en lugar de copiarlo o importarlo de `clinical` (regla "lo
   que usan dos features va a shared"). Riesgo: toca "Mis atenciones"; su spec lo protege.
4. **"Saldo por cobrar" no depende del período** (así lo calcula el backend); el texto lo aclara para no confundir.
5. **Sin `index.ts` en `management`** hasta que otro feature lo necesite (017).
6. **Lo que el plan viejo (F-9) pedía y el backend no da:** atenciones por día (serie), top 5 diagnósticos CIE-10 y
   barras por profesional con su `colorTag`. No se piden ni se simulan.

## Archivos a tocar
```
src/app/
├── app.routes.ts                                            (direccion/estadisticas → ClinicStatsPage)
├── shared/utils/calendar-period.ts                          (movido desde clinical/domain/encounter-period.ts,
│                                                              exportaciones renombradas + rangeLabel)
├── features/clinical/
│   ├── pages/my-encounters/my-encounters.page.ts            (imports y nombres nuevos)
│   └── services/my-encounters.store.ts                      (imports y nombres nuevos)
└── features/management/                                     (nuevo)
    ├── models/dashboard.models.ts
    ├── services/dashboard.api.ts
    ├── services/clinic-stats.store.ts
    ├── domain/stats-period.ts
    ├── components/stats-period-bar/stats-period-bar.component.ts
    ├── components/stats-kpis/stats-kpis.component.ts
    └── pages/clinic-stats/
        ├── clinic-stats.page.ts
        └── clinic-stats.page.spec.ts
```
- `dashboard.models.ts`:
  ```ts
  export interface PatientStats { totalActive: number; newInRange: number; }
  export interface AppointmentStats { total: number; byStatus: Record<string, number>; noShowRate: number;
    completedEncounters: number; }
  export interface BillingStats { collected: number; byMethod: Record<string, number>; outstandingBalance: number; }
  export interface TopTreatment { code: string; name: string; quantity: number; amount: number; }
  export interface ProfessionalStats { professionalId: string; name: string; encounters: number; revenue: number; }
  export interface ChannelStat { source: string; appointments: number; }
  export interface DashboardSummary { from: string; to: string; patients: PatientStats;
    appointments: AppointmentStats; billing: BillingStats; topTreatments: TopTreatment[];
    byProfessional: ProfessionalStats[]; byChannel: ChannelStat[]; }
  ```
  (`byStatus`/`byMethod` como `Record<string, number>`; las claves conocidas se tipan en la 016b.)
- `DashboardApi.summary(from, to)` → `api.get<DashboardSummary>('/api/v1/dashboard/summary', { params: { from, to } })`.
- Página: mismo esqueleto que `MyEncountersPage` (`toSignal(route.queryParamMap…)`, `effect` + `untracked` para
  llamar a `store.load(period)`, `router.navigate([], { relativeTo, queryParams })`).

## Criterios de aceptación
- [ ] `/direccion/estadisticas` (director) abre la pantalla real; otros perfiles siguen redirigidos a su inicio.
- [ ] Por defecto pide `GET /api/v1/dashboard/summary?from=<día 1 del mes>&to=<último día>` y muestra las 6 tarjetas.
- [ ] Día/Semana/Mes y ‹ › cambian la URL y el rango pedido; "Atrás" conserva el período.
- [ ] Rango válido → una petición con esas fechas; rango inválido → mensaje en línea y ninguna petición.
- [ ] Carga, error con "Reintentar" y cifras en 0 se ven bien (nada de "NaN" ni vacíos).
- [ ] "Mis atenciones" funciona igual tras mover `calendar-period.ts`; no queda ningún import a
      `clinical/domain/encounter-period`.
- [ ] Solo tokens, sin `any`, OnPush, plantillas < ~150 líneas; `management` no importa de otros features.
- [ ] `npx ng build` y `npx ng test --watch=false` en verde.

## Responsive
Revisar en **375, 768, 1024 y 1366** (375 es real: el director la mira en el teléfono).
- Tarjetas: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr))` → 2 columnas en 375, 3 en
  768–1024, 6 en 1366 si caben. Cifra `--fs-lg` (o `--fs-xl` en `≥ md`).
- Barra de período: `bd-segmented` y `bd-date-nav` (o el formulario de rango) apilados en `< md`, en una fila en
  `≥ md`. Inputs y botones ≥ 44 px. Sin scroll horizontal.

## Tests requeridos
`features/management/pages/clinic-stats/clinic-stats.page.spec.ts` (**2 casos**). `RouterTestingHarness` con la
ruta `direccion/estadisticas` → `ClinicStatsPage`; reloj fijo `vi.setSystemTime(new Date('2026-10-10T12:00:00-05:00'))`
(sábado); sesión de director (`roles: ['ADMIN','ODONTOLOGO']`, `professionalId: '55555555-5555-5555-5555-555555555555'`);
respuesta = el JSON del contrato. Para la URL con query usar
`httpMock.expectOne((req) => req.url === '/api/v1/dashboard/summary')` y verificar `req.params.get('from')`/`('to')`.
1. `'abrir Estadísticas → pide el mes actual y muestra las cifras; Semana → pide lunes a domingo'`: params
   `from=2026-10-01`, `to=2026-10-31` → se ven "47", "5,9 %", "$ 845,50" y "$ 420,00" → clic "Semana" →
   nueva petición con `from=2026-10-05`, `to=2026-10-11` → responder → sigue visible "Estadísticas".
2. `'error del backend → mensaje y Reintentar → vuelve a pedir y muestra las cifras'`: responder 500
   `{ success: false, message: 'Error interno del servidor. Contacte al administrador.', data: null }` → se ve el
   mensaje → clic "Reintentar" → otra petición con las mismas fechas → responder OK → se ve "47".

Durante el desarrollo:
`npx ng test --watch=false --include='src/app/features/{management,clinical}/**/*.spec.ts'`.

## Prueba manual
1. Director → "Estadísticas" → mes actual con las 6 tarjetas; comparar "Cobrado" con los abonos del mes.
2. Día / Semana / Mes y ‹ ›; "Hoy" vuelve; "Atrás" del navegador conserva el período.
3. Rango 1 ene – hoy → cifras; rango de 2 años → mensaje sin petición; desde > hasta → mensaje.
4. Odontólogo y secretaria: la URL los manda a su inicio.
5. "Mis atenciones" sigue funcionando (semana, mes, ‹ ›).
6. Anchos 375, 768, 1024 y 1366.

## Resultado
(lo llena el ejecutor)

## Revisión
