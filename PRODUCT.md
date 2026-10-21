# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Secretaria (recepción):** en el PC de recepción (1366 o 1920 px) todo el día. Lleva la agenda, registra
  llegadas, da de alta pacientes, gestiona horarios y cobra abonos. Atiende el teléfono y a la gente en el mostrador
  al mismo tiempo, así que trabaja con interrupciones constantes.
- **Odontólogo (odontóloga y especialistas):** en la laptop o tablet del consultorio, con el paciente en el sillón,
  guantes y poco tiempo. Atiende, registra el odontograma y los diagnósticos, y emite recetas.
- **Director:** lo mismo que el odontólogo, más estadísticas de la clínica y auditoría. A veces lo revisa en el
  móvil.

## Product Purpose
Sistema de gestión para una sola clínica odontológica en Ecuador (Bellidental). Reemplaza el Google Calendar
compartido (un color por doctor), la ficha rápida en papel y el formulario 033 llenado en diferido. Es el proyecto
de titulación: el éxito se mide como la reducción del tiempo de las tareas (TGA) en T1 (receta y registro), T2
(cobro) y T3 (agenda), con el menor número de clics posible.

## Positioning
Hecho a la medida de la operación real de esta clínica y de la normativa ecuatoriana: el formulario 033 del MSP con
su odontograma y simbología, la separación de datos clínicos que exige el AM 5216-A (la secretaria nunca ve
antecedentes, odontograma ni diagnósticos) y un bot que también agenda citas.

## Operating Context
- Vive en un VPS y se usa por HTTPS; fuentes, íconos y recursos se sirven desde el propio sistema (nada de terceros).
- Hoy: Google Calendar compartido con un color por doctor; ficha rápida en papel (filiación, antecedentes,
  odontograma, tabla fecha/Dg./tratamiento/doctor/abono/saldo/firma); formulario 033; receta manuscrita.
- La agenda la modifican la recepción, los profesionales y el bot, así que puede cambiar sin que la secretaria
  haga nada.
- Un día normal: 2–4 profesionales atienden a la vez y hay 20–40 citas. La acción más frecuente de la secretaria
  en la agenda es marcar la llegada del paciente ("Llegó").

## Capabilities and Constraints
- Tres perfiles en la interfaz (secretaria, odontólogo, director): menús según el perfil y acciones según el
  permiso de `/auth/me`.
- Backend Spring Boot propio (`/api/v1`); frontend Angular 22 standalone con signals y `@angular/cdk`, sin librería
  de componentes.
- Fuera del MVP: registro de usuarios, UI del bot, impresión del 033, notificaciones en tiempo real, modo oscuro,
  PWA/offline, i18n.
- Nada clínico ni de pagos se elimina desde la UI: se anula ("Anular"), con motivo cuando el backend lo pide.
- Detalle del alcance: `docs/MVP-SCOPE.md`; visibilidad por perfil: `docs/CONTEXT.md`; plan:
  `docs/IMPLEMENTATION-PLAN.md`.

## Brand Commitments
- Nombre "Bellidental", "Centro Odontológico". Paleta azul del logo con antagonistas dorado y coral (`paleta.txt`,
  plan §2.3, decisión F-5 aprobada por el usuario). Playfair Display itálica solo en la marca.
- Textos de la UI en español de Ecuador. Verbos fijos: "Anular" (nunca "Eliminar"), "Registrar", "Completar
  atención"; el check-in se muestra como "Llegó".

## Evidence on Hand
- Formularios originales: `docs/reference/form-033.txt`, `ficha-rapida.txt`, `odontograma-completo.txt`.
- Bocetos clicables de distribución: `docs/mockups/bellidental-bocetos.html`.
- No hay métricas de TGA medidas todavía: no inventarlas.

## Product Principles
1. Menos clics que el papel y el calendario: valores por defecto, autocompletar, una pantalla por tarea.
2. La acción frecuente va a un clic; las raras y destructivas, detrás de una confirmación.
3. El color nunca va solo: el estado siempre lleva etiqueta o ícono.
4. Lo clínico es del odontólogo: la recepción no lo ve, ni de reojo.
5. Ante cortes de conexión, lo que está en pantalla es la verdad actual (refresco periódico,
   errores visibles, nunca silenciosos).

## Accessibility & Inclusion
Objetivos táctiles ≥ 44 px (tablet y guantes), foco visible, operable con teclado y nunca depender solo del hover o
del color (reglas en `.agents/skills/responsive/SKILL.md` y `clean-code/SKILL.md`).
