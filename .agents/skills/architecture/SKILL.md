Estructura de `src/app` (ya creada; solo se crean las carpetas que un feature usa).

```
core/                      singleton de toda la app; nunca importa de features/
  api/                     ApiClient (desenvuelve ApiResponse<T>), modelos de error, paginación
  auth/                    sesión, AuthService, modelos de /auth/login y /auth/me
  guards/                  authGuard, guestGuard, profileGuard (perfil), permissionGuard
  interceptors/            auth (Bearer), error (401 → logout, 0 → sin conexión)
  services/                ClinicClock (zona America/Guayaquil), NotificationService (toasts)
shared/                    piezas de UI genéricas, sin lógica de negocio ni llamadas HTTP
  components/              button, modal, table, empty-state, status-badge, field, skeleton...
  directives/  pipes/      p. ej. age, phone, money, clinic-date
  utils/                   funciones puras transversales (fechas, cédula, E.164)
  styles/                  _tokens.scss, _breakpoints.scss, _mixins.scss
layout/                    main-layout (sidebar + header + <router-outlet>), sidebar, header, breadcrumbs
features/<feature>/
  index.ts                 API pública del feature: lo único que otro feature puede importar
  <feature>.routes.ts      rutas lazy del feature
  pages/<pagina>/          componentes de ruta (smart): leen la URL, llaman servicios, orquestan
  components/<comp>/       presentacionales (dumb): solo input()/output(), sin servicios HTTP
  services/                acceso a la API del feature (usa core/api) y estado con signals
  models/                  interfaces que reflejan los DTO del backend
  domain/                  solo si hace falta: lógica pura sin Angular (geometría del odontograma,
                           mapeo de estados, cálculos); sin tests propios: se valida en la página y a mano
```

Features del MVP: `auth`, `dashboard` (inicio por perfil), `appointments` (agenda, horarios), `patients`
(búsqueda, filiación, ficha rápida), `clinical` (atención, diagnósticos, historial), `odontogram`, `treatments`,
`prescriptions`, `billing`, `management` (estadísticas y auditoría del director; crear la carpeta en su tarea). `notifications` y `professionals` quedan vacíos hasta que una tarea los use.

Reglas:
- Un feature solo importa de otro a través de su `index.ts`; nunca rutas internas (`../patients/services/...`).
  `index.ts` exporta componentes reutilizables, servicios y modelos que otros necesitan (equivale al `Directory`
  del backend).
- `core/` y `shared/` no importan de `features/`. `layout/` solo importa de `core/`, `shared/` y de `index.ts`.
- Componentes standalone (sin NgModules), `ChangeDetectionStrategy.OnPush`, `inject()`, `input()`/`output()`/
  `model()`, control flow `@if/@for/@switch`, `@defer` para paneles pesados (odontograma, historial).
- Estado: signals (`signal`, `computed`, `resource`/`rxResource` o servicios con signals). Sin NgRx.
- Formularios: Reactive Forms tipados (`FormBuilder.nonNullable`). Validaciones de negocio replicadas del backend
  solo donde ahorran un viaje (cédula, teléfono, campos obligatorios); el backend sigue siendo la garantía.
- HTTP solo en `services/` de un feature o en `core/`. Las URLs son relativas (`/api/v1/...`); en desarrollo las
  resuelve `proxy.conf.json`, en producción nginx. Nunca `http://localhost:8080` en el código.
- Rutas lazy por feature (`loadChildren`/`loadComponent`). Menús e inicio según el **perfil** (secretaria,
  odontólogo, director; plan §3); botones y acciones según el **permiso** de `/auth/me`. Nunca comparar nombres de
  rol sueltos en componentes: solo `SessionStore.profile()` y `hasPermission()`.
- Tests junto al archivo que prueban (`login.page.spec.ts` al lado de `login.page.ts`).
- Nombres de archivo: `kebab-case.<tipo>.ts` (`patient-search.component.ts`, `login.page.ts`,
  `appointments.service.ts`, `odontogram-layout.ts` en `domain/`).
