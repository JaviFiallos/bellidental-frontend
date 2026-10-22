# 024 — Catálogo de tratamientos y especialidades del director

## Objetivo
Pantalla `/direccion/catalogo` (solo perfil `DIRECTOR`) para que el director cree, edite y desactive tratamientos y
especialidades sin migraciones. Consume el backend **021** (D-27, commit `2cf12d1` de `bellidental-backend`). Feature
`management` (ya existe; esta tarea añade carpetas, no reorganiza). Modo **Operate**: escaneo rápido, pocos clics.

Reglas del negocio (backend):
- Nunca se elimina: solo **Desactivar / Activar** (nada de «Eliminar» en la UI).
- El **código** de un tratamiento se escribe al crear y **no se edita** después.
- La especialidad de un tratamiento es **opcional** («Cualquiera»): solo sirve para filtrar el catálogo.
- Cambiar el precio solo afecta a las atenciones futuras (mostrar esa nota en el formulario de edición).
- Desactivar una especialidad puede dar **409** (es la de urgencias del bot, tiene profesionales activos o citas
  futuras): se muestra el `message` del backend, sin inventar textos.

## Contrato del backend (todas las respuestas son `ApiResponse<T>`; `ApiClient` las desenvuelve)
| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /api/v1/treatments/manage` | — | `CatalogTreatment[]` (activos e inactivos, orden por código) |
| `POST /api/v1/treatments` | `{code, name, description?, basePrice, specialtyId?}` | 201 `CatalogTreatment` (409 código repetido, 400 especialidad inactiva) |
| `PUT /api/v1/treatments/{id}` | `{name, description?, basePrice, specialtyId?}` (sin `specialtyId` se quita la especialidad) | `CatalogTreatment` |
| `POST /api/v1/treatments/{id}/deactivate` · `/activate` | — | `CatalogTreatment` |
| `GET /api/v1/specialties/manage` | — | `CatalogSpecialty[]` (todas, por nombre) |
| `POST /api/v1/specialties` | `{name, defaultDurationMinutes}` | 201 `CatalogSpecialty` (409 nombre repetido, 400 duración inválida) |
| `PUT /api/v1/specialties/{id}` | `{name, defaultDurationMinutes}` | `CatalogSpecialty` |
| `POST /api/v1/specialties/{id}/deactivate` · `/activate` | — | `CatalogSpecialty` (deactivate: 409 posible) |

```ts
interface CatalogTreatment { id: number; code: string; name: string; description: string | null;
  basePrice: number; specialtyId: number | null; active: boolean }
interface CatalogSpecialty { id: number; name: string; defaultDurationMinutes: number; active: boolean }
```
`defaultDurationMinutes`: múltiplo de 15 entre 15 y 240. `basePrice` ≥ 0 con máximo 2 decimales (el backend valida).

## Archivos a tocar
```
src/app/features/management/
  models/catalog.models.ts                     CatalogTreatment, CatalogSpecialty, Create/Update requests
  services/catalog.api.ts                      un método por endpoint de la tabla (usa core/api ApiClient)
  services/catalog.store.ts                    estado con signals, se provee en la página (como UsersStore)
  domain/catalog-display.ts                    puro: nombre de especialidad por id, filtro de texto, duraciones permitidas
  components/treatment-table/                  presentacional: tabla/tarjetas de tratamientos
  components/treatment-form/                   presentacional: formulario crear/editar tratamiento
  components/specialty-table/                  presentacional
  components/specialty-form/                   presentacional
  pages/catalog/catalog.page.ts                dos pestañas (bd-segmented): «Tratamientos» y «Especialidades»
  pages/catalog/catalog.page.spec.ts           integración (ver Tests)
src/app/app.routes.ts                          ruta `direccion/catalogo`, `profileGuard('DIRECTOR')`, lazy como `direccion/usuarios`
src/app/layout/nav-items.ts                    ítem «Catálogo» (icono de lucide, p. ej. `ClipboardList`) solo en DIRECTOR, tras «Usuarios»
```
Estructura: sigue `UsersPage` + `UsersStore` + `bd-side-sheet` de la 023a/023c como patrón (un solo panel lateral con
`activePanel`: `treatment | specialty`; el formulario se recrea al cambiar de fila). `management/index.ts` no cambia.
No se importan rutas internas de otros features. Reutiliza `shared/` (page-header, side-sheet, segmented, status-badge,
confirm-dialog, alert, skeleton, field, empty-state, pipe `money`); no crees componentes genéricos nuevos.
No se toca el feature `treatments` ni la atención: allí `GET /treatments` sigue igual (ahora devuelve campos extra
`specialtyId` y `active`, que el modelo `Treatment` existente puede ignorar).

## Criterios de aceptación
1. `/direccion/catalogo` solo para `DIRECTOR` (otro perfil → su inicio, por el `profileGuard`). Aparece «Catálogo» en el
   menú del director.
2. **Pestaña Tratamientos**: tabla con código, nombre, especialidad (nombre, o «Cualquiera»), precio (pipe `money`),
   estado (`bd-status-badge`: color + texto «Activo»/«Inactivo») y acciones «Editar» y «Desactivar»/«Activar». Orden por
   código. Búsqueda por texto (código o nombre, mínimo 2 caracteres, en el cliente) y casilla «Mostrar inactivos»
   (por defecto activada: el director debe ver todo). Los inactivos se atenúan pero siguen legibles.
3. **Nuevo / Editar tratamiento** en `bd-side-sheet`: código (solo al crear, se envía en mayúsculas sin espacios
   sobrantes; deshabilitado al editar), nombre (obligatorio, máx. 150), descripción (opcional), precio (obligatorio,
   ≥ 0, 2 decimales), especialidad (`<select>` con las especialidades **activas** + «Cualquiera» = sin `specialtyId`).
   Al editar, nota: «El nuevo precio solo aplica a atenciones futuras.». Al guardar OK: el panel se cierra, la tabla se
   actualiza y un toast confirma («Tratamiento creado» / «Tratamiento actualizado»).
4. **Desactivar/Activar tratamiento**: acción directa (sin confirmación para activar; `ConfirmDialogService` para
   desactivar, con texto «Dejará de aparecer en las atenciones. El historial no cambia.»). Muestra `busy` en la fila.
5. **Pestaña Especialidades**: tabla con nombre, duración por defecto («30 min»), estado y acciones «Editar» y
   «Desactivar»/«Activar». Formulario en el mismo panel: nombre (obligatorio, máx. 100) y duración (`<select>` de 15 a
   240 en pasos de 15). Mismos toasts. Desactivar con confirmación; si el backend responde **409** se muestra su `message`
   en un toast de error y la fila no cambia.
6. Errores de la API: se muestran con el `message` del backend (409 código/nombre repetido dentro del formulario, sin
   cerrar el panel); 403 → «No tienes permiso»; 0 → «No se pudo conectar con el servidor». La carga inicial con
   error muestra `bd-alert` con «Reintentar». Estado vacío con `bd-empty-state`.
7. Al cargar la página se hacen dos GET (`/treatments/manage` y `/specialties/manage`) y se recargan solo los afectados
   tras guardar/desactivar.
8. Reglas de `clean-code`, `architecture`, `responsive` y `testing`: standalone, OnPush, `inject()`, signals,
   Reactive Forms tipados con `nonNullable`, sin `any`, estilos solo con tokens, textos en español, sin dependencias
   nuevas, URLs relativas.

## Responsive
Revisar en 375, 768, 1024, 1366 y 1920. En `< sm` las tablas pasan a lista de tarjetas (código/nombre arriba,
especialidad y precio debajo, acciones al pie, objetivos táctiles ≥ 44 px). El panel lateral es lateral en `lg+` y hoja
inferior en `< lg` (lo resuelve `bd-side-sheet`). Sin scroll horizontal de la página. Anotar en Resultado qué anchos se
revisaron.

## Tests requeridos
Un solo `catalog.page.spec.ts` (integración de página, 3 casos; `HttpTestingController` con la forma real de los DTO):
- `crear tratamiento → lo muestra en la tabla`: la página pide `GET /api/v1/treatments/manage` y
  `GET /api/v1/specialties/manage`; el usuario abre «Nuevo tratamiento», escribe código, nombre, precio y elige
  «Endodoncia»; se verifica `POST /api/v1/treatments` con body `{code, name, basePrice, specialtyId}` (código en
  mayúsculas) → responde 201 → la fila aparece con la especialidad y el precio.
- `editar precio → PUT sin código`: «Editar» → cambia el precio → `PUT /api/v1/treatments/{id}` con body
  `{name, description, basePrice, specialtyId}` **sin `code`** → la fila muestra el precio nuevo.
- `desactivar especialidad con conflicto → muestra el mensaje del backend`: pestaña Especialidades → «Desactivar» →
  confirmar → `POST /api/v1/specialties/{id}/deactivate` responde 409 con `message`
  «Hay profesionales con esta especialidad; quítasela antes.» → el mensaje es visible y la fila sigue «Activo».
Ningún otro test.

## Prueba manual
1. Entrar como director → menú «Catálogo» → ver los 12 tratamientos y las 2 especialidades.
2. Crear una especialidad nueva y un tratamiento asignado a ella; filtrar por texto.
3. Editar el precio de un tratamiento y desactivarlo: ya no aparece al registrar tratamientos en una atención.
4. Intentar desactivar «Odontología general»: debe mostrar el aviso del backend.
5. Entrar como secretaria u odontólogo: no hay menú «Catálogo» y la ruta redirige a su inicio.

## Resultado

**Archivos creados** (todos en `src/app/features/management/`):
- `models/catalog.models.ts`: `CatalogTreatment`, `CatalogSpecialty`, requests de tratamiento y especialidad, `TreatmentFormResult`.
- `domain/catalog-display.ts`: puro. Filtro de texto (desde 2 caracteres) y orden por código, nombres por id, opciones de especialidad, duraciones 15–240, `parsePrice`, `normalizeCode`, resúmenes.
- `services/catalog.api.ts`: un método por endpoint de la tabla del backend (`ApiClient`).
- `services/catalog.store.ts`: `CatalogStore` con signals, provisto en la página.
- `components/treatment-table/`, `components/treatment-form/`, `components/specialty-table/`, `components/specialty-form/`: presentacionales.
- `pages/catalog/catalog.page.ts` y `catalog.page.spec.ts` (3 casos de integración).

**Archivos modificados**: `src/app/app.routes.ts` (ruta `direccion/catalogo`, `profileGuard('DIRECTOR')`, lazy) y `src/app/layout/nav-items.ts` (ítem «Catálogo», icono `ClipboardList`, solo DIRECTOR, tras «Usuarios»). `management/index.ts` no cambió. `docs/IMPLEMENTATION-PLAN.md` no se tocó. No hubo git add/commit/push ni cambio de rama.

**Totales reales** (copiados de la consola):
- `npx ng build`: sin errores ni warnings (`Application bundle generation complete`, exit 0).
- `npx ng test --watch=false`:
  - `Test Files  14 passed (14)`
  - `Tests  65 passed (65)`
- Durante el desarrollo, `--include='src/app/features/management/**/*.spec.ts'`: `Test Files 3 passed (3)`, `Tests 9 passed (9)`.

**Responsive**: NO revisado visualmente. No levanté la app con datos ni probé en DevTools a 375, 768, 1024, 1366 ni 1920. Lo implementado sigue el patrón de `user-table` (tarjetas por container query `< 600px` del contenedor, `bd-side-sheet` en `< lg`, sin scroll horizontal de página). El usuario debe confirmarlo a mano.

**Problemas y supuestos**:
1. **Harness del spec**: `RouterTestingHarness` y un segundo `TestBed.createComponent(ToastHostComponent)` se pisan (Angular elimina las raíces de prueba anteriores), y la página desaparecía del DOM. Por eso el spec monta un host de prueba con `<bd-toast-host />` y `<router-outlet />`. No es un mock: la página y sus hijos son los reales y el toast se lee del DOM.
2. **Especialidad inactiva en edición**: el formulario de tratamiento ofrece las activas más la actual del tratamiento (marcada «(inactiva)»). Sin eso, el `PUT` sin `specialtyId` la quitaría en silencio.
3. **Cuerpos**: en el alta, `description` y `specialtyId` se omiten si están vacíos. En la edición, `description` va como `null` si queda vacía (así se borra). `code` nunca se envía en el `PUT`.
4. **Precio**: campo de texto con `inputmode="decimal"`. Acepta punto o coma, hasta 2 decimales; no hay validación de máximo.
5. **Código**: sin límite de longitud en el cliente (el backend no lo especifica). Se guarda en mayúsculas y sin espacios sobrantes.
6. **Alta de especialidad**: la tarea lista POST `/specialties` en el contrato, así que la tabla incluye «Nueva especialidad» (la prueba manual 2 la necesita). Duración por defecto del formulario: 30 min (supuesto).
7. **Recargas**: tras guardar, activar o desactivar se vuelve a pedir la lista afectada (`GET .../manage`), como pide el criterio 7. Por eso los tests también responden esas recargas.
8. **Textos propios**: el mensaje de confirmación de desactivar especialidad («…Si tiene profesionales activos o citas futuras, el sistema lo impedirá…») es redacción mía basada en las condiciones 409 de la tarea. El mensaje del 409 se muestra tal cual lo devuelve el backend.
9. **Duplicación**: el CSS de tarjetas de `treatment-table` y `specialty-table` es casi igual al de `user-table`. No lo extraje a `shared/` porque la tarea prohíbe componentes genéricos nuevos.
10. **Alcance**: no se tocó el feature `treatments` ni la atención.

## Revisión
Estado: APROBADO (Claude Opus 5.5)

- `npx ng build` exit 0 sin warnings; `npx ng test --watch=false`: 14 archivos, 65 tests, todos pasan (repetido por el revisor).
- Rutas y menú: `direccion/catalogo` con `profileGuard('DIRECTOR')` e ítem «Catálogo» solo para el director. Un método por endpoint en `CatalogApi`; sin `any`, `console` ni «Eliminar».
- Detalles aceptados: en edición el formulario conserva la especialidad actual aunque esté inactiva (evita quitarla en silencio); el `PUT` nunca lleva `code`.
- Pendiente del usuario: revisión visual en 375, 768, 1024, 1366 y 1920 (no se hizo en navegador).
