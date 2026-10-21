- Código y nombres en inglés; textos de la UI en español (Ecuador). Nada de abreviaturas ni `data`, `info`, `tmp`.
- Componentes pequeños con una responsabilidad: si una plantilla pasa de ~150 líneas o un componente maneja más de
  un formulario, se divide en componentes presentacionales.
- Sin duplicación: lo que usan dos features va a `shared/` (UI) o `core/` (servicios); lo que usa un solo feature
  se queda en él.
- TypeScript estricto: nada de `any`; modelos en `models/` con los nombres de campo del backend (camelCase).
- Fechas: el backend devuelve ISO con zona (`OffsetDateTime`). Se muestran en `America/Guayaquil` con los pipes de
  `shared/pipes`; nunca `new Date()` suelto en un componente para "hoy": usar `ClinicClock`.
- Ids `uuid` como `string`; catálogos `bigint` como `number`; dinero como `number` con 2 decimales y el pipe `money`.
- Nada de borrar datos clínicos ni pagos desde la UI: las acciones son "Anular" (con motivo cuando el backend lo
  pide), nunca "Eliminar".
- Estilos: solo variables de `shared/styles/_tokens.scss` (paleta del plan §2.3, espacios, radios, tipografía);
  tonos nuevos con `color-mix()` a partir de esos tokens. Nada de colores
  sueltos en componentes, salvo los colores clínicos que llegan del catálogo del odontograma.
- Sin dependencias nuevas sin que la tarea lo diga. Permitidas: `@angular/cdk` (overlay, dialog, a11y),
  `lucide-angular` (íconos), `@fontsource/*` (fuentes).
- Sin recursos externos en tiempo de ejecución (CDN, Google Fonts): privacidad de datos de salud y menos puntos de
  fallo (el sistema vive en un VPS, backend D-17).
  Fuentes e íconos van en `public/` o `src/assets/`.
- Errores de la API: se muestran con el `message` del backend; 403 → "No tienes permiso"; 0 → "No se pudo conectar con
  el servidor". Nunca un error silencioso.
- Accesibilidad mínima: elementos interactivos son `<button>`/`<a>`, `aria-label` en íconos, foco visible, color
  nunca como único indicador (estado = color + texto o ícono).
