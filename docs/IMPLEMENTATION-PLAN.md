# Plan de implementación — Frontend Bellidental

Documento vivo. **Cada §5.x es la base de una tarea** `docs/tasks/NNN-*.md`; al aprobarla, Claude marca su estado en
§9 y anota aquí lo que haya cambiado (decisión, endpoint, componente compartido nuevo).
Alcance: `MVP-SCOPE.md`. Por qué y visibilidad: `CONTEXT.md`. Fuentes del dominio: `docs/reference/`.
Bocetos clicables (paleta, secretaria, odontólogo): `docs/mockups/bellidental-bocetos.html` — referencia visual
de distribución, no de pixeles; ante una diferencia manda este plan.
Marcas: **[G-n]** = falta en el backend (§7.2) · **[F-n]** = decisión (§8).

---

## 1. Stack y despliegue
- Angular 22 (standalone, signals, zoneless), SCSS, Vitest (`ng test`), `@angular/cdk` (overlay, dialog, a11y,
  layout), `lucide-angular` para íconos. Sin librería de componentes ni de gráficos.
- Fuentes locales con `@fontsource` (Inter variable para la UI, Playfair Display solo para la marca). Nada se carga
  de terceros en tiempo de ejecución (CDN, Google Fonts): privacidad de los datos de salud (LOPDP), menos puntos de
  fallo y carga rápida.
- Desarrollo: `ng serve` + `proxy.conf.json` (`/api` → `http://localhost:8080`).
- **Producción (backend D-17): VPS en la nube** con Docker Compose. Caddy es el único servicio público (HTTPS
  automático): `app.<dominio>` → contenedor `frontend` (nginx con el build) y `app.<dominio>/api/v1/` → backend;
  `/api/v1/bot/**` queda bloqueado desde internet. Mismo origen: sin CORS. Tarea backend 018.
- **Sin internet en la clínica no hay sistema** (el bot sigue atendiendo): contingencia en papel (BN10). El error
  `0` ("No se pudo conectar con el servidor") debe ser claro en todas las pantallas; no hay modo offline.
- Al estar en internet, el director puede abrirlo desde su móvil fuera de la clínica: 375 px es un ancho real.
- Equipos: PC de recepción (1366–1920 px), laptop del consultorio (1366 px), tablet (768–1024 px), móvil del
  director (375 px).

## 2. Convenciones

### 2.1 API y errores
- `core/api/ApiClient`: `get/post/put<T>(url, body?, params?)` → `Observable<T>` ya desenvuelto de
  `ApiResponse<T> { success, message, data }`. Acciones que devuelven `ApiResponse<Void>` → `Observable<string>`
  con el `message` (sirve para el toast).
- Error → `ApiError { status, message }`. Textos estándar (`core/api/api-error-messages.ts`):
  `0` "No se pudo conectar con el servidor." · `401` lo maneja el interceptor · `403` "No tienes permiso para esta
  acción." · `404` "No encontrado." · `409` y `400` → el `message` del backend tal cual (son mensajes de negocio).
- Paginación de Spring: `Page<T> { content, totalElements, totalPages, number, size }` → `core/api/page.ts`.
- Fechas: el backend recibe y devuelve `OffsetDateTime` ISO con offset (`2026-10-10T08:30:00-05:00`). Los rangos
  `from/to` se arman siempre con `ClinicClock` (`America/Guayaquil`, UTC−5), nunca con la zona del navegador.

### 2.2 Sesión [F-4]
- `POST /auth/login` → guardar en **`localStorage`** (`bd.session`) `{ accessToken, expiresAt }` con
  `expiresAt = Date.now() + expiresIn * 1000` (`expiresIn` en **segundos**, 86400 = 24 h; corregido en la 020). La sesión sobrevive a cerrar el navegador y
  expira sola a las 24 h.
- Al iniciar la app: si hay sesión vigente → `GET /auth/me`; si vencida o `/me` falla → limpiar y login.
- `401` en cualquier petición → limpiar sesión → `/auth/login?expirada=1`. Sin refresh token.
- "Cerrar sesión" limpia `localStorage`. Evento `storage`: si otra pestaña cierra sesión, esta vuelve al login.
- Riesgo asumido: en un PC compartido la sesión queda abierta hasta que alguien pulse "Cerrar sesión" o pasen 24 h.
  Por eso "Cerrar sesión" está siempre visible al pie del sidebar.

### 2.3 Sistema visual
Base: `paleta.txt` (azules del logo + dorado/coral antagonistas). Ampliada con tintes intermedios y dos acentos
fríos (verde azulado e índigo) para que todo quede en el tono azulado. No es una paleta rígida: se pueden derivar
tonos con `color-mix()` **a partir de estos tokens**; nunca hex sueltos en componentes.

| Token | Hex | Origen | Uso |
|---|---|---|---|
| `--blue-950` | `#0A1C2E` | nuevo | texto sobre fondos claros de marca, sombras |
| `--blue-900` | `#0F2A44` | paleta (profundo) | sidebar, títulos |
| `--blue-800` | `#1C3C5C` | paleta (logo) | botón primario, enlaces activos |
| `--blue-700` | `#24507A` | nuevo | hover del primario |
| `--blue-600` | `#2C5F8A` | paleta (medio) | enlaces, foco, estado "Agendada" |
| `--blue-500` | `#4A7BA6` | nuevo | íconos, bordes activos |
| `--blue-400` | `#6E93B8` | paleta (pastel oscuro) | inicio de degradados, gráficos |
| `--blue-300` | `#A8C4DE` | paleta (pastel medio) | bordes suaves, gráficos |
| `--blue-200` | `#D3E4F0` | paleta (pastel claro) | selección, ítem activo |
| `--blue-100` | `#E6F0F8` | nuevo | fondo de "Agendada", hover de filas |
| `--blue-50` | `#EFF6FB` | paleta (casi blanco) | fondos suaves, cabeceras de tabla |
| `--gold-700` | `#9A5B1C` | nuevo | texto sobre dorado claro (AA) |
| `--gold-600` | `#C97B2E` | paleta (dorado oscuro) | botón de acento hover, íconos |
| `--gold-400` | `#E3A857` | paleta (dorado suave) | botón de acento (texto `--blue-950`), "En espera" |
| `--gold-100` | `#FBF0DC` | nuevo | fondo de "En espera" y avisos |
| `--coral-700` | `#B04A31` | nuevo | texto de error y alertas clínicas (AA) |
| `--coral-500` | `#D9724F` | paleta (coral) | "No asistió", borde de error |
| `--coral-100` | `#FBE7DF` | nuevo | fondo de error y de chips de antecedentes |
| `--teal-700` | `#1F6F66` | nuevo (antagonista frío) | texto de éxito |
| `--teal-500` | `#2F8F83` | nuevo | "Atendida", toasts de éxito |
| `--teal-100` | `#DDF1EE` | nuevo | fondo de "Atendida" |
| `--indigo-600` | `#4B56B0` | nuevo | texto de "En atención" |
| `--indigo-400` | `#6670C9` | nuevo | "En atención" |
| `--indigo-100` | `#E7E9F8` | nuevo | fondo de "En atención" |
| `--slate-800` | `#2E3A46` | paleta (gris azulado) | texto principal |
| `--slate-600` | `#4F5D6B` | nuevo | texto secundario fuerte |
| `--slate-500` | `#6B7684` | styles.txt | texto atenuado |
| `--slate-300` | `#C5CFD9` | nuevo | bordes de inputs |
| `--slate-200` | `#E1E7ED` | styles.txt | bordes, separadores |
| `--slate-100` | `#EDF1F5` | nuevo | canceladas, deshabilitado |
| `--slate-50` | `#F7F9FB` | paleta (blanco frío) | fondo de la app |
| `--white` | `#FFFFFF` | paleta | tarjetas, superficies |

Alias semánticos (lo que usan los componentes): `--color-bg` slate-50 · `--color-surface` white ·
`--color-text` slate-800 · `--color-text-muted` slate-500 · `--color-border` slate-200 · `--color-primary`
blue-800 · `--color-primary-hover` blue-700 · `--color-accent` gold-400 · `--color-focus` blue-600 ·
`--color-success` teal-500 · `--color-warning` gold-400 · `--color-danger` coral-700 · `--color-info` blue-600.

Reglas de uso:
- Una sola acción de acento (dorado) por pantalla: la decisiva ("Completar atención", "Registrar abono",
  "Nueva cita"). El resto, primario azul o secundario contorneado.
- El dorado nunca lleva texto blanco (contraste insuficiente): texto `--blue-950`.
- Sidebar: degradado `--blue-900 → --blue-800`, texto blanco, ítem activo con barra dorada a la izquierda.
- Estados de cita (siempre color + etiqueta o ícono, nunca solo color):

| Estado | Barra | Fondo | Texto |
|---|---|---|---|
| Agendada / Confirmada ✓ | blue-600 | blue-100 | blue-800 |
| En espera | gold-400 | gold-100 | gold-700 |
| En atención | indigo-400 | indigo-100 | indigo-600 |
| Atendida | teal-500 | teal-100 | teal-700 |
| No asistió | coral-500 | coral-100 | coral-700 |
| Cancelada / Reprogramada | slate-300 | slate-100 | slate-500 (tachado) |

- El `colorTag` del profesional (del backend) solo identifica al profesional (punto o borde de columna); nunca
  indica estado.
- **Colores clínicos del odontograma**: solo los del catálogo (`GET /odontogram/catalog`: rojo `#D32F2F` pendiente,
  azul `#1E88E5` realizado, negro prótesis). No se mezclan con la paleta ni se derivan.
- Tipografía: Inter (UI) 14 px base en tablas densas, 16 px en formularios; Playfair Display itálica solo en la
  marca. Escala `--fs-xs … --fs-2xl`, espaciado `--space-*`, radios y sombras de `styles.txt`.

### 2.4 Componentes compartidos (modulares, en `shared/components/` salvo que se indique)
Se crean en la primera tarea que los necesita y se reutilizan después. Ningún feature crea su propia versión.

| Componente / pieza | Para qué | Tarea |
|---|---|---|
| Clases `.btn` (`-primary`, `-accent`, `-outline`, `-ghost`, `-danger`), `.input`, `.card` | estilos base | 001 |
| `bd-field` | etiqueta + control + ayuda + error accesible | 001 |
| `bd-alert` | mensaje en línea (`role=alert` o `status`) | 001 |
| `bd-icon` | envoltura de `lucide-angular` con tamaño y `aria-hidden` | 002a |
| `NotificationService` + `bd-toast-host` (core) | toasts de éxito/error | 002a |
| `bd-combobox` | buscador con lista (CDK overlay, ↑↓ Enter Esc, `aria-activedescendant`) | 002b |
| `bd-side-sheet` | panel lateral no modal en `≥ lg` (la página reserva 26rem), hoja inferior modal en `< lg`; `fullscreenBelowMd` para formularios | 003b · 003c · 004a |
| `ConfirmDialog` (CDK Dialog) | confirmar acciones; con campo de motivo opcional | 003b |
| `bd-page-header` | encabezado de página | 002a |
| `bd-empty-state`, `bd-skeleton` | vacío, carga | 003a |
| `bd-segmented` | selector de 2–4 opciones (vistas, PRE/DEF, Pendiente/Realizado) | 003a |
| `bd-date-nav` | ◀ fecha ▶ + "Hoy" | 003a |
| `bd-status-badge` | estado de cita con color + etiqueta | 003a |
| `.table-cards` (estilo) | tabla que pasa a tarjetas en `< sm` | 005 |
| Pipes `clinicDate`, `clinicTime` · `phone` · `money` | formatos de §2.5 | 002a · 002b · 012a |
| `ConfirmDialog.reasonRequired` | motivo obligatorio al anular (tratamientos, pagos) | 012a |
| `ApiClient.getBlob` (core) | descargar PDFs con el token; lee el `message` del error aunque llegue como `Blob` | 013b |
| Utils `cedula.ts`, `e164.ts` (`shared/utils`) | validar cédula EC, convertir teléfono | 005 |
| Util `pdf-window.ts` (`shared/utils`, movido desde prescriptions) | pestaña del PDF abierta en el clic | 013b → 015b (F-21) |
| Util `calendar-period.ts` (`shared/utils`, movido desde `clinical/domain/encounter-period.ts`) | período día/semana/mes con etiqueta; `rangeLabel(from, to)` para cualquier rango | 019 → 016a (F-20) |

Por feature (exportados en su `index.ts`): `PatientSearchComponent` (patients, 002b), `AppointmentCard`
(appointments, 003a), `OdontogramComponent` (odontogram, 009), `PatientClinicalHeader` (clinical, 008),
`TreatmentsSectionComponent` + `TreatmentsStore` (treatments, 012a), `PrescriptionsSectionComponent` +
`PrescriptionEditorComponent` + `PrescriptionsStore` (prescriptions, 013a), `PatientAccountSectionComponent` +
`PatientAccountStore` (billing, 015a), `AuditHistoryDialogService` (management, 017).
Las secciones de la atención que viven en otro feature (odontograma, tratamientos, recetas) no importan de
`clinical`: reciben tipos mínimos (`DiagnosisOption`, `FindingOption`) y la página de la atención los conecta.

### 2.5 Formatos y textos
- Fecha corta "sáb 10 oct", hora "10:30", larga "10 de octubre de 2026"; edad "19 años".
- Moneda USD "$ 25,00". Teléfono: se muestra "0987 654 321", se envía E.164 `593987654321`.
- Verbos: "Anular" (nunca "Eliminar"), "Registrar", "Completar atención", "Check-in" se muestra "Llegó".
- Toda acción que cambia datos: botón con carga, sin doble envío, toast al terminar; errores 409/400 en línea.
- Búsquedas: mínimo 2 caracteres, debounce 250 ms, cancelar la anterior (`switchMap`).
- Estados de cada página: carga (skeleton), vacío (empty-state con la acción siguiente), error (alert + reintentar).

## 3. Perfiles, navegación y permisos

### 3.1 Tres perfiles
El backend tiene roles; la interfaz se organiza en **tres perfiles** (`SessionStore.profile()`):

| Perfil | Se deriva de `/auth/me` | Interfaz |
|---|---|---|
| `SECRETARIA` | roles incluye `SECRETARIA` | Recepción: agenda, pacientes (sin datos clínicos), horarios, cobros |
| `ODONTOLOGO` | roles incluye `ODONTOLOGO` y no `ADMIN` | Consultorio: sus citas, atención, odontograma, ficha clínica |
| `DIRECTOR` | roles incluye `ADMIN` | **La misma del odontólogo** + Estadísticas + Usuarios + "Historial de cambios" en contexto (F-15) |

Todos los perfiles: "Cambiar contraseña" al pie del sidebar (`/cuenta/contrasena`, 023b).
Inicio: `SECRETARIA` → `/recepcion`; `ODONTOLOGO` y `DIRECTOR` → `/consultorio` (si el director no tuviera
`professionalId`, → `/direccion/estadisticas`).
Menús y rutas se deciden por **perfil**; botones y acciones por **permiso** (`hasPermission('APPOINTMENT_UPDATE')`).
Así el director no ve la recepción aunque su rol ADMIN tenga esos permisos en el backend.

### 3.2 Rutas
```
/auth/login                         público (guestGuard)
/recepcion                          SECRETARIA           Agenda del día                 P3, P4    003, 004
/recepcion/horarios                 SECRETARIA           Horarios de profesionales      P7        006
/pacientes/nuevo                    SECRETARIA           Alta de paciente               P6        005
/pacientes/:id                      todos                SECRETARIA → ficha de recepción P5        005, 015a, 015b
                                                         ODONTOLOGO/DIRECTOR → ficha clínica P13  014 (017: historial)
/pacientes/:id/033                  ODONTOLOGO, DIRECTOR Formulario 033 (vista e impresión) P18 018
/consultorio                        ODONTOLOGO, DIRECTOR Mis citas de hoy (tablero)     P8        007
/consultorio/atenciones             ODONTOLOGO, DIRECTOR Mis atenciones (día/semana/mes) P19      019
/consultorio/atencion/:encounterId  ODONTOLOGO, DIRECTOR Atención                       P9–P12, P15  008–013 (017: historial)
/direccion/estadisticas             DIRECTOR             Estadísticas de la clínica     P16       016a, 016b
/direccion/usuarios                 DIRECTOR             Usuarios                       P20       023a, 023c
/cuenta/contrasena                  todos (sin profileGuard) Cambiar mi contraseña       P21       023b
```
Todas bajo `MainLayout` con `authGuard`; cada grupo con `profileGuard([...])`. Perfil equivocado → su inicio.
`/direccion/auditoria` **se quita** en la 017 (F-15): sin lista en el backend (G-7) no hay qué mostrar; el
historial se abre desde el registro (paciente, atención).

### 3.3 Menú lateral por perfil
| Secretaria | Odontólogo | Director |
|---|---|---|
| Agenda (inicio) | Mis citas (inicio) | Mis citas (inicio) |
| — | Mis atenciones | Mis atenciones |
| Pacientes ¹ | Pacientes ¹ | Pacientes ¹ |
| Horarios | — | — |
| — | — | Estadísticas |
| — | — | Usuarios (023a) |
| Pie: Cambiar contraseña · Cerrar sesión | Pie: Cambiar contraseña · Cerrar sesión | Pie: Cambiar contraseña · Cerrar sesión |

"Auditoría" sale del menú en la 017 (F-15).

¹ "Pacientes" enfoca el buscador global (no hay listado: >1000 pacientes, siempre se busca). [F-1, F-2]

## 4. Responsive (resumen; reglas en `responsive/SKILL.md`)
| Pantalla | xs (<600) | sm–md (600–1199) | lg+ (≥1200) |
|---|---|---|---|
| Shell | drawer ☰, buscador como ícono | sidebar de íconos (md) | sidebar 232 px |
| Agenda recepción | un profesional, lista por hora | 2–3 columnas + scroll interno | todas las columnas |
| Tablero odontólogo | pestañas por estado | pestañas por estado | 4 columnas |
| Atención | secciones apiladas, odontograma por cuadrante | odontograma completo + panel como hoja inferior | odontograma + panel lateral |
| Ficha recepción | apilada, tabla → tarjetas | 2 columnas | 2 columnas |
Prioridad de revisión: pantallas del odontólogo en 1366 y 768 (tablet vertical) y 1024 (horizontal).

---

## 5. Tareas

Formato de cada sección: pantalla · ruta y perfil · depende de · API · estructura · comportamiento ·
responsive · test de integración · prueba manual.

### 5.1 Base, sesión y login — tarea 001 (P1)
- **Depende de:** —. **API:** `POST /auth/login`, `GET /auth/me`.
- **Estructura:** `core/{api,auth,guards,interceptors}`, `shared/styles/{_tokens,_breakpoints}.scss`,
  `shared/components/{field,alert}`, `features/auth/pages/login`, `features/dashboard/pages/placeholder`
  (inicio provisional por perfil hasta 003/007).
- **Comportamiento:** ver `docs/tasks/001-base-y-login.md`. Sesión según §2.2; perfil e inicio según §3.1;
  tokens según §2.3.
```
lg+ (≥1200)                                              xs–md (<900)
┌──────────────────────┬───────────────────────────────┐  ┌───────────────────────┐
│                      │                               │  │  Bellidental (marca)  │
│   Bellidental        │   Iniciar sesión              │  ├───────────────────────┤
│   (Playfair, itálica)│                               │  │ Iniciar sesión        │
│   Centro Odontológico│   Correo electrónico          │  │ [correo            ]  │
│                      │   [director@bellidental.local]│  │ [contraseña     👁]  │
│   degradado azul     │   Contraseña                  │  │ ⚠ mensaje de error    │
│   blue-900 → 400     │   [••••••••••••          👁]  │  │ [     Ingresar     ]  │
│                      │   ⚠ Correo o contraseña ...   │  │ ¿Olvidaste...?        │
│                      │   [        Ingresar        ]  │  └───────────────────────┘
│                      │   ¿Olvidaste tu contraseña?   │
└──────────────────────┴───────────────────────────────┘
```
- **Test:** `login.page.spec.ts` — odontóloga ingresa → login + `/me` → `/consultorio`; 401 → mensaje visible.
- **Hecho (001):** `AuthService.restoreSession(): Observable<boolean>` es el único punto que recupera la sesión
  (token vigente → `/me`); lo usan `authGuard`, `guestGuard` y `homeRedirectGuard` (`''` → `homeRoute`). Textos de
  error en `core/api/api-error-messages.ts`. `ApiClient` solo tiene `get/post/put`. `lucide-angular` se instala con
  `npm install --legacy-peer-deps` (peer de Angular 22).

### 5.2 Shell, perfiles y buscador global — tareas 002a (shell y perfiles) y 002b (buscador) (P2)
- **Depende de:** 001 · [G-2] opcional. **Perfil:** todos.
- **API:** `GET /patients?query&page=0&size=8` (buscador) · `GET /appointments?from&to[&professionalId]`
  (próxima cita) · `GET /professionals/{id}` (nombre del odontólogo para el sidebar mientras no exista G-2).
- **Estructura:**
```
layout/main-layout/  sidebar/  header/  coming-soon/  nav-items.ts (menú por perfil, §3.3)
core/guards/profile.guard.ts · core/services/{clinic-clock,notification}.service.ts
shared/components/{icon,toast-host,combobox,page-header} · shared/pipes/{clinic-date,clinic-time,phone}.pipe.ts
features/patients/index.ts → PatientSearchComponent, PatientSearchStore, PatientsApi (search, getById), Patient
features/appointments/index.ts → AppointmentsApi (list), Appointment, NextAppointmentStore
features/professionals/index.ts → ProfessionalsApi (getById), Professional
```
```
┌────────┬──────────────────────────────────────────────────────────────────────────┐
│  🦷    │ [🔍 Buscar paciente: cédula, nombre o teléfono   Ctrl K]  Hoy sáb 10 oct  │
│ Belli- │                                    Próxima: 10:30 · Pérez D. (Dra. Sofía)│
│ dental ├──────────────────────────────────────────────────────────────────────────┤
│▌Agenda │                                                                          │
│ Pacien.│                         <router-outlet>                                  │
│ Horar. │                                                                          │
│ ────── │                                                                          │
│ Yadira │                                                                          │
│ Recepc.│                                                                          │
│ ⎋ Salir│                                                                          │
└────────┴──────────────────────────────────────────────────────────────────────────┘
```
- **Comportamiento:**
  - Buscador siempre visible; `Ctrl+K` o `/` lo enfoca. Resultado: nombre, cédula, edad, teléfono; Enter abre
    `/pacientes/:id`. Sin resultados y perfil SECRETARIA → "Registrar paciente «texto»" (`/pacientes/nuevo?q=`).
  - Próxima cita: siguiente cita de hoy no atendida ni cancelada (del propio profesional en ODONTOLOGO/DIRECTOR;
    de todos en SECRETARIA); se refresca cada 60 s y al volver a la pestaña.
  - Pie del sidebar: nombre, perfil ("Recepción", "Odontóloga", "Director") y "Cerrar sesión".
  - Rutas de §3.2 registradas con páginas provisionales donde aún no hay pantalla.
- **Responsive:** §4. En `< md` el buscador ocupa toda la barra al tocar el ícono; Esc lo cierra.
- **Test:** `main-layout.spec.ts` (el layout hace de página), 1 caso: escribir "per" en el buscador →
  `GET /patients?query=per…` → se listan los resultados → Enter navega a `/pacientes/:id`.
- **Prueba manual:** iniciar con secretaria y con odontóloga y comparar menús; `Ctrl+K`; anchos 375/768/1366.
- **Dividida en 002a y 002b** (tamaño): 002a = rutas, `profileGuard`, layout, sidebar, header con fecha y próxima
  cita, compartidos básicos; 002b = `bd-combobox`, buscador de pacientes, atajos, ítem "Pacientes" del menú.
  El test `main-layout.spec.ts` nace en 002a y se amplía en 002b.
- **Hecho (002a):** rutas provisionales con `layout/coming-soon`; `profileGuard(...profiles)`; `MainLayout` provee
  `NextAppointmentStore` (`start()` = refresco 60 s + `visibilitychange`; expone `today`, que el header usa como
  fecha); `bd-icon` usa el tipo `LucideIconData` exportado desde `shared/components/icon`; `nav-items.ts` sin
  "Pacientes" (lo agrega la 002b).
- **Hecho (002b):** `bd-combobox` (plantilla por `contentChild`, input `actionLabel` → output `action`, estados fuera
  del listbox) listo para la 004 y la 008. El CDK `overlay-prebuilt.css` está en `angular.json` (`styles`). El header
  recibe `isCompact` desde `MainLayout`: el buscador expandido solo existe en `< md`. `PatientSearchStore` lo provee
  quien lo usa (hoy `MainLayout`).
- **002c (Ajustes y pulido):** corrección de hover completo en `.sidebar__link` (100% de ancho en `<button>`),
  feedback visual perceptible de foco al pulsar "Pacientes" o usar `Ctrl+K`/`/`, y normalización de separadores de cédula
  en `PatientSearchStore`. **Hecho:** el halo vive en `PatientSearchComponent.highlight()` (el header solo lo invoca
  en `≥ md`); `normalizePatientSearchQuery` quita `-`, `.` y espacios en términos numéricos o documentales. Pendiente
  backend: confirmar que `GET /patients?query=` filtra también por `document_number`.
- **Decisiones (redacción de 002):** side-sheet, confirm-dialog, empty-state y skeleton pasan a la 003 (primer uso).
  Rutas provisionales con `layout/coming-soon` (`data: {title, task}`); cada tarea reemplaza su entrada por el
  `loadChildren` de su feature. El pie del sidebar muestra el área ("Recepción", "Consultorio", "Dirección"), no
  "Odontóloga", porque `/auth/me` no informa el género. Componentes de feature tontos: el estado del buscador y de la
  próxima cita vive en stores (`PatientSearchStore`, `NextAppointmentStore`) que inyecta el componente smart.

### 5.3 Recepción: agenda del día — tareas 003a (lectura) y 003b (panel y acciones) (P3 y acciones de estado de P4)
- **Depende de:** 002. **Perfil:** SECRETARIA. **Ruta:** `/recepcion?fecha=2026-10-10&vista=profesional`.
- **API:** `GET /professionals` (activos, con `colorTag`) · `GET /professionals/{id}/schedules/effective?from&to`
  (columnas y horas sombreadas) · `GET /appointments?from&to` · `POST /appointments/{id}/confirm` ·
  `/check-in` · `/no-show` · `/cancel` (todas devuelven solo `message` → volver a pedir la lista).
- **Estructura:**
```
features/appointments/
  index.ts                       AppointmentsApi, Appointment, AppointmentCardComponent, appointmentDisplayState()
  appointments.routes.ts
  pages/reception-agenda/        orquesta fecha, vista, carga y panel
  components/agenda-grid/        columnas por profesional, filas de 15 min, posición por hora
  components/agenda-by-status/   columnas Agendadas · En espera · Atendidas · No asistió
  components/appointment-card/   paciente, especialidad/motivo, estado, color del profesional
  components/appointment-panel/  detalle + acciones según estado (en bd-side-sheet)
  components/agenda-summary/     contadores del día
  services/appointments.api.ts   services/agenda.store.ts (signals: fecha, vista, citas, profesionales)
  domain/appointment-state.ts    estado de pantalla (§2.3) desde status + checkedInAt (+ encounterStatus, G-1)
shared/components/{segmented,date-nav,status-badge,side-sheet,confirm-dialog,empty-state,skeleton}
```
```
Agenda · [◀ sáb 10 oct ▶] [Hoy]     Vista: (●Por profesional ○Por estado)   [+ Sin cita] [+ Nueva cita]
┌─────────┬─────────┬─────────┬─────────┐   ■ Agendada ■ En espera ■ Atendida ■ No asistió
│ 26 citas│ 3 espera│ 14 atend│ 2 no as.│
└─────────┴─────────┴─────────┴─────────┘
┌──────┬────────────────────┬────────────────────┬────────────────────┐
│      │ ● Dr. Daniel       │ ● Dra. Sofía       │ ● Dr. Hugo (endo)  │  ← encabezado fijo
├──────┼────────────────────┼────────────────────┼────────────────────┤
│08:00 │┃Pérez David  ✓     │                    │┃Soria Juan         │
│08:15 │┃Profilaxis En esp. │┃Romo Sol  Agendada  │┃Endodoncia (60')   │
│ ...  │                    │                    │                    │
│12:00 │░░░░ fuera de horario░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────┴────────────────────┴────────────────────┴────────────────────┘
```
- **Comportamiento:**
  - Filas de 15 min de 08:00 a 20:00; tarjeta con alto = duración; scroll inicial a la hora actual si es hoy.
  - Columnas: profesionales con horario efectivo ese día; sin horario → no aparece (selector "ver todos").
  - Clic en tarjeta → panel: paciente (enlace a ficha), profesional, hora, especialidad, motivo, origen
    (Recepción/Bot/Sin cita) y acciones según estado: Confirmar · Llegó (check-in) · No asistió · Cancelar
    (confirmación) · Reprogramar y Nueva cita (abren el formulario de la 004).
  - Canceladas y reprogramadas ocultas; interruptor "Ver canceladas".
  - Vista "Por estado": columnas Agendadas · En espera · En atención · Atendidas · No asistió, tarjetas por hora,
    borde con el color del profesional.
  - Refresco cada 60 s (la agenda la toca también el bot) y tras cada acción.
- **Responsive:** `xl` todas las columnas; `lg/md` columna de horas fija + scroll horizontal interno; `< md`
  selector de profesional y lista por hora; panel → hoja inferior.
- **Decisiones (redacción de 003, brief de `/impeccable shape` aprobado):** dividida en 003a (lectura) y 003b (panel
  y acciones). "Llegó" va directo en la tarjeta (1 clic; citas de hoy de ≥ 30 min), porque es la acción más frecuente
  según el usuario. Contadores en una línea que también sirve de leyenda, en vez de cajas. 1 h = 8 rem. Columnas: con
  turno o con citas ese día. "En atención" desde la 007 (G-1: `encounterStatus` OPEN sin anular). "No asistió" solo cuando ya pasó la hora de inicio. Cancelar
  no lleva motivo (el backend no lo recibe). `< md`: lista por hora (§5.3 manda sobre §4). Volumen típico: 2–4
  profesionales y 20–40 citas al día. Contexto de producto en `PRODUCT.md`.
- **Hecho (003a):** `AgendaStore` (provisto por la página) carga con `loadTrigger$` + `switchMap` y expone `now`
  (refresco 60 s + `visibilitychange`). Geometría pura en `domain/agenda-layout.ts` (`calculateAgendaTimeRange`,
  `calculateShades`, `calculatePositionedAppointment`; 1 h = 8 rem). Columnas con `data-professional-id`.
  `ProfessionalsApi.list()` filtra activos. `ClinicClock` + `dayRange`, `addDays`, `minutesOfDay`. Compartidos nuevos:
  `bd-segmented`, `bd-date-nav`, `bd-status-badge`, `bd-empty-state`, `bd-skeleton`.
- **Hecho (003b):** `availableActions()` y `canQuickCheckIn()` (≥ 30 min) en `domain/appointment-state.ts` son la
  única fuente de las reglas. La página calcula `quickCheckInIds`, `selectedId` y `pendingCheckInId` y los pasa a las
  3 vistas; la tarjeta es dumb (`checkIn` output). `AgendaStore.runAction()` evita el doble envío, muestra el toast y
  vuelve a pedir la lista; tras cancelar cierra el panel. `bd-side-sheet` usa `position: fixed` (no CDK Overlay;
  desviación aceptada) y cambia el deslizamiento por un fundido con `prefers-reduced-motion`. Uso de
  `ConfirmDialogService.open()`: `{title, message, confirmLabel, cancelLabel, tone, reasonLabel?}` →
  `Observable<{confirmed, reason?}>`.
- **Hecho (003c):** en `≥ lg` el panel no es modal y la página reserva `padding-inline-end: 26rem`; en `< lg`
  sigue la hoja inferior modal. La geometría de la agenda se calcula en horas (`topHours`, `heightHours`,
  `totalHours`) con `--hour-height`: 8rem, o 11rem con `pointer: coarse` (15 min = 44 px). El Esc de
  `bd-side-sheet` respeta `defaultPrevented`. `ClinicClock` crea sus formateadores una sola vez.
- **Test:** `reception-agenda.page.spec.ts` — carga del día (3 GET) → se ven las tarjetas en su columna con su
  estado; clic "Llegó" → `POST /appointments/{id}/check-in` → recarga → la tarjeta dice "En espera". 409 al
  cancelar → mensaje del backend visible.
- **Prueba manual:** 1920 y 1366 con 3 profesionales; cambiar de día y de vista.

### 5.4 Recepción: nueva cita, sin cita y reprogramar — tareas 004a (nueva cita) y 004b (sin cita, reprogramar) (P4)
- **Depende de:** 003. **Perfil:** SECRETARIA (formularios dentro de `/recepcion`).
- **API:** `GET /specialties` (con `defaultDurationMinutes`) · `GET /availability?professionalId&specialtyId&date`
  · `POST /appointments` · `POST /appointments/walk-in` · `POST /appointments/{id}/reschedule`.
- **Estructura:** `features/appointments/components/{appointment-form,walk-in-form,reschedule-form,slot-picker}`;
  usa `PatientSearchComponent` de `patients/index.ts`.
- **Comportamiento:**
  - Nueva cita: paciente (buscador) → especialidad (solo las del profesional) → profesional → fecha → huecos
    libres (`slot-picker`, chips de hora) → motivo opcional. Desde un hueco de la grilla se precargan
    profesional, fecha y hora. 409 de cruce → mensaje y se recargan los huecos.
  - Sin cita (walk-in): paciente + especialidad + profesional (por defecto el primero con hueco ahora) → la cita
    entra directamente "En espera".
  - Reprogramar: misma UI con la cita original resumida; puede cambiar profesional y especialidad.
  - Paciente inexistente → "Registrar paciente" abre el alta (005) en un diálogo y vuelve con el paciente elegido
    (si 005 aún no existe, el enlace queda deshabilitado).
- **Responsive:** formulario en `bd-side-sheet`; en `< md` pantalla completa.
- **Test:** `reception-agenda.page.spec.ts` (se amplía): nueva cita desde un hueco → `GET /availability` →
  elegir hora → `POST /appointments` con body correcto → la tarjeta aparece; 409 → mensaje.
- **Prueba manual:** crear dos citas cruzadas; walk-in; reprogramar a otro día.
- **Decisiones (004a/004b):**
  - La 004 se divide en dos tareas.
  - Orden del formulario: paciente → especialidad (de `GET /specialties`, limitadas a las del profesional si se
    abre desde un hueco) → profesional (filtrado por la especialidad; si hay uno solo, queda elegido) → fecha →
    hora.
  - El formulario no envía `endAt`: el backend usa la duración de la especialidad.
  - El estado del formulario va en `AppointmentFormStore` (lo provee la página); los formularios son dumb.
  - `bd-side-sheet` gana `fullscreenBelowMd`.
  - En el walk-in, el profesional por defecto es el que tiene el hueco más cercano según `/availability` de hoy.
  - En reprogramar se envían `professionalId` y `specialtyId` solo si cambiaron.
  - El formulario envía siempre `endAt` (actualizado en 004c tras backend 006f): permite citas de duración variable (15 a 240 min) calculando el fin del último bloque.
- **Hecho (004a):** `AppointmentFormStore` (provisto por la página junto a `PatientSearchStore`) pide
  `/availability` con `switchMap`, reconcilia la hora preseleccionada con `minutesOfDay` y, tras un 409, vuelve a
  pedir las horas. La página guarda `activePanel: 'detail' | 'create' | null`; si la cita seleccionada desaparece,
  el panel de detalle se cierra. `slotAtOffset()` (`domain/agenda-layout.ts`) convierte el clic en la columna en
  una hora redondeada a 15 min, dentro del turno, y devuelve `null` en el pasado. Componentes dumb nuevos:
  `appointment-form`, `appointment-patient-field` y `slot-picker` (radiogroup nativo). Los inputs y los selects
  usan la clase global `.input`. `SpecialtiesApi` y `Specialty` (`id: number`) se exportan desde
  `professionals/index.ts`.
- **Hecho (004b):** `AppointmentFormStore` tiene `mode: 'create' | 'walk-in' | 'reschedule'`.
  - **Walk-in:** pide `/availability` de hoy para cada profesional con la especialidad (`walkInTrigger$` con
    `switchMap` y `forkJoin`) y elige al del hueco más cercano. Si ninguno tiene hueco, no elige y avisa.
  - **Reprogramar:** se abre desde la acción `'reschedule'` de `availableActions()`. Al cerrar sin guardar vuelve
    al detalle, y al guardar quita la selección y va a la fecha nueva.
  - `activePanel` en la página: `'detail' | 'create' | 'walk-in' | 'reschedule' | null`.
- **Hecho (004c):** Soporte para duración variable en bloques de 15 min. `GET /availability?...&durationMinutes=15`
  en crear y reprogramar (walk-in sin cambios). `slot-ranges.ts` con funciones puras (`validStarts`, `rangeFrom`,
  `formatDuration`, `roundUpToQuarter`). Componente dumb `duration-stepper` (− / valor / +). `slot-picker` con
  control segmentado de jornadas (`Mañana (n) · Tarde (n)`), visualización de una jornada a la vez, filtrado de
  inicios válidos donde cabe la duración, marcado visual de rango con borde y check, y resumen de hora fin.
  `POST /appointments` y `/reschedule` envían siempre `endAt`.

### 5.5 Pacientes: alta, edición y ficha de recepción — tareas 005a (alta y edición) y 005b (ficha) (P5 sin cuenta, P6)
- **Depende de:** 002 · [G-4] (citas del paciente) · [G-5] (observaciones). **Perfil:** SECRETARIA; en
  ODONTOLOGO/DIRECTOR `/pacientes/:id` muestra provisionalmente solo identificación hasta la 014.
- **API:** `GET /patients/{id}` · `POST /patients` · `PUT /patients/{id}` (incluye `adminNotes`) ·
  `GET /appointments?patientId=` [G-4].
- **Estructura:** `features/patients/pages/{patient-reception,patient-form}`,
  `components/{patient-identity,patient-appointments,admin-notes}`; `shared/utils/{cedula,e164}.ts`;
  `shared/pipes/phone.pipe.ts`; estilo `.table-cards`.
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ David Pérez                         CI 05xxxxxxxx · 19 años · 0987 654 321 [Editar]│
│ Observaciones: presupuesto ortodoncia $1.200 (abonos mensuales)          [Editar] │
├───────────────────────────────┬──────────────────────────────────────────────────┤
│ Próxima cita                  │ Estado de cuenta                      (tarea 015) │
│ mar 14 oct 10:30 · Dra. Sofía │ Fecha  Tratamiento     Doctor  Cargo  Abono Saldo │
│ [Reprogramar] [Cancelar]      │ 03/10  Profilaxis      Dra S   25,00  25,00  0,00 │
│ Citas anteriores (lista)      │ 10/10  Resina 2 caras  Dr D    45,00  20,00 25,00 │
│                               │                              [Registrar abono]   │
└───────────────────────────────┴──────────────────────────────────────────────────┘
```
- **Comportamiento:**
  - Sin antecedentes, odontograma ni diagnósticos (`CONTEXT.md` §3). Columna "Estado" de la ficha en papel no se
    muestra: el saldo ya lo dice [F-3].
  - Alta: tipo de documento (cédula por defecto) + número con validación de dígito verificador, nombres,
    apellidos, fecha de nacimiento, sexo, teléfono, correo, contacto de emergencia, observaciones. Precarga desde
    `?q=` (dígitos → cédula; texto → nombres). 409 duplicado → "Ya existe" + enlace a su ficha.
  - Edición en el mismo formulario. Observaciones editables en línea (guardar al salir).
  - Citas del paciente: próxima con acciones (Reprogramar, Cancelar), anteriores con estado.
- **Test:** `patient-form.page.spec.ts` — alta válida → `POST /patients` con teléfono E.164 → navega a la ficha;
  409 → mensaje con enlace.
- **Prueba manual:** cédula inválida, alta, edición, observaciones; 375 y 1366.
- **Decisiones (005a/005b):**
  - La 005 se divide en alta y edición (005a) y ficha (005b).
  - "Reprogramar" desde la ficha abre la agenda con `?fecha&cita&accion=reprogramar`, para reutilizar el
    formulario de la 004b.
- **Hecho (005a):** `PatientFormPage` atiende `/pacientes/nuevo` y `/pacientes/:id/editar`.
  - Utilidades puras `shared/utils/cedula.ts` y `e164.ts`; el backend guarda los teléfonos como `593…`, sin "+".
  - El `PUT` es parcial: los opcionales vacíos van como `""` para borrarlos. El tipo de sangre no se puede borrar,
    porque el backend no acepta `""` en un enum.
  - El 409 del alta busca el documento con `GET /patients?query=` para mostrar el enlace a la ficha.
- **Hecho (005b):** `PatientReceptionPage` en `/pacientes/:id`.
  - Componentes dumb `patient-identity`, `admin-notes` (edición en línea, se guarda al salir) y
    `patient-appointments` (próximas y anteriores).
  - `AppointmentsApi.listByPatient`. La agenda acepta `?cita&accion=reprogramar` desde otras pantallas.
  - ODONTOLOGO y DIRECTOR ven solo la identificación.

### 5.6 Horarios de profesionales — tareas 006a (semana tipo) y 006b (excepciones y calendario) (P7)
- **Depende de:** 002. **Perfil:** SECRETARIA. **Ruta:** `/recepcion/horarios`.
- **API:** `GET /professionals` · `GET /professionals/{id}/schedules` · `POST /professionals/{id}/schedules` ·
  `PUT /schedules/{id}` · `POST /schedules/{id}/deactivate` · `GET /professionals/{id}/schedules/effective`.
- **Estructura:** `features/appointments/pages/schedules`, `components/{weekly-schedule,schedule-exceptions,
  effective-calendar}`.
- **Comportamiento:** selector de profesional; semana tipo lunes–sábado con turnos (08:00–12:00, 14:00–20:00 por
  defecto al añadir); excepciones por fecha (no atiende / horario especial); calendario mensual con el horario
  efectivo. "Desactivar" en lugar de borrar.
- **Test:** `schedules.page.spec.ts` — añadir turno → `POST …/schedules` → aparece en la semana; 409/400 → mensaje.
- **Prueba manual:** endodoncista solo martes; excepción de feriado; ver la agenda (003) de ese día.
- **Hecho (006a):** `/recepcion/horarios` con `SchedulesPage` y `SchedulesStore` (provisto por la página).
  - Componentes dumb `weekly-schedule` (domingo en `<details>`) y `shift-editor`.
  - `SchedulesApi.list/create/update/deactivate`; la hora se normaliza a `HH:mm`.
  - Sin `SCHEDULE_MANAGE` la página es solo de lectura.
- **Hecho (006b):** excepciones por fecha y calendario mensual efectivo en la misma página.
  - Excepciones: "No atiende" (`available: false`) u "Horario especial" (un `POST` por turno).
  - Calendario: `GET …/effective` del mes visible (`?mes=`). En `< 36rem` de contenedor pasa a lista.
  - Componentes dumb `schedule-exceptions`, `exception-form` y `effective-calendar`.

### 5.7 Consultorio: mis citas de hoy — tarea 007 (P8)
- **Depende de:** 002, 003 (reutiliza `AppointmentCard` y `appointmentDisplayState`) · [G-1].
- **Perfil:** ODONTOLOGO, DIRECTOR. **Ruta:** `/consultorio`.
- **API:** `GET /appointments?professionalId={me}&from&to` · `POST /appointments/{id}/check-in` ·
  `POST /appointments/{id}/encounter { chiefComplaint }` → `EncounterResponse`.
- **Estructura:** `features/dashboard/pages/dentist-board`, `components/{board-column,board-item,open-encounter-dialog}`,
  `domain/board-columns.ts`, `services/dentist-board.store.ts`; `features/clinical/services/encounters.api.ts`
  (`EncountersApi`, un API por recurso; la 008 lo amplía).
```
Mis citas · sáb 10 oct                                     12 hoy · 2 en espera · 1 en atención · 7 atendidas
┌──────────────────┬──────────────────┬──────────────────┬───────────────────────────┐
│ Agendadas        │ En espera        │ En atención      │ Atendidas                 │
├──────────────────┼──────────────────┼──────────────────┼───────────────────────────┤
│┃09:00 Romo Sol   │┃08:25 Pérez David│┃08:40 Vega Ana   │┃08:00 Soria Juan ✓         │
│┃Control ortod.   │┃Profilaxis       │ [ Continuar ]    │                           │
│ [Atender]        │ [ Atender ]      │                  │                           │
└──────────────────┴──────────────────┴──────────────────┴───────────────────────────┘
```
- **Comportamiento:**
  - "Atender" → diálogo con un solo campo, **motivo de consulta** (prefijo "Paciente refiere …", Enter confirma)
    → `POST …/encounter` → `/consultorio/atencion/:encounterId`. Si la cita aún no tiene check-in, se hace
    primero `POST …/check-in` (el paciente está en el sillón; el backend exige check-in).
  - "Continuar" (En atención) y "Ver" (Atendidas) → usan `encounterId` de la cita [G-1].
  - Refresco cada 60 s. Contadores arriba.
- **Responsive:** `≥ lg` 4 columnas; `< lg` pestañas con "En espera" seleccionada; botones de 48 px.
- **Test:** `dentist-board.page.spec.ts` — carga con `professionalId` del `/me` → tarjetas por columna; "Atender"
  con motivo → `POST …/encounter` → navega a la atención.
- **Prueba manual:** 1366, 1024 y 768 en tablet; director ve lo mismo con sus citas.
- **Hecho (007):** `/consultorio` con `DentistBoardPage` y `DentistBoardStore` (provisto por la página).
  - `boardColumn()` en `dashboard/domain`; cancelada, reprogramada y no asistió no se muestran.
  - Componentes `board-column`, `board-item` y `open-encounter-dialog` (CDK Dialog; recibe `submit` por `DIALOG_DATA`).
  - `EncountersApi.open` en `features/clinical`. `appointmentDisplayState`: los estados finales mandan sobre
    `checkedInAt` (antes una cita atendida salía "En espera") y "En atención" sale de G-1.

### 5.8 Atención: cabecera, antecedentes, motivo, diagnósticos y completar — tareas 008a y 008b (P9)
- **Depende de:** 007. **Perfil:** ODONTOLOGO, DIRECTOR. **Ruta:** `/consultorio/atencion/:encounterId`.
- **API:** `GET /encounters/{id}` · `GET /patients/{id}` · `GET /patients/{id}/clinical-record` ·
  `GET /medical-history-conditions` · `POST /clinical-records/{id}/history-entries` ·
  `POST /history-entries/{id}/void` · `PUT /clinical-records/{id}` · `PUT /encounters/{id}` ·
  `GET /icd10?query=` · `POST /encounters/{id}/diagnoses` · `POST /encounter-diagnoses/{id}/void` ·
  `POST /encounters/{id}/complete`.
- **Estructura:**
```
features/clinical/
  index.ts                         PatientClinicalHeaderComponent, EncountersApi (007), Encounter models
  clinical.routes.ts
  pages/encounter/                 orquesta: carga, formulario de cabecera, barra de completar
  components/patient-clinical-header/   identidad + chips de antecedentes + medicación
  components/history-drawer/       los 10 ítems del 033 (personal/familiar, pariente, "otro" con texto)
  components/diagnosis-list/       buscador CIE-10 (bd-combobox) + lista con PRE/DEF y Anular
  components/complete-bar/         barra fija: faltantes + "Completar atención"
  services/encounter.store.ts      signals del encuentro; guardado automático
```
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ David Pérez · 19 años · CI 05xx · HC-000123     ⚠ Diabetes  ⚠ Alergia a penicilina  │
│ Medicación: metformina                                [Antecedentes ▸] [Historial ▸] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ODONTOGRAMA (tareas 009–010; hasta entonces, espacio reservado)                     │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ Motivo* [Paciente refiere dolor en molar superior derecho                 ] ✓ guardado│
│ Enfermedad actual (opcional, una línea) [                                         ]  │
│ Diagnósticos [🔍 CIE-10: K02.1 o "caries"]   K02.1 Caries de la dentina (DEF|pre) ✕  │
│ Tratamientos (012) · Receta (013) · ▸ Más del 033 (011)                              │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                   Falta: 1 diagnóstico   [ Completar atención ]      │ ← fija
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- **Comportamiento:**
  - Antecedentes activos como chips coral con ⚠; "No refiere" si `noKnownHistory`; sin datos → botón
    "Registrar antecedentes" resaltado (primera vez). Drawer: los 10 ítems en el orden del 033, cada uno
    Personal / Familiar (+ pariente), "Otro" con descripción; medicación actual; "No refiere" (409 si hay
    entradas activas → mensaje).
  - Motivo y enfermedad actual: guardado automático (800 ms) con `PUT /encounters/{id}`. El PUT reemplaza la
    cabecera completa: el store conserva todos los campos del `EncounterResponse` y envía todos.
  - Diagnósticos: buscador CIE-10 (código o texto); al elegir se agrega con DEF por defecto; toggle PRE/DEF antes
    de agregar; 409 duplicado → mensaje; "Anular" pide motivo solo si la atención está cerrada.
  - "Completar atención": deshabilitado con la razón ("Falta motivo", "Falta 1 diagnóstico") → confirmación →
    `POST …/complete` → toast → `/consultorio`.
  - Atención cerrada (D-6): banner "Atención completada el … — puedes corregir"; mismos controles para el
    odontólogo que atendió; para otro odontólogo, solo lectura (403 → mensaje).
- **Responsive:** `< md` secciones apiladas; barra de completar fija abajo siempre; chips con scroll horizontal.
- **Test:** `encounter.page.spec.ts` — carga (encuentro, paciente, historia) → se ven chips de antecedentes;
  agregar diagnóstico → `POST …/diagnoses` → aparece; completar → `POST …/complete` → navega a `/consultorio`.
- **Prueba manual:** flujo completo con un paciente nuevo; recargar a mitad (el motivo persiste).
- **Decisiones (008a, `/impeccable shape` confirmado por el usuario el 2026-10-12):**
  - Se divide en 008a (cabecera de solo lectura, motivo, diagnósticos, completar) y 008b (panel de antecedentes).
  - El espacio del odontograma va como franja baja al final hasta la 009; en la 009 sube al lugar del boceto.
  - "Completar atención" sin confirmación: un clic, aviso y vuelta a `/consultorio` (reversible por D-6).
  - "Anular diagnóstico" con confirmación y sin motivo: `POST /encounter-diagnoses/{id}/void` no recibe body.
  - Los errores de negocio del backend son 409 (no 403). Si la atención es de otro odontólogo, la pantalla se
    abre en solo lectura desde el inicio.
- **Hecho (008a):** `/consultorio/atencion/:encounterId` con `EncounterPage` y `EncounterStore` (provisto por la página).
  - `EncountersApi.get/update/addDiagnosis/voidDiagnosis/complete`, `ClinicalRecordsApi.getByPatient`, `Icd10Api.search`.
  - Componentes `patient-clinical-header` (solo lectura), `encounter-notes`, `diagnosis-list` y `complete-bar`.
  - Guardado automático con versión de cambios (`changeVersion`/`savedVersion`); la búsqueda CIE-10 vive en el store.
  - Contra el backend real la cabecera no recibía la historia clínica hasta G-9 (resuelto en backend 005b `6fd4ab5`).
    El test no lo detectó porque el fixture usa `ApiResponse`, que es la forma correcta.
- **Hecho (008b):** panel de antecedentes en `bd-side-sheet` (`fullscreenBelowMd`) con `HistoryPanelStore` (provisto por la
  página), que escribe en `EncounterStore.clinicalRecord`. Componentes `history-panel`, `history-condition-row` y
  `history-entry-form`. Audit de la pantalla: 12/20; los P1 van en la 008c.
- **Hecho (008c):** sin tokens de paleta inexistentes en `src/` (se reemplazan por los de §2.3 o `color-mix`; la
  paleta no crece). La barra de completar es `sticky` y no tapa el sidebar. El ✕ de los chips tiene un área táctil de 44 px.

### 5.9 Odontograma: dibujo y lectura — tareas 009a y 009b (P10, parte 1)
- **Depende de:** 008. **API:** `GET /odontogram/catalog` (cache de sesión) · `GET /patients/{id}/odontogram`.
- **Estructura y reglas de dibujo:** §6. Se monta en la atención (sin edición todavía) y queda listo para la 014.
- **Test:** `encounter.page.spec.ts` (se amplía, 1 caso): con hallazgos de ejemplo → la pieza 16 muestra la cara M
  roja (atributo `data-condition`/`aria-label` "16 mesial: caries pendiente") y se ven los índices CPO.
- **Prueba manual:** comparar visualmente con el 033 en papel (`docs/reference/form-033.txt`, escaneo); 768 y 375.

- **Hecho (009a):** feature `odontogram` (`OdontogramComponent` dumb + `OdontogramStore` provisto por la página +
  `OdontogramApi` con el catálogo en caché). Dominio `odontogram-layout` (854×414), `surface-layout`, `tooth-names` y
  `finding-symbol`. Montado en la atención, entre la cabecera y el motivo.

- **Hecho (009b):** marcas de pieza (orden RECTANGLE→CROSS; triángulo con la punta hacia la raíz), piezas perdidas
  atenuadas, `span-band` (fija, removible, total; solapamiento 7 unidades hacia afuera), leyenda (`symbol-glyph` dividido
  por ámbito), cuadrantes con < 720 px (`ResizeObserver`), foco itinerante (`tooth-navigation`) y la salida
  `toothActivate` lista para la 010.

### 5.10 Odontograma: registro en la atención — tareas 010a y 010b (P10, parte 2)
- **Depende de:** 009. **API:** `POST /encounters/{id}/findings` · `POST /findings/{id}/void` ·
  `GET /encounters/{id}/findings` · recarga de `GET /patients/{id}/odontogram`.
- **Comportamiento:** interacción de §6 (2 clics por caries), panel de la pieza, anular lo de esta atención.
- **Test:** `encounter.page.spec.ts` (se amplía, 1 caso): clic en cara O de 36 → "Caries" → `POST …/findings`
  con `{toothCode:36, surfaceCode:'O', conditionId, status:'PENDING'}` → la cara se pinta roja.
- **Prueba manual:** registrar caries, obturación, extracción, endodoncia, prótesis fija (rango), movilidad y
  recesión; anular; tablet con el dedo.

- **Hecho (010a):** registro en 2 clics (cara → condición) con `tooth-panel`, `tooth-conditions` y
  `tooth-current-findings`; `finding-request` arma el body según el contrato. El store separa `loading` (inicial) de
  `refreshing` (recarga sin destruir la vista). Los hallazgos de la atención llevan "Anular" con confirmación. Vale
  para las temporales (cuentan en el ceo).

- **Hecho (010b):** modo "Elige la pieza final" (`spanMode`, `span-notice`, `validateSpanEnd`: misma arcada y
  dentición). Audit del odontograma (009a–010b): 16/20. Se corrigieron tokens `slate-400/700/900` heredados.

### 5.11 "Más del 033" — tarea 011 (P15)
- **Depende de:** 008. **API:** `PUT /encounters/{id}` (mismo store de la 008; rangos en la tarea).
- **Comportamiento:** sección plegable (cerrada por defecto) con: signos vitales (PA sistólica/diastólica, FC,
  temperatura, FR con los rangos del backend), examen estomatognático (12 regiones del 033 como casillas +
  descripción; botón "Sin patología aparente"), indicadores (enfermedad periodontal, maloclusión Angle I/II/III,
  fluorosis: `bd-segmented`), planes (casillas Biometría · Química sanguínea · Rayos X · Otros + una sola
  descripción, como en el papel; tarea 021 · backend 008b). Guardado automático. Editable con la atención cerrada (D-6). Indicador "033 incompleto" en la
  atención (falta algún signo vital o el examen). El indicador en el tablero queda fuera: `Appointment` no trae
  estos campos.
- **Test:** sin test nuevo (usa el mismo PUT ya probado); prueba manual.
- **Orden:** se ejecuta después de 012a–013b (prioridad del usuario, 2026-10-19); no depende de ellas.
- Tarea: `docs/tasks/011-mas-del-033.md`.

### 5.12 Tratamientos en la atención — tareas 012a y 012b (P11) · backend 010a/010b
- **Depende de:** 010 (odontograma editable). **Backend:** 010a `10abf5f`, 010b `cf9a6c9`.
- **API:** `GET /treatments?query=` (sin `query` = catálogo completo) · `POST /encounters/{id}/treatments` ·
  `GET /encounters/{id}/treatments` · `POST /performed-treatments/{id}/void` `{voidReason}` (§7.1).
- **012a — catálogo, registro y anular:** feature nuevo `treatments`. El catálogo se pide una vez por sesión y se
  filtra en el cliente (prefijo de código o nombre). Formulario del tratamiento elegido: cantidad 1, precio =
  `basePrice` (editable para descuentos), pieza (precargada desde el odontograma) y cara opcionales, diagnóstico
  (el primero activo por defecto, o "Sin diagnóstico"), nota. Lista con total por fila y **total de la sesión**
  (suma de los `total` del backend). Anular con motivo obligatorio. Test: registrar → aparece con su total; anular
  con motivo → se quita.
- **012b — ligar a un hallazgo:** select de hallazgos PENDING vigentes del paciente y atajo "Tratar" en el panel
  de la pieza. Con hallazgo, el body lleva `dentalFindingId` sin pieza ni cara (el backend las copia y crea el DONE:
  CARIES → FILLING, EXTRACTION → MISSING_CARIES, D-14c del backend). Después se recarga el odontograma (rojo → azul).
  Anular el tratamiento no anula el DONE. Test: tratar una caries → la cara pasa a obturación realizada.
- Tareas: `docs/tasks/012a-tratamientos-registro.md`, `docs/tasks/012b-tratamiento-hallazgo.md`.

### 5.13 Receta y PDF — tareas 013a y 013b (P12) · backend 011a/011b
- **Depende de:** 008. **Backend:** 011a `8dbfbd5`, 011b `a631bbb`.
- **API:** `GET /medications?query=` (1+ caracteres, con presets) · `POST /encounters/{id}/prescriptions` ·
  `PUT /prescriptions/{id}` (solo DRAFT; reemplaza ítems, D-16 del backend) · `GET /encounters/{id}/prescriptions` ·
  `POST /prescriptions/{id}/issue` · `POST /prescriptions/{id}/void` (sin motivo) · `GET /prescriptions/{id}/pdf`
  (binario).
- **013a — borrador:** feature `prescriptions`. Lista de recetas de la atención; editor en `bd-side-sheet`:
  diagnóstico de la atención (el primero por defecto, obligatorio), medicamento desde la primera letra, presets como
  botones que copian dosis/frecuencia/duración/indicaciones (editables), cantidad en texto libre, ítems locales hasta
  guardar, indicaciones generales con atajos. "Guardar borrador" = POST o PUT. Test: receta con preset → Borrador;
  409 de diagnóstico → mensaje en el editor.
- **013b — emitir e imprimir:** "Emitir e imprimir" (guardar → `issue` → PDF) en un clic. El PDF exige el Bearer:
  se descarga con `ApiClient.getBlob` y se abre con `URL.createObjectURL` en una pestaña abierta en el mismo clic
  (si el navegador la bloquea, botón "Abrir PDF") [F-13]. Emitida = inmutable: "Imprimir" y "Anular y rehacer"
  (anula y abre un borrador nuevo con los mismos datos). Test: emitir → Emitida y PDF; 409 → mensaje y sigue en
  borrador.
- Tareas: `docs/tasks/013a-receta-borrador.md`, `docs/tasks/013b-receta-emitir-pdf.md`.

### 5.14 Ficha clínica e historial inmediato — tarea 014 (P13) · backend clinical-summary
- **Backend pendiente:** `GET /patients/{id}/clinical-summary` es la tarea 011c del backend
  (`../bellidental-backend/docs/tasks/011c-historial-clinico.md`). Esta tarea no se redacta hasta que tenga commit.
  El endpoint trae solo la cabecera de la historia y las sesiones; antecedentes y odontograma salen de sus endpoints.
- **Ruta:** `/pacientes/:id` para ODONTOLOGO/DIRECTOR (y drawer "Historial ▸" en la atención).
- **API:** `GET /patients/{id}/clinical-summary`.
- **Comportamiento:** cabecera clínica (reutiliza `PatientClinicalHeader`), odontograma vigente en lectura,
  pendientes (hallazgos rojos), línea de tiempo de sesiones (N°, fecha, profesional, diagnósticos,
  procedimientos, recetas) como la sección 12 del 033; abrir una sesión muestra su detalle. Debe cargar < 1 s.
- **Test:** carga → se ven sesiones en orden y antecedentes.
- **Suma (2026-10-21):** el backend 011c ya tiene commit (`dc4ca61`). Para el DIRECTOR la ficha clínica muestra
  además el estado de cuenta en solo lectura (`PatientAccountSectionComponent` de `billing/index.ts`, sin
  "Registrar abono"; F-10) y el "Historial de cambios" del paciente (017). El ODONTOLOGO no ve la cuenta (403).

### 5.15 Cobros y comprobante — tareas 015a y 015b (P14, completa P5) · backend 012 `328c6fe`
- **Perfil:** SECRETARIA (`BILLING_READ` ve, `BILLING_CREATE` registra y anula). DIRECTOR (ADMIN tiene ambos
  permisos): solo lectura dentro de su ficha clínica, **pendiente de la 014** (hoy `/pacientes/:id` le muestra solo
  la identificación). ODONTOLOGO: **no** (sin `BILLING_*`, el backend responde 403) [F-10 corregida].
- **API (backend 012):** `GET /patients/{patientId}/account` · `POST /patients/{patientId}/payments`
  `{amount, method EFECTIVO|TRANSFERENCIA|TARJETA, encounterId?}` → `Payment` (201) ·
  `POST /payments/{id}/void` `{voidReason}` → `Payment` · `GET /payments/{id}/receipt` (PDF A5, binario). DTO en §7.1.
- **Estado de cuenta:** saldo **calculado** por el backend (nunca se guarda): cargos = tratamientos no anulados de
  atenciones no anuladas; abonos = pagos no anulados. Una sesión por atención (fecha, profesional, tratamientos
  «nombre x cantidad», cargo, abono, saldo acumulado) y, si hay pagos sin atención, una **sesión final con
  `encounterId = null`**. Sin Dg. ni columna "Estado" (F-3). Saldo negativo = a favor.
- **015a — estado de cuenta y abono:** feature `billing` (`PatientAccountSectionComponent` + `PatientAccountStore`
  exportados) en la ficha de recepción, una sola columna (F-19). "Registrar abono" (acento): monto = saldo si > 0,
  método Efectivo, sesión = la atención de hoy si existe (si no, "Sin sesión"); tras guardar se recarga la cuenta.
- **015b — comprobante y anular:** el `Payment` del abono recién registrado queda en una franja "Abono registrado
  C-000123" con "Imprimir comprobante" (`ApiClient.getBlob` + `URL.createObjectURL`, F-13) y "Anular" (motivo
  obligatorio). **Sin G-11 no hay forma de reimprimir o anular abonos de otras visitas** (la cuenta no trae ids de
  pago); eso queda para una 015c cuando exista `GET /patients/{id}/payments`. `pdf-window.ts` pasa a `shared/utils`.
- **Test:** `patient-reception.page.spec.ts` (+2 casos en 015a, +2 en 015b).

### 5.16 Estadísticas de la clínica — tareas 016a y 016b (P16) · backend 020 `81ee53d`
- **Perfil:** DIRECTOR (endpoint solo `hasRole('ADMIN')`, D-26 del backend). **Ruta:** `/direccion/estadisticas`.
- **API:** `GET /dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` (fechas de la clínica, inclusivas; ambas o
  ninguna → por defecto el mes actual; `from > to` o > 366 días → 400). DTO en §7.1.
- **Contenido real [F-9 corregida]:** tarjetas: atenciones completadas, pacientes nuevos (y activos), citas del
  período, inasistencia (% y n), cobrado, saldo por cobrar (histórico). Barras horizontales en CSS (sin librería):
  citas por estado y por canal (Recepción · Profesional · Bot · Sin cita), cobrado por método, atenciones y
  producción por profesional, top 5 tratamientos. **Ya no existe** en el backend: atenciones por día (serie),
  top 5 diagnósticos CIE-10 ni `colorTag` por profesional.
- **016a:** feature `management`, ruta, selector de período en la URL (Día · Semana · Mes · Rango; F-20), API,
  store, tarjetas. Mueve `clinical/domain/encounter-period.ts` a `shared/utils/calendar-period.ts`. Test de página.
- **016b:** gráficos y tablas (sin tests). `bar-list` (barras CSS, cifra siempre visible) en `management`;
  `billing/index.ts` exporta `PAYMENT_METHOD_LABELS`. `byProfessional` llega sin orden del backend: el frontend
  lo ordena por atenciones desc.
- **Responsive:** tarjetas 2×N en móvil (el director lo revisa en el teléfono).

### 5.17 Auditoría: historial de cambios en contexto — tarea 017 (P17) · backend 013 `64b68fd`
- **Perfil:** DIRECTOR (endpoint `hasRole('ADMIN')`). **Sin ruta propia** (F-15): G-7 no se resolvió, el backend
  solo da el historial de **un registro**: `GET /audit/{entity}/{id}` con `entity` ∈ `clinical-records`,
  `medical-history-entries`, `encounters`, `encounter-diagnoses`, `dental-findings`, `performed-treatments`,
  `prescriptions`, `prescription-items`, `payments`, `appointments`, `patients`.
- **Comportamiento:** diálogo reutilizable "Historial de cambios" (`AuditHistoryDialogService` de
  `management/index.ts`): por revisión, fecha y hora (Guayaquil), usuario, acción (Creó · Modificó · Anuló ·
  Eliminó) y cambios "campo: antes → después" con nombres de campo en español. Entradas: ficha del paciente
  (`patients`) y cabecera de la atención (`encounters`). Pagos (`payments`): cuando el director vea la cuenta (014).
  Se quitan la ruta `/direccion/auditoria` y el ítem "Auditoría" del menú.
- **Test:** `patient-reception.page.spec.ts` (+2 casos, director).

### 5.18 Formulario 033: vista e impresión — tareas 018a y 018b (P18, RF09) · backend 011c
- **Alcance:** RF09 pasa al MVP (usuario, 2026-10-19). **Ruta:** `/pacientes/:id/033` (ODONTOLOGO, DIRECTOR); enlaces
  "Formulario 033" en `/pacientes/:id` y en la cabecera de la atención. Sin entrada en el menú (siempre es de un
  paciente).
- **API:** `GET /patients/{id}/clinical-summary` (backend 011c) + paciente, historia clínica, condiciones, catálogo,
  odontograma y `GET /encounters/{id}` de la atención de referencia.
- **Comportamiento:** réplica de `docs/Form_033.pdf` (misma numeración y distribución) en hojas A4 de ancho fijo;
  lo impreso es lo que se ve (`window.print()` + `@page A4`), F-14. Secciones 1, 2, 4, 5, 7, 10 y 11 de la **atención
  de referencia** (por defecto la sesión 1, de apertura; selector `?sesion=N`). Odontograma vigente con
  `variant="form-033"`. Sección 12: 9 sesiones por hoja 2; más → hojas de continuación con NÚMERO DE HOJA.
  Quedan en blanco (se llenan a mano): embarazada, grupos "programado", regiones del examen, higiene oral
  simplificada, OTROS, fecha de control y firmas. 5–14 años → "no programado".
- **018a:** ruta, carga, selector, hoja 1 y secciones 10–11, accesos. Test: abrir → hoja con la apertura; cambiar
  de sesión → `GET /encounters/{id}` → cambian motivo y CIE.
- **018b:** sección 12, hojas de continuación, "Imprimir" y estilos de impresión. Sin tests.
- Tareas: `docs/tasks/018a-formulario-033-vista.md`, `docs/tasks/018b-formulario-033-tratamiento-e-impresion.md`.

### 5.19 Consultorio: mis atenciones — tarea 019 (P19)
- **Pedido del usuario (2026-10-19):** ver las atenciones propias anteriores por día, semana o mes y abrirlas para
  continuar o corregir (la corrección sigue la D-6, sin plazo). Entrada "Mis atenciones" en el sidebar.
- **API:** `GET /appointments?professionalId={me}&from&to` (sin backend nuevo); filas = citas con `encounterId`.
- **Comportamiento:** período en la URL (`?periodo=dia|semana|mes&fecha=`), semana lunes–domingo por defecto;
  tabla desc (fecha, hora, paciente, especialidad, estado, acción Continuar/Corregir/Ver); "Solo abiertas";
  `< sm` tarjetas. `bd-date-nav` gana `label` y `unit`.
- Tarea: `docs/tasks/019-mis-atenciones.md`.

### 5.20 Usuarios del director y cambio de contraseña — tareas 023a, 023b y 023c (P20, P21) · backend 019 `7fc03c2`
- **Requerimiento nuevo del usuario** (backend D-24, reemplaza D-13): el director (ADMIN) gestiona las cuentas.
  Contradecía el MVP-SCOPE ("sin UI de usuarios"); ya se actualizó.
- **API:** `GET /users` (todas las cuentas sin borrado lógico, activas e inactivas, incluye la del bot) ·
  `POST /users` `{email, username?, temporaryPassword, roles[]}` · `PUT /users/{id}/roles` `{roles[]}` ·
  `POST /users/{id}/reset-password` `{temporaryPassword}` · `POST /users/{id}/deactivate` · `/activate` ·
  `POST /professionals/{id}/access` `{email, temporaryPassword}` · `PUT /auth/password`
  `{currentPassword, newPassword}` (cualquier usuario). Reglas: roles asignables solo `ODONTOLOGO` y `SECRETARIA`
  (ADMIN → 400); contraseña ≥ 10 caracteres (400); temporal sin cambio forzado; no desactivarse a sí mismo (409);
  cuentas `is_system` y roles de un ADMIN intocables (409); `PUT /auth/password` con la actual incorrecta → **401**.
- **023a — lista, alta, activar/desactivar:** `/direccion/usuarios` en `management`; tabla con usuario, correo,
  roles, profesional vinculado (de `GET /professionals`, `userId`), estado, último acceso; alta en `bd-side-sheet`
  con contraseña temporal generable. Filas de ADMIN y sin roles (bot) sin acciones (F-17, G-12).
- **023b — cambiar mi contraseña:** `/cuenta/contrasena` (feature `auth`), enlace al pie del sidebar para todos.
  El `errorInterceptor` no cierra la sesión con el 401 de `/auth/password` (F-18).
- **023c — roles, restablecer contraseña y acceso de profesionales:** acciones por fila y sección "Profesionales
  sin cuenta" (`userId = null`) con "Dar acceso".

---

## 6. Odontograma (detalle técnico) — tareas 009 y 010

**Objetivo:** que se lea como el 033 en papel (`docs/reference/form-033.txt`, `odontograma-completo.txt`) y que
registrar un hallazgo cueste 2 clics.

**Disposición** (de arriba abajo; perspectiva del paciente: su derecha a la izquierda del observador):

| Fila | Contenido | Piezas |
|---|---|---|
| 1 | Recesión (casilla con clase I–IV) | 18…11 · 21…28 |
| 2 | Movilidad (casilla con grado 0–3) | 18…11 · 21…28 |
| 3 | Permanentes superiores (cuadrado de 5 caras) — etiqueta "Vestibular" a la izquierda | 18…11 · 21…28 |
| 4 | Temporales superiores (círculo de 5 caras), alineados bajo 15…11 / 21…25 | 55…51 · 61…65 |
| 5 | Temporales inferiores — etiqueta "Lingual" entre 4 y 5 | 85…81 · 71…75 |
| 6 | Permanentes inferiores — etiqueta "Vestibular" | 48…41 · 31…38 |
| 7–8 | Movilidad y recesión inferiores | 48…41 · 31…38 |

Línea media vertical entre cuadrantes; números FDI sobre (superior) o bajo (inferior) cada pieza. Temporales
siempre visibles [F-6]. Filas periodontales confirmadas por el usuario (F-11): Recesión es la exterior.

**Orientación de caras** (`domain/surface-layout.ts`):
- Superior: arriba = V, abajo = P (palatina); inferior: arriba = L, abajo = V; centro = O (I en incisivos y
  caninos: el `surfaceLabel` llega del backend).
- Cuadrantes 1, 4, 5, 8: izquierda = D, derecha = M. Cuadrantes 2, 3, 6, 7: izquierda = M, derecha = D.

**Dibujo (SVG con `viewBox`, un componente por pieza):**
- Cada pieza: cuadrado (permanente) o círculo (temporal) con 4 trapecios + centro, como en la ficha.
- Hallazgo de cara (scope SURFACE): la región se rellena con el color del símbolo; `SEALANT` dibuja `✱`.
- Hallazgo de pieza (TOOTH): la forma del símbolo sobre la pieza (CROSS, TRIANGLE, DOUBLE_SQUARE, RECTANGLE
  relleno, CIRCLE_CROSS con X negra). Periodontales (movilidad, recesión): el grado en su casilla de fila.
- Rango (SPAN): banda sobre la arcada superior o bajo la inferior entre `toothCode` y `endToothCode`
  (SQUARES_LINE punteada, `(···)`, `=`).
- `MISSING_*` vigente: la pieza se atenúa y solo muestra su símbolo.
- Forma, color, relleno y línea vienen del `symbol` de cada `FindingResponse`; el catálogo da nombres y qué
  condiciones aplican a cada scope. Nada de colores inventados.
- Accesibilidad: cada región es un `<path>` con `role="button"`, `aria-label` "16 mesial: caries pendiente" y foco
  visible. Teclado (ajustado en la 009b/010a): foco itinerante por pieza; ←→ recorre la fila, ↑↓ cambia de fila,
  Home/End; Enter selecciona la pieza y lleva el foco a los botones de cara del panel (≥ 44 px); Esc limpia la selección.
  El panel va dentro de la tarjeta (a la derecha en `≥ lg`, debajo en `< lg`), como el boceto, sin overlay.

**Interacción (solo en la atención y solo el odontólogo que atiende):**
1. Clic en una cara → panel con la cara preseleccionada y las condiciones SURFACE (Caries, Obturación, Sellante).
   Clic en "Caries" → `POST /encounters/{id}/findings` con el estado por defecto (si la condición solo tiene un
   estado, ese; si tiene dos, PENDING). **2 clics.**
2. Clic en el número de la pieza → condiciones de pieza (Extracción indicada, Pérdida, Endodoncia, Corona, Otro
   con nota).
3. Clic en una casilla de movilidad/recesión → selector de grado (`gradeMin…gradeMax`).
4. Prótesis (SPAN) → "Elige la pieza final" → clic en otra pieza de la misma arcada.
5. Pendiente (rojo) / Realizado (azul): `bd-segmented` en el panel; solo se habilitan los estados con símbolo.
6. El panel lista lo vigente de la pieza: lo registrado en esta atención tiene "Anular"; lo de atenciones
   anteriores es solo lectura (para cambiarlo se registra el estado nuevo: el último gana, D-14).
- Leyenda plegable con todos los símbolos del catálogo; CPO (C·P·O·total) y ceo bajo el odontograma.
- Modo lectura (`editable=false`): mismo componente sin panel (ficha clínica, historial).

**Estructura:**
```
features/odontogram/
  index.ts                         OdontogramComponent (inputs: patientId, encounterId?, editable)
  components/odontogram/           orquesta filas, selección y panel
  components/tooth/                SVG de una pieza (cuadrado o círculo) con sus 5 regiones
  components/tooth-panel/          panel lateral (≥ lg) / hoja inferior (< lg) con bd-side-sheet
  components/span-band/  components/periodontal-row/  components/odontogram-legend/  components/dental-indices/
  services/odontogram.api.ts       catálogo (cache), vigente, registrar, anular
  models/odontogram.models.ts
  domain/odontogram-layout.ts      filas y orden de las 52 piezas
  domain/surface-layout.ts         orientación de caras por pieza
  domain/finding-symbol.ts         hallazgo → región, forma, color
```
Responsive (ajustado en la 009a con el usuario): odontograma completo con **≥ 720 px de contenedor** y pestañas por
cuadrante (18–11 · 21–28 · 48–41 · 31–38, con sus temporales) por debajo. Geometría en unidades de `viewBox`
(`TOOTH` 40 y texto 15): con 720 px, el texto mide ≥ 12 px y la pieza unos 33 px. Con la columna de etiquetas no caben
piezas de 36 px y texto de 12 px a la vez, así que se prioriza el texto, y en la 010 las caras también se eligen con
los botones del panel (≥ 44 px). Caras del backend: `O V L M D`. `L` superior = palatina y `O` en incisivo o canino =
incisal (`SurfaceLabelResolver`).

---

## 7. Contrato con el backend

### 7.1 DTO usados (los `models/` del frontend los reflejan tal cual)
| Endpoint | Respuesta (`data`) |
|---|---|
| `POST /auth/login` `{email,password}` | `{ accessToken, expiresIn (segundos), roles[] }` |
| `GET /auth/me` | `{ userId, email, roles[], permissions[], professionalId? }` |
| `GET /patients?query&page&size` | `Page<Patient>` (size ≤ 50) |
| `GET/POST/PUT /patients[/{id}]` | `Patient { id, documentType, documentNumber, firstName, lastName, fullName, birthDate, age, sex, bloodType, bloodTypeLabel, phoneE164, email, emergencyContactName, emergencyContactPhoneE164, active }` (+ `adminNotes` [G-5]) |
| `GET /professionals[/{id}]` | `{ id, userId, fullName, licenseNumber, colorTag, specialties[{id,name,defaultDurationMinutes}], active }` |
| `GET /specialties` | `[{ id, name, defaultDurationMinutes }]` |
| `GET /professionals/{id}/schedules` | `[{ id, weekday 1–7, specificDate, startTime, endTime, available }]` |
| `GET …/schedules/effective?from&to` | `[{ date, shifts[{startTime,endTime}] }]` |
| `GET /availability?professionalId&specialtyId&date&durationMinutes?` | `[{ startAt, endAt }]` |
| `GET /appointments?professionalId?&from&to`, `GET /appointments/{id}` | `Appointment { id, patientId, patientName, professionalId, professionalName, colorTag, specialtyId, specialtyName, startAt, endAt, status, source, reason, notes, checkedInAt, rescheduledFromId }` (+ `encounterId`, `encounterStatus`, `encounterVoided` [G-1]) |
| `POST /appointments` | body `{ patientId, professionalId, specialtyId, startAt, endAt, reason?, notes? }` → `Appointment` |
| `POST /appointments/walk-in` | body `{ patientId, professionalId, specialtyId }` → `Appointment` |
| `POST /appointments/{id}/reschedule` | body `{ startAt, endAt, professionalId?, specialtyId? }` → `Appointment` |
| `POST /appointments/{id}/confirm · check-in · no-show · cancel` | solo `message` |
| `GET/POST /patients/{id}/clinical-record` | `{ id, recordNumber, openedAt, noKnownHistory, currentMedication, historyEntries[{ id, conditionId, conditionName, scope, relative, description, active }] }` |
| `GET /medical-history-conditions` | `[{ id, name, displayOrder }]` |
| `POST /clinical-records/{id}/history-entries` | body `{ conditionId, scope PERSONAL/FAMILY, relative?, description? }` |
| `PUT /clinical-records/{id}` | body `{ noKnownHistory?, currentMedication? }` |
| `POST /appointments/{id}/encounter` | body `{ chiefComplaint }` → `Encounter` |
| `GET/PUT /encounters/{id}` | `Encounter { id, appointmentId, patientId, professionalId, status OPEN/COMPLETED, startAt, endAt, closedAt, chiefComplaint, currentIllness, bpSystolic, bpDiastolic, heartRate, temperature, respiratoryRate, stomatognathicExam, stomatognathicRegions[] (1–12), periodontalDisease, fluorosis, malocclusion, diagnosticExams[] (BIOMETRIA·QUIMICA_SANGUINEA·RAYOS_X·OTROS), planDescription (backend 008b), voidedAt, voidReason, diagnoses[] }` |
| `GET /icd10?query` | `[{ id, code, description, category }]` (máx. 20) |
| `POST /encounters/{id}/diagnoses` | body `{ icd10Id, certainty PRESUMPTIVE/DEFINITIVE, notes? }` → `Diagnosis { id, icd10Id, code, description, certainty, notes, voidedAt }` |
| `POST /encounters/{id}/complete`, `POST /encounter-diagnoses/{id}/void` | `Encounter` / `message` |
| `GET /odontogram/catalog` | `{ teeth[{code,dentition,arch,quadrant,position,type}], surfaces[{code,name}], conditions[{id,code,name,category,scope,gradeMin,gradeMax,symbols[]}] }` |
| `GET /patients/{id}/odontogram` | `{ patientId, findings[], indices{cpoC,cpoP,cpoO,cpoTotal,ceoC,ceoE,ceoO,ceoTotal}, cariesSurfaces }` |
| `POST /encounters/{id}/findings` | body `{ toothCode, endToothCode?, surfaceCode?, conditionId, status PENDING/DONE, grade?, notes? }` → `Finding { id, toothCode, endToothCode, surfaceCode, surfaceLabel, conditionId, status, grade, notes, symbol{shape,color,secondaryColor,filled,lineStyle} }` |
| `GET /treatments?query?` | `[{ id, code, name, description, basePrice }]` (sin `query` = catálogo activo; 1 carácter → 400) |
| `POST /encounters/{id}/treatments` | body `{ treatmentId, quantity?, price?, encounterDiagnosisId?, toothCode?, surfaceCode?, notes?, dentalFindingId? }` → `PerformedTreatment { id, encounterId, treatmentId, treatmentCode, treatmentName, encounterDiagnosisId, dentalFindingId, toothCode, surfaceCode, quantity, price, total, notes, createdAt }` |
| `GET /encounters/{id}/treatments` · `POST /performed-treatments/{id}/void` `{ voidReason }` | `PerformedTreatment[]` (no anulados) · `message` |
| `GET /medications?query` | `[{ id, name, presentation, concentration, route, presets[{ id, label, dose, frequency, duration, instructions }] }]` (máx. 20, `query` 1+) |
| `POST /encounters/{id}/prescriptions` · `PUT /prescriptions/{id}` | body `{ encounterDiagnosisId, generalInstructions?, items[{ medicationId, medicationPresetId?, dose?, frequency?, duration?, quantity?, instructions? }] }` → `Prescription { id, encounterId, encounterDiagnosisId, icd10Code, icd10Description, status DRAFT/ISSUED, prescribedAt, generalInstructions, voided, items[{ id, medicationId, medicationName, presentation, concentration, medicationPresetId, dose, frequency, duration, quantity, instructions }] }` |
| `GET /encounters/{id}/prescriptions` · `GET /prescriptions/{id}` · `POST /prescriptions/{id}/issue` · `/void` | `Prescription[]` (no anuladas) · `Prescription` |
| `GET /prescriptions/{id}/pdf` | binario `application/pdf` (sin `ApiResponse`; 409 JSON si no está emitida) |
| `GET /patients/{id}/clinical-summary` (backend 011c) | `{ patientId, clinicName, recordNumber, openedAt, openedBy{id,fullName,licenseNumber}, sessions[{ encounterId, sessionNumber, startAt, status, professional{…}, diagnoses[{id,code,description,certainty,notes}], treatments[{id,code,name,toothCode,surfaceCode,quantity}], prescriptions[{id,prescribedAt,generalInstructions,items[{medicationName,concentration,presentation,dose,frequency,duration,quantity}]}] }] }` (sesiones = atenciones no anuladas por `startAt`; recetas solo ISSUED) |
| `GET /patients/{patientId}/account` (`BILLING_READ`; backend 012) | `{ patientId, patientName, totalCharges, totalPayments, balance, sessions[{ encounterId (null = pagos sin atención, sesión final), date, professionalName (null en la final), treatments[] ("Profilaxis x1"), charge, payment, runningBalance }] }` (orden ascendente; montos `number` con 2 decimales; `balance` < 0 = a favor) |
| `POST /patients/{patientId}/payments` (`BILLING_CREATE`) | body `{ amount (≥ 0.01, 8+2 dígitos), method EFECTIVO/TRANSFERENCIA/TARJETA, encounterId? }` → 201 `Payment { id, patientId, encounterId, amount, method, receiptNumber "C-000001", paidAt, receivedBy, voided, voidReason }` (atención de otro paciente o anulada → 409) |
| `POST /payments/{id}/void` (`BILLING_CREATE`) | body `{ voidReason }` (obligatorio, 400) → `Payment` con `voided: true` (ya anulado → 409) |
| `GET /payments/{id}/receipt` (`BILLING_READ`) | binario `application/pdf` A5 (sin `ApiResponse`; 404 JSON si no existe) |
| `GET /audit/{entity}/{id}` (ADMIN; backend 013) | `[{ revision, at (Instant UTC, "…Z"), userId, username (null = proceso sin usuario), type ADD/MOD/DEL, changes[{ field (nombre Java: "chiefComplaint", "voidedAt"…), oldValue, newValue }] }]` (texto; de la más antigua a la más reciente; entidad desconocida → 404; registro sin historial → `[]`) |
| `GET /dashboard/summary?from&to` (ADMIN; backend 020) | `{ from, to, patients{ totalActive, newInRange }, appointments{ total, byStatus{PENDING,CONFIRMED,ATTENDED,CANCELLED,NO_SHOW,RESCHEDULED}, noShowRate (0–100, 1 decimal), completedEncounters }, billing{ collected, byMethod{EFECTIVO,TRANSFERENCIA,TARJETA}, outstandingBalance }, topTreatments[{ code, name, quantity, amount }] (≤ 5), byProfessional[{ professionalId, name, encounters, revenue }], byChannel[{ source RECEPTION/PROFESSIONAL/BOT/WALK_IN, appointments }] }` |
| `GET /users` · `GET /users/{id}` (ADMIN; backend 019) | `User { id, username, email, active, lastLoginAt, createdAt, roles[] }` (lista: todas las cuentas sin borrado lógico, por `createdAt` desc; sin `isSystem` ni profesional [G-12]) |
| `POST /users` · `PUT /users/{id}/roles` · `POST /users/{id}/deactivate` · `/activate` | body `{ email, username?, temporaryPassword, roles[] }` → 201 `User` · `{ roles[] }` → `User` · sin body → `User` |
| `POST /users/{id}/reset-password` · `PUT /auth/password` | `{ temporaryPassword }` · `{ currentPassword, newPassword }` → solo `message` ("Contraseña restablecida." / "Contraseña actualizada."); actual incorrecta → 401 con `message` "Credenciales inválidas" |
| `POST /professionals/{id}/access` (ADMIN) | body `{ email, temporaryPassword }` → 201 `User` con rol ODONTOLOGO (ya tiene cuenta → 409) |
| `GET /professionals` (completo) | además de lo de arriba: `userId` es **`null`** si el profesional no tiene cuenta; también `documentType, documentNumber, firstName, lastName, phoneE164, createdAt, updatedAt` |

Al redactar cada tarea Claude confirma el DTO si el backend cambió desde esta tabla.

### 7.2 Faltantes en el backend
| ID | Falta | Bloquea | Propuesta | Tarea backend |
|---|---|---|---|---|
| G-1 | `Appointment` no trae `encounterId` ni `encounterStatus` | "En atención" y "Continuar" (007), ir de la cita a la atención | Añadirlos (null si no hay atención) + `encounterVoided` (atención anulada: sin "Continuar") | **Resuelto** (backend 006e `5d7f145`) |
| G-2 | `/auth/me` sin nombre para mostrar | Sidebar (002) | `displayName` (profesional: nombre; si no, username) | opcional |
| G-3 | Tratamientos, recetas, cobros, clinical-summary | 012–015 | Tareas backend 010, 011, 012 y clinical-summary | **Resuelto**: 010a `10abf5f`, 010b `cf9a6c9`, 011a `8dbfbd5`, 011b `a631bbb`, 011c `dc4ca61`, cobros 012 `328c6fe` |
| G-10 | Estado del recordatorio de WhatsApp por cita (enviado, confirmó, canceló) y consentimiento del aviso por paciente | Nada del MVP (opcional) | Si la clínica lo pide: `reminderStatus` en `Appointment` y `privacyConsentAt` en la ficha | posterior al MVP |
| G-4 | `GET /appointments` no filtra por paciente | Citas en la ficha (005) | `patientId` opcional; con él, `from/to` opcionales | **Resuelto**: backend 006d (`8a8bf7f`, `PatientRecordApiIT`) |
| G-5 | `PatientResponse` y `CreatePatientRequest` sin `adminNotes` (solo `UpdatePatientRequest` lo tiene) | Observaciones en la ficha (005) | Añadir `adminNotes` a ambos | **Resuelto**: backend 006d (`8a8bf7f`) |
| G-6 | No hay estadísticas | 016 | `GET /stats/summary?from&to` (ADMIN) con las cifras de §5.16 | **Resuelto con cambios** (backend 020 `81ee53d`): `GET /dashboard/summary`; sin atenciones por día ni top CIE-10 (F-9) |
| G-7 | Auditoría solo por registro (`GET /audit/{entity}/{id}`) | Lista de la 017 | `GET /audit?from&to&userId&entity&page` (ADMIN), o al menos `?patientId=` | **No resuelto** (backend 013 `64b68fd` solo por registro). La 017 usa historial en contexto (F-15); la pantalla `/direccion/auditoria` vuelve si se hace |
| G-11 | Ningún endpoint lista los pagos de un paciente con su `id` (`AccountResponse` solo trae sumas por sesión; no hay `GET /payments/{id}`) | Reimprimir el comprobante o anular un abono de otra visita (015c) | `GET /patients/{patientId}/payments` (`BILLING_READ`) → `Payment[]` por `paidAt` desc, con anulados | nueva (backend), opcional para el MVP |
| G-12 | `UserResponse` no trae `system` ni el profesional vinculado | 023a/023c: el frontend no sabe qué cuentas son del sistema (bot) | Añadir `system: boolean` (y `professionalId?`) a `UserResponse` | opcional; mientras tanto, heurística F-17 |
| G-13 | `PUT /auth/password` con la actual incorrecta responde 401 "Credenciales inválidas" (el handler global de `BadCredentialsException` pisa el mensaje "La contraseña actual no es correcta.") | 023b muestra un texto propio | Que el handler use `ex.getMessage()` o lanzar otra excepción (400/409) | opcional |
| G-8 | Ningún endpoint de `ScheduleController` usa `ApiResponse` (GET y POST `/professionals/{id}/schedules`, `…/effective`, `PUT /schedules/{id}`, `POST /schedules/{id}/deactivate`) | Agenda (003a), horarios (006) | Envolver en `ApiResponse` como el resto (decisión del usuario: corregir el backend) | **Resuelto**: backend 006c (`ScheduleApiIT`) |
| G-9 | `ClinicalRecordController` no usa `ApiResponse` (clinical-record, PUT, conditions, history-entries, void); `currentMedication` vacía no se puede borrar | Cabecera clínica (008a: recibe `undefined` contra el backend real) y antecedentes (008b) | Envolver en `ApiResponse` y que `currentMedication` vacía pase a `null` | **Resuelto** (backend 005b `6fd4ab5`) |

## 8. Decisiones
| ID | Decisión | Estado |
|---|---|---|
| F-1 | Menú de recepción: Inicio = agenda del día; la ficha se abre desde el buscador o una cita | Aprobada |
| F-2 | Sin "Tratamientos" en el menú del odontólogo (se registran en la atención) | Aprobada |
| F-3 | Sin columna "Estado" en la tabla de la ficha (el saldo lo dice) | Aprobada |
| F-4 | Sesión en `localStorage`, expira a las 24 h; "Cerrar sesión" siempre visible (§2.2) | Aprobada (usuario) |
| F-5 | Paleta de `paleta.txt` ampliada en tonos azulados con antagonistas dorado/coral (§2.3) | Aprobada (usuario) |
| F-6 | Dentición temporal siempre visible, como en el 033 | Aprobada |
| F-7 | Íconos `lucide-angular` (locales) | Aprobada |
| F-8 | Tres perfiles; director = odontólogo + estadísticas + ~~auditoría~~ usuarios + historial de cambios en contexto (F-15), sin vista de recepción (§3.1) | Aprobada (usuario); ampliada 2026-10-21 (usuarios, backend D-24) |
| F-9 | Estadísticas: ~~atenciones, pacientes nuevos, inasistencias, ingresos, saldo pendiente, origen de citas, top 5 tratamientos y diagnósticos~~ → **lo que da `GET /dashboard/summary`**: atenciones completadas, pacientes nuevos y activos, citas por estado y canal, inasistencia %, cobrado (total y por método), saldo por cobrar, atenciones y producción por profesional, top 5 tratamientos. Sin serie por día ni top CIE-10 (§5.16) | Corregida (2026-10-21, backend 020) |
| F-10 | ~~Odontólogo y~~ El director ve el estado de cuenta en su ficha clínica, solo lectura (014). El odontólogo **no**: no tiene `BILLING_READ` (403). Si la clínica lo quiere, el backend debe darle ese permiso | Corregida (2026-10-21, backend 012) |
| F-11 | Filas periodontales del 033: Recesión es la fila exterior y Movilidad va junto a los dientes, en espejo abajo (como el boceto) | Aprobada (usuario, 2026-10-12) |
| F-12 | Bot de WhatsApp sin pantallas en el MVP: no hay bandeja de mensajes (la conversación vive en el agente, en memoria, y derivar = enlace al WhatsApp de recepción, D-3/D-19 del backend). Lo que hace el bot se ve en la agenda: citas `source=BOT` (ícono y "Agendada por el bot"), confirmaciones y cancelaciones del recordatorio como cambios de estado (refresco periódico), reprogramaciones con su cita nueva | Propuesta (2026-10-19) |
| F-13 | PDFs (receta, comprobante) por `ApiClient.getBlob` + `URL.createObjectURL` en una pestaña abierta en el clic; fallback "Abrir PDF" | Propuesta (2026-10-19) |
| F-14 | Formulario 033 (RF09, ahora en el MVP): vista e impresión con el mismo HTML A4 (`window.print()`), no PDF del backend, para reutilizar el odontograma SVG. Dentro de la hoja: colores oficiales como tokens `--form033-*` y unidades `mm`/`pt` (documento de tamaño fijo, excepción a §2.3 y a `responsive/SKILL.md`). Atención de referencia = apertura, con selector. Campos que el sistema no guarda, en blanco | Aprobada (usuario, 2026-10-19) |
| F-15 | Auditoría sin pantalla propia mientras no exista G-7: diálogo "Historial de cambios" (entidad + id) solo para el perfil DIRECTOR, abierto desde la ficha del paciente y la cabecera de la atención (pagos, cuando el director vea la cuenta en la 014). Se quitan `/direccion/auditoria` y "Auditoría" del menú: una búsqueda por tipo + UUID no le sirve al director, que nunca ve UUID | Propuesta (2026-10-21) |
| F-16 | Feature `management` (ya previsto en `architecture/SKILL.md`) agrupa estadísticas, historial de cambios y usuarios del director; otros features solo usan su `index.ts` (`AuditHistoryDialogService`) | Propuesta (2026-10-21) |
| F-17 | Usuarios: filas con rol ADMIN (el director) o sin roles (cuenta del bot) se muestran sin acciones (el backend respondería 409); heurística hasta G-12. Contraseña temporal visible y con botón "Generar" (12 caracteres con `crypto.getRandomValues`) para dictarla; sin cambio forzado en el primer ingreso (backend D-24). Cambio de email (`PUT /users/{id}`) fuera de alcance | Propuesta (2026-10-21) |
| F-18 | "Cambiar contraseña" como página `/cuenta/contrasena` (todos los perfiles) enlazada al pie del sidebar; el `errorInterceptor` excluye `/auth/password` del cierre de sesión por 401 y la página muestra "La contraseña actual no es correcta." (G-13) | Propuesta (2026-10-21) |
| F-19 | Cobro en la ficha de recepción: estado de cuenta en una sola columna, antes de "Citas" (la tabla de 6 columnas no cabe a media página). Abono: monto = saldo si > 0, método Efectivo, sesión = atención de hoy si la hay. Comprobante y anular solo del abono recién registrado hasta G-11 | Propuesta (2026-10-21) |
| F-20 | Estadísticas: período en la URL (`?periodo=` día, semana, mes o rango, con `fecha` o `desde`/`hasta`), mes actual por defecto; siempre se envían `from` y `to`; barras horizontales en CSS sin `colorTag`. Las funciones de período de la 019 pasan a `shared/utils/calendar-period.ts` (las usan clinical y management) | Propuesta (2026-10-21) |
| F-21 | `pdf-window.ts` (abrir pestaña en el clic, poner el blob, liberar la URL) pasa de `prescriptions/services` a `shared/utils`: lo usan recetas y cobros | Propuesta (2026-10-21) |

## 9. Orden y seguimiento de tareas
| Tarea | Pantalla | Depende de (frontend · backend) | Estado |
|---|---|---|---|
| 001 | Base, sesión y login | — | Commit `cb2b6e1` |
| 002a | Shell y perfiles | 001 · (G-2 opcional) | Commit `8320033` |
| 002b | Buscador global de pacientes | 002a | Commit `3cbf525` |
| 002c | Shell y buscador: hover en sidebar, feedback de foco y cédula | 002b | Aprobada |
| 003a | Agenda del día (lectura) | 002b · G-8 | Commit `efa8233` |
| 003b | Agenda: panel y acciones de estado | 003a | Commit `cee09ad` |
| 003c | Agenda: pulido tras la auditoría (panel no modal en lg+, 44 px táctil, a11y) | 003b | Commit `221b5f5` |
| 004a | Nueva cita (formulario, slot-picker, clic en hueco de la grilla) | 003c | Commit `a11593e` |
| 004b | Sin cita (walk-in) y reprogramar | 004a | Commit `266d779` |
| 004c | Nueva cita y reprogramar: bloques de 15 min y duración elegida | 004b · backend 006f | Aprobada |
| 005a | Pacientes: alta y edición | 002b · G-5 | Commit `2b80240` |
| 005b | Pacientes: ficha de recepción (identificación, observaciones, citas) | 005a · G-4 | Commit `0a63492` |
| 006a | Horarios: semana tipo por profesional | 002 · G-8 | Commit `417bed3` |
| 006b | Horarios: excepciones por fecha y calendario efectivo | 006a | Commit `5975e18` |
| 007 | Consultorio: mis citas de hoy | 003 · G-1 | Commit `eae126f` |
| 008a | Atención: cabecera, motivo, diagnósticos, completar | 007 | Commit `c220096` |
| 008b | Atención: panel de antecedentes (033) | 008a · G-9 | Commit `dc6099c` |
| 008c | Tokens de color inexistentes y ajustes del audit de la atención | 008b | Commit `3d0d014` |
| 009a | Odontograma: estructura, caras, filas periodontales e índices | 008 · F-11 | Commit `c0ec93a` |
| 009b | Odontograma: símbolos de pieza, rangos, leyenda, cuadrantes y teclado | 009a | Commit `aba5a95` |
| 010a | Odontograma: registro con el panel de la pieza (cara, pieza, periodontal, anular) | 009b | Commit `525688d` |
| 010b | Odontograma: prótesis en rango ("Elige la pieza final") | 010a | Commit `045e93b` (ejecutó Haiku) |
| 012a | Tratamientos: catálogo, registro, total de la sesión y anular | 010b · backend 010a | Commit `201b522` (ejecutó Haiku) |
| 012b | Tratamiento ligado a un hallazgo (rojo → azul) y "Tratar" en el panel | 012a · backend 010b | Commit `0113586` (ejecutó Haiku) |
| 013a | Receta: armar y guardar el borrador | 008 · backend 011a | Commit `84ff88f` (ejecutó Haiku) |
| 013b | Receta: emitir e imprimir (PDF), reimprimir y anular | 013a · backend 011b | Commit `1b22cc4` (ejecutó Haiku) |
| 011 | Más del 033 | 008 | Commit `fa8d43b` (ejecutó Haiku) |
| 014 | Ficha clínica e historial | 009 · backend clinical-summary | — |
| 015a | Cobros: estado de cuenta y registrar abono (ficha de recepción) | 005b · backend 012 `328c6fe` | Aprobada (ejecutó Haiku) |
| 015b | Cobros: comprobante PDF y anular el abono recién registrado | 015a · 013b (`getBlob`) | Aprobada (ejecutó Haiku) |
| 015c | Cobros: lista de pagos del paciente (reimprimir, anular) | 015b · G-11 | — (bloqueada por G-11) |
| 016a | Estadísticas: ruta, período, API y tarjetas | 002 · 019 · backend 020 `81ee53d` | Aprobada (ejecutó Haiku) |
| 016b | Estadísticas: gráficos de barras y tablas | 016a | Aprobada (ejecutó Haiku) |
| 017 | Historial de cambios (auditoría en contexto) y retiro de `/direccion/auditoria` | 016a (`management`) · backend 013 `64b68fd` | Redactada |
| 023a | Usuarios del director: lista, alta, activar/desactivar | 016a (`management`) · backend 019 `7fc03c2` | Redactada |
| 023b | Cambiar mi contraseña (todos los perfiles) | 002a · backend 019 | Redactada |
| 023c | Usuarios: roles, restablecer contraseña y acceso de profesionales | 023a | Redactada |
| 018a | Formulario 033: vista (hoja 1, secciones 10–11), datos y atención de referencia | 011 · backend 011c `dc4ca61` | Aprobada (ejecutó Haiku) |
| 018b | Formulario 033: sección 12, hojas de continuación e impresión | 018a | Aprobada (ejecutó Haiku) |
| 019 | Consultorio: mis atenciones (día/semana/mes) | 007 · 008 | Aprobada (ejecutó Haiku) |
| 020 | Ajustes: pieza completa, textos largos, sesión 24 h, logo y margen de la receta | 019 | Aprobada (ejecutó Haiku) |
| 021 | Casillas del 033: regiones del examen (sección 5), exámenes del plan y descripción única (sección 10) | 011 · 018a · backend 008b `eac5068` | Aprobada (ejecutó Gemini) |
| 021a | Examen estomatognático: un campo por región marcada, confirmación al desmarcar | 021 | Aprobada (ejecutó Haiku) |
| 022 | Imagen Docker (nginx) y CI a GHCR (push a `main`+`develop`; imagen solo en `main`) | backend 018a | Aprobada (ejecutó Haiku) |
| 022b | Job `deploy` por SSH al VPS de Contabo (cuando el VPS y los secretos estén listos) | 022 · backend 018a | Aprobada (ejecutó Haiku) |

Estados: — (sin redactar) · Redactada · En corrección · Aprobada · Commit `<hash>`.
Ruta crítica para la tesis (TGA): 001 → 002a → 002b → 003a → 003b → 003c → 004a → 004b → 007 → 008 → 009/010 → 012a → 012b → 013a → 013b → 015a → 015b.
Orden de ejecución desde el 2026-10-19: 012a → 012b → 013a → 013b → 011; después backend 011c → 018a → 018b → 014
(las tres usan `clinical-summary`) y 015 cuando exista backend 012.
Orden desde el 2026-10-21 (backend 012, 013, 019 y 020 terminados): **015a → 015b → 016a → 016b → 017 → 023a →
023b → 023c**, después 014 (ficha clínica; suma la cuenta de solo lectura del director y el historial de pagos) y
015c cuando exista G-11. 016a va antes de 017 y 023a porque crea el feature `management`.
