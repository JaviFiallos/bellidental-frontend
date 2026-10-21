# 002a — Shell y perfiles

## Objetivo
Crear el marco común de todas las pantallas (plan §3, §4, §5.2, primera mitad): un sidebar con el menú según el
perfil, un header con la fecha de hoy y la próxima cita, y todas las rutas de §3.2 registradas con páginas
provisionales y protegidas por perfil. También se crean las piezas compartidas que usa el shell: íconos, toasts,
encabezado de página, `ClinicClock` y los pipes de fecha y hora.

Fuera de alcance: el buscador global y el ítem "Pacientes" del menú (tarea 002b); `bd-side-sheet`,
`ConfirmDialog`, `bd-empty-state` y `bd-skeleton` (tarea 003).

## Archivos a tocar
```
src/app/
  app.html                         <router-outlet /> + <bd-toast-host />
  app.routes.ts                    'auth' (igual) + '' → MainLayout con authGuard; hijos de §3.2 (criterio 1)
  core/
    guards/profile.guard.ts        (nuevo) profileGuard(...profiles: Profile[]): CanActivateFn
    services/
      clinic-clock.service.ts      (nuevo) hora y fecha en America/Guayaquil; rango del día con offset -05:00
      notification.service.ts      (nuevo) success(msg) / error(msg) con signals; lista de toasts
  shared/
    components/
      icon/icon.component.ts       (nuevo) bd-icon: envuelve lucide-angular ([img]); size; aria-hidden o label
      toast-host/                  (nuevo) bd-toast-host: pinta los toasts de NotificationService
      page-header/                 (nuevo) bd-page-header: título + subtítulo + <ng-content> para acciones
    pipes/
      clinic-date.pipe.ts          (nuevo) "sáb 10 oct"; variante 'long' → "10 de octubre de 2026"
      clinic-time.pipe.ts          (nuevo) "10:30"
  layout/
    main-layout/main-layout.ts|html|scss|spec.ts   (smart) sidebar + header + <router-outlet>; drawer en < md;
                                                   inyecta NextAppointmentStore y ProfessionalsApi
    sidebar/sidebar.component.ts|html|scss         (dumb) inputs: items, userName, areaLabel, mode
                                                   (drawer | icons | full); output: logout
    header/header.component.ts|html|scss           (dumb) inputs: today, nextAppointment, showProfessional;
                                                   output: menuToggle (☰ en < md); deja reservado el espacio
                                                   del buscador para la 002b
    coming-soon/coming-soon.page.ts                (nuevo) página provisional: bd-page-header con
                                                   route.data.title + "Pantalla en construcción (tarea NNN)"
    nav-items.ts                                   menú por perfil (§3.3): label, ícono, ruta
  features/
    appointments/
      index.ts                     AppointmentsApi, Appointment, AppointmentStatus, AppointmentSource,
                                   NextAppointmentStore
      models/appointment.models.ts Appointment (DTO §7.1 sin los campos de G-1)
      services/appointments.api.ts list({ from, to, professionalId? }) → Appointment[]
      services/next-appointment.store.ts  próxima cita de hoy; refresco 60 s y al volver a la pestaña
                                          (no providedIn root: lo provee MainLayout)
    professionals/
      index.ts                     ProfessionalsApi, Professional
      models/professional.models.ts
      services/professionals.api.ts getById(id) → Professional
    dashboard/
      dashboard.routes.ts          (borrar)
      pages/placeholder/           (borrar: la reemplazan layout/coming-soon y el pie del sidebar)
```
El header va en `layout/header/` (carpeta ya existente y nombre de `architecture/SKILL.md`), no en `topbar/`.
No se toca `layout/breadcrumbs/`. `layout/` importa de otros features solo por `appointments/index.ts` y
`professionals/index.ts`.

## Criterios de aceptación
**Rutas y perfiles**
1. `app.routes.ts` (plan §3.2). Cada ruta provisional usa `loadComponent` → `ComingSoonPage` con
   `data: { title, task }`. Las tareas siguientes reemplazan su entrada por el `loadChildren` de su feature.
   ```
   'auth'                                   (sin cambios, guestGuard)
   ''  MainLayout, canActivate [authGuard]
     ''                         pathMatch full → homeRedirectGuard
     'recepcion'                profileGuard('SECRETARIA')            "Agenda del día" (003)
     'recepcion/horarios'       profileGuard('SECRETARIA')            "Horarios" (006)
     'pacientes/nuevo'          profileGuard('SECRETARIA')            "Nuevo paciente" (005)
     'pacientes/:id'            (todos)                               "Ficha del paciente" (005/014)
     'consultorio'              profileGuard('ODONTOLOGO','DIRECTOR') "Mis citas de hoy" (007)
     'consultorio/atencion/:encounterId'  profileGuard('ODONTOLOGO','DIRECTOR')  "Atención" (008)
     'direccion/estadisticas'   profileGuard('DIRECTOR')              "Estadísticas" (016)
     'direccion/auditoria'      profileGuard('DIRECTOR')              "Auditoría" (017)
   '**' → ''
   ```
2. `profileGuard`: si el perfil de la sesión no está en la lista → `UrlTree` a `homeRoute()`. Corre después de
   `authGuard` (padre), así que `currentUser` ya está cargado.

**Sidebar (plan §3.3, §2.3)**
3. Menú según `SessionStore.profile()`, definido en `nav-items.ts` (sin "Pacientes": lo agrega la 002b):
   - Secretaria: Agenda (`/recepcion`) · Horarios (`/recepcion/horarios`).
   - Odontólogo: Mis citas (`/consultorio`).
   - Director: Mis citas · Estadísticas (`/direccion/estadisticas`) · Auditoría (`/direccion/auditoria`).
   Íconos `lucide-angular` (`CalendarDays`, `Clock`, `CalendarCheck`, `ChartColumn`, `ShieldCheck`, `LogOut`).
   `<a routerLink>` con `routerLinkActive` y `aria-current="page"`.
4. Fondo degradado `--blue-900 → --blue-800`, texto blanco; ítem activo con barra dorada (`--gold-400`) a la
   izquierda y fondo `color-mix()` de blanco. Marca "Bellidental" con `.brand-script` arriba.
5. Pie fijo: nombre, área y botón "Cerrar sesión" (`AuthService.logout()`), siempre visible.
   - Nombre: ODONTOLOGO/DIRECTOR con `professionalId` → `GET /api/v1/professionals/{id}` → `fullName`; si no
     (secretaria, o la petición falla) → el `email`.
   - Área (sin suponer el género): `SECRETARIA` → "Recepción", `ODONTOLOGO` → "Consultorio",
     `DIRECTOR` → "Dirección".

**Header**
6. "Hoy sáb 10 oct" con `ClinicClock` + `clinicDate`.
7. Próxima cita (`NextAppointmentStore`): `GET /api/v1/appointments?from&to[&professionalId]` del día de hoy
   según `ClinicClock` (`from` 00:00:00 y `to` 23:59:59 con `-05:00`). SECRETARIA → sin `professionalId` (todas);
   ODONTOLOGO/DIRECTOR → su `professionalId` (director sin `professionalId` → no se muestra). La próxima es la de
   `startAt` más temprano entre las `PENDING`/`CONFIRMED` con `endAt` posterior a ahora. Texto:
   "Próxima: 10:30 · {patientName}" y, solo en recepción, " · {professionalName}". Sin citas →
   "Sin más citas hoy". Si falla → texto atenuado "No se pudo cargar la próxima cita" con ícono (sin toast; se
   reintenta en el siguiente refresco). Refresco cada 60 s y en `visibilitychange` cuando la pestaña vuelve a
   estar visible; intervalo y listener se limpian al destruir el layout.

**Compartidos**
8. `NotificationService` + `bd-toast-host` (en `app.html`, visible también en el login): éxito
   (`role="status"`, se cierra solo a los 5 s) y error (`role="alert"`, queda hasta cerrarlo); botón cerrar con
   `aria-label`; color + ícono, nunca solo color. En esta tarea nadie lo usa todavía.
9. `bd-icon` con `aria-hidden="true"` por defecto; con `label` → `role="img"` + `aria-label`.
10. Pipes y `ClinicClock` con `Intl.DateTimeFormat('es-EC', { timeZone: 'America/Guayaquil' })`; ningún
    `new Date()` suelto en componentes para saber qué día es hoy.
11. Modelos con los campos exactos del backend: `Appointment` (§7.1) con
    `status: 'PENDING' | 'CONFIRMED' | 'ATTENDED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED'` y
    `source: 'RECEPTION' | 'PROFESSIONAL' | 'BOT' | 'WALK_IN'`; `Professional` (§7.1). `GET /appointments`
    devuelve una lista, no `Page`.
12. Estilos solo con tokens; objetivos táctiles ≥ 44 px; foco visible en todos los elementos interactivos.

## Responsive
Revisar en **375, 768, 1024, 1366 y 1920** (plan §4, `responsive/SKILL.md`):
- `xs`–`sm` (< 900): sidebar como drawer que se abre con ☰ en el header (CDK `cdkTrapFocus`, fondo oscuro; Esc y
  clic fuera lo cierran; se cierra al navegar). La próxima cita se oculta en `xs` y se acorta en `sm`.
- `md` (900–1199): sidebar solo íconos (72 px); la etiqueta se ve como tooltip con foco o hover y además va en
  `aria-label` (no depende del hover).
- `lg+` (≥ 1200): sidebar completo de 232 px.
- `xl` (≥ 1536): el contenido del `<router-outlet>` crece sin ancho máximo (la agenda lo necesita).
- Nunca scroll horizontal de la página.

## Tests requeridos
Solo integración (`testing/SKILL.md`): `layout/main-layout/main-layout.spec.ts`. El layout hace de página: se
monta `MainLayout` con `provideRouter` (rutas vacías), `provideHttpClient()` y `provideHttpClientTesting()`. La
sesión se carga en el `SessionStore` real (`setSession` + `setCurrentUser`). 2 casos:
1. odontóloga con `professionalId` → `GET /api/v1/professionals/{id}` (responder `fullName`) y
   `GET /api/v1/appointments` con `professionalId`, `from` y `to` (verificar los tres parámetros; responder una cita
   `CONFIRMED` futura y una `ATTENDED`) → el pie del sidebar muestra el nombre y "Consultorio"; el header muestra
   "Próxima:" con la hora y el paciente de la cita `CONFIRMED`; el menú muestra "Mis citas" y no "Agenda";
2. secretaria → `GET /api/v1/appointments` sin `professionalId`, responde 500 → se ve "No se pudo cargar la
   próxima cita"; el menú muestra "Agenda" y "Horarios"; el pie muestra el correo y "Recepción".

Para la hora "ahora" en el test, usar los fake timers de Vitest (`vi.setSystemTime`) en lugar de depender del reloj.

## Prueba manual
Con el backend en `:8080` y `npx ng serve`:
1. Entrar con la secretaria: menú Agenda · Horarios; pie con correo y "Recepción". Con la odontóloga: Mis citas;
   pie con su nombre y "Consultorio". Con el director: Mis citas · Estadísticas · Auditoría.
2. Odontóloga escribe `/recepcion` en la URL → vuelve a `/consultorio`. Secretaria escribe `/direccion/auditoria`
   → vuelve a `/recepcion`.
3. Próxima cita visible con una cita de hoy; cambiar de pestaña y volver → se refresca (pestaña Red).
4. "Cerrar sesión" desde el pie → login.
5. Anchos 375, 768, 1024, 1366 y 1920: drawer con ☰ (Esc lo cierra, el foco no sale del drawer), sidebar de
   íconos con tooltip, sidebar completo.

## Resultado
- **Archivos creados:**
  - `src/app/core/guards/profile.guard.ts`: Guard funcional para perfiles con redirección automática al home del perfil actual.
  - `src/app/core/services/clinic-clock.service.ts`: Servicio con zona horaria `America/Guayaquil` (-05:00) para fecha actual y rango del día.
  - `src/app/core/services/notification.service.ts`: Notificaciones globales de tipo éxito y error con auto-dismiss configurable.
  - `src/app/shared/pipes/clinic-date.pipe.ts`: Pipe de formateo de fecha (`short` y `long`).
  - `src/app/shared/pipes/clinic-time.pipe.ts`: Pipe de formateo de hora 24h (`HH:mm`).
  - `src/app/shared/components/icon/icon.component.ts`: Wrapper `<bd-icon>` con soporte de accesibilidad y tipado adaptado a `lucide-angular`.
  - `src/app/shared/components/page-header/page-header.component.ts`: Encabezado reutilizable `<bd-page-header>` con título, descripción y acciones.
  - `src/app/shared/components/toast-host/toast-host.component.ts`: Componente host flotante para banners toast.
  - `src/app/features/appointments/models/appointment.models.ts`, `services/appointments.api.ts`, `services/next-appointment.store.ts`, `index.ts`: Módulo de citas, cliente HTTP con filtros de rango y professionalId, y signal store de próxima cita con recarga automática por timer y visibilidad de pestaña.
  - `src/app/features/professionals/models/professional.models.ts`, `services/professionals.api.ts`, `index.ts`: Módulo de profesionales con endpoint `getById`.
  - `src/app/layout/nav-items.ts`: Definición de navegación por perfiles (Secretaria, Odontólogo, Director).
  - `src/app/layout/coming-soon/coming-soon.page.ts`: Página provisional informativa para rutas del plan §3.2.
  - `src/app/layout/header/header.component.ts|html|scss`: Encabezado con botón hamburguesa responsive, fecha clínica y bloque de próxima cita.
  - `src/app/layout/sidebar/sidebar.component.ts|html|scss`: Barra lateral con modos `drawer`, `icons` (72px con tooltips) y `full` (232px).
  - `src/app/layout/main-layout/main-layout.ts|html|scss`: Shell principal con gestión de backdrop, trap de foco (CDK) para drawer, y breakpoints responsive.
  - `src/app/layout/main-layout/main-layout.spec.ts`: Test de integración con los 2 casos requeridos bajo HttpTestingController y SessionStore real.
- **Archivos modificados:**
  - `src/app/app.routes.ts`: Rutas hijas configuradas bajo MainLayout con `profileGuard`.
  - `src/app/app.ts` y `src/app/app.html`: Integración global de `<bd-toast-host />`.
  - Limpieza de carpeta temporal `src/app/features/dashboard/`.
- **Resultado del build:**
  OK (`Application bundle generation complete. [22.720 seconds]`)
- **Resultado literal de ng test:**
```
 Test Files  2 passed (2)
      Tests  4 passed (4)
```
- **Anchos revisados:**
  - `375px`: Sidebar como drawer oculto; botón ☰ visible en header; al presionar abre drawer vertical con backdrop oscuro y focus atrapado; próxima cita no desborda.
  - `768px`: Modo drawer; header mantiene botón ☰ y próxima cita legible.
  - `1024px`: Sidebar en modo compacto de 72px solo con iconos y tooltips nativos; contenido central alineado sin solapamiento.
  - `1366px`: Sidebar completo (232px) con etiquetas visibles, nombre de usuario y botón de cerrar sesión en el pie.
  - `1920px`: Layout amplio y fluido, contenido central sin desbordes ni scroll horizontal indeseado.
- **Perfiles verificados en sesión:**
  - `ODONTOLOGO` (`odontologa@bellidental.local`): Ingreso a `/consultorio`, menú "Mis citas", pie con nombre y "Consultorio". Próxima cita del día cargada.
  - `SECRETARIA` (`secretaria@bellidental.local`): Ingreso a `/recepcion`, menú "Agenda" y "Horarios", pie con correo y "Recepción".
  - `DIRECTOR` (`director@bellidental.local`): Ingreso a `/direccion/estadisticas`, menú "Mis citas", "Estadísticas" y "Auditoría", pie con "Dirección".
- **Prueba manual:**
  - Backend corriendo en `http://localhost:8080` y frontend en `http://localhost:4200`.
  - Credenciales:
    - Odontóloga: `odontologa@bellidental.local` / `Cambiar.2026!`
    - Secretaria: `secretaria@bellidental.local` / `Cambiar.2026!`
    - Director: `director@bellidental.local` / `Cambiar.2026!`
  - Verificar guardas URL (`/recepcion` vs `/consultorio`), cierre de sesión y responsividad en DevTools.
- **Correcciones aplicadas (revisión):**
  1. *Arquitectura:* `main-layout.ts` y `header.component.ts` ahora importan exclusivamente desde `features/appointments` y `features/professionals` (`index.ts`).
  2. *Refresco en NextAppointmentStore:* Métodos `setupRefreshInterval` y `setupVisibilityListener` movidos al método `start()` de `NextAppointmentStore` con limpieza automática vía `DestroyRef`. `today` ahora es un signal reactivo en el store actualizado en cada invocación de `load()`.
  3. *ComingSoonPage:* Subtítulo simplificado a "Pantalla en construcción (tarea 003)" y contenido de tarjeta a "Esta pantalla aún no está disponible.".
  4. *Color drawer-backdrop:* Sustituido `rgba(10, 28, 46, 0.6)` por `color-mix(in srgb, var(--blue-950) 60%, transparent)`.
  5. *Accesibilidad botón ☰:* Agregados `[attr.aria-expanded]="isDrawerOpen()"` y `aria-controls="sidebar-drawer"` en `header.component.html`, y el id correspondiente en el panel drawer.
  6. *Sidebar en modo iconos:* Eliminados atributos `title` nativos que duplicaban los tooltips personalizados en enlaces y botón de salida. Agregado `<span class="sidebar__tooltip">` a "Cerrar sesión".
  7. *Ruta auth:* Eliminado `guestGuard` duplicado en `app.routes.ts` (mantenido solo en `auth.routes.ts`).
  8. *Features:* Restaurado `features/dashboard/.gitkeep`.
- **Resultado del build tras correcciones:**
  OK (`Application bundle generation complete. [9.457 seconds]`, 0 errores, 0 warnings).
- **Resultado literal de ng test tras correcciones:**
```
 Test Files  2 passed (2)
      Tests  4 passed (4)
```

## Revisión

**Estado: CORRECCIONES**

Verificado por Claude: `npx ng build` OK · `ng test` 4/4 OK · rutas y `profileGuard` según §3.2 · menú por perfil,
pie con nombre/área y "Cerrar sesión" · próxima cita con el filtro y el rango correctos · los modos del sidebar
(drawer / íconos / completo) en los puntos de corte correctos · el test cumple la tarea (verifica los tres
parámetros y usa `vi.setSystemTime`).

1. **Arquitectura (obligatorio):** `layout/` importa rutas internas de features:
   `main-layout.ts` → `features/appointments/services/next-appointment.store` y
   `features/professionals/services/professionals.api`; `header.component.ts` →
   `features/appointments/models/appointment.models`. Importar solo desde `features/appointments` y
   `features/professionals` (sus `index.ts`).
2. **Refresco en el store:** el intervalo de 60 s y el listener de `visibilitychange` están en `MainLayout`; la
   tarea los asigna a `NextAppointmentStore`. Moverlos a un método `start()` del store, que los limpie con su
   propio `DestroyRef` (el store lo provee el layout, así que se destruye con él). `MainLayout` solo llama a
   `start()`. Además `today` se calcula una sola vez: si la app queda abierta pasada la medianoche, el header y el
   rango de la próxima cita quedan en el día anterior. Que `today` sea un signal que se actualice en cada
   refresco.
3. **`ComingSoonPage`:** el texto queda "Esta pantalla se implementará en la pantalla en construcción (tarea 003)."
   Dejar solo el subtítulo "Pantalla en construcción (tarea 003)" y en la tarjeta "Esta pantalla aún no está
   disponible." (sin armar frases con `task`).
4. **Color suelto:** `rgba(10, 28, 46, 0.6)` en `.drawer-backdrop` (`main-layout.scss`) →
   `color-mix(in srgb, var(--blue-950) 60%, transparent)`.
5. **Botón ☰:** agregar `aria-expanded` (estado del drawer, nuevo input del header) y `aria-controls` con el
   `id` del panel del drawer.
6. **Sidebar en modo íconos:** sobra el `title` nativo en los enlaces y en "Cerrar sesión", que duplica el
   tooltip propio. Quitar `title` y dejar `aria-label` + el tooltip (que ya aparece con `:focus-visible` y
   `:hover`). Agregar el mismo tooltip a "Cerrar sesión".
7. **`guestGuard` duplicado:** está en la ruta `'auth'` de `app.routes.ts` y en `login` de `auth.routes.ts`
   (la tarea decía `'auth'` sin cambios). Quitarlo de `app.routes.ts`.
8. Se borraron todos los `.gitkeep` de `features/dashboard/`; restaurar solo `features/dashboard/.gitkeep` (el
   feature se usa en la 007, como las demás carpetas de feature vacías).

Tras corregir: `npx ng build` y `npx ng test --watch=false`; actualizar Resultado (solo lo que cambió).

### Revisión 2

**Estado: APROBADO**

Las 8 correcciones están aplicadas. `layout/` importa los features solo por sus `index.ts`. El refresco y el
listener de `visibilitychange` están en `NextAppointmentStore.start()` y se limpian con su `DestroyRef`. `today`
es un signal que se actualiza en cada refresco. El texto de la página provisional está corregido. El fondo del
drawer usa `color-mix()`. El botón ☰ tiene `aria-expanded` y `aria-controls="sidebar-drawer"`. El sidebar de solo
íconos muestra un único tooltip, también en "Cerrar sesión". `guestGuard` aparece una sola vez. Se restauró
`features/dashboard/.gitkeep`. `npx ng build` OK · `ng test` 4/4 OK.
