# 023a — Usuarios del director: lista, alta y activar/desactivar

> Plan §5.20 (P20, parte 1). Backend 019 (`7fc03c2`, D-24). Requiere la 016a (feature `management`).
> Perfil: DIRECTOR. **Requerimiento nuevo del usuario** (antes "sin UI de usuarios"; MVP-SCOPE ya actualizado).
> La 023c agrega roles, restablecer contraseña y acceso de profesionales; la 023b, "Cambiar mi contraseña".

## Objetivo
Pantalla `/direccion/usuarios` con la lista de cuentas, el alta de una cuenta de **odontólogo o secretaria** con
contraseña temporal, y **Desactivar / Activar** (nunca "Eliminar": el backend ya no borra usuarios).

### Contrato (backend 019; DTO reales)
- **`GET /api/v1/users`** (`hasRole('ADMIN')`) → `ApiResponse<User[]>`: **todas** las cuentas sin borrado lógico
  (activas e **inactivas**), por `createdAt` desc. Incluye la cuenta técnica del bot (`bot_whatsapp`, **sin roles**).
  ```json
  { "success": true, "message": "OK", "data": [
      { "id": "11111111-1111-1111-1111-111111111111", "username": "director", "email": "director@bellidental.local",
        "active": true, "lastLoginAt": "2026-10-21T08:02:11-05:00", "createdAt": "2026-09-01T10:00:00-05:00",
        "roles": ["ADMIN", "ODONTOLOGO"] },
      { "id": "22222222-2222-2222-2222-222222222222", "username": "odontologa", "email": "odontologa@bellidental.local",
        "active": true, "lastLoginAt": "2026-10-20T07:55:00-05:00", "createdAt": "2026-09-01T10:00:00-05:00",
        "roles": ["ODONTOLOGO"] },
      { "id": "33333333-3333-3333-3333-333333333333", "username": "secretaria", "email": "secretaria@bellidental.local",
        "active": true, "lastLoginAt": null, "createdAt": "2026-09-01T10:00:00-05:00", "roles": ["SECRETARIA"] },
      { "id": "44444444-4444-4444-4444-444444444444", "username": "bot_whatsapp", "email": "bot@bellidental.local",
        "active": true, "lastLoginAt": null, "createdAt": "2026-09-01T10:00:00-05:00", "roles": [] } ] }
  ```
  `UserResponse` **no** trae si la cuenta es del sistema ni el profesional vinculado (G-12).
- **`POST /api/v1/users`** body `{ email, username?, temporaryPassword, roles }` → **201** `ApiResponse<User>`
  (message "Usuario creado."):
  - `email` obligatorio, formato email, ≤ 150; se guarda en minúsculas. Repetido → **409**
    "El email '<email>' ya está en uso.".
  - `username` opcional (≤ 60): si se omite, el backend usa la parte antes de `@`. Repetido → 409
    "El nombre de usuario '<username>' ya está en uso.". **Se omite la clave** si el campo está vacío.
  - `temporaryPassword` obligatoria, **≥ 10 caracteres** (si no → 400 "La contraseña debe tener al menos 10
    caracteres."). No hay cambio forzado en el primer ingreso.
  - `roles` no vacío, solo `ODONTOLOGO` y/o `SECRETARIA` (`ADMIN` → 400 "Rol no permitido: ADMIN.").
- **`POST /api/v1/users/{id}/deactivate`** y **`POST /api/v1/users/{id}/activate`** (sin body) →
  `ApiResponse<User>` ("Usuario desactivado." / "Usuario activado."). Desactivarse a sí mismo → 409 "No puedes
  desactivar tu propia cuenta."; cuenta del sistema → 409 "Los usuarios del sistema no se pueden modificar.".
  El efecto es inmediato (el usuario desactivado recibe 401 en su próxima petición).
- **`GET /api/v1/professionals`** (`PROFESSIONAL_READ`, el director lo tiene) → `ApiResponse<Professional[]>`; se
  usa `ProfessionalsApi.list()` de `features/professionals/index.ts` (ya filtra activos). `userId` es **`null`**
  cuando el profesional no tiene cuenta.

### Comportamiento
1. **Ruta** `direccion/usuarios` en `app.routes.ts` (dentro de `MainLayout`), `canActivate: [profileGuard('DIRECTOR')]`,
   `loadComponent` de `UsersPage`. **Menú** (`layout/nav-items.ts`, caso `DIRECTOR`): `{ label: 'Usuarios', icon:
   UserCog, route: '/direccion/usuarios' }` después de "Estadísticas".
2. **Carga** (`UsersStore`, provisto por la página): `forkJoin` de `GET /users` y `GET /professionals`. Carga →
   `bd-skeleton`; error → `bd-alert` con el `message` y "Reintentar".
3. **Encabezado:** `bd-page-header` "Usuarios", subtítulo "4 cuentas · 3 activas"; botón **"Nuevo usuario"**
   (`btn btn-accent`).
4. **Tabla** (`user-table`, presentacional): columnas **Usuario** (username en negrita y email debajo) · **Rol** ·
   **Profesional** · **Estado** · **Último acceso** · **Acciones**.
   - Rol: etiquetas `ADMIN` → "Director", `ODONTOLOGO` → "Odontólogo", `SECRETARIA` → "Secretaria", unidas con " · ";
     sin roles → "Cuenta del sistema".
   - Profesional: `fullName` del profesional cuyo `userId === user.id`; si no, "—".
   - Estado: `bd-status-badge` "Activo" (tono `attended`) / "Inactivo" (tono `cancelled`).
   - Último acceso: `clinicDate` + `clinicTime` o "Nunca".
   - Acciones (F-17): solo en filas **gestionables** = con roles y sin `ADMIN`. Activa → "Desactivar"
     (`btn btn-outline`); inactiva → "Activar" (`btn btn-outline`). Filas no gestionables: texto atenuado
     "Sin acciones" (director) o "Cuenta del sistema" (bot).
   - "Desactivar" pide confirmación (`ConfirmDialogService.open({ title: 'Desactivar usuario', message: '«secretaria»
     no podrá iniciar sesión hasta que la actives de nuevo.', confirmLabel: 'Desactivar', cancelLabel: 'Volver',
     tone: 'danger' })`) → `POST …/deactivate` → reemplaza la fila con la respuesta, toast "Usuario desactivado".
     "Activar" va directo → `POST …/activate` → toast "Usuario activado". Botón de la fila con carga y sin doble
     envío; error → toast de error con el `message`.
5. **Alta** en `bd-side-sheet` (`[fullscreenBelowMd]="true"`, `titleId="user-create-title"`; en `≥ lg` la página
   reserva `padding-inline-end: 26rem` mientras está abierto, como la agenda) con `user-create-form`
   (Reactive Forms `FormBuilder.nonNullable`):
   - **Correo** (obligatorio, `Validators.email`), **Nombre de usuario** (opcional; ayuda "Si lo dejas vacío se usa
     la parte del correo antes de @."), **Rol**: dos casillas "Odontólogo" y "Secretaria" (al menos una; error
     "Elige al menos un rol."), **Contraseña temporal** (`type="text"`, visible a propósito para dictarla;
     mínimo 10, error "Mínimo 10 caracteres.") con botón **"Generar"** que pone 12 caracteres aleatorios.
   - "Crear usuario" (`btn btn-accent`, "Creando…" mientras envía) y "Cancelar".
   - Éxito → cierra el panel, toast "Usuario creado", **recarga la lista** y muestra arriba un `bd-alert`
     `variant="success"` `role="status"`: "Cuenta «ana.perez» creada. Contraseña temporal: Xk7…  Entrégala a la
     persona; podrá cambiarla en «Cambiar contraseña». No se volverá a mostrar." con botón "Entendido" que la oculta.
   - Error (400/409) → `bd-alert` en el formulario con el `message`; el panel sigue abierto con lo escrito.
6. `generateTemporaryPassword()` en `management/domain/user-display.ts`: 12 caracteres con
   `crypto.getRandomValues` del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789` (sin 0/O/1/l/I,
   para dictarla sin confusiones). Mismo archivo: `ROLE_LABELS`, `isManageableUser(user)`,
   `MIN_PASSWORD_LENGTH = 10`.

### Estructura
```
features/management/
  models/user.models.ts               User, AssignableRole ('ODONTOLOGO' | 'SECRETARIA'), CreateUserRequest
  services/users.api.ts               list, create, deactivate, activate (ApiClient; URLs /api/v1/users…)
  services/users.store.ts             @Injectable() sin providedIn: users, professionalsByUserId, loading, error,
                                      createOpen, saving, saveError, busyUserId, createdNotice; load() (usuarios +
                                      profesionales), reloadUsers() (solo GET /users), create(), deactivate(user),
                                      activate(user)
  domain/user-display.ts              ROLE_LABELS, isManageableUser, generateTemporaryPassword, MIN_PASSWORD_LENGTH
  components/user-table/              (dumb) filas y acciones
  components/user-create-form/        (dumb) formulario de alta
  pages/users/users.page.ts + users.page.spec.ts
```
- `management` importa de `features/professionals/index.ts` (`ProfessionalsApi`, `Professional`); nada más de otros
  features. `management/index.ts` (creado en la 017) **no** exporta nada de usuarios (nadie más lo usa).
- `features/professionals/models/professional.models.ts`: `userId: string` → **`userId: string | null`** (el
  backend envía `null`; hoy nadie lee `userId`, verificado, así que no rompe nada).

## Decisiones a revisar
1. **Filas no gestionables por heurística** (F-17): el backend no dice qué cuenta es del sistema (G-12). Se ocultan
   las acciones en filas con `ADMIN` (el backend tampoco deja cambiarles roles; desactivarse a sí mismo da 409) y en
   filas **sin roles** (el bot). Si mañana hay una cuenta sin roles que sí se quiere gestionar, no se podrá desde aquí.
   Propuesta al backend: `system: boolean` en `UserResponse`.
2. **Contraseña temporal visible** y con "Generar": el director tiene que dictarla o anotarla. Se muestra una sola
   vez en un aviso tras crear. Riesgo: queda en pantalla hasta pulsar "Entendido".
3. **Sin cambio forzado** de la contraseña temporal (decisión del backend D-24): se recomienda a la persona usar
   "Cambiar contraseña" (023b).
4. **Cambiar el correo** (`PUT /users/{id}`) no se incluye: no se pidió y es raro; se puede sumar después.
5. **Se muestran inactivos** en la misma lista (con su estado) porque es la única forma de reactivarlos.
6. "Nuevo usuario" es la acción de acento de la pantalla.

## Archivos a tocar
```
src/app/
├── app.routes.ts                                           (ruta direccion/usuarios)
├── layout/nav-items.ts                                     ("Usuarios" para DIRECTOR, ícono UserCog)
├── features/professionals/models/professional.models.ts    (userId: string | null)
└── features/management/
    ├── models/user.models.ts                               (nuevo)
    ├── services/users.api.ts                               (nuevo)
    ├── services/users.store.ts                             (nuevo)
    ├── domain/user-display.ts                              (nuevo)
    ├── components/user-table/user-table.component.ts       (nuevo)
    ├── components/user-create-form/user-create-form.component.ts   (nuevo)
    └── pages/users/
        ├── users.page.ts                                   (nuevo)
        └── users.page.spec.ts                              (nuevo)
```
Compartidos (rutas reales): `shared/components/page-header/page-header.component` (`bd-page-header`, con
`<ng-content>` para el botón), `side-sheet` (`bd-side-sheet` desde `shared/components/side-sheet`),
`confirm-dialog` (`ConfirmDialogService` desde `shared/components/confirm-dialog`), `field`, `alert`,
`status-badge`, `skeleton`, `empty-state`; pipes `clinicDate`, `clinicTime`; `NotificationService`
(`core/services/notification.service`).

## Criterios de aceptación
- [ ] El director ve "Usuarios" en el menú; secretaria y odontólogo no, y la URL los manda a su inicio.
- [ ] La lista muestra las 4 cuentas de la semilla con rol, profesional vinculado (odontóloga y director), estado y
      último acceso; el director y el bot sin acciones.
- [ ] Alta: `POST /api/v1/users` con `email`, `temporaryPassword`, `roles` (y `username` solo si se escribió);
      validaciones en línea (correo, rol, 10 caracteres) sin petición; 409/400 con el `message`.
- [ ] Tras crear: lista recargada y aviso con la contraseña temporal que se puede ocultar.
- [ ] Desactivar (con confirmación) y Activar cambian el estado de la fila con la respuesta; sin "Eliminar".
- [ ] Solo tokens; sin `any`; OnPush; plantillas < ~150 líneas; `management` solo importa de
      `professionals/index.ts` entre los features.
- [ ] `npx ng build` y `npx ng test --watch=false` en verde.

## Responsive
Revisar en **375, 768, 1024 y 1366**. Tabla → tarjetas con contenedor `< 37.5rem` (patrón de la 015a). Alta en
`bd-side-sheet`: panel a la derecha en `≥ lg` (página con 26rem reservados), hoja inferior en `md`, pantalla
completa en `< md`. Botones e inputs ≥ 44 px; sin scroll horizontal.

## Tests requeridos
`features/management/pages/users/users.page.spec.ts` (**2 casos**). Sesión de director; `RouterTestingHarness` con
la ruta `direccion/usuarios`. Respuestas con el JSON del contrato; para profesionales, `ApiResponse<Professional[]>`
con la odontóloga (`userId: '2222…'`), el director (`userId: '1111…'`) y "Hugo Soria" (`id: '77777777-…'`,
`userId: null`, `active: true`).
1. `'abrir Usuarios → lista con roles y profesional; Nuevo usuario → POST /users → la lista se recarga'`:
   `expectOne('/api/v1/users')` y `expectOne('/api/v1/professionals')` → se ven "odontologa", "Odontóloga
   Principal", "Cuenta del sistema" → clic "Nuevo usuario" → escribir correo `ana.perez@bellidental.local`, marcar
   "Secretaria", contraseña `Temporal.2026` → "Crear usuario" → POST `/api/v1/users` con body exactamente
   `{ email: 'ana.perez@bellidental.local', temporaryPassword: 'Temporal.2026', roles: ['SECRETARIA'] }` → responder
   201 con el usuario `ana.perez` → **solo** un nuevo `GET /api/v1/users` (tras crear, el store recarga solo los
   usuarios con `reloadUsers()`; los profesionales no cambian) con la lista + ana.perez → se ve "ana.perez" y el aviso
   con "Temporal.2026".
2. `'correo repetido → 409 → mensaje en el formulario'`: mismo alta → responder 409 `{ success: false, message:
   "El email 'ana.perez@bellidental.local' ya está en uso.", data: null }` → el mensaje se ve en el panel, que sigue
   abierto; no hay recarga de la lista.

## Prueba manual
1. Director → "Usuarios" → la lista de la semilla; el bot dice "Cuenta del sistema" sin acciones.
2. "Nuevo usuario" → "Generar" → crear una secretaria → aviso con la contraseña → cerrar sesión e ingresar con esa
   cuenta → ve la recepción.
3. Como director, desactivar esa cuenta → en la otra pestaña la secretaria pierde la sesión en su próxima acción;
   "Activar" → puede volver a ingresar.
4. Correo repetido, sin rol, contraseña de 9 caracteres → mensajes.
5. Anchos 375 (tarjetas, alta a pantalla completa), 768, 1024 y 1366.

## Resultado
(lo llena el ejecutor)

## Revisión
