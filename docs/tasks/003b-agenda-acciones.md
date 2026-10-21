# 003b — Agenda: panel de cita y acciones de estado

## Objetivo
Completar la agenda de recepción (plan §5.3, acciones de estado de P4): marcar la llegada con **un clic** desde la
tarjeta y abrir el panel de la cita con sus datos y las acciones según el estado (Confirmar, Llegó, No asistió,
Cancelar). Crea `bd-side-sheet` y `ConfirmDialog`, que reutilizarán la 004 y la 008.

**Depende de:** 003a aprobada. Fuera de alcance: Reprogramar, Nueva cita y Sin cita (004); "En atención" (G-1).

## Brief de diseño (`/impeccable shape`, aprobado por el usuario)
- La acción más frecuente es **"Llegó"**: botón directo en la tarjeta (1 clic), solo si la cita es de **hoy**,
  está PENDING/CONFIRMED sin `checkedInAt` y dura ≥ 30 min (las de 15 min no tienen espacio para 44 px: allí va en
  el panel). En la vista por estado y en la lista `< md` lo llevan todas las tarjetas que cumplan la regla.
- Clic en la tarjeta → panel (`bd-side-sheet`): a la derecha en `lg+`, hoja inferior en `< lg`. Tarjeta abierta
  resaltada en la grilla.
- Acciones del panel según estado; **la acción probable va primero** con `.btn-primary`, el resto `.btn-outline`;
  Cancelar con `.btn-ghost` en tono de peligro y separado. Sin dorado: el acento de la pantalla queda para
  "Nueva cita" (004).
- Tras cada acción: el botón muestra carga y no admite doble envío → toast con el `message` del backend →
  se vuelve a pedir `GET /appointments` → la tarjeta cambia de estado en su lugar; el panel sigue abierto con el
  estado nuevo (salvo tras cancelar, que lo cierra).

## Archivos a tocar
```
src/app/
  shared/components/
    side-sheet/                    (nuevo) bd-side-sheet: CDK Overlay; derecha en ≥ lg (ancho 26rem), hoja inferior
                                   en < lg (máx. 85vh, asa para arrastrar opcional); role="dialog", aria-labelledby,
                                   foco atrapado (cdkTrapFocus) y devuelto al origen al cerrar; Esc y botón cerrar
    confirm-dialog/                (nuevo) ConfirmDialog con CDK Dialog: confirmDialog.open({ title, message,
                                   confirmLabel, tone: 'danger' | 'primary', reasonLabel? }) → Observable<
                                   { confirmed: boolean; reason?: string }>; el campo de motivo es opcional
                                   (aquí no se usa; lo usará la 008)
  features/appointments/
    services/appointments.api.ts   + confirm(id), checkIn(id), noShow(id), cancel(id) → Observable<string> (message)
    services/agenda.store.ts       + selectedAppointmentId, pendingAction, actionError; runAction(id, action)
    domain/appointment-state.ts    + availableActions(appointment, now, isToday) → lista de acciones permitidas
    components/appointment-card/   + botón "Llegó" en el espacio [actions] (lo pinta la página o la vista)
    components/appointment-panel/  (nuevo, dumb) detalle + botones; inputs: appointment, actions, pendingAction,
                                   error; outputs: action, close
    pages/reception-agenda/        abre/cierra el panel, conecta acciones con el store y el ConfirmDialog
```
`NotificationService` (002a) para los toasts.

## Criterios de aceptación
**Reglas de las acciones** (backend `AppointmentTransitions`, confirmado):
1. Confirmar: solo `PENDING`.
2. Llegó (check-in): `PENDING`/`CONFIRMED` sin `checkedInAt`. El backend no limita el día; la interfaz lo ofrece
   solo si la cita es de hoy (`ClinicClock`).
3. No asistió: `PENDING`/`CONFIRMED` sin `checkedInAt`; la interfaz lo ofrece solo cuando `startAt` ya pasó.
4. Cancelar: `PENDING`/`CONFIRMED` (con o sin llegada); pide confirmación: "¿Cancelar la cita de David Pérez de las
   10:30?" con botones "Cancelar cita" (peligro) y "Volver". Sin motivo (el backend no lo recibe).
5. Atendida, No asistió, Cancelada y Reprogramada: sin acciones; el panel solo informa.
6. Los botones se muestran también según el **permiso** (`hasPermission`): `APPOINTMENT_UPDATE` para Confirmar,
   Llegó y No asistió; `APPOINTMENT_CANCEL` para Cancelar. Nunca por nombre de rol.
7. Endpoints: `POST /api/v1/appointments/{id}/confirm|check-in|no-show|cancel` sin cuerpo; todos devuelven solo
   `message` (`ApiClient.post<string>`).

**Panel**
8. Contenido: paciente (enlace a `/pacientes/:id`), `bd-status-badge`, fecha y hora "sáb 10 oct · 10:30–11:00",
   profesional con su punto `colorTag`, especialidad, motivo, origen ("Recepción", "Profesional", "Bot", "Sin
   cita"), notas, y "Llegó a las 10:12" si tiene `checkedInAt`. Título del diálogo = nombre del paciente.
9. Error de la acción (409/400 del backend, p. ej. "La cita ya tiene check-in."): `bd-alert` dentro del panel con
   el `message`, y se recarga la lista (otro usuario o el bot pudo cambiarla). 403 → "No tienes permiso para esta
   acción." 0 → "No se pudo conectar con el servidor."
10. Si el refresco de 60 s trae la cita abierta con otro estado, el panel se actualiza; si ya no existe en el día,
    se cierra con un toast "La cita ya no está en este día".

**Tarjeta**
11. "Llegó" en la tarjeta: `<button>` hermano del botón principal (no anidado), ≥ 44 × 44 px, ícono + texto
    "Llegó", `aria-label` "Registrar llegada de David Pérez". Mientras se envía: carga y deshabilitado; al terminar,
    toast y la tarjeta pasa a "En espera".

## Responsive
Revisar en **375, 768, 1024, 1366 y 1920**:
- `≥ lg`: panel lateral derecho de 26rem sobre la grilla (sin moverla); la tarjeta abierta queda visible.
- `< lg`: hoja inferior (máx. 85vh) con scroll interno; los botones de acción quedan fijos al pie de la hoja.
- Botones del panel a todo el ancho en `< sm`.

## Tests requeridos
Solo integración: se amplía `reception-agenda.page.spec.ts` (no se crea otro spec), reutilizando las fixtures de la
003a. 2 casos nuevos:
1. clic en "Llegó" de la cita PENDING de hoy → `POST /api/v1/appointments/{id}/check-in` → responde `message` →
   nuevo `GET /api/v1/appointments` (responder la misma cita con `checkedInAt`) → la tarjeta dice "En espera" y se
   ve el toast con el `message`;
2. abrir el panel de una cita → "Cancelar" → confirmar en el diálogo → `POST …/cancel` responde 409 con
   `message` "Solo se pueden cancelar citas en estado PENDING o CONFIRMED." → el mensaje se ve dentro del panel.

## Prueba manual
Con el backend en `:8080` y `npx ng serve`, como secretaria:
1. Cita de hoy agendada → "Llegó" desde la tarjeta → toast y pasa a "En espera" sin abrir nada.
2. Abrir una cita PENDING → Confirmar → "Confirmada ✓". Cita cuya hora ya pasó → "No asistió". Cancelar con
   confirmación → desaparece (o se ve tachada con "Ver canceladas").
3. Abrir la misma cita en dos pestañas; marcar "Llegó" en una y luego en la otra → mensaje del backend en el panel.
4. Teclado: Tab hasta una tarjeta, Enter abre el panel, Esc lo cierra y el foco vuelve a la tarjeta.
5. Anchos 375, 768, 1024, 1366 y 1920 (panel lateral vs hoja inferior).

## Resultado
- **Qué se hizo:**
  - `src/app/shared/components/side-sheet/`: componente `bd-side-sheet` con soporte responsivo (panel lateral derecho de 26rem en `≥ lg` (1200px), hoja inferior de máx. 85vh en `< lg` con asa superior), `role="dialog"`, `aria-labelledby`, foco atrapado con CDK TrapFocus (`cdkTrapFocus`, `cdkTrapFocusAutoCapture`) y restauración del foco al elemento de origen al cerrar, soporte para tecla Esc y botón de cerrar. Backdrop con `color-mix(in srgb, var(--blue-950) 60%, transparent)` y `backdrop-filter: blur(2px)` alineado con `.drawer-backdrop`. Soporte para `prefers-reduced-motion: reduce` que reemplaza `bdSlideUp`/`bdSlideLeft` por fundido suave.
  - `src/app/shared/components/confirm-dialog/`: `ConfirmDialogComponent` y `ConfirmDialogService` basado en Angular CDK Dialog (`@angular/cdk/dialog`), sin doble rol anidado en el DOM interno, con `ariaLabelledBy: 'confirm-dialog-title'` y `ariaDescribedBy: 'confirm-dialog-desc'`, foco inicial seguro en el botón de cancelar "Volver" con `cdkFocusInitial`, soporte para tono primario/peligro y campo opcional de motivo.
  - `src/app/features/appointments/services/appointments.api.ts`: agregados métodos `confirm(id)`, `checkIn(id)`, `noShow(id)` y `cancel(id)` que devuelven `Observable<string>` con el mensaje devuelto por el backend.
  - `src/app/features/appointments/domain/appointment-state.ts`: implementada función `availableActions(appointment, now, isToday, hasPermission)` con las reglas de negocio de transiciones (Llegó en PENDING/CONFIRMED sin check-in solo para hoy, Confirmar solo PENDING, No asistió tras pasar startAt sin check-in, Cancelar en PENDING/CONFIRMED; filtrado por permisos `APPOINTMENT_UPDATE` y `APPOINTMENT_CANCEL`). Función pura `canQuickCheckIn(appointment, now, isToday, hasPermission)` que centraliza la regla de botón rápido (disponibilidad de `'check-in'` y duración ≥ 30 min).
  - `src/app/features/appointments/services/agenda.store.ts`: agregados estados `selectedAppointmentId`, `selectedAppointment`, `pendingAction`, `pendingActionAppointmentId`, `actionError`, selección de cita y método `runAction(id, action)` con prevención de doble envío, notificación toast vía `NotificationService`, recarga automática y cierre en cancelación; actualización o cierre con toast informativo si la cita desaparece en un refresco.
  - `src/app/features/appointments/components/appointment-card/appointment-card.component.ts`: tarjeta desacoplada como componente dumb sin inyección de stores, con inputs `selected`, `checkInAvailable`, `checkInPending` y output `checkIn`. Botón "Llegó" directo (`≥ 44 × 44` px, con spinner estilizado mediante `color-mix(in srgb, currentColor 30%, transparent)`).
  - `src/app/features/appointments/components/appointment-panel/appointment-panel.component.ts`: componente dumb con encabezado y enlace a ficha de paciente, badge de estado, fecha y horario mediante pipes `clinicDate` y `clinicTime` ("sáb 10 oct · 10:30–11:00"), profesional con dot `colorTag`, especialidad, motivo, origen, notas, registro de hora de llegada con `clinicTime`, alerta `bd-alert` ante errores de acción y botones de acción; estilos de sombra y spinner migrados a `color-mix()`.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.ts`: cálculo de `selectedId`, `quickCheckInIds` (Set) y `pendingCheckInId` propagados a las 3 vistas (`agenda-grid`, `agenda-by-status`, `agenda-day-list`), uso de `ClinicTimePipe` para el diálogo de cancelación, y panel lateral `bd-side-sheet` conectado al store.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.spec.ts`: 2 tests de integración requeridos (clic en "Llegó" con check-in y actualización a "En espera" con toast, y flujo de cancelación con diálogo confirmando y visualización de error 409 dentro del panel).
- **Resultado del build y test:**
  - `npx ng build`: OK (bundle generado limpiamente sin errores).
  - `npx ng test --watch=false` (copia literal de los totales de consola):
```
Test Files  3 passed (3)
Tests  10 passed (10)
```
- **Anchos revisados:**
  - `375px`: Hoja inferior ocupando el ancho completo (máx. 85vh), asa de arrastre visible arriba, botones de acción a todo el ancho y sticky en el pie; tarjetas con botón "Llegó" de 44px de alto.
  - `768px`: Hoja inferior funcional con scroll interno; botones de acción sticky en el pie; sin problemas de desborde.
  - `1024px`: Hoja inferior (1024px < breakpoint `lg` de 1200px) ocupando el ancho completo con asa superior y scroll interno; la tarjeta seleccionada permanece resaltada en la grilla.
  - `1366px`: Panel lateral derecho de 26rem fluido sobre la grilla (`≥ lg`), backdrop con `color-mix` y `blur(2px)`.
  - `1920px`: Panel lateral derecho de 26rem a la derecha sin distorsión de la grilla de turnos.
- **Cómo levantar lo necesario para la ## Prueba manual:**
  - Backend: `./mvnw spring-boot:run` en `:8080`.
  - Frontend: `npx ng serve` y navegar a `http://localhost:4200/recepcion`.
  - Usuario de prueba: `secretaria@bellidental.local` / `Cambiar.2026!` (seed V4).
- **Problemas encontrados y supuestos tomados:**
  - Ninguno. Las 6 correcciones de la revisión fueron aplicadas conforme a la arquitectura y estándares de clean code, a11y y responsive.

## Revisión


**Revisión 1** — Estado: CORRECCIONES

Build OK y `ng test`: 10/10 (3 archivos). Las reglas de `availableActions`, los endpoints, el `ConfirmDialog`, el
panel y los 2 tests cumplen. Hay que corregir:

1. **La tarjeta no es dumb** (`appointment-card.component.ts`): inyecta `SessionStore` y `AgendaStore`, llama a
   `agendaStore.runAction()` desde la tarjeta y calcula ella misma quién puede marcar "Llegó" (`isToday` con
   `startsWith`, permiso y estados duplicados de `availableActions`). Además, `checkIn` se emite pero nadie lo
   escucha. Hay que dejarla solo con `input()`/`output()`:
   - inputs `selected`, `checkInAvailable` y `checkInPending` (todos `boolean`), y output `checkIn`;
   - en `domain/appointment-state.ts`, `canQuickCheckIn(appointment, now, isToday, hasPermission)` =
     `availableActions(...)` incluye `'check-in'` y la cita dura ≥ 30 min. Es la única fuente de la regla;
   - la página calcula `selectedId`, `quickCheckInIds` (`Set<string>`, con `canQuickCheckIn` sobre
     `store.displayedAppointments()`) y `pendingCheckInId`, y se los pasa a `agenda-grid`, `agenda-by-status` y
     `agenda-day-list`. Estos se los pasan a cada tarjeta y reemiten `checkIn`;
   - la página llama a `store.runAction(appt.id, 'check-in')`.
2. **Fechas formateadas a mano dos veces**: `formatTime` está copiado en el panel y en la página, y
   `formattedDateTime` repite `Intl.DateTimeFormat`, lo que en es-EC deja "sáb., 10 oct.". Usar los pipes
   `clinicDate` y `clinicTime` de `shared/pipes` en la plantilla del panel, para que quede
   "sáb 10 oct · 10:30–11:00". Para el texto del diálogo en la página, usar `ClinicTimePipe` (instancia) o un
   método de `ClinicClock`, no una copia.
3. **Colores sueltos**: hay que pasarlos a `color-mix()` desde tokens; el backdrop puede seguir el patrón de
   `.drawer-backdrop` en `main-layout.scss`.
   - `side-sheet.component.ts:67`, backdrop `rgba(15, 23, 42, 0.35)`;
   - `appointment-panel.component.ts:313`, `box-shadow` con `rgba`;
   - los spinners, en `appointment-panel.component.ts:360` y `appointment-card.component.ts:326`.
4. **`prefers-reduced-motion`** (`responsive/SKILL.md`): `bd-side-sheet` desliza el panel (`bdSlideUp` y
   `bdSlideLeft`) sin respetarlo. Con `@media (prefers-reduced-motion: reduce)`, quitar las animaciones de
   desplazamiento; el fundido puede quedar.
5. **`ConfirmDialog` con doble rol**: CDK Dialog ya pone `role="alertdialog"` y `aria-modal` en su contenedor, y
   el componente los repite en su `div` interno, así que quedan dos diálogos anidados. Quitarlos del `div` y pasar
   los ids en la configuración: `ariaLabelledBy` (y, si hace falta, `ariaDescribedBy`, o
   `aria-describedby` vía config). Verificar que el foco inicial cae en "Volver".
6. **El Resultado no coincide con el código**:
   - dice que en **1024 px** se ve el panel lateral, pero 1024 < `lg` (1200), así que el código muestra la hoja
     inferior (lo correcto). Revisar de nuevo los 5 anchos y anotar lo que realmente se ve;
   - las credenciales son `secretaria@bellidental.local` / `Cambiar.2026!` (seed V4), no
     `secretaria@bellidental.com` / `Secretaria123*`.

Se acepta como desviación que `bd-side-sheet` use `position: fixed` en vez de CDK Overlay: el comportamiento es el
pedido, y el toast (z-index 9999) queda por encima del backdrop. Los 2 tests existentes deben seguir pasando sin
cambiar lo que verifican. Si el punto 1 cambia cómo se hace clic en "Llegó", solo ajustar el selector.

**Revisión 2** — Estado: APROBADO

Build OK y `ng test`: 10/10 (3 archivos). Verifiqué las 6 correcciones en el código:
- la tarjeta solo tiene `input()`/`output()`: `selected`, `checkInAvailable`, `checkInPending` y `checkIn`;
- la regla del botón rápido vive solo en `canQuickCheckIn`, en domain; la página calcula `quickCheckInIds`, se lo
  pasa a las 3 vistas y llama a `runAction`;
- el panel formatea con los pipes `clinicDate`/`clinicTime`, y el diálogo con `ClinicTimePipe`;
- no quedan colores sueltos;
- `prefers-reduced-motion` cambia el deslizamiento por un fundido;
- el `ConfirmDialog` usa `ariaLabelledBy`/`ariaDescribedBy` de CDK y pone el foco inicial en "Volver";
- el Resultado tiene los anchos y las credenciales correctos.

Corrección mínima de Claude: el backdrop de `bd-side-sheet` pasa de `blue-950` al 60 % con `blur(2px)` a `blue-950`
al 25 % sin blur, para que en `lg+` la tarjeta abierta siga visible detrás del panel (brief). Build OK tras el
cambio.

**Auditoría `/impeccable audit` (agenda completa)**: 15/20, Bueno. Por dimensión: accesibilidad 3, rendimiento 3,
temas 3, responsive 3, integridad 3. Revisión de código más el detector; no hice prueba visual con el backend.

Pendientes. No bloquean la aprobación; van a una tarea de pulido o a la 004:
- [P2] La tarjeta no anuncia que abre el panel ni cuál está abierta: falta `aria-haspopup="dialog"` y
  `aria-expanded` (o `aria-current`) según `selected`, en el botón principal de `appointment-card`.
- [P2] En `lg+` el panel es modal: tiene backdrop, `aria-modal` y foco atrapado. Para ver otra cita hay que cerrar
  y volver a abrir. Propuesta: en `lg+`, panel no modal sin backdrop, donde el clic en otra tarjeta cambia la cita
  abierta; la hoja inferior modal queda solo en `< lg`.
- [P2] En la grilla, las tarjetas de 15 min miden 2 rem (32 px), menos que el mínimo táctil de 44 px, en tablet
  horizontal (`md`–`lg`). Es una consecuencia de 1 h = 8 rem; hay que decidir si se acepta o si se amplía el
  área táctil.
- [P3] `ClinicClock.minutesOfDay()` y `formatTime` de la tarjeta crean un `Intl.DateTimeFormat` en cada llamada
  (en ordenamientos, `timeRange` y geometría). Conviene guardar el formateador en una propiedad.
- [P3] `agenda-summary`: un `aria-label` en un `div` sin rol no se anuncia. Usar `role="group"`.
- [P3] `bd-segmented`: los ítems miden 38 px de alto, aunque el control completo mide 46 px.
- Detector: `side-tab` (`border-left: 4px` en la tarjeta). Se acepta: es la barra de estado de las citas,
  convención del calendario que reemplaza, y el estado también va en texto.
