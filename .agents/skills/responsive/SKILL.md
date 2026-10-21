Toda pantalla y todo componente son responsivos. Las pantallas del odontólogo (inicio, atención, odontograma) son
la prioridad: se usan en laptop del consultorio y en tablet.

**Puntos de corte** (`shared/styles/_breakpoints.scss`, mixins `bp-up(md)` etc.; mobile-first, `min-width`):

| Token | Ancho | Dispositivo objetivo | Layout |
|---|---|---|---|
| `xs` | < 600 | teléfono | sidebar como drawer (botón ☰); buscador colapsado a ícono; una columna |
| `sm` | ≥ 600 | tablet vertical | drawer; tarjetas a 2 columnas |
| `md` | ≥ 900 | tablet horizontal / laptop pequeña | sidebar solo íconos (72 px) con tooltip |
| `lg` | ≥ 1200 | laptop del consultorio (1366×768) | sidebar completo (232 px) |
| `xl` | ≥ 1536 | monitor de recepción | contenido con ancho máximo y más columnas de agenda |

Reglas:
- Nunca scroll horizontal de la página. Si un contenido es más ancho (agenda con muchos profesionales,
  odontograma completo), el scroll horizontal vive **dentro** de su contenedor, con la columna de horas o las
  etiquetas fijas (`position: sticky`).
- Componentes con `@container` (container queries) cuando su ancho depende del panel donde se usan
  (tarjeta de cita, ficha del paciente, panel del diente); `@media` solo para el layout de página.
- Objetivos táctiles ≥ 44×44 px (tablet y guantes). Ninguna acción depende solo de `:hover`.
- Unidades: `rem` para tipografía y espacios, `%`/`fr`/`minmax()` para grillas; nada de anchos fijos en px salvo
  bordes, íconos y el sidebar.
- Tipografía base 16 px; tablas y agenda pueden bajar a 14 px, nunca menos de 12 px.
- Paneles laterales (diente seleccionado, detalle de cita): a la derecha en `lg+`; como hoja inferior
  (bottom sheet, CDK Overlay) en `< lg`.
- Tablas (historial, estado de cuenta): en `< sm` se convierten en lista de tarjetas.
- El SVG del odontograma usa `viewBox` y escala con el contenedor; en `xs` (< 600) muestra un cuadrante por
  pestaña (18–11 · 21–28 · 48–41 · 31–38) para mantener cada pieza ≥ 32 px.
- `prefers-reduced-motion`: sin animaciones de desplazamiento.

Cada tarea con UI lista en `## Responsive` los anchos a revisar. Por defecto: **375, 768, 1024, 1366** (y 1920 para la
agenda de recepción). Gemini los revisa en DevTools y anota el resultado.
