# Alcance del MVP — Frontend Bellidental

Origen: `../bellidental-backend/docs/MVP-SCOPE.md` (contrato del producto). Este archivo fija qué pantallas entran.
Objetivo medible: bajar el TGA (T1 receta + registro, T2 cobro, T3 agenda). **Cada pantalla de consulta y recepción
se diseña para el menor número de clics**: valores por defecto, autocompletar, una sola pantalla por tarea.
Plan: `docs/IMPLEMENTATION-PLAN.md`. Contexto y visibilidad por rol: `docs/CONTEXT.md`.

## Tres perfiles
- **Secretaria** (recepción): agenda, pacientes sin datos clínicos, horarios, cobros.
- **Odontólogo** (consultorio): sus citas, atención, odontograma, ficha clínica.
- **Director**: la misma interfaz del odontólogo + estadísticas de la clínica + gestión de usuarios + historial de
  cambios (auditoría) en la ficha del paciente y en la atención.
- **Todos**: cambiar su propia contraseña.

## Pantallas por perfil

| # | Pantalla | Perfil | Requerimientos | API |
|---|---|---|---|---|
| P1 | Login | todos | RNF01 | lista |
| P2 | Shell: sidebar, buscador global de pacientes, fecha, próxima cita | todos | RF06 | lista |
| P3 | Inicio recepción = agenda del día (por profesional / por estado) | SECRETARIA | RF07 | lista |
| P4 | Nueva cita, walk-in, reprogramar, check-in, no asistió, cancelar | SECRETARIA | RF07, RF15 | lista |
| P5 | Ficha rápida de recepción: filiación, observaciones, citas, estado de cuenta | SECRETARIA | RF06, RF08 | lista (cuenta: backend 012) |
| P6 | Alta y edición de paciente | SECRETARIA | RF06 | lista |
| P7 | Horarios de profesionales | SECRETARIA | RF07 (D-1, D-12) | lista |
| P8 | Inicio odontólogo: tablero de sus citas por estado | ODONTOLOGO, DIRECTOR | RF07 | lista (ver G1) |
| P9 | Atención: paciente + antecedentes, motivo, diagnósticos CIE-10, completar | ODONTOLOGO, DIRECTOR | RF01, RF03 | lista |
| P10 | Odontograma tipo 033 (registro y lectura) | ODONTOLOGO, DIRECTOR | RF02 | lista |
| P11 | Tratamientos en la atención (ligados a diagnóstico y hallazgo) | ODONTOLOGO, DIRECTOR | RF04, RF02 | lista (backend 010a, 010b) |
| P12 | Receta (borrador → emitida) + PDF | ODONTOLOGO, DIRECTOR | RF04, RF05 | lista (backend 011a, 011b) |
| P13 | Ficha clínica / historial inmediato | ODONTOLOGO, DIRECTOR | RF06 | falta (backend 011c `clinical-summary`) |
| P14 | Cobro de abono, comprobante PDF y anular con motivo (el director lo ve en solo lectura en P13; el odontólogo no) | SECRETARIA | RF08 | lista (backend 012); reimprimir abonos de otras visitas: falta G-11 |
| P15 | "Más del 033": signos, examen, indicadores, planes (editable después) | ODONTOLOGO, DIRECTOR | RF01 | lista |
| P16 | Estadísticas de la clínica (citas, inasistencia, atenciones, ingresos, saldo por cobrar, top 5 tratamientos) | DIRECTOR | (gestión) | lista (backend 020 `/dashboard/summary`) |
| P17 | Historial de cambios de un registro (paciente, atención): quién cambió qué y cuándo. Sin pantalla de lista | DIRECTOR | RNF02 | lista por registro (backend 013); lista general: falta G-7 |
| P18 | Formulario 033: vista con la numeración y distribución oficiales e impresión A4 (desde el 2026-10-19) | ODONTOLOGO, DIRECTOR | RF09 | falta (backend 011c) |
| P19 | Mis atenciones: atenciones propias por día, semana o mes, para continuar o corregir (desde el 2026-10-19) | ODONTOLOGO, DIRECTOR | RF06 | lista |
| P20 | Usuarios: crear cuentas de odontólogo y secretaria, roles, contraseña temporal, activar/desactivar, dar acceso a un profesional (desde el 2026-10-21, backend D-24) | DIRECTOR | RNF01 | lista (backend 019) |
| P21 | Cambiar mi contraseña | todos | RNF01 | lista (backend 019) |

## Bot de WhatsApp (RF10–RF15): sin pantallas
El bot es un agente Python aparte que habla con el backend por `/api/v1/bot/*` (backend D-19). No tiene interfaz
en este frontend:
- **No hay bandeja de mensajes entrantes.** La conversación vive solo en el agente (en memoria, 30 min) y no se
  guarda en la base. Cuando el bot no puede resolver algo (preguntas clínicas, saldos, paciente nuevo, límites),
  **deriva**: envía al paciente el enlace `wa.me` del WhatsApp de recepción, que sigue atendiéndose en su teléfono.
- **Lo que hace el bot se ve en la agenda** (ya implementado): citas con `source=BOT` (ícono y "Agendada por el
  bot"), confirmaciones y cancelaciones del recordatorio como cambios de estado, y reprogramaciones con su cita
  nueva. La agenda se refresca sola.
- Urgencias por el bot: la cita aparece en la agenda como cualquier otra; no hay aviso aparte (backend D-21b).
- Estado del recordatorio y consentimiento del aviso de privacidad: sin UI en el MVP (G-10 del plan, opcional).

## Fuera del MVP (no implementar)
Gestión de permisos y de roles fuera de ODONTOLOGO/SECRETARIA (crear administradores), autorregistro y "olvidé mi
contraseña" por correo (el director restablece) · pantallas del bot (bandeja, conversaciones, configuración) ·
pantalla de exportación y respaldos (backend 018 sin UI) · notificaciones en tiempo real
(WebSocket) · modo oscuro · PWA/offline del navegador (sin internet se usa la contingencia en papel) · i18n (solo
español).

## Decisiones (no cambiar sin aprobación)
- Tres perfiles (secretaria, odontólogo, director); menús por perfil, acciones por permiso.
- Angular 22 standalone + signals; sin librería de componentes; `@angular/cdk` para overlays, diálogos y a11y.
- Sesión en `localStorage` que expira a las 24 h; sin unit tests (solo integración de página + prueba manual).
- Paleta azulada de la marca con antagonistas dorado/coral (plan §2.3).
- Sin recursos de terceros en tiempo de ejecución (CDN, Google Fonts): fuentes e íconos locales (privacidad y
  menos puntos de fallo). El sistema vive en un VPS (backend D-17) y se usa por HTTPS desde el navegador.
- API por URL relativa `/api/v1` (proxy en desarrollo; Caddy + nginx en el VPS en producción).
- La secretaria nunca ve datos clínicos: ni antecedentes, ni odontograma, ni diagnósticos (AM 5216-A, RNF03).
- La atención muestra solo lo esencial del 033; el resto se completa después en "Más del 033".
- Odontograma con la disposición y simbología del formulario 033 (pedido del odontólogo).
- Responsivo en todo; prioridad a las pantallas del odontólogo (laptop 1366 y tablet).
