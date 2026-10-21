# 023c — Usuarios: cambiar roles, restablecer contraseña y dar acceso a un profesional

> Plan §5.20 (P20, parte 2). Backend 019 (`7fc03c2`, D-24). Requiere la 023a (página `/direccion/usuarios`,
> `UsersStore`, `user-table`, `generateTemporaryPassword`). Perfil: DIRECTOR.

## Objetivo
Completar la gestión de cuentas del director con tres acciones más:
1. **Roles** de una cuenta (Odontólogo / Secretaria).
2. **Restablecer contraseña** con una contraseña temporal (cuando alguien la olvidó).
3. **Dar acceso** a un profesional registrado que aún no tiene cuenta (sección "Profesionales sin cuenta").

### Contrato (backend 019)
- **`PUT /api/v1/users/{id}/roles`** body `{ "roles": ["ODONTOLOGO", "SECRETARIA"] }` (no vacío; solo esos dos) →
  `ApiResponse<User>` ("Roles actualizados."). Cuenta con `ADMIN` → 409 "No se modifican los roles de un
  administrador."; del sistema → 409 "Los usuarios del sistema no se pueden modificar."; `ADMIN` en la lista → 400.
  Efecto inmediato (los permisos del usuario cambian en su próxima petición).
- **`POST /api/v1/users/{id}/reset-password`** body `{ "temporaryPassword": "…" }` (≥ 10) → 200
  `{ "success": true, "message": "Contraseña restablecida.", "data": null }`; 400 si es corta; 409 si es del sistema.
- **`POST /api/v1/professionals/{id}/access`** body `{ "email": "hugo.soria@bellidental.local", "temporaryPassword":
  "…" }` → **201** `ApiResponse<User>` ("Cuenta de acceso creada.") con `roles: ["ODONTOLOGO"]` y `username` = parte
  del correo antes de `@`. Errores: 404 profesional inexistente; 409 "El profesional ya tiene una cuenta de
  acceso."; 409 correo o usuario repetido; 400 contraseña corta.
- `User` y `Professional` como en la 023a (`Professional.userId: string | null`).

### Comportamiento
1. **Acciones por fila** (solo filas gestionables, `isManageableUser` de la 023a), junto a Desactivar/Activar:
   "Roles" y "Restablecer contraseña" (`btn btn-ghost`, 44 px). En `< 37.5rem` de contenedor, las acciones van en
   una fila que se envuelve.
2. Un solo `bd-side-sheet` en la página con `activePanel: 'create' | 'roles' | 'reset' | 'access' | null` (y el
   usuario o profesional elegido), igual que la agenda (`activePanel` en `reception-agenda.page.ts`). Mismo
   `padding-inline-end: 26rem` en `≥ lg` mientras esté abierto.
3. **Roles** (`user-roles-form`, dumb): título "Roles de «odontologa»", casillas Odontólogo / Secretaria precargadas;
   al menos una ("Elige al menos un rol."). "Guardar roles" → `PUT …/roles` → reemplaza la fila con la respuesta,
   toast "Roles actualizados", cierra. Error → `message` en el panel.
4. **Restablecer contraseña** (`reset-password-form`, dumb): texto "La persona deberá usar esta contraseña en su
   próximo ingreso. La anterior deja de funcionar."; campo "Contraseña temporal" (`type="text"`, ≥ 10) con
   "Generar" (`generateTemporaryPassword`). "Restablecer" (`btn btn-primary`) → `POST …/reset-password` → cierra,
   toast con el `message` y el mismo aviso de la 023a ("Contraseña temporal de «odontologa»: … No se volverá a
   mostrar.", con "Entendido").
5. **Profesionales sin cuenta** (sección debajo de la tabla, componente `professionals-without-access`, dumb): lista
   de `ProfessionalsApi.list()` con `userId === null` (nombre, matrícula `licenseNumber`) y botón "Dar acceso".
   Sin ninguno → la sección no se muestra.
   - "Dar acceso" abre `grant-access-form` (dumb): título "Acceso para Hugo Soria", "Correo" (obligatorio, email) y
     "Contraseña temporal" (≥ 10, "Generar"); nota "Se crea con rol Odontólogo.". "Crear acceso" → `POST
     /professionals/{id}/access` → cierra, toast "Cuenta de acceso creada", aviso con usuario y contraseña temporal,
     y **recarga usuarios y profesionales** (`load()` de la 023a: el profesional deja la sección y aparece vinculado
     en la tabla).
6. Todas las acciones: botón con carga, sin doble envío; errores 400/409 con el `message` dentro del panel.

### Estructura
```
features/management/
  models/user.models.ts                + UpdateUserRolesRequest, ResetPasswordRequest, GrantAccessRequest
  services/users.api.ts                + updateRoles, resetPassword, grantAccess
  services/users.store.ts              + activePanel/selección, updateRoles(), resetPassword(), grantAccess(),
                                         professionalsWithoutAccess (computed)
  components/user-table/               + salidas editRoles, resetPassword
  components/user-roles-form/          (nuevo, dumb)
  components/reset-password-form/      (nuevo, dumb)
  components/grant-access-form/        (nuevo, dumb)
  components/professionals-without-access/   (nuevo, dumb)
  pages/users/users.page.ts            (panel único; aviso de contraseña reutilizado)
  pages/users/users.page.spec.ts       (+2 casos)
```
`management` sigue importando solo `professionals/index.ts` entre los features. Si `users.page.ts` pasa de ~150
líneas de plantilla, sacar el contenido del panel a un componente `users-panel` (dumb) que reciba `activePanel`.

## Decisiones a revisar
1. **Roles como casillas** (puede tener los dos): el backend acepta un conjunto; una persona que hace de recepción y
   atiende es posible en una clínica pequeña. Si se prefiere un solo rol, cambiar a `bd-segmented`.
2. **Dar acceso solo crea rol Odontólogo** (lo fija el backend); un profesional que también haga recepción se ajusta
   luego con "Roles".
3. **Profesionales sin cuenta** = `GET /professionals` filtrado por `userId === null`; `ProfessionalsApi.list()` ya
   deja fuera los inactivos (no se ofrece acceso a un profesional inactivo).
4. La contraseña restablecida se muestra una vez (mismo criterio que la 023a, F-17).
5. **Inconveniente:** el backend no informa qué cuenta es del sistema (G-12): la heurística de la 023a decide qué
   filas tienen acciones.

## Archivos a tocar
```
src/app/features/management/
├── models/user.models.ts
├── services/users.api.ts
├── services/users.store.ts
├── components/
│   ├── user-table/user-table.component.ts
│   ├── user-roles-form/user-roles-form.component.ts                         (nuevo)
│   ├── reset-password-form/reset-password-form.component.ts                 (nuevo)
│   ├── grant-access-form/grant-access-form.component.ts                     (nuevo)
│   └── professionals-without-access/professionals-without-access.component.ts   (nuevo)
└── pages/users/
    ├── users.page.ts
    └── users.page.spec.ts
```

## Criterios de aceptación
- [ ] "Roles" y "Restablecer contraseña" solo en filas gestionables; el director y el bot siguen sin acciones.
- [ ] Roles: `PUT /api/v1/users/{id}/roles` con `{ roles: [...] }`; la fila muestra los roles nuevos.
- [ ] Restablecer: `POST /api/v1/users/{id}/reset-password` con `{ temporaryPassword }`; aviso con la contraseña.
- [ ] "Profesionales sin cuenta" lista solo los activos con `userId: null`; "Dar acceso" →
      `POST /api/v1/professionals/{id}/access` con `{ email, temporaryPassword }` → el profesional pasa a la tabla
      vinculado a su cuenta nueva.
- [ ] Validaciones en línea sin petición (rol, correo, 10 caracteres); 400/409 con el `message`.
- [ ] Solo tokens; sin `any`; OnPush; plantillas < ~150 líneas.
- [ ] `npx ng build` y `npx ng test --watch=false` en verde (los 2 casos de la 023a siguen pasando).

## Responsive
Revisar en **375, 768, 1024 y 1366**. Formularios en el mismo `bd-side-sheet` (pantalla completa en `< md`).
"Profesionales sin cuenta" como lista de tarjetas en `< sm` y filas en más. Botones ≥ 44 px; sin scroll horizontal.

## Tests requeridos
Se amplía `features/management/pages/users/users.page.spec.ts` (+**2 casos**; mismas respuestas de la 023a, con
"Hugo Soria" `id: '77777777-7777-7777-7777-777777777777'`, `userId: null`).
1. `'Dar acceso a un profesional sin cuenta → POST /professionals/{id}/access → aparece vinculado'`: se ve "Hugo Soria"
   en "Profesionales sin cuenta" → "Dar acceso" → correo `hugo.soria@bellidental.local`, contraseña
   `Temporal.2026` → "Crear acceso" → `expectOne('/api/v1/professionals/77777777-7777-7777-7777-777777777777/access')`
   POST con body `{ email: 'hugo.soria@bellidental.local', temporaryPassword: 'Temporal.2026' }` → responder 201 con
   `{ id: '88888888-…', username: 'hugo.soria', roles: ['ODONTOLOGO'], … }` → `expectOne('/api/v1/users')` y
   `expectOne('/api/v1/professionals')` (Hugo ahora con `userId: '88888888-…'`) → la fila "hugo.soria" muestra
   "Hugo Soria" y la sección "Profesionales sin cuenta" ya no está.
2. `'Restablecer contraseña rechazada por el backend → 409 → mensaje en el panel'`: fila
   "secretaria" → "Restablecer contraseña" → escribir `Temporal.2026` → "Restablecer" → POST
   `/api/v1/users/33333333-3333-3333-3333-333333333333/reset-password` body `{ temporaryPassword: 'Temporal.2026' }`
   → responder 409 `{ success: false, message: 'Los usuarios del sistema no se pueden modificar.', data: null }` →
   el mensaje se ve en el panel, que sigue abierto.

## Prueba manual
1. Cambiar la secretaria de prueba a "Odontólogo" → al ingresar con ella ve el consultorio.
2. Restablecer su contraseña → ingresar con la temporal → cambiarla en "Cambiar contraseña" (023b).
3. Registrar un profesional sin cuenta (backend/semilla) → "Dar acceso" → ingresar con esa cuenta → ve sus citas.
4. Errores: sin rol, correo repetido, contraseña corta.
5. Anchos 375, 768, 1024 y 1366.

## Resultado
(lo llena el ejecutor)

## Revisión
