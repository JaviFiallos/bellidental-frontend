# 017c — Auditoría: filtros con el selector de período y el estilo estándar

## Objetivo
En `/direccion/auditoria` los filtros se ven planos porque `audit-filters` usa las clases `.form-input` y
`.form-select`, que **no existen** (la clase global es `.input`). Se estandarizan:
- Fechas con `bd-stats-period-bar` (Día · Semana · Mes · Rango + ◀ fecha ▶ «Hoy»), el mismo de estadísticas.
- Tipo de registro y usuario como selects `.input` con `bd-field`, en una barra como `.my-encounters__toolbar`.
Sin backend; mismo `GET /audit?from&to&entity&userId&patientId&page&size`.

## Archivos a tocar
```
src/app/features/management/
  domain/stats-period.ts                         (modif.) parseStatsPeriod con defaultKind opcional
  components/audit-filters/audit-filters.component.ts  (modif.) sin fechas; .input + bd-field; estilo de barra
  pages/audit-log/audit-log.page.ts              (modif.) período desde la URL como clinic-stats + bd-stats-period-bar
  pages/audit-log/audit-log.page.spec.ts         (modif.) solo si algo deja de cuadrar (ver Tests)
```

## Criterios de aceptación
1. `parseStatsPeriod(kind, date, from, to, today, defaultKind: CalendarPeriodKind = 'mes')`: el parámetro nuevo
   es opcional y decide el período por defecto (y el de valores inválidos). Estadísticas no cambia.
2. `AuditLogPage`:
   - `period` = `parseStatsPeriod(periodo, fecha, desde, hasta, hoy, 'semana')` con `toSignal(queryParamMap)`,
     igual que `ClinicStatsPage` (por defecto la **semana actual**; antes eran los últimos 7 días). Si la URL trae
     `?paciente=` y no trae período (enlace desde la ficha), el defecto es `'mes'`.
   - `onKindChange`, `onShift`, `onToday`, `onRangeApply` copian la lógica de `ClinicStatsPage`, pero con
     `queryParamsHandling: 'merge'` y `pagina: 0` para no perder `tipo`, `usuario` ni `paciente`.
   - El `effect` de carga usa `period().from` y `period().to`. Se borran `defaultFrom`, `defaultTo`, `from`, `to`.
   - Plantilla: `bd-page-header` → `bd-stats-period-bar [period]="period()"` → `bd-audit-filters` → resultado.
3. `bd-audit-filters`:
   - Quita `from`/`to` (inputs, salidas y `AuditFiltersValues`; queda `{ entity, userId }`).
   - Selects con `class="input"` dentro de `bd-field` («Tipo de registro», «Usuario»); se borran
     `.audit-filters__input`, `.audit-filters__select` y `.audit-filters__label` propias.
   - Barra sin caja propia: `display: flex; flex-direction: column; gap: var(--space-sm)` y en `bp-up(md)` fila con
     `flex-wrap: wrap; align-items: flex-end`; cada select `min-width: 14rem` en `md+`, 100 % en `xs`. Mismo mixin
     `bp-up` de `_breakpoints.scss` (no `@media (min-width: 640px)` sueltos).
   - El chip «Paciente: … ✕» se queda; su botón ✕ pasa a un área táctil de 44 × 44 px (el ícono sigue pequeño).
   - Se corrige `--slate-700` (no existe en §2.3) por `--slate-600`.
4. El rango > 92 días lo sigue rechazando el backend con su `message` (ya probado); el selector de rango valida lo
   suyo (`validateStatsRange`) igual que en estadísticas.

## Responsive
375, 768, 1024, 1366. En 375: período arriba, selects apilados a todo el ancho, chip debajo. En 1024+: período en
una fila y los dos selects en la siguiente, alineados a la izquierda.

## Tests requeridos
Sin casos nuevos. Los dos casos de `audit-log.page.spec.ts` deben seguir pasando: verifican que existan `from` y `to`
y el 400 visible. Si alguno fijaba la fecha por defecto de 7 días, se ajusta a la semana actual.

## Prueba manual
1. Abrir Auditoría → «Semana» elegida, la semana actual; ◀ ▶ cambian la semana y la lista.
2. Mes y Rango (2 fechas + Aplicar) → la lista se recarga; elegir «Tipo» y «Usuario» y luego cambiar el período →
   los filtros se conservan.
3. Desde la ficha del paciente → «Historial de cambios» completo (`?paciente=`) → el chip sigue y ✕ lo quita.
4. Comparar visualmente con Estadísticas y Mis atenciones: mismos controles y alturas.

## Resultado
- **Archivos modificados:**
  - `src/app/features/management/domain/stats-period.ts`: `parseStatsPeriod` acepta `defaultKind: CalendarPeriodKind = 'mes'` opcional para definir el período base.
  - `src/app/features/management/components/audit-filters/audit-filters.component.ts`: se eliminaron inputs/outputs de fechas (`from`/`to`), se usan `bd-field` y `class="input"` para los selects de tipo y usuario, barra flexible alineada con `bp-up(md)` y `min-width: 14rem`, y botón ✕ del chip con área táctil de 44 × 44 px.
  - `src/app/features/management/pages/audit-log/audit-log.page.ts`: lectura reactiva del período desde la URL vía `toSignal` (defecto `'semana'`, o `'mes'` si viene `?paciente=`), integración de `bd-stats-period-bar`, navegación con `queryParamsHandling: 'merge'` y reseteo a `pagina: 0`.
- **Resultado del build:** OK (`npx ng build` finalizó exitosamente).
- **Totales de pruebas:**
  - `npx ng test --watch=false --include=src/app/features/management/pages/audit-log/audit-log.page.spec.ts`:
```
 Test Files  1 passed (1)
      Tests  2 passed (2)
```
  - `npx ng test --watch=false --include='src/app/features/management/**/*.spec.ts'`:
```
 Test Files  4 passed (4)
      Tests  11 passed (11)
```
- **Anchos revisados:** 375, 768, 1024, 1366 px. En 375 px el selector de período y los selects se apilan a 100% de ancho sin desbordes; en 1024+ px los selects se disponen en fila con `min-width: 14rem` alineados al inicio.
- **Prueba manual:** Iniciar sesión como director (`director@bellidental.local` / `Cambiar.2026!`) y abrir `/direccion/auditoria` o acceder al historial completo desde la ficha del paciente.
- **Problemas encontrados y supuestos:** Ninguno. Se mantuvo la validación de rango y el soporte de error 400.

## Revisión
Estado: APROBADO

- Cumple: `parseStatsPeriod` con `defaultKind = 'mes'` (estadísticas sin cambio); período de la URL con defecto
  semana (mes con `?paciente=` sin `periodo`); navegación con `merge` + `pagina: 0`; sin `defaultFrom/defaultTo/
  from/to`; `audit-filters` sin fechas, `.input` + `bd-field`, `bp-up(md)`, ✕ de 44 px, sin `--slate-700`.
  Spec sin cambios y sin `skip`.
- Correcciones menores de Claude (solo tokens existentes):
  1. Chip: `var(--radius-full, 9999px)` (no existe) → `var(--radius-lg)`; márgenes negativos del ✕ en `rem`.
  2. Página: `max-width: var(--container-max, 1200px)` (no existe) → mismo contenedor que `clinic-stats`
     (`min-width: 0`, padding `--space-md` / `--space-lg` en `md+`).
- Totales tras corregir: management `Test Files 4 passed (4)` · `Tests 11 passed (11)`; `npx ng build` OK.
