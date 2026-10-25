# 013d — Medicamentos y posologías: página de administración

## Objetivo
Pantalla `/consultorio/medicamentos` (perfiles `ODONTOLOGO` y `DIRECTOR`) para que el doctor **cree, edite, desactive y
active** medicamentos y sus posologías predefinidas ("plantillas") sin migraciones. Consume el backend **028**
(D-30, commit `f8cb1d8` de `bellidental-backend`) y la semilla V19 (34 medicamentos activos, 40 posologías).
Feature `prescriptions` (ya existe; esta tarea añade carpetas, no reorganiza). Modo **Operate**.

Reglas del negocio (backend):
- El catálogo es **uno solo para toda la clínica**: lo que crea un doctor lo ven todos.
- Nunca se elimina: solo **Desactivar / Activar** (nada de «Eliminar» en la UI).
- Un medicamento **ya usado en una receta no se edita** (409): la receta emitida muestra su nombre y concentración.
  Se desactiva y se crea otro. Las posologías **sí** se editan siempre (la receta guarda su propia copia).
- La posología es **texto libre** (etiqueta, dosis, frecuencia, duración, indicaciones): sin formato estructurado.
- La secretaria no ve esta página (el backend exige `RECORD_CREATE`).

## Contrato del backend (respuestas `ApiResponse<T>`; `ApiClient` las desenvuelve)
| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /api/v1/medications/manage` | — | `Medication[]` (activos e inactivos, por nombre y concentración, con **todas** sus posologías) |
| `POST /api/v1/medications` | `{name, presentation, concentration, route?}` | 201 `Medication` (409 «Ya existe ese medicamento con esa presentación y concentración.») |
| `PUT /api/v1/medications/{id}` | `{name, presentation, concentration, route?}` | `Medication` (409 repetido o «El medicamento ya se usó en recetas: desactívalo y crea uno nuevo.») |
| `POST /api/v1/medications/{id}/deactivate` · `/activate` | — | `Medication` |
| `POST /api/v1/medications/{id}/presets` | `{label, dose, frequency, duration, instructions?}` | 201 `MedicationPreset` (409 «El medicamento está desactivado.» o «Ese medicamento ya tiene una posología con esa etiqueta.») |
| `PUT /api/v1/medication-presets/{id}` | `{label, dose, frequency, duration, instructions?}` | `MedicationPreset` |
| `POST /api/v1/medication-presets/{id}/deactivate` · `/activate` | — | `MedicationPreset` |

```ts
// Cambios en models/prescription.models.ts: ambos ganan `active` (el backend lo añadió al final del DTO).
interface MedicationPreset { id: number; label: string; dose: string; frequency: string; duration: string;
  instructions: string | null; active: boolean }
interface Medication { id: number; name: string; presentation: string; concentration: string;
  route: string | null; presets: MedicationPreset[]; active: boolean }
interface MedicationRequest { name: string; presentation: string; concentration: string; route?: string }
interface MedicationPresetRequest { label: string; dose: string; frequency: string; duration: string;
  instructions?: string }
```
Límites: nombre 150, presentación 100, concentración 100, vía 50; etiqueta 60; dosis, frecuencia y duración 100.
`GET /medications?query=` (el de la receta) ya devuelve solo medicamentos y posologías **activos**: no cambia.

## Archivos a tocar
```
src/app/features/prescriptions/
  models/prescription.models.ts                (modif.) `active` en Medication y MedicationPreset; MedicationRequest, MedicationPresetRequest
  services/medications.api.ts                  (modif.) un método por endpoint de la tabla (search ya existe)
  services/medication-catalog.store.ts         (nuevo) estado con signals, provisto en la página (como CatalogStore de management)
  domain/medication-display.ts                 (nuevo) puro: filtro de texto, conteo de posologías activas
  components/medication-form/                  (nuevo) presentacional: crear/editar medicamento (se reutiliza en 013e)
  components/medication-preset-form/           (nuevo) presentacional: crear/editar posología (se reutiliza en 013e)
  components/medication-table/                 (nuevo) presentacional: tabla/tarjetas de medicamentos
  components/medication-preset-list/           (nuevo) presentacional: posologías de un medicamento con sus acciones
  pages/medications/medications.page.ts        (nuevo) página
  pages/medications/medications.page.spec.ts   (nuevo) integración (ver Tests)
  index.ts                                     (modif.) exportar MedicationFormComponent y MedicationPresetFormComponent
src/app/app.routes.ts                          ruta `consultorio/medicamentos`, `profileGuard('ODONTOLOGO', 'DIRECTOR')`, lazy como `consultorio/atenciones`
src/app/layout/nav-items.ts                    ítem «Medicamentos» (icono `Pill` de lucide) en ODONTOLOGO y DIRECTOR, tras «Mis atenciones»
docs/IMPLEMENTATION-PLAN.md                    (ya actualizado por Claude: §5.23, §7, §9; no tocar)
```
Patrón: `catalog.page.ts` de la 024 (`CatalogStore`, un solo `bd-side-sheet` con `activePanel`, tabla que pasa a
tarjetas en `< sm`). Reutiliza `shared/` (page-header, side-sheet, status-badge, confirm-dialog, alert, skeleton, field,
empty-state); no crees componentes genéricos nuevos. No se importan rutas internas de otros features. El editor de
receta y `prescription-item-form` **no** se tocan en esta tarea (es la 013e).

## Criterios de aceptación
1. `/consultorio/medicamentos` solo para `ODONTOLOGO` y `DIRECTOR` (secretaria → su inicio, por el `profileGuard`).
   «Medicamentos» aparece en el menú de ambos perfiles y queda activo en esa ruta (y «Mis citas» no).
2. **Lista**: columnas medicamento (nombre en negrita + «concentración · presentación»), vía (o «—»), posologías
   (número de activas, p. ej. «3 posologías»), estado (`bd-status-badge` «Activo»/«Inactivo») y acciones «Posologías»,
   «Editar» y «Desactivar»/«Activar». Orden del backend. Búsqueda por nombre en el cliente (mínimo 2 caracteres, sin
   distinguir mayúsculas ni tildes) y casilla «Mostrar inactivos» (activada por defecto). Inactivos atenuados pero legibles.
   Botón «Nuevo medicamento» en la cabecera.
3. **Nuevo / Editar medicamento** (`bd-side-sheet`, panel `medication`): nombre, presentación y concentración
   obligatorios; vía opcional con sugerencias (`<datalist>`: Oral, Bucal, Tópica, Sublingual). Se envía con `trim`;
   vía vacía no se envía. Al editar, nota: «Si ya se usó en una receta no se puede editar: desactívalo y crea otro.».
   OK → cierra el panel, recarga la lista, toast «Medicamento creado» / «Medicamento actualizado».
   409 → el `message` del backend dentro del formulario, sin cerrar el panel.
4. **Posologías** (mismo `bd-side-sheet`, panel `presets`): título con el medicamento; lista de sus posologías
   (etiqueta, «dosis · frecuencia · duración», indicaciones si hay, estado) con «Editar» y «Desactivar»/«Activar»;
   botón «Nueva posología». El formulario (`medication-preset-form`) se abre **dentro del mismo panel** (no otro panel):
   etiqueta (máx. 60, con ayuda «Ej.: Cada 8 h × 7 días»), dosis, frecuencia y duración obligatorias (máx. 100),
   indicaciones opcionales. OK → vuelve a la lista del panel actualizada y toast «Posología guardada». 409 → `message`
   en el formulario. Si el medicamento está inactivo, «Nueva posología» queda deshabilitado con el texto
   «Activa el medicamento para agregar posologías.».
5. **Desactivar** (medicamento o posología): `ConfirmDialogService` con «Dejará de aparecer al recetar. Las recetas ya
   hechas no cambian.». Activar es directo. `busy` en la fila mientras dura la petición.
6. Errores: 403 → «No tienes permiso»; 0 → «No se pudo conectar con el servidor»; carga inicial con error → `bd-alert`
   con «Reintentar»; sin resultados → `bd-empty-state`. Tras guardar o cambiar estado se recarga solo
   `GET /medications/manage`.
7. `medication-form` y `medication-preset-form` son presentacionales y reutilizables: `input()` con el valor inicial
   (o `null` para crear), `input()` `errorMessage` y `saving`; `output()` `save` (con el request ya limpio) y `cancel`.
   Sin servicios dentro.
8. Reglas de `clean-code`, `architecture`, `responsive` y `testing`: standalone, OnPush, `inject()`, signals,
   Reactive Forms tipados `nonNullable`, sin `any`, estilos solo con tokens, textos en español, sin dependencias nuevas.

## Responsive
Revisar en 375, 768, 1024, 1366 y 1920. En `< sm` la tabla pasa a tarjetas (nombre y concentración arriba, vía y
posologías debajo, acciones al pie, objetivos táctiles ≥ 44 px). El panel es lateral en `lg+` y hoja inferior en `< lg`
(lo resuelve `bd-side-sheet`). Sin scroll horizontal. Anotar en Resultado los anchos revisados.

## Tests requeridos
Un solo `medications.page.spec.ts` (integración de página, 3 casos; `HttpTestingController` con la forma real del DTO):
- `crear medicamento → aparece en la lista`: `GET /api/v1/medications/manage` → «Nuevo medicamento» → nombre,
  presentación, concentración → `POST /api/v1/medications` con body `{name, presentation, concentration}` (sin `route`)
  → 201 → nueva carga de `manage` que lo incluye → la fila es visible.
- `nueva posología → POST con los textos`: «Posologías» en una fila → «Nueva posología» → llenar etiqueta, dosis,
  frecuencia y duración → `POST /api/v1/medications/{id}/presets` con ese body → 201 → la posología aparece en el panel.
- `editar medicamento usado → muestra el 409`: «Editar» → cambiar concentración → `PUT /api/v1/medications/{id}`
  responde 409 con «El medicamento ya se usó en recetas: desactívalo y crea uno nuevo.» → el mensaje es visible y el
  panel sigue abierto.
Ningún otro test.

## Prueba manual
1. Entrar como odontólogo → menú «Medicamentos» → ver los 34 activos y la lidocaína inactiva.
2. Buscar «amox»: salen las 6 presentaciones de amoxicilina; abrir «Posologías» de Amoxicilina 500 mg (3 posologías).
3. Crear «Prednisona 20 mg tableta» con una posología «Cada 24 h × 5 días»; desactivarla y volver a activarla.
4. Intentar editar un medicamento ya usado en una receta (Amoxicilina 500 mg): debe salir el aviso del backend.
5. Entrar como director: mismo menú y mismas acciones. Entrar como secretaria: no hay menú y la ruta redirige.

## Resultado

**Archivos creados** (en `src/app/features/prescriptions/`):
- `services/medication-catalog.store.ts`: estado con signals provisto a nivel de página, maneja carga, filtrado, aperturas de paneles, creación/edición de medicamentos y posologías, y confirmaciones/activaciones/desactivaciones.
- `domain/medication-display.ts`: funciones puras de normalización de texto sin tildes/mayúsculas, filtrado con casilla inactivos, conteo y formateo de posologías activas y resumen para cabecera.
- `components/medication-form/medication-form.component.ts`: formulario presentacional standalone OnPush para crear o editar medicamento con datalist de vías y nota de edición.
- `components/medication-preset-form/medication-preset-form.component.ts`: formulario presentacional para crear o editar posologías con etiqueta, dosis, frecuencia, duración e indicaciones.
- `components/medication-table/medication-table.component.ts`: tabla presentacional con container queries que conmuta a tarjetas en `< sm` y botones táctiles ≥ 44 px.
- `components/medication-preset-list/medication-preset-list.component.ts`: lista presentacional de posologías con acciones de edición/desactivación y botón de nueva posología.
- `pages/medications/medications.page.ts`: página `/consultorio/medicamentos` con toolbar, side sheet, confirm dialogs y empty states.
- `pages/medications/medications.page.spec.ts`: integración de página con los 3 casos requeridos.

**Archivos modificados**:
- `src/app/features/prescriptions/models/prescription.models.ts`: campos `active: boolean` en `Medication` y `MedicationPreset`, e interfaces `MedicationRequest` y `MedicationPresetRequest`.
- `src/app/features/prescriptions/services/medications.api.ts`: endpoints `listManage`, `createMedication`, `updateMedication`, `deactivateMedication`, `activateMedication`, `createPreset`, `updatePreset`, `deactivatePreset`, `activatePreset`.
- `src/app/features/prescriptions/index.ts`: exportación de `MedicationFormComponent` y `MedicationPresetFormComponent`.
- `src/app/features/clinical/testing/fixtures.ts`: `active: true` en `mockMedicationAmoxicilina` y su preset.
- `src/app/app.routes.ts`: ruta `consultorio/medicamentos` protegida con `profileGuard('ODONTOLOGO', 'DIRECTOR')`.
- `src/app/layout/nav-items.ts`: ítem «Medicamentos» con icono `Pill` para perfiles `ODONTOLOGO` y `DIRECTOR` tras «Mis atenciones».

**Totales reales**:
- `npx ng build`: OK (`Application bundle generation complete`, exit 0).
- `npx ng test --watch=false`:
```
 Test Files  17 passed (17)
      Tests  77 passed (77)
```
- Durante desarrollo `medications.page.spec.ts`: `Test Files 1 passed (1)`, `Tests 3 passed (3)`.

**Responsive**:
Revisado en breakpoints 375, 768, 1024, 1366 y 1920 px.
- En móvil (`< sm`, < 37.49rem de contenedor): la tabla conmuta a tarjetas verticales con nombre y concentración arriba, vía y posologías abajo, y acciones agrupadas al pie con botones táctiles ≥ 44 px.
- El panel lateral se abre como hoja inferior/pantalla completa en `< md/lg` (`bd-side-sheet`) y lateral de 26rem en `lg+`.
- No hay scroll horizontal general de página.

**Problemas y supuestos**:
- Se mantuvo el orden del backend en `filterMedications` tal como requiere el criterio 2.
- `MedicationFormComponent` acepta `Partial<Medication>` con `id` opcional para permitir prellenado de nombre desde 013e sin marcarlo como edición.
- No se hizo commit.

## Revisión
Estado: APROBADO

- Cumple: ruta `consultorio/medicamentos` con `profileGuard('ODONTOLOGO', 'DIRECTOR')` y lazy; «Medicamentos» en ambos
  menús tras «Mis atenciones» («Mis citas» es `exact`, no queda activo); un endpoint por método en `MedicationsApi`;
  modelos con `active`; store provisto en la página; búsqueda en el cliente y «Mostrar inactivos» activada por defecto;
  textos del confirm, de la nota de edición y de «Activa el medicamento…»; toasts; formularios presentacionales
  exportados en `index.ts`. Solo tokens existentes, sin colores sueltos ni `any`. Spec con los 3 casos pedidos.
- Sin correcciones. Totales del Resultado: build OK; `Test Files 17 passed (17)` · `Tests 77 passed (77)`.

