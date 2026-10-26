# 016d — Estadísticas: top 3 tratamientos y top 3 diagnósticos en barras

## Objetivo
En `/direccion/estadisticas` los paneles «Top 3 tratamientos» y «Top 3 diagnósticos» hoy son tablas
(`top-treatments-table`, `top-diagnoses-table`). Se cambian por **barras horizontales ordenadas** con el componente
`bd-bar-list` que ya usan «Citas por estado», «Citas por canal» y «Cobrado por método» (F-24: con 3 ítems importa el
orden y la cifra; un pastel no deja comparar porciones parecidas y no se lee a 375 px). Sin backend, sin API nueva.

## Archivos a tocar
```
src/app/features/management/
  components/bar-list/bar-list.component.ts      (modif.) BarRow.rank? y BarRow.detail? opcionales
  domain/stats-labels.ts                         (modif.) topTreatmentRows(), topDiagnosisRows()
  pages/clinic-stats/clinic-stats.page.ts        (modif.) dos bd-bar-list en lugar de las tablas
  components/top-treatments-table/               (borrar) queda sin uso
  components/top-diagnoses-table/                (borrar) queda sin uso
  pages/clinic-stats/clinic-stats.page.spec.ts   (modif.) solo si alguna aserción leía la tabla (ver Tests)
```
Sin cambios en `index.ts`.

## Criterios de aceptación
1. `BarRow` gana dos campos opcionales (los demás usos no cambian):
   - `rank?: number` → si viene, se muestra «1», «2», «3» en un círculo pequeño antes de la etiqueta
     (`aria-hidden`; el orden ya lo da la lista).
   - `detail?: string` → texto secundario en una segunda línea bajo la etiqueta, `--fs-xs`, `--color-text-muted`
     (para el código y el monto).
2. Funciones puras en `domain/stats-labels.ts` (mismo estilo que `appointmentStatusRows`):
   - `topTreatmentRows(rows: TopTreatment[], money: (n: number) => string): BarRow[]` → `label` = nombre,
     `value` = `quantity`, `valueText` = «12 veces» (1 → «1 vez»), `detail` = «D23 · $ 240,00», `rank` = posición.
   - `topDiagnosisRows(rows: TopDiagnosis[]): BarRow[]` → `label` = descripción, `value` = `occurrences`,
     `valueText` = «8 veces», `detail` = «K02.1 · 5 pacientes» (1 → «1 paciente»), `rank` = posición.
   - Mantienen el orden del backend (ya viene ordenado desc).
3. En la página: `<bd-bar-list [rows]="topTreatmentRowsView()" ariaLabel="Top 3 tratamientos"
   emptyText="Sin tratamientos en el período" />` e igual para diagnósticos con «Sin diagnósticos en el período».
   Los `computed` usan el `MoneyPipe` como ya lo hace `methodRows`. Títulos de panel sin cambios.
4. Se borran las carpetas `top-treatments-table` y `top-diagnoses-table` y sus imports (sin código muerto).
5. Colores solo de tokens: las barras de los tops usan el tono neutro (`--blue-400`) que ya tiene `bd-bar-list`.

## Responsive
375, 768, 1024, 1366. En 375 la etiqueta larga de un diagnóstico pasa a varias líneas (`overflow-wrap`), la cifra
sigue visible a la derecha y la barra ocupa todo el ancho del panel.

## Tests requeridos
Sin tests nuevos. Si el caso actual de `clinic-stats.page.spec.ts` busca una celda de tabla de los tops, se ajusta
para leer el texto visible (`K02.1` y el nombre del tratamiento siguen visibles en `detail`/`label`).

## Prueba manual
1. Mes con datos → los dos tops muestran 3 barras en orden, con «N veces», código y monto/pacientes.
2. Período sin atenciones → «Sin tratamientos en el período» y «Sin diagnósticos en el período».
3. 375 px: nada se corta ni hay scroll horizontal.

## Resultado
**Archivos tocados**
- `management/components/bar-list/bar-list.component.ts` (modif.): `BarRow` gana `rank?` y `detail?`. El ranking va en un círculo `aria-hidden` y el detalle en segunda línea (`--fs-xs`, `--color-text-muted`).
- `management/domain/stats-labels.ts` (modif.): `topTreatmentRows()` y `topDiagnosisRows()`, con helper `countWithUnit` para «1 vez / N veces» y «1 paciente / N pacientes».
- `management/pages/clinic-stats/clinic-stats.page.ts` (modif.): los dos tops usan `bd-bar-list`; se quitan los imports de las tablas.
- Borradas `management/components/top-treatments-table/` y `management/components/top-diagnoses-table/` (sin referencias restantes).
- `clinic-stats.page.spec.ts`: sin cambios (sus aserciones siguen visibles en `detail`/`label`).

**Build**: OK (`Application bundle generation complete`).

**Tests**
- `clinic-stats`: `Test Files  1 passed (1)` / `Tests  2 passed (2)`
- Suite completa: `Test Files  1 failed | 14 passed (15)` / `Tests  1 failed | 69 passed (70)`
- Fallo ajeno (no tocado): `src/app/features/clinical/pages/encounter/encounter.page.spec.ts` > «Guardar con un diagnóstico que ya no vale → mensaje visible y el ítem se conserva» (`expected null to be truthy`). Pertenece al trabajo en paralelo de clinical.

**Responsive** (sin navegador; verificación visual pendiente del usuario): en 375 la etiqueta larga de diagnóstico baja a varias líneas (`overflow-wrap: anywhere`), la cifra queda a la derecha (`nowrap`) y la barra ocupa el ancho del panel. Sin px fijos salvo el círculo de 1.5rem.

**Supuestos**: separador « · » en `detail`; `topDiagnoses` con `?? []` como antes.

## Revisión
Estado: APROBADO

- Cumple: `BarRow.rank?`/`detail?` opcionales (rango `aria-hidden`, detalle `--fs-xs` muted), `topTreatmentRows()` y
  `topDiagnosisRows()` puras con singular/plural y orden del backend, dos `bd-bar-list` con `computed` y `MoneyPipe`,
  tono neutro `--blue-400`, solo tokens existentes.
- Tablas `top-treatments-table` y `top-diagnoses-table` borradas; sin referencias en `src/`.
- Fallo de `encounter.page.spec.ts` ajeno a esta tarea (trabajo en paralelo de clinical).
- Pendiente manual del usuario: 375/768/1024/1366 (etiqueta larga en varias líneas, cifra visible).
