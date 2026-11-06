# 029 — Dirección: botón «Exportar datos» (ZIP de CSV)

## Objetivo
RNF04: el director descarga todos los datos del sistema sin ayuda técnica. El backend (tarea 018d) expone
`GET /api/v1/admin/export` (solo ADMIN), que responde un **ZIP binario** (no `ApiResponse`), con
`Content-Disposition: attachment; filename="bellidental-export-<yyyyMMdd-HHmm>.zip"` (expuesta por CORS).
Errores: 401/403 con el JSON habitual de `ApiResponse`.

Se añade un botón en la cabecera de la pantalla **Auditoría** (`/direccion/auditoria`, ya solo para el director):
descarga el ZIP con el nombre que manda el backend. Sin pantalla ni ruta nueva.

## Archivos a tocar
```
src/app/features/management/
  services/data-export.api.ts          (nuevo) GET blob con HttpClient (observe: 'response')
  services/data-export.store.ts        (nuevo) estado exporting, descarga y toasts
  pages/audit-log/
    audit-log.page.ts                  botón en <bd-page-header>; provee DataExportStore
    audit-log.page.spec.ts             +2 casos
docs/IMPLEMENTATION-PLAN.md            §7 contrato: GET /admin/export
```
No exportar nada nuevo en `management/index.ts`. No tocar `core/` (el `ApiClient` desenvuelve `ApiResponse`
y no sirve para binarios: `DataExportApi` usa `HttpClient` directamente; el interceptor ya añade el JWT).

## Criterios de aceptación
1. `DataExportApi.download(): Observable<HttpResponse<Blob>>` →
   `http.get('/api/v1/admin/export', { responseType: 'blob', observe: 'response' })`.
2. `DataExportStore` (provisto en la página): `exporting` (signal) y `export()`:
   - Ignora el clic si ya está exportando (sin doble descarga).
   - Nombre del archivo: el `filename` de `Content-Disposition`; si falta, `bellidental-export.zip`.
   - Descarga con `URL.createObjectURL(blob)` + `<a download>` temporal; después `URL.revokeObjectURL`.
   - Éxito → toast `success` «Exportación descargada.»; error → toast `error` «No se pudo exportar los datos.»
     (con 403: «Solo el director puede exportar los datos.»). El cuerpo de error llega como `Blob`: no se intenta
     leer su JSON.
3. Botón secundario en la cabecera: icono de descarga (lucide, como el resto de la app) + «Exportar datos»;
   mientras exporta: deshabilitado, `aria-busy="true"` y texto «Exportando…». `title`/ayuda breve:
   «ZIP con un CSV por tabla (Excel, LibreOffice)».
4. El resto de la pantalla Auditoría no cambia.
5. Plan §7: fila del endpoint (`GET /api/v1/admin/export` · ADMIN · ZIP binario, nombre en `Content-Disposition`).
   §9 lo actualiza Claude al aprobar.

## Responsive
Revisar en `xs` (360 px), `md` (768 px) y `lg` (1280 px): en `xs` el botón baja bajo el título (el `page-header`
ya hace `flex-wrap`) y no desborda; texto visible en todos los anchos.

## Tests requeridos
`audit-log.page.spec.ts`, 2 casos nuevos (los existentes no se tocan salvo para proveer lo nuevo):
1. Clic en «Exportar datos» → `expectOne` `GET /api/v1/admin/export` con `responseType` `blob` → responder un
   `Blob` con cabecera `Content-Disposition: attachment; filename="bellidental-export-20261106-1015.zip"` → se ve
   el toast «Exportación descargada.» y el botón vuelve a estar habilitado. (Simular `URL.createObjectURL` /
   `revokeObjectURL` en jsdom si no existen; comprobar que el `<a>` recibió el `download` con ese nombre.)
2. Respuesta 403 → se ve «Solo el director puede exportar los datos.».

## Prueba manual
1. Backend local con la tarea 018d (`./mvnw spring-boot:run` o el compose de desarrollo) y `npm start`.
2. Entrar como `director@bellidental.local` → Dirección → Auditoría → «Exportar datos».
3. Se descarga `bellidental-export-<fecha>.zip`; abrirlo: `README.txt`, `patients.csv`, `users.csv` (columna
   `password_hash` vacía), tablas `*_aud`. Abrir un CSV en LibreOffice/Excel (UTF-8): tildes correctas.
4. En 360 px el botón se ve completo bajo el título.

## Resultado

**Archivos**
- Nuevo `src/app/features/management/services/data-export.api.ts`: `DataExportApi.download()` con `HttpClient`, `responseType: 'blob'`, `observe: 'response'`.
- Nuevo `src/app/features/management/services/data-export.store.ts`: `DataExportStore` (`exporting` signal, `export()`, descarga con `<a download>` temporal, toasts).
- Modificado `src/app/features/management/pages/audit-log/audit-log.page.ts`: botón «Exportar datos» en `<bd-page-header>` (icono lucide `Download` vía `bd-icon`), `providers: [AuditLogStore, DataExportStore]`.
- Modificado `src/app/features/management/pages/audit-log/audit-log.page.spec.ts`: +2 casos (exportación OK, 403).
- Modificado `docs/IMPLEMENTATION-PLAN.md`: fila `GET /admin/export` en §7.1.

**Build**: OK (`npx ng build` exit 0). Aviso preexistente no relacionado: `sidebar.component.scss` supera el presupuesto de 4 kB por 96 bytes.

**Tests**
- Durante el desarrollo, `npx ng test --watch=false --include='src/app/features/management/**/*.spec.ts'`:
  `Test Files  5 passed (5)` / `Tests  17 passed (17)`
- Final, `npx ng test --watch=false`:
  `Test Files  18 passed (18)` / `Tests  86 passed (86)`

**Responsive**: no se abrió navegador; revisión por código, no visual. El botón va en `.page-header__actions` (flex con `flex-wrap` en la cabecera), así que en 360 px baja bajo el título; texto e icono caben en una línea (`.btn` sin ancho fijo). Pendiente de comprobar en DevTools a 375/768/1024/1366/1920.

**Supuestos y problemas**
- El toast no se renderiza dentro de la página (lo hace el host de toasts del layout), así que el spec verifica el estado de `NotificationService.toasts()` en lugar del DOM.
- La descarga se verifica en jsdom con un listener de captura sobre `click` que lee `download` del `<a>` y cancela la navegación; `URL.createObjectURL`/`revokeObjectURL` se stubean en el caso de éxito y se restauran al final.
- El `<a>` se añade al `body` antes de hacer clic (necesario en Firefox) y se elimina después; `revokeObjectURL` se llama justo tras el clic.
- Mensaje de 403 según la tarea («Solo el director puede exportar los datos.»), no el genérico de `ApiClient`: el store no usa `ApiClient` porque el cuerpo de error es un `Blob`.
- Sin commit ni cambio de rama.

## Revisión
Estado: APROBADO
- `DataExportApi` usa `HttpClient` directo con `responseType: 'blob'` y `observe: 'response'`; nada en `core/` ni en `management/index.ts`; `DataExportStore` provisto en la página, con el mismo patrón que `AuditLogStore` (`signal`, `takeUntilDestroyed`).
- Store: ignora clics si ya exporta; `filename` de `Content-Disposition` con fallback `bellidental-export.zip`; `<a download>` temporal se añade, se pulsa y se quita, y luego `revokeObjectURL` (sin fugas); toasts con los textos exactos y el 403 aparte, sin leer el cuerpo `Blob`.
- Botón `btn-outline` (secundario estándar) con icono lucide `Download`, `disabled`, `aria-busy` y «Exportando…»; `title` según la tarea. El resto de Auditoría sin cambios.
- Spec: 2 casos con `HttpTestingController` / `expectOne` (y `verify` del `afterEach`); comprueba `responseType`, el nombre descargado, `revokeObjectURL` y el botón habilitado de nuevo. Se acepta verificar `NotificationService.toasts()` porque el toast lo pinta el layout.
- Plan §7.1 con la fila del endpoint; §9 actualizado por Claude. Pendiente la prueba manual y la revisión responsive en el navegador.

Corrección mínima del orquestador: `data-export.store.ts` revoca la URL del blob con `setTimeout` (revocar en el
mismo tick del clic puede cancelar la descarga en algunos navegadores); el spec espera un macrotask antes de
comprobar `revokeObjectURL`. Specs de management: 5 files / 17 tests passed.
