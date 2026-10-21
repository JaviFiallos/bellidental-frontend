# 023b — Cambiar mi contraseña (todos los perfiles)

> Plan §5.20 (P21). Backend 019 (`7fc03c2`). Requiere la 002a (layout y sidebar). Perfil: **todos**.

## Objetivo
Página `/cuenta/contrasena` donde cualquier usuario cambia su propia contraseña (p. ej. la temporal que le dio el
director, 023a), con un enlace **"Cambiar contraseña"** al pie del sidebar, encima de "Cerrar sesión".

### Contrato (backend 019)
- **`PUT /api/v1/auth/password`** (`isAuthenticated()`), body `{ "currentPassword": "…", "newPassword": "…" }` →
  200 `{ "success": true, "message": "Contraseña actualizada.", "data": null }` (`ApiClient.put<string>` devuelve el
  `message`). El token actual **sigue valiendo** (no hay que volver a ingresar).
- Errores:
  - contraseña actual incorrecta → **401** `{ "success": false, "message": "Credenciales inválidas", "data": null }`
    (el handler global pisa el texto "La contraseña actual no es correcta."; G-13);
  - nueva < 10 caracteres → 400 "La contraseña debe tener al menos 10 caracteres.";
  - nueva igual a la actual → 400 "La nueva contraseña debe ser distinta de la actual.";
  - campo vacío → 400 (Bean Validation).
- **Problema a resolver:** `core/interceptors/error.interceptor.ts` trata **todo 401** (salvo `/auth/login`) como
  sesión vencida: limpia la sesión y navega a `/auth/login?expirada=1`. Con la contraseña actual mal escrita el
  usuario quedaría expulsado.

### Comportamiento
1. **Interceptor:** excluir también `/auth/password` del cierre de sesión por 401. Dejar las URLs excluidas en una
   constante (p. ej. `const SESSION_SAFE_401_URLS = ['/auth/login', '/auth/password'];` y
   `!SESSION_SAFE_401_URLS.some((url) => req.url.includes(url))`). El resto de 401 sigue igual.
2. **Ruta** `cuenta/contrasena` en `app.routes.ts`, dentro de los `children` de `MainLayout` (ya protegido por
   `authGuard`), **sin** `profileGuard`, con `loadComponent` de `ChangePasswordPage`
   (`features/auth/pages/change-password/change-password.page.ts`).
3. **API:** método nuevo `changePassword(request: ChangePasswordRequest): Observable<string>` en
   `core/auth/auth.service.ts` (ya usa `ApiClient`) → `this.api.put<string>('/api/v1/auth/password', request)`.
   Tipo `ChangePasswordRequest { currentPassword: string; newPassword: string }` en `core/auth/auth.models.ts`.
4. **Página** (`bd-page-header` "Cambiar contraseña", tarjeta `.card` de ancho máximo 28rem), Reactive Forms
   `FormBuilder.nonNullable`:
   - **Contraseña actual**, **Nueva contraseña** (ayuda "Mínimo 10 caracteres."), **Repite la nueva contraseña**;
     los tres `type="password"` con botón de mostrar/ocultar (como el login, `features/auth/pages/login`), con
     `autocomplete` `current-password` / `new-password` / `new-password`.
   - Validación en el cliente (sin petición): obligatorios; nueva ≥ 10 → "Mínimo 10 caracteres."; repetida distinta
     → "Las contraseñas no coinciden."; nueva igual a la actual → "La nueva contraseña debe ser distinta de la
     actual.". Errores con `bd-field` (`error`).
   - "Guardar contraseña" (`btn btn-primary`, "Guardando…" mientras envía; sin doble envío).
   - Éxito → `bd-alert variant="success" role="status"` "Contraseña actualizada." en la página, toast igual y el
     formulario se vacía. La sesión sigue abierta.
   - **401** → `bd-alert` "La contraseña actual no es correcta." (texto propio, porque el backend responde
     "Credenciales inválidas"), foco en "Contraseña actual"; **no** se cierra la sesión.
   - Otros errores (400, 0, 403) → `bd-alert` con el `message` del `ApiError`.
5. **Sidebar** (`layout/sidebar/sidebar.component.html` y `.ts`): en `sidebar__footer`, antes del botón de cerrar
   sesión, un `<a routerLink="/cuenta/contrasena" routerLinkActive="is-active">` con ícono `KeyRound`
   (`lucide-angular`) y texto "Cambiar contraseña"; en modo `icons` solo el ícono con `aria-label` y el tooltip
   `sidebar__tooltip`, igual que "Cerrar sesión". Estilo: el mismo del botón de cerrar sesión (área ≥ 44 px). El
   drawer ya se cierra solo al navegar (`MainLayout` escucha `NavigationEnd`).

### Estructura
- `features/auth` usa `pages/change-password/` (ya tiene `pages/login`). Sin `index.ts` nuevo (solo lo carga la ruta).
- Depende de `core/auth` (`AuthService`, `ChangePasswordRequest`), `core/api` (`ApiError`), `core/services`
  (`NotificationService`) y `shared/components` (`page-header`, `field`, `alert`, `icon`).

## Decisiones a revisar
1. **Página propia** y no un diálogo desde el sidebar: se puede enlazar (p. ej. desde el aviso de la 023a), se prueba
   como página y no mete un componente con HTTP en `layout/`.
2. **Excluir `/auth/password` del 401 global.** Inconveniente: si justo en ese momento el token venció, el usuario
   verá "La contraseña actual no es correcta." en vez de ir al login; su siguiente acción lo llevará al login. Es poco
   probable (token de 24 h) y es la solución más simple. Alternativa más precisa: que el backend responda 400/409
   para la contraseña actual incorrecta (G-13).
3. **Texto propio para el 401** ("La contraseña actual no es correcta.") en vez del `message` del backend
   ("Credenciales inválidas"), que confunde dentro de la app. Si el backend corrige G-13, se puede volver al
   `message`.
4. Se valida en el cliente "distinta de la actual" y "≥ 10" para ahorrar el viaje; el backend sigue siendo la
   garantía.
5. Sin cerrar sesión tras cambiarla: el backend no invalida el token.

## Archivos a tocar
```
src/app/
├── app.routes.ts                                         (ruta cuenta/contrasena)
├── core/
│   ├── interceptors/error.interceptor.ts                 (no cerrar sesión con 401 de /auth/password)
│   └── auth/
│       ├── auth.models.ts                                (+ ChangePasswordRequest)
│       └── auth.service.ts                               (+ changePassword)
├── layout/sidebar/
│   ├── sidebar.component.ts                              (+ RouterLink ya importado; ícono KeyRound)
│   ├── sidebar.component.html                            (enlace "Cambiar contraseña" en el pie)
│   └── sidebar.component.scss                            (estilo del enlace, igual al de cerrar sesión)
└── features/auth/pages/change-password/
    ├── change-password.page.ts                           (nuevo)
    └── change-password.page.spec.ts                      (nuevo)
```

## Criterios de aceptación
- [ ] Secretaria, odontólogo y director ven "Cambiar contraseña" al pie del sidebar (también en modo íconos y en el
      drawer) y abren `/cuenta/contrasena`.
- [ ] Con la actual correcta → `PUT /api/v1/auth/password` con `{ currentPassword, newPassword }` → "Contraseña
      actualizada." y formulario vacío; la sesión sigue.
- [ ] Con la actual incorrecta (401) → "La contraseña actual no es correcta." y **sigue en la página con la sesión
      abierta** (no navega al login).
- [ ] Cualquier otro 401 de la app sigue cerrando la sesión (no se rompe el comportamiento del 2.2 del plan).
- [ ] Validaciones en el cliente sin petición; 400 del backend con su `message`.
- [ ] Foco visible, `aria-label` en el botón de mostrar/ocultar, campos ≥ 44 px; solo tokens; sin `any`; OnPush.
- [ ] `npx ng build` y `npx ng test --watch=false` en verde.

## Responsive
Revisar en **375, 768, 1024 y 1366**. Tarjeta a todo el ancho en 375 (con el margen de la página) y de 28rem
centrada a la izquierda en más. Sidebar: revisar el pie en modo completo (≥ 1200), íconos (900–1199) y drawer
(< 900).

## Tests requeridos
`features/auth/pages/change-password/change-password.page.spec.ts` (**2 casos**). Para probar el interceptor real:
`provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))` + `provideHttpClientTesting()` y
`provideRouter([{ path: 'cuenta/contrasena', component: ChangePasswordPage }, { path: 'auth/login', component:
<stub vacío> }])`; abrir con `RouterTestingHarness.create('/cuenta/contrasena')` tras
`SessionStore.setSession('token-1', 86400)` y `setCurrentUser(...)` (secretaria).
1. `'cambiar la contraseña → PUT /auth/password → mensaje de éxito y formulario vacío'`: escribir actual
   `Cambiar.2026!`, nueva y repetida `NuevaClave.2026` → "Guardar contraseña" → `expectOne('/api/v1/auth/password')`
   método PUT, body `{ currentPassword: 'Cambiar.2026!', newPassword: 'NuevaClave.2026' }` → responder
   `{ success: true, message: 'Contraseña actualizada.', data: null }` → se ve "Contraseña actualizada." y los
   campos quedan vacíos.
2. `'contraseña actual incorrecta → 401 → mensaje y la sesión sigue'`: mismo envío → responder **401**
   `{ success: false, message: 'Credenciales inválidas', data: null }` → se ve "La contraseña actual no es
   correcta."; `TestBed.inject(SessionStore).token()` sigue siendo `'token-1'` y la URL sigue en
   `/cuenta/contrasena` (`TestBed.inject(Router).url`).

## Prueba manual
1. Con cada perfil: "Cambiar contraseña" en el pie del sidebar (pantalla grande, íconos y drawer en el móvil).
2. Actual incorrecta → mensaje, sigue dentro. Nueva de 9 caracteres, repetida distinta, igual a la actual → mensajes
   sin petición (pestaña Red de DevTools).
3. Cambio correcto → mensaje; cerrar sesión e ingresar con la nueva; la vieja ya no sirve.
4. Usuario creado por el director con contraseña temporal (023a) → la cambia aquí.
5. Anchos 375, 768, 1024 y 1366.

## Resultado
(lo llena el ejecutor)

## Revisión
