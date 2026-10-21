# Contexto para el frontend — Bellidental

El "por qué" completo está en `docs/reference/CONTEXT-dominio.md` (copia del backend). Formularios originales:
`docs/reference/form-033.txt`, `ficha-rapida.txt`, `odontograma-completo.txt`. Aquí solo lo que decide pantallas.

**Jerarquía (si hay contradicción, gana el de arriba):** backend `MVP-SCOPE.md` → `docs/MVP-SCOPE.md` →
`docs/IMPLEMENTATION-PLAN.md` → este archivo.

## 1. Quién usa qué y dónde

| Perfil | Roles del backend | Equipo | Uso |
|---|---|---|---|
| Secretaria | SECRETARIA | PC de recepción (1920 px o 1366 px), todo el día | Agenda, filiación, check-in, cobros |
| Odontólogo (odontóloga y especialistas) | ODONTOLOGO | laptop o tablet del consultorio, con el paciente en el sillón | Atención, odontograma, diagnósticos, receta |
| Director | ADMIN + ODONTOLOGO | laptop / móvil | Lo mismo que el odontólogo + estadísticas, usuarios e historial de cambios |

Escena real del odontólogo: guantes, poco tiempo, paciente en el sillón. Pocos clics, objetivos grandes, nada de
formularios largos durante la consulta.

## 2. Lo que se hacía a mano → pantalla

| A mano (hoy) | Pantalla |
|---|---|
| Google Calendar compartido, un color por doctor | P3 Agenda del día (colores por profesional y por estado) |
| Ficha rápida en papel (filiación, antecedentes, odontograma, tabla fecha/Dg/tratamiento/Dr/abono/saldo/firma) | Se divide en dos vistas del mismo dato (abajo) |
| Formulario 033 llenado en diferido | Atención (P9) con lo esencial + "Más del 033" (P15) después |
| Receta manuscrita | P12 desde catálogo |

## 3. La ficha rápida se divide por normativa

| Campo de la ficha en papel | Secretaria (P5) | Odontólogo (P9/P13) |
|---|---|---|
| Nombre, cédula, F. nacimiento, edad, teléfono | ✔ (edita) | ✔ (lee) |
| Observaciones (notas, presupuestos) | ✔ `admin_notes` | — |
| **Antecedentes** | ✘ **no los ve** | ✔ (alertas en rojo, los registra él) |
| **Odontograma** | ✘ **no lo ve** | ✔ |
| Tabla: Fecha, Tratamiento, Doctor | ✔ | ✔ |
| Tabla: **Dg.** (diagnóstico CIE-10) | ✘ **no lo ve** | ✔ |
| Tabla: Abono, Saldo | ✔ (registra y anula el abono) | solo el director, lectura (ADMIN tiene `BILLING_READ`); el odontólogo no (403) |
| Factura | N° de comprobante interno (`C-000001`) | — |
| Firma | Línea de firma en el comprobante impreso | — |

Por eso el boceto de "Ficha rápida de la secretaria" pierde antecedentes, odontograma y la columna Dg.: el backend
le responde 403 en `/clinical-records`, `/encounters`, `/patients/{id}/odontogram` e `/icd10`.

## 4. Atención rápida: qué del 033 se pide durante la consulta

| Sección del 033 | Durante la consulta | Después ("Más del 033") |
|---|---|---|
| 1 Motivo de consulta | ✔ obligatorio (se pide al abrir) | — |
| 2 Enfermedad actual | opcional, una línea | completo |
| 3 Antecedentes | alertas visibles; registrar si es primera vez | — |
| 4 Signos vitales | — | ✔ |
| 5 Examen estomatognático | — | ✔ |
| 6 Odontograma | ✔ (centro de la pantalla) | correcciones (D-6) |
| 7 Indicadores (periodontal, maloclusión, fluorosis) | — | ✔ |
| 10 Planes | — | ✔ |
| 11 Diagnóstico CIE-10 | ✔ (≥ 1 para completar) | correcciones (D-6) |
| 12 Procedimientos y prescripciones | ✔ tratamientos y receta | — |

D-6 (backend): tras completar, el mismo odontólogo puede corregir la cabecera (`PUT /encounters/{id}`) y anular y
volver a registrar diagnósticos y hallazgos en la misma atención.

## 5. Estados de cita → colores (agenda y tableros)

| Backend | Condición | Etiqueta | Color |
|---|---|---|---|
| PENDING / CONFIRMED | sin `checkedInAt` | Agendada (Confirmada con ✓) | azul |
| PENDING / CONFIRMED | con `checkedInAt` | En espera | dorado |
| (atención OPEN) | requiere G-1 | En atención | índigo |
| ATTENDED | — | Atendida | verde azulado |
| NO_SHOW | — | No asistió | coral |
| CANCELLED / RESCHEDULED | — | ocultas por defecto (filtro "ver canceladas") | gris |

El color nunca va solo: siempre etiqueta o ícono. Tokens exactos en el plan §2.3.

## 6. Odontograma (033)
Disposición, caras y simbología: `docs/reference/odontograma-completo.txt` y `form-033.txt` (sección 6);
detalle técnico en el plan §6. Rojo `#D32F2F` = pendiente, azul `#1E88E5` = realizado, negro = prótesis.
Los colores y formas llegan de `GET /odontogram/catalog`; el frontend no los inventa.
