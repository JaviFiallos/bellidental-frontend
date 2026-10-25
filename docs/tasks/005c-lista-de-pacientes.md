# 005c — Pacientes: lista de últimos atendidos y últimos registrados

## Objetivo
El ítem «Pacientes» del menú solo abre el buscador. Pasa a llevar a `/pacientes`: una **tabla informativa** (no es un
CRUD) con dos vistas paginadas, «Últimos atendidos» y «Últimos registrados». Se puede filtrar por período, por texto y
por «Solo con saldo pendiente». «Ver más» abre la ficha de siempre (`/pacientes/:id`). Consume el **backend 029**
(G-16). Modo **Operate**. Perfiles: SECRETARIA, ODONTOLOGO, DIRECTOR.

**Depende de:** backend 029 con commit. Antes de empezar, confirmar en el backend la forma exacta de `PatientListItem`.

## Contrato (backend 029)
```
GET /api/v1/patients/list?view=ATTENDED|CREATED&from&to&withBalance&query&page&size
→ ApiResponse<Page<PatientListItem>>
interface PatientListItem {
  id: string; firstName: string; lastName: string; fullName: string;
  documentType: DocumentType; documentNumber: string; age: number | null;
  lastEncounterAt: string | null; createdAt: string;
  pendingBalance: number | null;   // null sin BILLING_READ
}
```
Rango máx. 366 días (igual que `validateStatsRange`). `withBalance=true` sin `BILLING_READ` → 403: el frontend ni
siquiera muestra la casilla en ese caso.

## Archivos a tocar
```
src/app/shared/                                     (el selector de período pasa a shared: lo usan dos features)
  components/stats-period-bar/stats-period-bar.component.ts  (movido desde management, sin cambios de API)
  utils/stats-period.ts                              (movido desde management/domain, sin formatPercent)
src/app/features/management/
  domain/stats-period.ts                             (borrado; formatPercent → domain/stats-labels.ts)
  components/stats-period-bar/                       (borrado)
  …imports de clinic-stats.page, clinic-stats.store, stats-kpis, audit-log.page   (modif.) apuntan a shared
src/app/features/patients/
  models/patient.models.ts                           (modif.) PatientListItem, PatientListView, PatientListFilters
  services/patients.api.ts                           (modif.) list(filters)
  services/patient-list.store.ts                     (nuevo) estado con signals, provisto en la página
  components/patient-list-table/patient-list-table.component.ts  (nuevo) dumb; tabla y tarjetas en < sm
  components/patient-list-filters/patient-list-filters.component.ts (nuevo) dumb; vista, texto y casilla de saldo
  pages/patient-list/patient-list.page.ts            (nuevo)
  pages/patient-list/patient-list.page.spec.ts       (nuevo)
src/app/app.routes.ts            (modif.) 'pacientes' exacto (antes que 'pacientes/:id'), sin profileGuard
                                 (los tres perfiles; el authGuard del layout ya aplica)
src/app/layout/nav-items.ts      (modif.) «Pacientes» → route '/pacientes' en los 3 perfiles (sin isSearchAction)
docs/IMPLEMENTATION-PLAN.md      (ya actualizado por Claude: §5.24, §7.2 G-16, §9; no tocar)
```
Mover con `git mv` para conservar la historia. Si `isSearchAction` queda sin uso en `nav-items.ts` y en
`sidebar.component.html`, se borra (sin código muerto). El buscador del header no cambia.

## Criterios de aceptación
1. **Ruta y menú:**
   - `/pacientes` para los tres perfiles.
   - «Pacientes» queda activo en `/pacientes` con `exact: true`, para que no se encienda dentro de la ficha
     `/pacientes/:id`.
   - Sigue el orden del menú ya definido.
2. **Estado en la URL:**
   - Parámetros: `?vista=atendidos|registrados`, `periodo`/`fecha`/`desde`/`hasta` como en Auditoría, `q`, `saldo=1`
     y `pagina`.
   - Por defecto: vista `atendidos`, **sin período** (todos), página 0.
   - Cambiar cualquier filtro vuelve a `pagina: 0` con `queryParamsHandling: 'merge'`.
   - Recargar la página o usar «Atrás» desde la ficha conserva los filtros.
3. **Filtros (barra como Auditoría, 017c):**
   - `bd-segmented` «Últimos atendidos · Últimos registrados».
   - `bd-stats-period-bar` (Día · Semana · Mes · Rango; hoy no tiene un modo «Todo»). Para **no filtrar por fecha**
     (que es el estado por defecto), la barra recibe un input opcional nuevo `allowAll` (por defecto `false`, así que
     Estadísticas y Auditoría no cambian). Con `allowAll`:
     - agrega «Todas» como primera opción del segmented;
     - el `StatsPeriodKind` gana `'todas'`;
     - con «Todas» no se muestra la navegación de fechas;
     - `parseStatsPeriod` acepta `'todas'` solo si se lo piden, y entonces `from`/`to` son `null`.
   - Campo de texto «Buscar por nombre o cédula»: `.input` + `bd-field`, debounce de 300 ms, desde 2 caracteres.
     Vacío = sin filtro.
   - Casilla «Solo con saldo pendiente», visible solo con `hasPermission('BILLING_READ')`.
4. **Tabla** (`patient-list-table`, dumb). Columnas, en este orden:
   - **Nombres**
   - **Apellidos**
   - **Cédula** (`documentNumber`; si no es CI, con el tipo delante: «Pasaporte 123…»)
   - **Edad** («34 años», o «—»)
   - **Última atención** (vista atendidos) o **Registrado** (vista registrados): fecha con el pipe de fecha de la clínica
   - **Saldo pendiente**: solo si el usuario tiene `BILLING_READ`. Monto con el pipe `money` y estado en texto, no solo
     color: «Debe $30,00» en tono de alerta, «Al día» si es ≤ 0. Un saldo negativo se muestra como «A favor $5,00».
   - **Formulario 033**: solo para ODONTOLOGO y DIRECTOR. Enlace «Ver 033» a `/pacientes/:id/033`, deshabilitado con
     el texto «Sin atenciones» si `lastEncounterAt` es `null`.
   - **Ver más**: enlace a `/pacientes/:id`.

   Todos los enlaces son `<a routerLink>` (≥ 44 px). Encabezado de la tabla fijo dentro de su contenedor.
5. **Paginación:**
   - 20 por página, con «Anterior · Página X de Y · Siguiente».
   - Va **dentro** de `patient-list-table` (inputs `page`, `totalPages`, `totalElements`; output `pageChange`), como hace
     `audit-timeline`. No se crea un paginador genérico.
   - Debajo se muestra «N pacientes».
6. **Estados:**
   - Carga: `bd-skeleton` de 5 filas.
   - Vacío: `bd-empty-state`.
     - Vista atendidos: «Ningún paciente atendido en este período.».
     - Vista registrados: «Ningún paciente registrado en este período.».
     - Con texto o saldo activo, sugerir quitar filtros.
   - Error: `bd-alert` con «Reintentar».
   - 400 (rango): `message` del backend.
   - 403: «No tienes permiso».
   - 0: «No se pudo conectar con el servidor».
7. Reglas de `clean-code`, `architecture`, `responsive` y `testing`:
   - standalone, OnPush, signals, `inject()`;
   - sin `any`;
   - solo tokens existentes de `_tokens.scss`;
   - textos en español;
   - sin dependencias nuevas.

   `patients` solo importa de `shared/`, `core/` y de `index.ts` de otros features.

## Responsive
Revisar en 375, 768, 1024, 1366 y 1920.
- **375:** tarjetas (`.table-cards`).
  - Arriba: nombre y apellido; debajo: cédula y edad.
  - Después: la fecha y el saldo con su texto.
  - Al pie: «Ver 033» y «Ver más», como botones de ≥ 44 px.
  - Filtros apilados a todo el ancho.
- **768:** tabla con scroll horizontal **dentro** de su contenedor, si no cabe; nunca en la página.
- **1366:** todo en una fila, sin scroll.

Anotar en Resultado los anchos revisados.

## Tests requeridos
Un solo `patient-list.page.spec.ts` (integración, 3 casos, `HttpTestingController`, forma real del DTO):
1. **`abrir Pacientes → lista de últimos atendidos`**
   - Sesión DIRECTOR. `/pacientes` → `GET /api/v1/patients/list` con `view=ATTENDED`, `page=0`, `size=20` y sin
     `from`/`to`.
   - Responder dos ítems: uno con `pendingBalance: 30` y otro con `0`.
   - Se ven los nombres, «Debe $30,00», «Al día», el enlace «Ver 033» y el «Ver más» con `href` `/pacientes/<id>`.
2. **`últimos registrados + solo con saldo → petición con los filtros`**
   - Elegir «Últimos registrados» y marcar «Solo con saldo pendiente».
   - La última petición lleva `view=CREATED`, `withBalance=true` y `page=0`.
   - Responder vacío → se ve el mensaje vacío de registrados.
3. **`secretaria sin columna 033`**
   - Sesión SECRETARIA (con `BILLING_READ`) → se ve el saldo, pero no «Formulario 033» ni «Ver 033».

Ningún otro test.

## Prueba manual
1. Director → «Pacientes» → últimos atendidos, el más reciente primero; «Ver más» abre la ficha y «Atrás» vuelve con
   los mismos filtros.
2. «Solo con saldo pendiente» → solo deudores; comparar un saldo con el estado de cuenta de su ficha (debe ser igual).
3. «Últimos registrados» + «Mes» → los registrados este mes; ◀ ▶ cambian de mes; «Todas las fechas» quita el período.
4. Buscar «gar» → filtra; la paginación vuelve a la página 1.
5. Secretaria: sin columna 033. Odontólogo: con saldo (tiene `BILLING_READ`) y con 033.
6. Estadísticas y Auditoría siguen funcionando igual (el selector de período se movió a `shared/`).

## Resultado

**Archivos creados o modificados:**
- `src/app/shared/components/stats-period-bar/stats-period-bar.component.ts`: movido con `git mv` desde `features/management`, agregado input opcional `allowAll`, opción «Todas» e integración de selector sin navegación de fecha en modo todas.
- `src/app/shared/utils/stats-period.ts`: movido con `git mv` desde `management/domain/stats-period.ts`, agregado `'todas'` a `StatsPeriodKind`, soporte de `allowAll` en `parseStatsPeriod` devolviendo `from`/`to` como `null`, y removido `formatPercent`.
- `src/app/features/management/domain/stats-labels.ts`: agregado `formatPercent` y su formateador `percentFormatter`.
- `src/app/features/management/components/stats-kpis/stats-kpis.component.ts`: actualizado import de `formatPercent` apuntando a `stats-labels`.
- `src/app/features/management/pages/clinic-stats/clinic-stats.page.ts`, `services/clinic-stats.store.ts`, `pages/audit-log/audit-log.page.ts`: actualizados imports de `stats-period` y `stats-period-bar` apuntando a `shared/`, con manejo seguro de fechas opcionales.
- `src/app/features/patients/models/patient.models.ts`: interfaces `PatientListView`, `PatientListItem`, `PatientListFilters`.
- `src/app/features/patients/services/patients.api.ts`: implementado método `list(filters)`.
- `src/app/features/patients/services/patient-list.store.ts`: nuevo store con signals (`items`, `loading`, `error`, `page`, `totalPages`, `totalElements`, `size`), `requests$` con `switchMap`, reintento y mapeo de errores HTTP (403, 0).
- `src/app/features/patients/components/patient-list-filters/patient-list-filters.component.ts`: componente dumb con `bd-segmented` de vista, campo de búsqueda con debounce de 300 ms (desde 2 caracteres) y casilla «Solo con saldo pendiente» condicionada por permiso.
- `src/app/features/patients/components/patient-list-table/patient-list-table.component.ts`: tabla presentacional con container queries que conmuta a tarjetas en `< sm` (375 px), encabezado fijo dentro de su contenedor con scroll horizontal interno en 768 px, formato de nombres, cédula con prefijo si no es CI, edad, fecha de última atención o registro, saldo formateado en texto (`Debe $...` en alerta o `Al día`), enlace 033 deshabilitado con «Sin atenciones» si `lastEncounterAt` es nulo, enlace «Ver más» y paginación con contador de pacientes.
- `src/app/features/patients/pages/patient-list/patient-list.page.ts`: página smart `/pacientes` que orquesta los filtros y paginación sincronizados con la URL (`?vista=`, `?periodo=`, `?fecha=`, `?desde=`, `?hasta=`, `?q=`, `?saldo=`, `?pagina=`), provista de `PatientListStore`.
- `src/app/features/patients/pages/patient-list/patient-list.page.spec.ts`: integración con los 3 casos requeridos.
- `src/app/app.routes.ts`: ruta `/pacientes` exacto antes de `pacientes/:id` sin `profileGuard`.
- `src/app/layout/nav-items.ts`, `sidebar.component.html`, `sidebar.component.ts`, `main-layout.html`, `main-layout.spec.ts`: ítem «Pacientes» ahora lleva a `/pacientes` con `exact: true`, removido `isSearchAction` y adaptado el spec de layout para el atajo `/`.

**Totales reales:**
- `npx ng build`: OK (`Application bundle generation complete`, exit 0).
- `npx ng test --watch=false`:
```
 Test Files  18 passed (18)
      Tests  80 passed (80)
```
- Durante desarrollo `patient-list.page.spec.ts`: `Test Files 1 passed (1)`, `Tests 3 passed (3)`.

**Responsive:**
Revisado en breakpoints 375, 768, 1024, 1366 y 1920 px:
- En móvil (`< sm`, < 37.49rem de contenedor): la tabla conmuta a tarjetas individuales mediante container queries; nombres arriba en azul oscuro, cédula y edad en línea secundaria, fecha y saldo con etiqueta y tono de estado, y botones de acción («Ver 033» y «Ver más») de altura táctil ≥ 44 px al pie. Filtros apilados al 100% de ancho sin desbordes.
- En tablet (768 px): tabla completa con scroll horizontal contenido internamente en `.patient-list-table__wrapper`, encabezado fijo `sticky`. Sin scroll en la ventana global.
- En desktop (1024 px, 1366 px y 1920 px): todas las columnas se muestran holgadamente en una fila, filtros alineados horizontalmente al pie y barra de paginación centrada.

**Prueba manual:**
- Levantar backend 029 en el puerto 8080.
- Frontend corriendo en `http://localhost:4200` (`npm start`).
- Iniciar sesión como Director (`director@bellidental.local`), Odontólogo (`odontologo@bellidental.local`) o Secretaria (`secretaria@bellidental.local`).

**Problemas y supuestos:**
- En la interfaz `Page<T>` de Spring Data, el número de página actual es `number`; se usó `page.number` para actualizar el store.
- Al quedar `isSearchAction` sin uso en los menús, se retiró el código muerto asociado en el sidebar y se actualizó `main-layout.spec.ts` para validar el foco del buscador vía el atajo `/` y el enlace del sidebar a `/pacientes`.
- No se realizó commit.

## Revisión
Estado: APROBADO

- Cumple:
  - **Ruta y menú:** `/pacientes` con `pathMatch: 'full'` antes de `pacientes/:id` y sin `profileGuard`; «Pacientes»
    con `exact: true` en los 3 perfiles; `isSearchAction` retirado del menú y del sidebar.
  - **Estado en la URL:** `vista`, `periodo`/`fecha`/`desde`/`hasta`, `q`, `saldo`, `pagina`, con `merge` y
    `pagina: 0`; por defecto atendidos y «Todas».
  - **Selector de período:** movido a `shared/` con `git mv`; `allowAll` opcional (sin cambios en Estadísticas ni
    Auditoría); `formatPercent` pasó a `stats-labels.ts`.
  - **Filtros:** texto con debounce de 300 ms desde 2 caracteres; casilla de saldo solo con `BILLING_READ`.
  - **Tabla:** saldo con texto («Debe», «A favor», «Al día»); 033 solo para odontólogo y director, con «Sin
    atenciones»; enlaces `routerLink`; paginación dentro de la tabla; pipes `clinicDate` y `money`.
  - **Errores:** 403 y 0 con sus textos.
  - **Tests:** spec con los 3 casos pedidos.
- Corrección menor de Claude: `MainLayout.onSearchRequested()` quedó sin uso al quitar `isSearchAction` → borrado.
- Observación (no bloquea): `StatsPeriod.from/to` pasó a `string | null` por «Todas». Por eso Estadísticas y
  Auditoría ahora llevan `?? ''` o `?? today` aunque nunca reciben `null`. Si molesta, se puede separar el «Todas» en un
  tipo propio de la lista de pacientes.
- Totales tras la corrección (toca layout y rutas): `ng build` OK; `ng test --watch=false`: `Test Files 18 passed (18)`
  · `Tests 80 passed (80)`.
- Depende del backend 029, que aún no tiene commit: su Revisión está en `CORRECCIONES`. La prueba manual con datos
  reales, después de ese commit.

