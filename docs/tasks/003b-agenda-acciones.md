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

## Revisión
