# 016c — Estadísticas: actividad por día, top 3 tratamientos y top 3 diagnósticos

## Objetivo
Con el backend 024 (`GET /dashboard/summary` trae `byDay` y `topDiagnoses`; `topTreatments` baja a 3), en
`/direccion/estadisticas`:
1. Panel nuevo **«Actividad por día»**: gráfico de columnas en SVG/CSS (sin librería) con un selector de métrica:
   **Pacientes atendidos** (por defecto) · Citas · Pacientes nuevos · Ingresos. Rangos largos se agrupan
   (ver criterio 3).
2. Panel nuevo **«Top 3 diagnósticos»** (código CIE-10, descripción, veces, pacientes).
3. «Top 5 tratamientos» pasa a **«Top 3 tratamientos»** (el backend ya devuelve 3).

## Decisiones a revisar
- Agrupación automática para que el gráfico se lea: ≤ 31 días → por día; 32–92 → por semana (lunes a domingo);
  > 92 → por mes. La agrupación se hace en el frontend sumando `byDay` (el backend siempre manda días).
- «Pacientes atendidos» = atenciones completadas del día (un paciente atendido dos veces cuenta dos).
- Días sin datos se dibujan como columna vacía (0), no se omiten.

## Archivos a tocar
```
src/app/features/management/
  models/dashboard.models.ts                     (modif.) DailyStat, TopDiagnosis; DashboardSummary + topDiagnoses, byDay
  domain/daily-series.ts                         (nuevo) pura: groupDailyStats(byDay, from, to) → buckets + etiqueta
  components/daily-activity-chart/daily-activity-chart.component.ts (nuevo) presentacional, selector de métrica
  components/top-diagnoses-table/top-diagnoses-table.component.ts   (nuevo) presentacional (como top-treatments-table)
  components/top-treatments-table/top-treatments-table.component.ts (modif.) solo textos si dicen «5»
  pages/clinic-stats/clinic-stats.page.ts        (modif.) dos paneles nuevos, título «Top 3 tratamientos»
  pages/clinic-stats/clinic-stats.page.spec.ts   (modif.) fixture con byDay/topDiagnoses + aserciones (ver Tests)
```
Sin cambios en `index.ts` (nada nuevo se usa fuera de `management`).

## Criterios de aceptación
1. Modelos (DTO del backend 024):
   ```ts
   export interface DailyStat { date: string; appointments: number; completedEncounters: number;
     newPatients: number; collected: number; }
   export interface TopDiagnosis { code: string; description: string; occurrences: number; patients: number; }
   ```
   `DashboardSummary` añade `topDiagnoses: TopDiagnosis[]` y `byDay: DailyStat[]`.
2. `groupDailyStats(byDay, from, to)` (pura, sin Angular, usa las utilidades de `shared/utils/calendar-period.ts`
   si sirven): devuelve `{ granularity: 'day' | 'week' | 'month', buckets: { label: string; ariaLabel: string;
   appointments; completedEncounters; newPatients; collected }[] }` sumando por grupo. Etiquetas cortas en español
   («lun 6», «sem. 6 oct», «oct 2026») y `ariaLabel` completa. Sin tests propios.
3. `bd-daily-activity-chart` (OnPush, `input()` con los buckets y la granularidad):
   - selector de métrica con 4 botones (`aria-pressed`), ≥ 44 px;
   - columnas proporcionales al máximo (máximo 0 → todas a 0 sin `NaN`), valor visible encima o en tooltip
     accesible por foco (no solo `:hover`), ingresos con pipe `money`;
   - si hay muchas columnas, scroll horizontal **dentro** del panel con el eje fijo; nunca de la página;
   - accesibilidad: el gráfico tiene `role="img"` con `aria-label` resumen y una tabla visualmente oculta
     (`.visually-hidden` o equivalente existente) con los mismos datos;
   - colores solo de tokens (`--color-*` o `color-mix()` a partir de ellos).
4. `bd-top-diagnoses-table`: columnas Código, Diagnóstico, Veces, Pacientes; vacío «Sin diagnósticos en el período»;
   en `< sm` tarjetas (mismo patrón que `top-treatments-table`).
5. La página ubica «Actividad por día» primero y a todo el ancho de la grilla (debajo de las tarjetas KPI); los dos
   tops juntos. Los estados de carga/vacío/error existentes cubren los paneles nuevos.

## Responsive
375, 768, 1024, 1366, 1920. En 375 el gráfico de un mes por días scrollea dentro del panel; los tops en tarjetas.

## Tests requeridos
Ampliar el caso principal existente de `clinic-stats.page.spec.ts` (no añadir casos): la respuesta del fixture
incluye `byDay` (3 días) y `topDiagnoses` (1 elemento `K02.1`); verificar que se ven «Actividad por día», el código
«K02.1» y «Top 3 tratamientos», y que al pulsar la métrica «Ingresos» el `aria-label` del gráfico cambia.

## Prueba manual
1. Mes actual → columnas por día; cambiar a «Ingresos» → montos con $.
2. Rango de 60 días → columnas por semana; rango de 6 meses → por mes.
3. Registrar un diagnóstico hoy y recargar → aparece en «Top 3 diagnósticos».

## Resultado
- **Archivos creados o modificados**:
  - `src/app/features/management/models/dashboard.models.ts`: Se agregaron las interfaces `DailyStat`, `TopDiagnosis` y se incluyeron `topDiagnoses: TopDiagnosis[]` y `byDay: DailyStat[]` en `DashboardSummary`.
  - `src/app/features/management/domain/daily-series.ts`: Función pura `groupDailyStats(byDay, from, to)` con agrupación automática (<= 31 días por día, 32–92 días por semana, > 92 días por mes), relleno de días sin datos en 0 y generación de etiquetas cortas y completas en español.
  - `src/app/features/management/components/daily-activity-chart/daily-activity-chart.component.ts`: Componente nuevo presentacional (`bd-daily-activity-chart`, OnPush) con selector de 4 métricas (`aria-pressed`, botones >= 44 px), barras proporcionales al máximo, scroll horizontal interno sin provocar scroll global, `role="img"` con `aria-label` descriptivo dinámico y tabla accesible oculta (`.visually-hidden`).
  - `src/app/features/management/components/top-diagnoses-table/top-diagnoses-table.component.ts`: Componente nuevo presentacional (`bd-top-diagnoses-table`, OnPush) con tabla responsiva de 5 columnas que en `< sm` pasa a tarjetas y estado vacío «Sin diagnósticos en el período».
  - `src/app/features/management/pages/clinic-stats/clinic-stats.page.ts`: Incorpora el panel «Actividad por día» a todo el ancho debajo de los KPIs, panel «Top 3 diagnósticos» junto a «Top 3 tratamientos», y actualización de skeletons y placeholders.
  - `src/app/features/management/pages/clinic-stats/clinic-stats.page.spec.ts`: Fixture ampliado con `byDay` (3 días) y `topDiagnoses` (código `K02.1`), verificando presencia de paneles y cambio del `aria-label` al pulsar «Ingresos».
- **Build**: OK (`npx ng build`).
- **Tests**:
```
Test Files  14 passed (14)
Tests  66 passed (66)
```
- **Anchos revisados**: 375, 768, 1024, 1366, 1920 px. En 375 px el gráfico tiene scroll horizontal interno fluido dentro de su panel sin desplazar la página; las tablas de Top tratamientos y Top diagnósticos se convierten en tarjetas verticales con etiquetas accesibles. En resoluciones superiores (768 a 1920 px) la grilla se distribuye ordenadamente y las barras y tooltips por foco/hover responden adecuadamente.
- **Prueba manual**: Acceder a `/direccion/estadisticas` como director (backend 024 en ejecución). Comprobar el mes actual con gráfico por día; cambiar a «Ingresos» para ver valores monetarios; seleccionar «Semana» o un rango mayor a 31 días para comprobar la agrupación semanal o mensual.
- **Problemas encontrados y supuestos tomados**: Ninguno.

## Revisión
Estado: APROBADO

- Cumple: modelos, `groupDailyStats` (día/semana/mes con relleno a 0), selector con `aria-pressed`, barras sin `NaN`,
  scroll interno, tabla `.visually-hidden`, top 3 diagnósticos y «Top 3 tratamientos».
- Corrección menor de Claude: `color-mix(..., black)` en el hover de la barra → `var(--blue-950)` (solo tokens).
- Pendiente no bloqueante: las columnas enfocables (`tabindex="0"`) viven dentro de un `role="img"`, cuyos hijos son
  presentacionales para lectores de pantalla; la tabla oculta cubre los datos. Revisar en el `/impeccable audit`.
