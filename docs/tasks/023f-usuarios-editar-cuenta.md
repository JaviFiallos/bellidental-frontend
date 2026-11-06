# 023f — Usuarios: el director edita el correo y el nombre de usuario de una cuenta

> Plan §5.20 (P20, parte 3). Backend 032 (D-24b, aprobada). Requiere la 023c (panel único `activePanel`,
> `users-panel`/`@switch` en `users.page.ts`, `panelKey`). Perfil: DIRECTOR.

## Objetivo
Hoy el director cambia roles, contraseña temporal y activo. Debe poder cambiar también el **correo** (con el que la
persona ingresa) y el **nombre de usuario** (el que se ve en la tabla, en auditoría y en "recibido por" de los pagos)
con una acción "Editar" por fila.

### Contrato (backend 032, D-24b)
- **`PUT /api/v1/users/{id}`** body `{ "email"?: string, "username"?: string }` — **parcial**: lo que no se envía no
  cambia → `200 ApiResponse<User>` ("Usuario actualizado.").
- Errores: `{}` → 400 "Indique el email o el nombre de usuario a cambiar."; campo en blanco → 400; email con mal
  formato o > 150 / username > 60 → 400; email o username de otra cuenta → 409 "El email '…' ya está en uso." /
  "El nombre de usuario '…' ya está en uso."; cuenta del sistema → 409.
- El ADMIN puede editar **su propia cuenta y la de otro ADMIN** (solo email/username; sus roles siguen bloqueados).
- Cambiar el email **no cierra la sesión** de esa persona (el token sigue valiendo); su siguiente ingreso es con el
  correo nuevo (el antiguo → 401). La auditoría muestra el username actual (se resuelve por `user_id`).

### Comportamiento
1. **Botón "Editar"** (`btn btn-ghost`, 44 px, `aria-label="Editar cuenta de <username>"`) en la columna Acciones:
   - filas gestionables (`isManageableUser`): primero, antes de "Roles";
   - filas con `ADMIN` (incluida la del director que está usando la pantalla): **solo** "Editar" (reemplaza el texto
     "Sin acciones");
   - cuenta del sistema (sin roles): sin cambios, "Cuenta del sistema" y sin botones.
   Nueva función pura `isEditableUser(user)` en `domain/user-display.ts` = `user.roles.length > 0` (misma heurística
   F-17/G-12). `describeUnmanageable` ya no se usa para filas ADMIN.
2. Panel nuevo `'edit'` en `UsersPanel`, mismo `bd-side-sheet`, título "Editar «odontologa»", recreado por `panelKey`
   como los otros.
3. **`user-edit-form`** (dumb, Reactive Form tipado `nonNullable`): campos "Correo" (`type="email"`, obligatorio,
   formato) y "Nombre de usuario" (obligatorio, máx. 60), precargados con los valores actuales. Nota bajo el correo:
   "Si cambias el correo, la persona deberá ingresar con el nuevo." "Guardar cambios" (`btn btn-primary`) deshabilitado
   mientras no haya cambios o el formulario sea inválido.
   - Emite solo los campos **cambiados** (comparando con el valor actual tras `trim()`; el correo además en
     minúsculas para comparar): p. ej. solo `{ username: 'odontologa.mora' }`. Nunca envía `{}`.
4. Store `updateAccount(request)` → `PUT /api/v1/users/{id}` → reemplaza la fila con la respuesta, toast
   "Cuenta actualizada", cierra el panel. Error 400/409 → `message` dentro del panel, que sigue abierto. Botón con
   carga, sin doble envío (`saving`).
5. **Cuenta propia:** si el `id` editado es `SessionStore.currentUser().userId`, tras el 200 se llama
   `AuthService.loadCurrentUser()` (de `core/auth`) para que el pie del menú muestre el correo nuevo. La sesión no se
   cierra.

### Estructura
```
features/management/
  models/user.models.ts                + UpdateUserRequest { email?: string; username?: string }
  domain/user-display.ts               + isEditableUser
  services/users.api.ts                + updateAccount(id, request)  (PUT /api/v1/users/{id})
  services/users.store.ts              + 'edit' en UsersPanel, openEdit(user), updateAccount()
  components/user-table/               + salida editAccount; filas ADMIN con solo "Editar"
  components/user-edit-form/           (nuevo, dumb)
  pages/users/users.page.ts            + @case ('edit')
  pages/users/users.page.spec.ts       (+2 casos)
```
`management` solo importa de `core/` y `professionals/index.ts`. Sin cambios en `core/`, `layout/` ni otros features.

## Decisiones a revisar
1. **"Nombre asignado" = `username`.** La cuenta no tiene nombre de persona; el nombre real del odontólogo es el del
   profesional y ya se edita en "Profesionales" (023e). Si se quería otra cosa, avisar antes de ejecutar.
2. **Las filas ADMIN muestran "Editar"** (la propia y la de otro director), porque el backend lo permite (D-24b).
   Roles, restablecer y desactivar siguen ocultos en esas filas.
3. **Solo se envía lo que cambió** (el backend es parcial); sin cambios no se puede guardar.
4. **Al cambiar el correo de otra persona su sesión sigue abierta** (lo decide el backend); el aviso del formulario
   le recuerda al director que debe comunicarle el correo nuevo.
5. **Sin campo "contraseña" en Editar:** la contraseña sigue en "Restablecer contraseña".

## Archivos a tocar
```
src/app/features/management/
├── models/user.models.ts
├── domain/user-display.ts
├── services/
│   ├── users.api.ts
│   └── users.store.ts
├── components/
│   ├── user-table/user-table.component.ts
│   └── user-edit-form/user-edit-form.component.ts      (nuevo)
└── pages/users/
    ├── users.page.ts
    └── users.page.spec.ts
```

## Criterios de aceptación
- [ ] "Editar" en filas gestionables y en filas ADMIN; la cuenta del sistema sigue sin acciones.
- [ ] `PUT /api/v1/users/{id}` con solo los campos cambiados; la fila muestra el correo/usuario nuevos.
- [ ] Sin cambios o formulario inválido → botón deshabilitado, sin petición.
- [ ] 400/409 con el `message` del backend dentro del panel.
- [ ] Editar la cuenta propia actualiza el correo del pie del menú sin cerrar sesión.
- [ ] Solo tokens; sin `any`; OnPush; plantillas < ~150 líneas; botones ≥ 44 px.
- [ ] `npx ng build` y `npx ng test --watch=false` en verde (los 4 casos existentes de Usuarios siguen pasando).

## Responsive
Revisar en **375, 768, 1024 y 1366**. Formulario en el `bd-side-sheet` (pantalla completa en `< md`). Con 4 botones
por fila las acciones se envuelven (ya lo hacen en `< 37.5rem` de contenedor); sin scroll horizontal.

## Tests requeridos
Se amplía `features/management/pages/users/users.page.spec.ts` (+**2 casos**; mismas respuestas iniciales).
1. `'Editar solo el nombre de usuario → PUT /users/{id} con ese campo → la fila se actualiza'`: fila "odontologa" →
   "Editar" → cambiar "Nombre de usuario" a `odontologa.mora` (correo sin tocar) → "Guardar cambios" →
   `expectOne('/api/v1/users/22222222-2222-2222-2222-222222222222')` método `PUT`, body exactamente
   `{ username: 'odontologa.mora' }` → responder 200 `ApiResponse<User>` con ese username → la tabla muestra
   "odontologa.mora" y el panel se cerró.
2. `'Correo de otra cuenta → 409 → mensaje en el panel'`: fila "odontologa" → "Editar" → correo
   `secretaria@bellidental.local` → "Guardar cambios" → PUT body `{ email: 'secretaria@bellidental.local' }` →
   responder 409 `{ success: false, message: "El email 'secretaria@bellidental.local' ya está en uso.", data: null }`
   → el mensaje se ve en el panel, que sigue abierto.

## Prueba manual
1. Editar el usuario de la secretaria de prueba → la tabla y la auditoría muestran el nombre nuevo.
2. Cambiar su correo → cerrar sesión → ingresar con el correo antiguo (error) y con el nuevo (entra).
3. Editar la cuenta propia del director (correo) → el pie del menú muestra el correo nuevo sin cerrar sesión.
4. Errores: correo o usuario de otra cuenta, correo mal escrito, campos vacíos, sin cambios.
5. Anchos 375, 768, 1024 y 1366.

## Resultado

**Archivos modificados**
- `models/user.models.ts`: `UpdateUserRequest { email?, username? }`.
- `domain/user-display.ts`: `isEditableUser(user)` (= `roles.length > 0`).
- `services/users.api.ts`: `updateAccount(id, request)` → `PUT /api/v1/users/{id}`.
- `services/users.store.ts`: panel `'edit'`, `openEdit(user)`, `updateAccount(request)` (startSaving/finishSaving/failSaving,
  `takeUntilDestroyed`, toast "Cuenta actualizada"); si el `id` es la cuenta propia (`SessionStore.currentUser().userId`)
  llama a `AuthService.loadCurrentUser()`. Inyecta `AuthService` y `SessionStore` de `core/auth` (sin cambios en `core/`).
- `components/user-table/user-table.component.ts`: botón "Editar" (`aria-label="Editar cuenta de <username>"`) primero en
  filas editables; ADMIN solo "Editar"; sistema sin botones; nueva salida `editAccount`.
- `pages/users/users.page.ts`: `(editAccount)`, `@case ('edit')` con `bd-user-edit-form`, título «Editar «<username>»».
- `pages/users/users.page.spec.ts`: +2 casos (ver abajo).

**Archivo nuevo**
- `components/user-edit-form/user-edit-form.component.ts` (dumb, Reactive Form `nonNullable`, `ngOnInit` precarga).

**Build**: OK (`npx ng build` exit 0). Aviso preexistente no relacionado: `layout/sidebar/sidebar.component.scss` supera el
presupuesto de 4 kB por 96 bytes (no se tocó `layout/`).

**Tests**
- Durante el desarrollo, `--include='src/app/features/management/**/*.spec.ts'`: `Test Files 5 passed (5)` · `Tests 15 passed (15)`.
- Final `npx ng test --watch=false` (1.ª vez): `Test Files  1 failed | 17 passed (18)` · `Tests  1 failed | 83 passed (84)`.
  El fallo es `clinical/pages/encounter/encounter.page.spec.ts > registra un tratamiento → aparece con su total`:
  `Test timed out in 5000ms` (feature no tocado). Al correr ese spec solo: `Test Files 1 passed (1)` · `Tests 23 passed (23)`.
  Parece un timeout intermitente por carga de la suite completa; no lo corregí (fuera de alcance). Conviene repetir la suite en la revisión.
- Usuarios: los 4 casos existentes siguen pasando; los 2 nuevos (`Editar solo el nombre de usuario…`, `Correo de otra cuenta → 409…`) pasan.

**Verificación visual**: no revisada (sin navegador). Anchos 375, 768, 1024 y 1366 pendientes de la prueba manual del usuario.
El formulario usa el mismo esquema que `user-create-form` (`bd-side-sheet`, botones `min-height: 44px`, acciones con wrap).

**Supuestos**
- El formulario emite el correo recortado (`trim()`) y en su capitalización original; la comparación con el actual es sin mayúsculas.
- El nombre de usuario se compara exacto (distingue mayúsculas).
- Validación: `notBlank` (función local en el componente) para que "   " cuente como vacío; `Validators.email` y `maxLength` como en el alta.
- El aviso bajo el correo es el `hint` de `bd-field` (se oculta si hay error, como en el resto de formularios).

**Pendiente / observación**
- `describeUnmanageable` ahora solo se usa para cuentas del sistema; su rama "Sin acciones" ya no es alcanzable.
  Lo dejé tal cual para no ampliar el alcance; se puede simplificar en una limpieza posterior.
- No se hizo commit.

## Revisión
Estado: APROBADO

- Contrato: `PUT /api/v1/users/{id}` con solo los campos cambiados (`changedFields` compara tras `trim()`, el correo
  sin mayúsculas); nunca `{}` (`canSave` deshabilita el botón sin cambios o con formulario inválido).
- "Editar" en filas gestionables y en filas ADMIN (`isEditableUser` = con roles); la cuenta del sistema sigue sin
  acciones; Roles, Restablecer y Activar/Desactivar siguen solo en gestionables.
- Store: mismo patrón que `updateRoles` (saving, sin doble envío, 400/409 con el `message` en el panel); cuenta
  propia → `AuthService.loadCurrentUser()` sin cerrar sesión. `management` importa solo de `core/` y
  `professionals/index.ts`. Sin `any`, OnPush, solo tokens, 44 px.
- Tests: los 2 casos pedidos (body exacto `{ username }` / `{ email }`, fila actualizada, 409 en el panel).
- Suite completa repetida por el revisor: `Test Files 18 passed (18)` · `Tests 84 passed (84)`. El fallo del
  Resultado (timeout en `encounter.page.spec.ts`) era intermitente.
- Nota menor (sin corrección): la rama "Sin acciones" de `describeUnmanageable` ya no se alcanza.
- Pendiente del usuario: revisión visual en 375, 768, 1024 y 1366 (Haiku no tuvo navegador).
