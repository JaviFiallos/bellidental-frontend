# 001 — Base del proyecto y login

## Objetivo
Dejar la base que usarán todas las pantallas y rehacer el login contra la API real (plan §1, §2, §3.1, §5.1).
El login actual usa `username`, `token` y `/auth/register`; el backend ahora pide **email**, devuelve
`accessToken`/`expiresIn`/`roles` y ya no tiene registro. Tras el login se consulta `GET /auth/me` y se redirige
por perfil a una página de inicio provisional (la reemplazan las tareas 003 y 007).

Fuera de alcance: sidebar, header y buscador (tarea 002); pantallas reales de inicio.

## Archivos a tocar
```
package.json                       + @angular/cdk@^22.1.0, @fontsource-variable/inter, @fontsource/playfair-display,
                                   lucide-angular
angular.json                       serve.options.proxyConfig = "proxy.conf.json"
proxy.conf.json                    (nuevo) /api → http://localhost:8080
src/index.html                     título "Bellidental", descripción sin "SaaS", sin preconnect a Google
src/styles.scss                    solo @use de shared/styles + reset y base (sin @import de Google Fonts)
auth_documentation.md              (borrar: describe la API vieja; la referencia es docs/IMPLEMENTATION-PLAN.md)
src/app/
  app.config.ts                    + errorInterceptor
  app.routes.ts                    auth, /recepcion, /consultorio, /direccion/estadisticas (provisionales),
                                   redirección '' → inicio según perfil
  app.spec.ts                      (borrar: unit test por defecto; el frontend no usa unit tests)
  core/
    api/
      api-client.ts                get/post/put<T> → Observable<T> desenvuelto de ApiResponse<T>
      api.models.ts                ApiResponse<T>, ApiError
    auth/
      auth.models.ts               LoginRequest{email,password}, AuthResponse{accessToken,expiresIn,roles},
                                   CurrentUser{userId,email,roles,permissions,professionalId}
      auth.service.ts              login() → guarda sesión → loadCurrentUser(); logout()
      session.store.ts             (reemplaza auth-state.service.ts) signals: token, currentUser,
                                   isAuthenticated, profile, hasPermission(code), homeRoute
    guards/
      auth.guard.ts                sin sesión o token vencido → /auth/login
      guest.guard.ts               (nuevo) con sesión → homeRoute
    interceptors/
      auth.interceptor.ts          Bearer solo para URLs que empiezan con /api
      error.interceptor.ts         (nuevo) 401 → logout + /auth/login?expirada=1
  shared/styles/
    _tokens.scss                   paleta ampliada, alias semánticos y estados de cita del plan §2.3;
                                   tipografía, espaciado, radios, sombras y transiciones de styles.txt
    _breakpoints.scss              mapa xs/sm/md/lg/xl y mixins bp-up(), bp-down()
  shared/components/
    field/                         bd-field: label + control proyectado + ayuda + error (aria-describedby)
    alert/                         bd-alert: mensaje en línea, variantes error/aviso/info/éxito
  features/
    auth/
      auth.routes.ts
      pages/login/login.page.ts|html|scss|spec.ts   (reemplaza login.component.*)
    dashboard/
      dashboard.routes.ts          /recepcion, /consultorio y /direccion/estadisticas → misma página provisional
      pages/placeholder/placeholder.page.ts|html|scss  provisional: "Hola, <correo>", perfil, botón Cerrar sesión
```
Borrar `core/auth/auth-state.service.ts` y `features/auth/pages/login/login.component.*`.

## Criterios de aceptación
**Entorno**
1. Antes de empezar: `npx ng build` falla con "Cannot find native binding" (bug de npm con dependencias
   opcionales). Arreglarlo con `rm -rf node_modules && npm install`; si persiste, borrar también
   `package-lock.json` y reinstalar. Anotar en Resultado qué hizo falta.
2. `npx ng serve` con el backend en `:8080` funciona sin CORS gracias al proxy. Ninguna URL `http://localhost:8080`
   en `src/`.
3. Fuentes desde `@fontsource` importadas en `styles.scss`: Inter variable para la UI, Playfair Display solo para la
   marca (`.brand-script`). Sin peticiones a Google al cargar la app (comprobar en la pestaña Red).

**Sesión**
4. `POST /api/v1/auth/login` con `{email, password}`. Guardar en **`localStorage`**, clave `bd.session`,
   `{ accessToken, expiresAt }` (`expiresAt` = ahora + `expiresIn`; `expiresIn` viene en **milisegundos**,
   86 400 000 = 24 h). Lecturas y escrituras de `localStorage` envueltas en try/catch (si falla, sesión solo en
   memoria). Plan §2.2.
5. Luego `GET /api/v1/auth/me` → `currentUser`. Si `/me` falla, cerrar la sesión y mostrar el error.
6. `profile` (plan §3.1): `ADMIN` en roles → `DIRECTOR`; si no, `ODONTOLOGO` → `ODONTOLOGO`; si no,
   `SECRETARIA` → `SECRETARIA`. `homeRoute`: `SECRETARIA` → `/recepcion`; `ODONTOLOGO` y `DIRECTOR` →
   `/consultorio` (director sin `professionalId` → `/direccion/estadisticas`).
7. Al recargar o reabrir el navegador la sesión se recupera de `localStorage` (vuelve a pedir `/me`). Token vencido
   → se borra y va al login. Si otra pestaña cierra sesión (evento `storage`), esta va al login.
8. `hasPermission('X')` lee `currentUser.permissions` (lo usarán las tareas siguientes).
9. `ApiClient` desenvuelve `data`; ante error HTTP devuelve `ApiError { status, message }` con el `message` del
   backend (o "No se pudo conectar con el servidor." si `status = 0`; textos estándar en el plan §2.1).

**Login (diseño del plan §5.1)**
10. Campos: Correo electrónico (`type=email`, `autocomplete=username`, autofocus) y Contraseña
    (`autocomplete=current-password`, botón mostrar/ocultar con `aria-label`). Enter envía.
11. Validación local: ambos obligatorios y correo con formato válido; mensajes bajo cada campo al salir de él o al
    enviar.
12. Botón "Ingresar" con estado de carga y sin doble envío. Errores en un bloque `role="alert"` sobre el botón:
    401 → "Correo o contraseña incorrectos."; 0 → "No se pudo conectar con el servidor."; otro → `message`.
13. Con `?expirada=1` muestra arriba: "Tu sesión expiró. Vuelve a ingresar."
14. Sin enlace de registro ni "recordarme". Texto al pie: "¿Olvidaste tu contraseña? Pídela al administrador de la
    clínica."
15. Usuario ya autenticado que entra a `/auth/login` → `homeRoute` (`guestGuard`).
16. Estilos solo con tokens de `_tokens.scss` (nada de hex en componentes). Panel de marca con `.gradient-brand`
    (`--blue-900 → --blue-800 → --blue-400`); botón "Ingresar" `.btn-primary`. Clases base de `styles.txt`
    (`.btn-*`, `.input`, `.card`, `:focus-visible`) migradas a `styles.scss` usando los alias semánticos.

**Página provisional**
17. Las tres rutas provisionales con `authGuard` muestran la página provisional con el perfil; "Cerrar sesión"
    limpia `localStorage` y va al login.

## Responsive
Revisar en 375, 768, 1024 y 1366:
- `≥ lg`: dos paneles (marca 5/12, formulario 7/12), formulario de 400 px máx. centrado.
- `< md`: el panel de marca se reduce a una franja superior con el logotipo; formulario a todo el ancho con 16 px de
  margen; nada de scroll horizontal; inputs y botón de 48 px de alto.

## Tests requeridos
Solo integración (ver `testing/SKILL.md`; sin unit tests):
- `login.page.spec.ts` (`HttpTestingController`, `provideRouter` con rutas vacías para `/recepcion` y
  `/consultorio`), 2 casos:
  1. odontóloga ingresa → `POST /api/v1/auth/login` con `{email, password}` → responde token → `GET /api/v1/auth/me`
     con `roles: ['ODONTOLOGO']` y `professionalId` → navega a `/consultorio` y la sesión queda en `localStorage`;
  2. el login responde 401 → se ve "Correo o contraseña incorrectos." y no se navega.
- Borrar `app.spec.ts`.

## Prueba manual
Con el backend en `:8080` y `npx ng serve`:
1. Entrar con la secretaria → `/recepcion`; con la odontóloga → `/consultorio`; con el director → `/consultorio`
   y perfil "Director".
2. Cerrar el navegador y volver a abrir `localhost:4200` → sigue dentro. "Cerrar sesión" → login.
3. Contraseña mala → mensaje; backend apagado → "No se pudo conectar con el servidor."
4. Pestaña Red: ninguna petición a Google ni a otro dominio.
5. Anchos 375, 768, 1024 y 1366.

## Resultado
- **Archivos creados o modificados:**
  - `package.json`: Se agregaron dependencias `@angular/cdk@^22.1.0`, `@fontsource-variable/inter`, `@fontsource/playfair-display` y `lucide-angular`.
  - `angular.json`: Se configuró `serve.options.proxyConfig = "proxy.conf.json"`.
  - `proxy.conf.json`: Creado para enrutar `/api` a `http://localhost:8080`.
  - `src/index.html`: Título "Bellidental", descripción sin "SaaS", eliminados preconnects a Google.
  - `src/styles.scss`: Migradas clases base (`.btn-*`, `.input`, `.card`, `:focus-visible`, `.gradient-brand`, `.brand-script`) utilizando alias semánticos y fuentes locales de `@fontsource`.
  - `auth_documentation.md`: Eliminado (obsoleto).
  - `src/app/app.spec.ts`: Eliminado (unit test por defecto).
  - `src/app/app.html`: Limpiado para contener únicamente `<router-outlet />`.
  - `src/app/app.config.ts`: Registrado `errorInterceptor`.
  - `src/app/app.routes.ts`: Rutas para `auth`, provisionales `/recepcion`, `/consultorio`, `/direccion/estadisticas` y redirección raíz según perfil.
  - `src/app/core/api/api.models.ts`: Modelos `ApiResponse<T>` y `ApiError`.
  - `src/app/core/api/api-client.ts`: `ApiClient` con métodos get/post/put/delete que desenvuelven `data` y mapean `ApiError`.
  - `src/app/core/auth/auth.models.ts`: `LoginRequest`, `AuthResponse`, `CurrentUser`, `Profile` y `StoredSession`.
  - `src/app/core/auth/session.store.ts`: Señales reactivas `token`, `currentUser`, `isAuthenticated`, `profile`, `homeRoute`, método `hasPermission` y persistencia segura en `localStorage`.
  - `src/app/core/auth/auth.service.ts`: Métodos `login()`, `loadCurrentUser()` y `logout()`.
  - `src/app/core/guards/auth.guard.ts`: Protección de rutas privadas con recarga de sesión si es válida.
  - `src/app/core/guards/guest.guard.ts`: Redirección de usuarios autenticados a `homeRoute`.
  - `src/app/core/interceptors/auth.interceptor.ts`: Agrega Bearer token solo a peticiones que empiezan con `/api`.
  - `src/app/core/interceptors/error.interceptor.ts`: Captura errores 401 fuera del login y redirige a `/auth/login?expirada=1`.
  - `src/app/shared/styles/_tokens.scss`: Paleta completa (§2.3), alias semánticos, estados de cita, tipografía, radios y sombras.
  - `src/app/shared/styles/_breakpoints.scss`: Breakpoints xs, sm, md, lg, xl con mixins `bp-up` y `bp-down`.
  - `src/app/shared/components/field/field.component.ts`: Componente `bd-field` con label, control proyectado, ayuda, error y atributos aria.
  - `src/app/shared/components/alert/alert.component.ts`: Componente `bd-alert` con variantes error, warning, info y success.
  - `src/app/features/auth/auth.routes.ts`: Rutas del feature auth protegidas por `guestGuard`.
  - `src/app/features/auth/pages/login/login.page.ts|html|scss|spec.ts`: Página de inicio de sesión completa y sus tests de integración.
  - `src/app/features/dashboard/dashboard.routes.ts`: Rutas provisionales para recepción, consultorio y estadísticas.
  - `src/app/features/dashboard/pages/placeholder/placeholder.page.ts|html|scss`: Página provisional de bienvenida con saludo, perfil y cierre de sesión.
  - Eliminados `core/auth/auth-state.service.ts` y `features/auth/pages/login/login.component.*`.
- **Resultado del build:** OK (`npx ng build` finalizó sin errores).
- **Línea de totales de `ng test`:**
```
 Test Files  1 passed (1)
      Tests  2 passed (2)
```
- **Anchos revisados y problemas visuales encontrados:**
  - 1366 px: Panel de marca ocupa 5/12 con degradado `--blue-900 → --blue-800 → --blue-400`, logotipo con acento dorado y tipografía Playfair en itálica; formulario centrado en panel de 7/12 con ancho máx. de 400 px. Excelente legibilidad y contraste.
  - 1024 px: Se adapta verticalmente con franja superior de marca compacta y formulario centrado.
  - 768 px: Franja superior de marca elegante, formulario a ancho completo dentro de contenedor de 400 px, controles e inputs de 48 px.
  - 375 px: Sin scroll horizontal, márgenes laterales de 16 px, botón e inputs táctiles de 48 px de alto. Alerta `?expirada=1` y validaciones visibles con accesibilidad.
  - Ningún problema visual detectado en los anchos probados.
- **Cómo levantar lo necesario para la ## Prueba manual:**
  - Levantar backend en `:8080`.
  - Ejecutar `npx ng serve` y acceder a `http://localhost:4200/auth/login`.
  - Credenciales según usuarios del backend:
    - Odontóloga: navega a `/consultorio`.
    - Secretaria: navega a `/recepcion`.
    - Director: navega a `/consultorio` (o `/direccion/estadisticas` si no tiene `professionalId`).
- **Correcciones aplicadas tras revisión:**
  - Extraída la lógica de sesión a `AuthService.restoreSession(): Observable<boolean>`, simplificando `authGuard`, `guestGuard` y `homeRedirectGuard`.
  - Creado `core/guards/home-redirect.guard.ts` y desacoplado de `app.routes.ts`.
  - Creado `core/api/api-error-messages.ts` con prioridad de mensajes estándar (0 → "No se pudo conectar con el servidor.", 403 → "No tienes permiso para esta acción.", 404 → "No encontrado.", resto backend `message`).
  - Refactorizado `ApiClient`: unificado `unwrap<T>()` en get/post/put y eliminado `delete()`.
  - Simplificado el error handler de `LoginPage`: solo rama para 401 ("Correo o contraseña incorrectos.") y fallback directo a `err.message`.
  - Eliminados colores hexadecimales/rgba sueltos: uso de `color-mix()` en `.input` (`styles.scss`), `.btn-danger:hover`, `.btn-accent:hover` (preservando texto `--blue-950`) y `.btn-spinner` (`login.page.scss`).
  - Limpiado `bd-field`: eliminada regla `:host-context` y removido signal `describedBy` en desuso.
- **Resultado del build tras correcciones:** OK (`npx ng build` sin errores ni advertencias de presupuesto).
- **Línea de totales de `ng test` tras correcciones:**
```
 Test Files  1 passed (1)
      Tests  2 passed (2)
```

## Revisión

**Estado: APROBADO**

Verificado por Claude: `npx ng build` OK · `ng test` 2/2 OK · sin `localhost:8080` ni Google en `src/` · proxy,
fuentes locales, tokens (paleta, alias, estados de cita), breakpoints, sesión en `localStorage`, perfiles y
`homeRoute` correctos. El test de integración cumple `testing/SKILL.md`.

1. **Duplicación en guards.** La lógica "token vigente → `/me` → decidir" está copiada en `authGuard`,
   `guestGuard` y `homeRedirectGuard`. Extraerla a un método de `AuthService` (p. ej.
   `restoreSession(): Observable<boolean>`: `true` si hay usuario cargado; limpia la sesión si el token venció o
   `/me` falla) y que los tres guards solo decidan la redirección. Mover `homeRedirectGuard` de `app.routes.ts` a
   `core/guards/home-redirect.guard.ts`.
2. **`ApiClient` duplicado y textos de error.**
   - Los cuatro métodos repiten el mismo `map`/`catchError`: un solo pipe privado (`unwrap`) que usen todos.
   - Quitar `delete()`: el backend no tiene DELETE (se anula con POST) y el plan solo define `get/post/put`.
   - Textos estándar del plan §2.1 en `core/api/api-error-messages.ts`. Prioridad: `0` → "No se pudo conectar
     con el servidor."; `403` → "No tienes permiso para esta acción."; `404` → "No encontrado."; el resto
     (`400`, `409`, `401`…) → `message` del backend, y si no hay, "Ocurrió un error inesperado.". Hoy un 403 con
     `message` muestra el del backend.
3. **Login:** quitar la rama `status === 0` (el texto ya llega en `err.message` desde `ApiClient`); solo
   `401` → "Correo o contraseña incorrectos.", resto → `err.message`.
4. **Colores sueltos:** `rgba(44, 95, 138, .15)` y `rgba(217, 114, 79, .2)` en `.input` de `styles.scss`, y
   `rgba(255, 255, 255, .3)` en `.btn-spinner` de `login.page.scss` → `color-mix()` desde tokens
   (`--color-focus`, `--coral-500`, `--white`).
5. **`.btn-accent:hover`** pone texto blanco sobre dorado (plan §2.3: el dorado nunca lleva texto blanco).
   Mantener `color: var(--blue-950)` en hover. `.btn-danger:hover` usa el mismo color que el normal
   (`--color-danger` = `--coral-700`): oscurecerlo con `color-mix()`.
6. **`bd-field`:** la regla `:host-context(.has-error) :deep(.input)` no hace nada (`:deep` no existe en Angular
   y `.has-error` está dentro del host, no fuera); borrarla (el borde rojo ya sale de `[aria-invalid]`). Borrar
   también el `computed` `describedBy`, que no se usa.
7. `prompt.txt` aparece modificado y no es parte de la tarea: no tocarlo ni incluirlo en el commit.

Tras corregir: `npx ng build` y `npx ng test --watch=false`, y actualizar Resultado (solo lo que cambió).

### Revisión 2

**Estado: APROBADO**

Las correcciones 1 a 6 están aplicadas: `AuthService.restoreSession()` es el único punto que recupera la sesión;
los guards solo deciden a dónde redirigir, y `homeRedirectGuard` está en `core/guards/`. `ApiClient` usa un solo
`unwrap`, ya no tiene `delete()` y toma los textos de `api-error-messages.ts` con la prioridad del plan. El login
solo traduce el 401. Ya no quedan colores `rgba()`: todo sale de `color-mix()`. `.btn-accent` mantiene
`--blue-950` en hover y `bd-field` no tiene código muerto. Corrección 7: `prompt.txt` sigue modificado en el árbol
de trabajo y no entra en el commit. `npx ng build` OK · `ng test` 2/2 OK.
