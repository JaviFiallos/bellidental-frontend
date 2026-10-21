# 003c — Agenda: pulido tras la auditoría

## Objetivo
Resolver los pendientes de `/impeccable audit` sobre la agenda (ver el final de `003b-agenda-acciones.md`):
- en pantallas grandes, el panel no bloquea la agenda y se puede pasar de una cita a otra con un clic;
- áreas táctiles de 44 px en tablet;
- anuncios correctos para lectores de pantalla;
- formateadores de fecha y hora creados una sola vez.

Sin llamadas nuevas a la API.

**Depende de:** 003b (commit `cee09ad`). Fuera de alcance: Nueva cita, Sin cita y Reprogramar (004).

**Cambio del brief (decisión de Claude, tras la auditoría):** en `≥ lg` el panel deja de ser modal y la agenda le
reserva su ancho. El panel "sobre la grilla sin moverla" tapaba entre una y dos columnas con 3–4 profesionales a
1366 px, así que no se podían abrir las citas de esas columnas.

## Archivos a tocar
```
src/app/
  core/services/clinic-clock.service.ts        formateadores Intl como propiedades privadas readonly (uno por formato),
                                               no uno nuevo en cada llamada (minutesOfDay, todayDateString, formatDate)
  shared/components/
    side-sheet/side-sheet.component.ts         modo según ancho: modal en < lg, no modal en ≥ lg
    segmented/segmented.component.ts           ítems de 44 px de alto
  features/appointments/
    domain/agenda-layout.ts                    la geometría se calcula en horas, no en rem (ver criterio 5)
    components/agenda-grid/                    posiciona con var(--hour-height); 1 h = 8rem o 11rem con puntero táctil
    components/appointment-card/               aria-haspopup / aria-expanded; top y height en horas; usa ClinicTimePipe
                                               en lugar de su formatTime propio
    components/agenda-summary/                 role="group" junto al aria-label
    pages/reception-agenda/                    reserva el ancho del panel en ≥ lg mientras está abierto
```

## Criterios de aceptación
**Panel en `≥ lg` (1200 px), no modal**
1. `bd-side-sheet` detecta el ancho con `BreakpointObserver` de `@angular/cdk/layout` usando
   `(min-width: 1200px)`, el mismo valor que `lg` en `_breakpoints.scss`.
   - En `≥ lg`: sin backdrop, sin `aria-modal`, `cdkTrapFocus` desactivado (`[cdkTrapFocusEnabled]="false"`) y
     `role="dialog"` con su `aria-labelledby`.
   - En `< lg`: se queda exactamente como está (hoja inferior modal, backdrop, foco atrapado).
2. En ambos modos, al abrir, el foco pasa al título del panel (`tabindex="-1"` en el `h2`). Esc cierra el panel y
   devuelve el foco a la tarjeta de origen. En `≥ lg`, Esc funciona aunque el foco esté en la grilla: escuchar
   `keydown.escape` en el documento solo mientras el panel esté abierto, o desde la página.
3. Con el panel abierto en `≥ lg`, el clic en otra tarjeta cambia la cita del panel sin cerrarlo. El foco pasa al
   título, y Esc devuelve el foco a la última tarjeta abierta.
4. La página reserva el ancho del panel mientras está abierto en `≥ lg`: `padding-inline-end: 26rem` en el
   contenedor de la agenda, con `bp-up('lg')`. La grilla se estrecha y su scroll horizontal interno muestra todas las
   columnas. La página nunca tiene scroll horizontal. Sin animar ese cambio de ancho.

**Áreas táctiles de 44 px**
5. Las tarjetas de 15 min deben medir ≥ 44 px de alto con puntero táctil:
   - `domain/agenda-layout.ts` calcula en **horas**: `topHours` y `heightHours` en lugar de `topRem` y
     `heightRem`, y `totalHours` en lugar de `totalHeightRem`. Se elimina `REM_PER_HOUR`;
   - la grilla define `--hour-height: 8rem` y `@media (pointer: coarse) { --hour-height: 11rem; }`. Con 11rem, 15 min
     = 2.75rem = 44 px;
   - tarjetas, sombreados, filas de hora y línea de "ahora" usan `calc(var(--hour-height) * <horas>)`. El alto fijo
     `8rem` de las filas (`agenda-grid` líneas 240 y 269) pasa a `var(--hour-height)`;
   - el desplazamiento automático hasta la hora actual lee la posición real en píxeles de la línea de "ahora"
     (`offsetTop`), no multiplica rem por el tamaño de fuente.
6. `bd-segmented`: `min-height: 44px` en cada ítem. Para que el control no crezca de más, el contenedor puede
   bajar su `padding` a 2px.

**Accesibilidad**
7. Botón principal de la tarjeta: `aria-haspopup="dialog"` y `[attr.aria-expanded]="selected()"`.
8. `agenda-summary`: `role="group"` en el contenedor que ya tiene `aria-label="Resumen del día"`.

**Rendimiento**
9. `ClinicClock`: los `Intl.DateTimeFormat` se crean una vez, como propiedades `private readonly`. Las firmas y lo que
   devuelve cada método no cambian.
10. `appointment-card`: se borra `formatTime` y se usa `ClinicTimePipe` (instancia en una propiedad), como hace la
    página.

**Sin regresiones**
11. Siguen igual: el botón "Llegó" en la tarjeta, las acciones del panel, el cierre tras cancelar, la vista por
    estado y la lista `< md`, que no usa la grilla.

## Responsive
Revisar en **375, 768, 1024, 1366 y 1920**:
- **768 y 1024**, con emulación táctil de DevTools (puntero `coarse`): las tarjetas de 15 min miden ≥ 44 px; la hoja
  inferior sigue siendo modal.
- **1366 y 1920**, con ratón: panel abierto sin backdrop; la grilla se estrecha y se ven todas las columnas con
  scroll interno; clic en una tarjeta de la última columna con el panel abierto → cambia la cita.
- **1366** con 4 profesionales: sin scroll horizontal de página.
- **375**: sin cambios respecto a la 003b.

## Tests requeridos
Sin tests: no hay llamadas nuevas a la API. Los 10 tests existentes deben seguir pasando sin cambiar lo que
verifican. Si un selector cambia por el criterio 5 (`topRem` → `topHours`), solo ajustar el selector.

## Prueba manual
Con el backend en `:8080` y `npx ng serve`, como secretaria (`secretaria@bellidental.local` / `Cambiar.2026!`):
1. A 1366: abrir una cita → la grilla se estrecha y la tarjeta queda visible → clic en otra cita → el panel cambia
   sin cerrarse → Esc → el foco vuelve a esa tarjeta.
2. A 1024 con emulación táctil: una cita de 15 min se toca con comodidad; la hoja inferior bloquea el fondo como
   antes.
3. Con lector de pantalla (Orca) o en el árbol de accesibilidad de DevTools: la tarjeta abierta se anuncia como
   "expandido".
4. "Llegó", Confirmar y Cancelar funcionan igual que en la 003b.

## Resultado
- **Qué se hizo:**
  - `src/app/core/services/clinic-clock.service.ts`: Formateadores `Intl.DateTimeFormat` instanciados una sola vez como propiedades privadas readonly (`dateStringFormatter`, `timeMinutesFormatter`), reutilizados en `todayDateString()`, `minutesOfDay()` y `formatDate()`.
  - `src/app/shared/components/side-sheet/side-sheet.component.ts`: Detección responsiva con `BreakpointObserver` (`(min-width: 1200px)`). En `≥ lg` opera como panel no modal sin backdrop, sin `aria-modal` y con `[cdkTrapFocus]="false"`. En `< lg` conserva la hoja inferior modal con backdrop y foco atrapado. Manejo de tecla Escape a nivel de documento (`keydown.escape`) y seguimiento de `previouslyFocusedElement` vía evento `(focusin)` para restaurar el foco a la tarjeta abierta.
  - `src/app/shared/components/segmented/segmented.component.ts`: Ítems con `min-height: 44px` y contenedor con `padding: 2px` para cumplir el área táctil mínima recomendada.
  - `src/app/features/appointments/domain/agenda-layout.ts`: Geometría calculada en horas (`topHours`, `heightHours`, `totalHours`) en lugar de `rem`. Eliminada la constante fija `REM_PER_HOUR`.
  - `src/app/features/appointments/components/agenda-grid/agenda-grid.component.ts`: Posicionamiento basado en `--hour-height: 8rem` y `@media (pointer: coarse) { --hour-height: 11rem; }` garantizando tarjetas de 15 min ≥ 44px. Celdas de hora y fondo actualizadas a `height: var(--hour-height)`. Auto-scroll mediante lectura directa de `nowLine.offsetTop`.
  - `src/app/features/appointments/components/appointment-card/appointment-card.component.ts`: Inclusión de `aria-haspopup="dialog"` y `[attr.aria-expanded]="selected()"` en el botón principal. Posicionamiento en horas con `calc(var(--hour-height) * ...)`. Reemplazo de formateador manual por instancia compartida de `ClinicTimePipe`.
  - `src/app/features/appointments/components/agenda-summary/agenda-summary.component.ts`: Añadido `role="group"` al contenedor con `aria-label="Resumen del día"`.
  - `src/app/features/appointments/components/appointment-panel/appointment-panel.component.ts`: Atributo `tabindex="-1"` en el `h2` del nombre del paciente y auto-foco en la apertura/cambio de cita mediante `effect()`.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.ts`: Reserva de espacio para el panel en `≥ lg` con `padding-inline-end: 26rem` sin animación en `.reception-agenda-page--panel-open`, previniendo scroll horizontal de la página.
- **Resultado del build y test:**
  - `npx ng build`: OK (bundle generado en 24.8 s, sin errores ni advertencias de presupuesto).
  - `npx ng test --watch=false` (copia literal de los totales de consola):
```
Test Files  3 passed (3)
     Tests  10 passed (10)
```
- **Anchos revisados:**
  - `375px`: Hoja inferior modal ocupando el ancho completo con backdrop y foco atrapado. Botones táctiles cómodos.
  - `768px` (táctil `pointer: coarse`): Tarjetas de 15 min escaladas a 44px de altura (`11rem * 0.25 = 2.75rem = 44px`); hoja inferior modal con backdrop.
  - `1024px` (táctil `pointer: coarse`): Tarjetas de 15 min con altura ≥ 44px; hoja inferior modal con drag handle.
  - `1366px` (escritorio): Panel lateral derecho no modal de 26rem sin backdrop; la grilla reserva `padding-inline-end: 26rem` y mantiene scroll horizontal interno sin desbordar la página; clic en otra tarjeta actualiza el panel fluidamente y Esc devuelve el foco a la tarjeta correspondiente.
  - `1920px` (escritorio amplio): Panel no modal a la derecha con grilla despejada y todas las columnas visibles.
- **Cómo levantar lo necesario para la ## Prueba manual:**
  - Backend: `./mvnw spring-boot:run` en `:8080`.
  - Frontend: `npx ng serve` y navegar a `http://localhost:4200/recepcion`.
  - Credenciales: `secretaria@bellidental.local` / `Cambiar.2026!`.
- **Problemas encontrados y supuestos tomados:**
  - Ninguno. Todos los criterios de accesibilidad, dimensiones táctiles, reactividad y rendimiento se resolvieron sin alterar el comportamiento funcional ni las pruebas existentes.

## Revisión


**Revisión 1** — Estado: APROBADO (con 2 correcciones mínimas de Claude)

Build OK y `ng test`: 10/10 (3 archivos). Los criterios 1–11 se cumplen en el código:
- `BreakpointObserver` a 1200 px; sin backdrop, sin `aria-modal` y sin foco atrapado en `≥ lg`;
- la página reserva 26rem;
- la geometría se calcula en horas, con `--hour-height` de 8rem y 11rem con `pointer: coarse`, y el desplazamiento
  automático usa `offsetTop`;
- tarjeta con `aria-haspopup` y `aria-expanded`; resumen con `role="group"`; segmented a 44 px;
- `ClinicClock` crea sus formateadores una vez, y la tarjeta usa `ClinicTimePipe`.

Corregí yo dos fallos:
1. **El panel robaba el foco cada 60 s.** El `effect` que enfoca el título dependía de `appointment()`. El refresco
   trae objetos nuevos, así que el foco saltaba al panel aunque la secretaria estuviera escribiendo en el buscador.
   Ahora depende de `appointmentId = computed(() => appointment().id)`, que solo cambia al abrir otra cita.
2. **Esc cerraba el panel junto con el diálogo de confirmación.** El listener `document:keydown.escape` no recibía
   el evento y cerraba el panel siempre, también al pulsar Esc en el `ConfirmDialog` de Cancelar. Ahora recibe
   `$event` y no hace nada si `event.defaultPrevented`. CDK Dialog escucha en `body` y llama a `preventDefault`;
   el combobox detiene la propagación.

Build y tests en verde tras las correcciones.
