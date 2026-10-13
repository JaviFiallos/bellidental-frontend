# Alcance del MVP — Frontend Bellidental

Origen: `../bellidental-backend/docs/MVP-SCOPE.md` (contrato del producto). Este archivo fija qué pantallas entran.
Objetivo medible: bajar el TGA (T1 receta + registro, T2 cobro, T3 agenda). **Cada pantalla de consulta y recepción
se diseña para el menor número de clics**: valores por defecto, autocompletar, una sola pantalla por tarea.
Plan: `docs/IMPLEMENTATION-PLAN.md`. Contexto y visibilidad por rol: `docs/CONTEXT.md`.

## Tres perfiles
- **Secretaria** (recepción): agenda, pacientes sin datos clínicos, horarios, cobros.
- **Odontólogo** (consultorio): sus citas, atención, odontograma, ficha clínica.
- **Director**: la misma interfaz del odontólogo + estadísticas de la clínica + auditoría.

## Pantallas por perfil

| # | Pantalla | Perfil | Requerimientos | API |
|---|---|---|---|---|
| P1 | Login | todos | RNF01 | lista |
| P2 | Shell: sidebar, buscador global de pacientes, fecha, próxima cita | todos | RF06 | lista |
| P3 | Inicio recepción = agenda del día (por profesional / por estado) | SECRETARIA | RF07 | lista |
| P4 | Nueva cita, walk-in, reprogramar, check-in, no asistió, cancelar | SECRETARIA | RF07, RF15 | lista |
| P5 | Ficha rápida de recepción: filiación, observaciones, citas, estado de cuenta | SECRETARIA | RF06, RF08 | parcial (cuenta: backend 012) |
| P6 | Alta y edición de paciente | SECRETARIA | RF06 | lista |
| P7 | Horarios de profesionales | SECRETARIA | RF07 (D-1, D-12) | lista |
| P8 | Inicio odontólogo: tablero de sus citas por estado | ODONTOLOGO, DIRECTOR | RF07 | lista (ver G1) |
| P9 | Atención: paciente + antecedentes, motivo, diagnósticos CIE-10, completar | ODONTOLOGO, DIRECTOR | RF01, RF03 | lista |
| P10 | Odontograma tipo 033 (registro y lectura) | ODONTOLOGO, DIRECTOR | RF02 | lista |
| P11 | Tratamientos en la atención | ODONTOLOGO, DIRECTOR | RF04 | backend 010 |
| P12 | Receta + PDF | ODONTOLOGO, DIRECTOR | RF04, RF05 | backend 011 |
| P13 | Ficha clínica / historial inmediato | ODONTOLOGO, DIRECTOR | RF06 | backend clinical-summary |
| P14 | Cobro de abono y comprobante PDF | SECRETARIA | RF08 | backend 012 |
| P15 | "Más del 033": signos, examen, indicadores, planes (editable después) | ODONTOLOGO, DIRECTOR | RF01 | lista |
| P16 | Estadísticas de la clínica | DIRECTOR | (gestión) | falta (G-6) |
| P17 | Auditoría: quién cambió qué y cuándo | DIRECTOR | RNF02 | backend 013 + G-7 |

## Fuera del MVP (no implementar)
Registro de usuarios y gestión de permisos · pantallas del bot (el bot no tiene UI) · impresión del 033 (RF09) ·
pantalla de exportación y respaldos (backend 018 sin UI) · notificaciones en tiempo real
(WebSocket) · modo oscuro · PWA/offline del navegador (el servidor está en la LAN) · i18n (solo español).

## Decisiones (no cambiar sin aprobación)
- Tres perfiles (secretaria, odontólogo, director); menús por perfil, acciones por permiso.
- Angular 22 standalone + signals; sin librería de componentes; `@angular/cdk` para overlays, diálogos y a11y.
- Sesión en `localStorage` que expira a las 24 h; sin unit tests (solo integración de página + prueba manual).
- Paleta azulada de la marca con antagonistas dorado/coral (plan §2.3).
- Sin recursos de internet en tiempo de ejecución: fuentes e íconos locales (la clínica funciona sin internet).
- API por URL relativa `/api/v1` (proxy en desarrollo, nginx en producción).
- La secretaria nunca ve datos clínicos: ni antecedentes, ni odontograma, ni diagnósticos (AM 5216-A, RNF03).
- La atención muestra solo lo esencial del 033; el resto se completa después en "Más del 033".
- Odontograma con la disposición y simbología del formulario 033 (pedido del odontólogo).
- Responsivo en todo; prioridad a las pantallas del odontólogo (laptop 1366 y tablet).
