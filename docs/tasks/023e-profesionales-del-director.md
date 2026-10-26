# 023e — Profesionales del director: alta y edición con color de agenda

## Objetivo
El color con el que la agenda identifica a cada profesional (`colorTag`) no se puede registrar ni editar desde la
interfaz: no hay pantalla de profesionales. El backend **ya lo soporta** (sin tarea backend):
`POST /api/v1/professionals` y `PUT /api/v1/professionals/{id}` aceptan `colorTag` `#RRGGBB`, con
`PROFESSIONAL_MANAGE` (solo ADMIN). Pantalla nueva `/direccion/profesionales` (DIRECTOR): tabla y panel lateral para
crear y editar datos, especialidades y color (F-23). «Dar acceso» (cuenta de usuario) sigue en Usuarios.

## Archivos a tocar
```
src/app/features/professionals/
  models/professional.models.ts      (modif.) colorTag: string | null; ProfessionalDetail; Create/UpdateProfessionalRequest
  services/professionals.api.ts      (modif.) listAll(), create(), update()
src/app/features/management/
  domain/professional-colors.ts      (nuevo) 8 colores sugeridos + colorInUseBy()
  services/professionals-admin.store.ts  (nuevo) lista, panel, guardar (provisto por la página)
  components/professional-table/professional-table.component.ts  (nuevo) dumb; < sm tarjetas (.table-cards)
  components/professional-form/professional-form.component.ts    (nuevo) dumb; Reactive Form tipado; .sheet-form
  components/color-swatch-picker/color-swatch-picker.component.ts (nuevo) dumb; radiogroup de muestras + libre
  pages/professionals/professionals.page.ts       (nuevo)
  pages/professionals/professionals.page.spec.ts  (nuevo)
src/app/app.routes.ts                (modif.) 'direccion/profesionales' con profileGuard('DIRECTOR')
src/app/layout/nav-items.ts          (modif.) «Profesionales» en el menú del director, tras «Usuarios»
```
`management` importa de `professionals/index.ts` (API, modelos, `SpecialtiesApi`) y de `patients/index.ts` solo el
tipo `DocumentType`. Seguir el patrón de `catalog.page.ts` (tabla + `bd-side-sheet` + store con `activePanel`).

## Criterios de aceptación
1. **Modelos** (DTO `ProfessionalResponse` del backend):
   ```ts
   export interface ProfessionalDetail extends Professional {
     documentType: DocumentType; documentNumber: string; firstName: string; lastName: string;
     phoneE164: string | null; createdAt: string; updatedAt: string;
   }
   export interface CreateProfessionalRequest {
     documentType: DocumentType; documentNumber: string; firstName: string; lastName: string;
     licenseNumber: string; phoneE164?: string; colorTag: string; specialtyIds: number[];
   }
   export type UpdateProfessionalRequest = Partial<CreateProfessionalRequest>;
   ```
   `Professional.colorTag` pasa a `string | null` (los usos existentes ya caen a un color por defecto o se ajustan
   con `?? ''`). No se envía `userId` ni `googleCalendarId`.
2. **API**: `listAll()` → `GET /api/v1/professionals` **sin** filtrar activos (`list()` no cambia);
   `create(body)` → `POST`; `update(id, body)` → `PUT /api/v1/professionals/{id}`; ambos devuelven
   `ProfessionalDetail`.
3. **Colores** (`domain/professional-colors.ts`): 8 hex sugeridos, distinguibles entre sí y legibles como borde o
   punto sobre blanco (p. ej. azul `#2C5F8A`, verde azulado `#2F8F83`, índigo `#4B56B0`, dorado `#C97B2E`, coral
   `#D9724F`, ciruela `#8E4A8C`, verde `#4C8A3F`, gris azulado `#4F5D6B`), con nombre en español para el
   `aria-label`. Son **datos** que se guardan en la BD (como los colores del odontograma), por eso viven en `domain/`
   y no en tokens. `colorInUseBy(color, professionals, exceptId)` → nombre del profesional **activo** que ya lo usa.
4. **`bd-color-swatch-picker`** (dumb, `ControlValueAccessor` o `model()`): `role="radiogroup"` con las 8 muestras
   como `<button role="radio" aria-checked>` de 44 × 44 px (borde + ✓ en la elegida, no solo color) y un
   «Otro color» con `<input type="color">`; el valor se normaliza a mayúsculas `#RRGGBB`.
5. **Formulario** (`.sheet-form`, Reactive Form tipado `nonNullable`): tipo de documento (CI por defecto) y número
   (con `shared/utils/cedula.ts` si es CI), nombres, apellidos, número de licencia, teléfono opcional (se envía con
   `toEcuadorE164`, se muestra con `toEcuadorLocal`), especialidades (casillas de `GET /specialties`, al menos una),
   color (obligatorio; en alta se propone el primer sugerido que nadie use). Bajo el color, aviso no bloqueante
   «Este color ya lo usa {nombre}» si `colorInUseBy` devuelve algo. Botones «Guardar» (con carga, sin doble envío) y
   «Cancelar».
   - **Editar**: precarga desde la fila; el `PUT` envía solo los campos cambiados (`specialtyIds` completo si cambió).
6. **Tabla**: Color (punto + nombre del color o el hex), Nombre, Licencia, Especialidades, Cuenta («Con cuenta» /
   «Sin cuenta»), Estado («Activo» / «Inactivo», texto + color), acción «Editar». Orden por nombre. Botón
   «Nuevo profesional» en el encabezado. Estados: skeleton, vacío, error con «Reintentar».
7. Tras guardar: toast («Profesional registrado» / «Profesional actualizado»), se recarga la lista y se cierra el
   panel. 400 y 409 (documento o licencia repetidos) → `message` del backend en el formulario.
8. Activar/desactivar profesionales queda **fuera** de esta tarea.

## Responsive
375, 768, 1024, 1366. En 375 la tabla pasa a tarjetas y el formulario a pantalla completa; las 8 muestras en 2 filas
de 4 sin scroll horizontal.

## Tests requeridos
`professionals.page.spec.ts` (2 casos):
1. Abrir `/direccion/profesionales` → `GET /api/v1/professionals` y `GET /api/v1/specialties` → se ven las filas;
   «Nuevo profesional» → llenar datos, una especialidad y elegir una muestra → Guardar → `POST /api/v1/professionals`
   con `{ documentType, documentNumber, firstName, lastName, licenseNumber, colorTag, specialtyIds }` → se recarga la
   lista y aparece el nombre nuevo.
2. Editar una fila y guardar → `PUT /api/v1/professionals/{id}` responde 409 «El número de licencia '…' ya está en
   uso.» → el mensaje se ve en el formulario.

## Prueba manual
1. Crear un profesional con color coral → «Dar acceso» en Usuarios → en la agenda sus citas llevan el punto coral.
2. Editar el color de un profesional existente → recargar la agenda → el color cambió.
3. Elegir un color que ya usa otro → aparece el aviso, pero deja guardar.
4. Cédula inválida → error en el campo sin llamar al backend.

## Resultado
- **Archivos creados o modificados:**
  - `src/app/features/professionals/models/professional.models.ts`: añadidos `ProfessionalDetail`, `CreateProfessionalRequest`, `UpdateProfessionalRequest` y `colorTag: string | null`.
  - `src/app/features/professionals/services/professionals.api.ts`: implementados `listAll()`, `create()` y `update()`.
  - `src/app/features/management/domain/professional-colors.ts` (nuevo): 8 colores hex sugeridos con nombres, utilidades `colorInUseBy()`, `suggestUnusedColor()`, `colorNameOrHex()`.
  - `src/app/features/management/components/color-swatch-picker/color-swatch-picker.component.ts` (nuevo): componente dumb con `ControlValueAccessor`, botones de 44 × 44 px, `role="radiogroup"`, indicador ✓ y selector libre con `<input type="color">`.
  - `src/app/features/management/services/professionals-admin.store.ts` (nuevo): store de página con `sortedProfessionals`, manejo de estado de panel, carga conjunta con `forkJoin` y persistencia con notificaciones.
  - `src/app/features/management/components/professional-table/professional-table.component.ts` (nuevo): tabla presentacional con `.table-cards` (tarjetas en `< sm`), punto y nombre de color, estado con badge y acción «Editar».
  - `src/app/features/management/components/professional-form/professional-form.component.ts` (nuevo): formulario reactivo `.sheet-form` con validación de cédula ecuatoriana, casillas de especialidades, sugerencia de color libre, aviso no bloqueante de color en uso y PUT parcial.
  - `src/app/features/management/pages/professionals/professionals.page.ts` (nuevo): orquestación de vista con skeleton, error, empty state y `bd-side-sheet`.
  - `src/app/features/management/pages/professionals/professionals.page.spec.ts` (nuevo): 2 casos de prueba de integración (alta completa y error 409 al editar).
  - `src/app/app.routes.ts`: ruta `direccion/profesionales` con `profileGuard('DIRECTOR')`.
  - `src/app/layout/nav-items.ts`: opción «Profesionales» en el menú del director tras «Usuarios».
- **Resultado del build:** OK (`npx ng build` finalizó exitosamente).
- **Totales de pruebas:**
  - `npx ng test --watch=false --include=src/app/features/management/pages/professionals/professionals.page.spec.ts`:
```
 Test Files  1 passed (1)
      Tests  2 passed (2)
```
  - `npx ng test --watch=false --include='src/app/features/management/**/*.spec.ts'`:
```
 Test Files  5 passed (5)
      Tests  13 passed (13)
```
- **Anchos revisados:** 375, 768, 1024, 1366 px. En 375 px la tabla pasa a tarjetas y el panel a pantalla completa con las 8 muestras en dos filas de cuatro; en 1024+ px la tabla es estándar y en 1200+ px la página reserva 26 rem cuando el panel lateral está abierto.
- **Prueba manual:** Acceder como director (`director@bellidental.local` / `Cambiar.2026!`) y abrir el menú «Profesionales» (`/direccion/profesionales`). Probar alta con color sugerido y edición de un profesional existente.
- **Problemas encontrados y supuestos:** Ninguno.

## Revisión
Estado: APROBADO

- Cumple: modelos con los nombres de `ProfessionalResponse` (`DocumentType` importado de `patients/index.ts`, sin ciclo),
  `listAll()` sin filtro y `list()` intacto; 8 colores en `domain/` con nombre en español y `colorInUseBy` solo
  activos; picker `radiogroup` + `aria-checked`, 44 px, ✓ y `#RRGGBB` en mayúsculas; formulario `nonNullable` con
  cédula, E.164, al menos una especialidad, color propuesto y aviso no bloqueante; PUT solo con lo cambiado; tabla con
  color + texto y tarjetas `< sm`; toasts, recarga y cierre; `message` del backend en el formulario; ruta con
  `profileGuard('DIRECTOR')` y menú tras «Usuarios». Management solo importa de los `index.ts`. Test: 2 casos con
  método, URL y body.
- Correcciones menores de Claude: `#2C5F8A` literal en formulario y picker → `SUGGESTED_PROFESSIONAL_COLORS[0].hex`
  (hex solo en `domain/`); `var(--slate-400)` (no existe) → `--slate-500`; `rgba(...)` en sombras → `color-mix` con
  `--blue-950`; `monospace` → `tabular-nums`; quitado el `(input)="onColorChange()"` redundante (ya lo cubre
  `valueChanges`); `aria-hidden` en el ícono ℹ del aviso.
- Totales (en copia aislada sin los cambios en curso de la 004d, que hoy rompen el build en
  `appointment-form.store.ts:666`): `ng build` OK; management `Test Files 5 passed (5)` · `Tests 13 passed (13)`.
- Pendiente no bloqueante: al editar no se puede borrar el teléfono (el PUT parcial trata `null` como «no cambia»).
