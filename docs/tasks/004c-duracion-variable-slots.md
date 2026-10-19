# 004c — Nueva cita y reprogramar: bloques de 15 min y duración elegida

> Plan §5.4 (mejora sobre 004a/004b, pedida tras la prueba manual). Perfil: SECRETARIA.
> **Requiere backend 006f** (`bellidental-backend/docs/tasks/006f-disponibilidad-duracion-variable.md`): parámetro
> `durationMinutes` en `GET /availability`. No ejecutar esta tarea hasta que la 006f tenga commit.

## ¿Toca cambiar el backend? Sí, poco
| Necesidad | Backend hoy | Cambio |
|---|---|---|
| Ver bloques de 15 min | `/availability` corta por la duración de la especialidad: con 30 min solo ofrece 09:00, 09:30… | **006f:** `durationMinutes=15` opcional |
| Guardar una cita de 45/60/90 min | `POST /appointments` y `/reschedule` **ya aceptan `endAt`** y validan turno y cruce | 006f solo valida múltiplo de 15 y máximo 240 |
| Ocultar lo ya tomado | `/availability` ya omite los bloques que se cruzan con citas activas | — |
| Reprogramar sin perder la duración | sin `endAt` usa la duración por defecto de la especialidad | — (el frontend envía siempre `endAt`) |

Se descarta calcular los huecos en el frontend con `/appointments` y `/schedules`: duplicaría `SlotCalculator`
(turnos, excepciones, "ahora"), y el backend debe seguir siendo la fuente de verdad.

## Objetivo
Que la secretaria agende citas de cualquier duración múltiplo de 15 (15 min a 4 h), viendo solo los bloques libres,
agrupados por jornada para no mostrar demasiados chips a la vez.

**Interacción (modo Operate, pocos clics):**
1. Al elegir profesional, especialidad y fecha, el store pide `/availability?...&durationMinutes=15` y recibe los
   bloques libres de 15 min.
2. **Duración:** control `−` / valor / `+` con pasos de 15 min, entre 15 min y 4 h, y textos `"45 min"`, `"1 h"`,
   `"1 h 30 min"`. Valor inicial:
   - nueva cita: `defaultDurationMinutes` de la especialidad, redondeada hacia arriba a 15;
   - reprogramar: la duración de la cita original (`endAt − startAt`).
   Reemplaza el texto actual "Duración: N min".
3. **Hora de inicio:** los chips son solo los bloques donde **cabe la duración elegida**, es decir, los N bloques
   seguidos son contiguos (`bloque[i].endAt === bloque[i+1].startAt`). Al elegir un chip, los N bloques de la cita
   quedan marcados como rango (el primero como inicio y el resto como "en rango"), para que se vean los slots
   seguidos que ocupa. Cambiar la duración recalcula los chips. Si el inicio elegido deja de caber, se quita la
   selección y aparece `role="status"`: "La cita de 1 h no cabe desde las 09:30. Elige otra hora."
4. **Jornadas:** un control segmentado `Mañana (n) · Tarde (n)` muestra **una jornada a la vez**. Se mantiene el corte
   actual de 12:00 y `n` cuenta las horas de inicio válidas. Jornada inicial: la de la hora preseleccionada (clic
   en la grilla) o, si no hay, la primera con inicios válidos. Una jornada sin inicios queda deshabilitada y dice
   "(0)".
5. **Resumen** bajo los chips: "09:30 – 10:30 · 1 h". El botón "Agendar cita" / "Reprogramar" se activa solo con
   un inicio válido.
6. Al enviar: `startAt` = inicio del primer bloque y `endAt` = fin del último. Crear y reprogramar **envían siempre
   `endAt`**. En reprogramar se mantiene la regla de enviar `professionalId` y `specialtyId` solo si cambiaron.
7. 409 → mensaje del backend, se vuelven a pedir los bloques y se conservan la duración y la jornada. El inicio se
   conserva solo si todavía cabe.
8. Clic en un hueco de la grilla (`openFromSlot`): la hora redondeada a 15 min queda preseleccionada si cabe con la
   duración inicial. Si no, no se elige nada y aparece el mensaje del punto 3.
9. **Walk-in sin cambios:** sigue pidiendo `/availability` **sin** `durationMinutes` y usa la duración por defecto.

## Archivos a tocar
```
src/app/features/appointments/
  domain/
    slot-ranges.ts                       (nuevo) funciones puras: validStarts(blocks, minutes),
                                           rangeFrom(blocks, start, minutes), formatDuration(minutes),
                                           roundUpToQuarter(minutes); constantes SLOT_STEP_MINUTES = 15,
                                           MAX_DURATION_MINUTES = 240, NOON_MINUTES = 720
  services/
    availability.api.ts                  slots(..., durationMinutes?: number) → añade el param solo si llega
    appointment-form.store.ts            durationMinutes (signal), validStarts/selectedRange (computed),
                                           setDuration(), body con endAt; walk-in sin cambios
  components/
    slot-picker/slot-picker.component.ts|scss   inputs: blocks, durationMinutes, selectedStart;
                                           outputs: startChange, durationChange; jornadas en control
                                           segmentado; rango marcado; resumen
    duration-stepper/duration-stepper.component.ts   (nuevo, dumb) − / valor / +, aria-live del valor
    appointment-form/appointment-form.component.ts   pasa los inputs y outputs nuevos
  pages/reception-agenda/
    reception-agenda.page.spec.ts        +1 caso; URL de /availability con &durationMinutes=15 en los casos
                                           existentes de crear y reprogramar (walk-in no cambia)
docs/IMPLEMENTATION-PLAN.md               §5.4 (decisión "no envía endAt" → "envía siempre endAt") y §7 (param)
```
No cambia `index.ts` del feature (no se exporta nada nuevo). No hay dependencias nuevas.

## Criterios de aceptación
1. `GET /api/v1/availability?professionalId=…&specialtyId=…&date=…&durationMinutes=15` en crear y reprogramar; el
   walk-in sigue sin `durationMinutes`.
2. Duración entre 15 y 240 en pasos de 15. `−` se deshabilita en 15 y `+` en 240. Cada botón mide al menos
   44×44 px y tiene `aria-label` ("Reducir duración" / "Aumentar duración"). El valor se anuncia con
   `aria-live="polite"`.
3. Los chips muestran solo los inicios donde cabe la duración. Una cita de 60 min no ofrece las 11:30 si el bloque
   de las 12:00 está ocupado o fuera de turno.
4. El rango elegido se distingue por color **y** por algo más, por ejemplo un borde, un ícono de check en el inicio
   o el texto del resumen. Los chips siguen siendo un `radiogroup` nativo, y los bloques en rango llevan
   `aria-describedby` hacia el resumen.
5. Control de jornadas con `role="tablist"` o radios, y los conteos visibles. Solo se muestra una jornada a la vez.
6. Body de `POST /appointments`: `{ patientId, professionalId, specialtyId, startAt, endAt, reason }`, con
   `endAt − startAt` igual a la duración elegida. Reprogramar envía `startAt` y `endAt`.
7. Al reprogramar, la duración inicial es la de la cita original, no la de la especialidad.
8. 409 y reintento como en el punto 7 del Objetivo. Si el backend responde 400 por la duración, se muestra su
   `message`.
9. La lógica de contigüidad vive en `domain/slot-ranges.ts`; componentes y store no repiten cálculos de minutos.
   Solo tokens de `_tokens.scss`.
10. Las plantillas de `slot-picker` y `duration-stepper` no pasan de ~150 líneas cada una.

## Responsive
Revisar en **375, 768, 1024, 1366 y 1920**.
- 375: el control de jornadas ocupa el ancho completo, los chips van en 3–4 columnas y el resumen y el stepper
  quedan visibles sin scroll horizontal.
- 768 y 1024 (hoja inferior): sin desbordes y con chips ≥ 44 px.
- 1366 y 1920 (panel lateral): el panel no crece en ancho, y los chips se reacomodan con `@container`.

## Tests requeridos
Se amplía `reception-agenda.page.spec.ts` con **1 caso nuevo**; los casos existentes solo actualizan la URL de
`/availability` en crear y reprogramar:
1. "Nueva cita de 1 h": abrir nueva cita (especialidad de 30 min) → `GET /availability?...&durationMinutes=15`.
   La respuesta trae los bloques de 15 min de 09:00 a 11:00 **sin el de las 09:45** (ocupado) → pulsar `+` dos
   veces (30 → 60 min) → el chip de las **09:00 no aparece**, porque el hueco de las 09:45 rompe los 4 bloques
   seguidos, y el de las **10:00 sí** → elegir 10:00 → el resumen dice "10:00 – 11:00 · 1 h" → "Agendar cita" →
   `POST /appointments` con `startAt` 10:00 y `endAt` 11:00 → 201 → la tarjeta aparece en la agenda.

El caso de 409 que ya existe cubre el reintento; solo se actualiza su URL.

## Prueba manual
1. Secretaria → Nueva cita con una especialidad de 30 min → la duración inicial es "30 min" y los chips van de 15
   en 15.
2. Subir a "1 h": desaparecen los inicios donde no caben 4 bloques seguidos; al elegir uno se marcan los 4 bloques
   y el resumen muestra la hora de fin.
3. Agendar → la tarjeta en la agenda ocupa la hora completa. Abrir otra cita nueva ese día: esos bloques ya no
   aparecen.
4. Cambiar entre Mañana y Tarde: solo se ve una jornada y los conteos coinciden.
5. Clic en un hueco de la grilla a las 10:15 → queda preseleccionado si cabe.
6. Reprogramar una cita de 45 min → la duración inicial es 45 min → mover a otro día → conserva los 45 min.
7. Walk-in: sigue funcionando igual.
8. Anchos 375, 1024 y 1366.

## Resultado
- **Qué se hizo:**
  - `src/app/features/appointments/domain/slot-ranges.ts`: creado con constantes `SLOT_STEP_MINUTES` (15), `MAX_DURATION_MINUTES` (240), `NOON_MINUTES` (720), `DEFAULT_DURATION_MINUTES` (30) y funciones puras `roundUpToQuarter()`, `formatDuration()`, `rangeFrom()`, `validStarts()`.
  - `src/app/features/appointments/services/availability.api.ts`: añadido parámetro opcional `durationMinutes?: number` en `slots()`.
  - `src/app/features/appointments/services/appointment-form.store.ts`: añadido signal `durationMinutes` inicializado con `DEFAULT_DURATION_MINUTES`, computed `selectedRange`, método `setDuration()`, paso de `durationMinutes = SLOT_STEP_MINUTES` en `triggerAvailability()`, cálculo de `endAt` en `create` y `reschedule` usando `this.selectedRange().at(-1)!.endAt`, manejo de 409 preservando selección si cabe, método `setSelectedStart(startAt: string | null)`, y cálculo inicial de duración de cita original en reprogramar. Se eliminó el código muerto `validStarts`.
  - `src/app/features/appointments/components/duration-stepper/duration-stepper.component.ts`: nuevo componente dumb para control stepper (− / valor / +) con límites 15 y 240, valor por defecto `DEFAULT_DURATION_MINUTES`, objetivos táctiles de 44×44 px, `aria-label` en botones y `aria-live="polite"` en el valor formateado.
  - `src/app/features/appointments/components/slot-picker/slot-picker.component.ts|scss|html`: control segmentado de jornadas (`Mañana (n) · Tarde (n)`) con `role="tablist"` mostrando una sola jornada a la vez; chips native radiogroup mostrando solo inicios donde cabe la duración elegida y marcando bloques contiguos en rango con `aria-describedby` hacia el resumen `"09:30 – 10:30 · 1 h"`. Se limpió la API duplicada transitoria dejando únicamente los inputs (`blocks`, `durationMinutes`, `selectedStart`, `loading`, `error`, `ready`, `ariaLabelledby`) y outputs (`startChange`, `durationChange`, `nextDay`, `retry`). Mensaje vacío preciso: si hay bloques pero la duración no cabe, muestra `"La cita de {duración} no cabe en ningún hueco de este día. Reduce la duración o mira el día siguiente."` con `role="status"` en el `<p>`.
  - `src/app/features/appointments/components/appointment-form/appointment-form.component.ts`: configurado `DEFAULT_DURATION_MINUTES` en `durationMinutes`, computado `selectedStart`, adaptado `bd-slot-picker` con su API limpia y emisión de `startChange`.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.ts`: enlazado `(startChange)="formStore.setSelectedStart($event)"`.
  - `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.spec.ts`: actualizados tests de crear y reprogramar para verificar `&durationMinutes=15` y `endAt` en el body; añadido caso nuevo para cita de 1 h con bloques contiguos y hueco intermedio.
  - `docs/IMPLEMENTATION-PLAN.md`: actualizada decisión en §5.4 indicando que el frontend envía siempre `endAt` tras backend 006f, documentado el hito 004c y actualizado §7 con `durationMinutes?` en `/availability` y `endAt` en bodies de creación y reprogramación.
  - `prompt.txt`: excluido de commits y staging según instrucción de revisión.

- **Resultado del build y tests:**
  - Build: OK (`Application bundle generation complete. [23.690 seconds]`)
  - Tests consola (totales copiados literalmente):
```
 Test Files  8 passed (8)
      Tests  35 passed (35)
```

- **Anchos revisados (Responsive):**
  - 375: el control de jornadas ocupa el 100% de ancho disponible con flex. Los chips se distribuyen en 3–4 columnas sin scroll horizontal. Stepper y resumen visibles y claros.
  - 768 y 1024 (hoja inferior): sin desbordes, chips y botones del stepper miden ≥ 44×44 px con espaciado adecuado.
  - 1366 y 1920 (panel lateral): panel mantiene su ancho fijo (26rem), `slot-picker` usa `@container` para adaptarse y los chips fluyen automáticamente en grilla. Sin problemas visuales encontrados.

- **Cómo levantar lo necesario para la prueba manual:**
  - Backend con 006f y 006g ejecutándose en `http://localhost:8080`.
  - Frontend: `npm start` y abrir `http://localhost:4200/recepcion`. Iniciar sesión como Secretaria (`secretaria@bellidental.com` / clave configurada).
  - Seguir los pasos de `## Prueba manual`: probar nueva cita, subir duración a 1 h con stepper, alternar jornadas Mañana/Tarde, preselección desde grilla y reprogramar cita observando duración persistida.

- **Problemas encontrados y supuestos tomados:**
  - Ninguno. Todas las correcciones solicitadas por el revisor fueron aplicadas de manera limpia y los 35 tests pasan exitosamente.

## Revisión
Estado: APROBADO

Las 5 correcciones de la revisión fueron aplicadas y verificadas:
1. API de `slot-picker` simplificada sin duplicados (`blocks`, `durationMinutes`, `selectedStart`, `startChange`, `durationChange`). `appointment-form` adaptado con `startChange` y `reception-agenda` enlazado a `formStore.setSelectedStart()`.
2. Mensaje vacío preciso cuando los bloques existen pero no cabe la duración, con `role="status"` en el `<p>`.
3. Eliminado el computed no utilizado `validStarts` en `AppointmentFormStore`.
4. Reemplazados literales por constantes `SLOT_STEP_MINUTES` y `DEFAULT_DURATION_MINUTES` en store y componentes; `endAt` simplificado con `at(-1)!.endAt`.
5. Exclusión de `prompt.txt`.

Verificado: `npx ng build` OK y `npx ng test --watch=false` → 8 archivos, 35 tests en verde.

### Historial de revisión
**Primera revisión (CORRECCIONES):**

Verificado: `npx ng build` OK; `npx ng test --watch=false` → 8 archivos, 35 tests en verde. `/availability` lleva
`durationMinutes=15` en crear y reprogramar y el walk-in no lo lleva (store:187). `endAt` se envía en los dos bodies.
La duración al reprogramar sale de la cita original. Con un 409 el inicio se conserva solo si todavía cabe. El clic
en la grilla ya redondea a 15 min (`agenda-layout.ts:190`). La contigüidad está en `domain/slot-ranges.ts` y las
plantillas no pasan de 150 líneas. La funcionalidad cumple; falta limpiar lo siguiente:

1. **API duplicada en `slot-picker`.** Conviven `blocks`/`slots`, `selectedStart`/`selectedSlot` y
   `startChange`/`slotChange`, con `effectiveBlocks` y `effectiveSelectedStart` como puente. Dejar solo lo que
   pide la tarea: inputs `blocks`, `durationMinutes`, `selectedStart` y outputs `startChange`, `durationChange`.
   `appointment-form` emite `startChange`, y el store, o la página, resuelve el `AvailableSlot` buscándolo en
   `slots()` por `startAt`.
2. **Mensaje vacío engañoso.** Si hay bloques pero la duración no cabe en ninguno (`allValidStarts().length === 0`
   con `blocks().length > 0`), hoy se muestra "Sin horas libres este día.". Cambiarlo por "La cita de {duración}
   no cabe en ningún hueco de este día. Reduce la duración o mira el día siguiente." El texto actual se queda
   solo para cuando no llega ningún bloque. Además, `role="status"` debe ir en el `<p>` del mensaje y no en el
   contenedor que incluye el stepper y el botón.
3. **Código muerto en el store.** `AppointmentFormStore.validStarts` no se usa en ningún sitio: eliminarlo.
4. **Literales en el store.** Usar `SLOT_STEP_MINUTES` en `.slots(..., 15)`. En `submit` reemplazar
   `range.length > 0 ? ... : undefined` + `endAt!` por `this.selectedRange().at(-1)!.endAt`, porque `canSubmit`
   ya garantiza que el rango no está vacío. El valor inicial `30` de `durationMinutes`, que se repite en el
   store, `openCreate`, `appointment-form` y `slot-picker`, pasa a una constante `DEFAULT_DURATION_MINUTES` en
   `slot-ranges.ts`.
5. No incluir `prompt.txt` en el commit: no es parte de la tarea.

Sin tests nuevos: los 35 actuales deben seguir pasando (ajustar en el spec solo los selectores u outputs que
cambien por el punto 1).

### Segunda revisión
Estado: APROBADO

`npx ng build` OK; `npx ng test --watch=false` → 8 archivos, 35 tests en verde.
1. `slot-picker` queda con la API pedida (`blocks`, `durationMinutes`, `selectedStart` → `startChange`,
   `durationChange`). El store resuelve el bloque con `setSelectedStart()`. ✔
2. El mensaje de "no cabe" se separa de "Sin horas libres", y `role="status"` está en el `<p>`. ✔
3. Se eliminó `validStarts` del store. ✔
4. Se usan `SLOT_STEP_MINUTES` y `DEFAULT_DURATION_MINUTES`, y `endAt` sale de `selectedRange().at(-1)!.endAt`. ✔
5. `prompt.txt` sigue modificado en el working tree: no hacer `git add` sobre él.

Plan §9 actualizado (004c → Aprobada; tras el commit, poner el hash).
