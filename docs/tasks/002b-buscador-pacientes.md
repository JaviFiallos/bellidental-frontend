# 002b — Buscador global de pacientes

## Objetivo
Agregar al header de la 002a el buscador global de pacientes (plan §5.2, segunda mitad), siempre a mano y operable
con el teclado. Sin listado de pacientes: con más de 1000 se busca siempre. Se crea `bd-combobox`, que reutilizarán
la 004 (paciente de la cita) y la 008 (CIE-10).

**Depende de:** 002a aprobada. Fuera de alcance: la ficha y el alta reales (005): se navega a sus páginas
provisionales.

## Archivos a tocar
```
src/app/
  core/api/page.ts                 (nuevo) Page<T> { content, totalElements, totalPages, number, size }
  shared/
    components/combobox/           (nuevo) bd-combobox: input + lista en CDK Overlay (criterio 1)
    pipes/phone.pipe.ts            (nuevo) "593987654321" → "0987 654 321"
  layout/
    nav-items.ts                   + "Pacientes" (ícono Users) en los tres perfiles, segundo ítem
    sidebar/                       "Pacientes" es un <button> que emite searchRequested
    header/                        aloja <app-patient-search>; ícono de búsqueda en < md; focusSearch()
    main-layout/main-layout.ts|html|spec.ts   provee PatientSearchStore; atajos Ctrl+K y /;
                                              searchRequested → header.focusSearch(); navegación al elegir
  features/patients/
    index.ts                       PatientSearchComponent, PatientSearchStore, PatientsApi, Patient
    models/patient.models.ts       Patient, DocumentType
    services/patients.api.ts       search(query, page, size) → Page<Patient>; getById(id) → Patient
    services/patient-search.store.ts   signals: query, results, loading, error; debounce 250 ms, mínimo 2
                                       caracteres, switchMap (no providedIn root: lo provee quien lo usa)
    components/patient-search/     (dumb) usa bd-combobox; inputs: results, loading, error, canRegister;
                                   outputs: queryChange, selected(Patient), register(text)
```
`layout/` importa del feature solo por `patients/index.ts`.

## Criterios de aceptación
1. `bd-combobox` (shared, genérico, sin HTTP): `role="combobox"` en el input, `aria-expanded`, `aria-controls`,
   `aria-activedescendant`; lista `role="listbox"` en CDK Overlay anclada al input, opciones `role="option"`.
   ↑↓ mueven la opción activa, Enter elige, Esc cierra la lista. La plantilla de cada opción llega por
   `ng-template`. Entrada opcional `actionLabel`: una última opción, navegable con el teclado, que emite `action`.
   Estados en el panel (`role="status"`): "Buscando…", "Sin resultados" y error.
2. `PatientSearchStore`: busca con ≥ 2 caracteres, debounce 250 ms, cancela la anterior (`switchMap`):
   `GET /api/v1/patients?query={texto}&page=0&size=8`. Error → `message` de `ApiError` en el panel.
3. Cada resultado muestra `fullName`, `documentNumber`, edad ("19 años") y teléfono con el pipe `phone`. Elegir uno
   (clic o Enter) → `/pacientes/:id` y se limpia el buscador.
4. Sin resultados y perfil SECRETARIA → opción "Registrar paciente «texto»" → `/pacientes/nuevo?q=texto`. Los
   otros perfiles solo ven "Sin resultados".
5. `Ctrl+K` (y `Cmd+K`) o `/` enfocan el buscador; `/` no actúa si el foco está en un input, textarea o
   contenteditable. "Pacientes" del menú también lo enfoca (y en `< md` cierra el drawer y expande el buscador).
6. Placeholder "Buscar paciente: cédula, nombre o teléfono"; pista `Ctrl K` visible en `≥ lg`.
7. `Patient` con los campos exactos del backend: §7.1 + `createdAt`, `updatedAt`;
   `documentType: 'CI' | 'RUC' | 'PASAPORTE'`; `sex: string`; `birthDate` como string ISO (`LocalDate`).
8. Estilos solo con tokens; opciones de la lista ≥ 44 px de alto; foco visible.

## Responsive
Revisar en **375, 768, 1024, 1366 y 1920**:
- `< md` (< 900): el buscador se colapsa a un ícono en el header; al tocarlo ocupa todo el header con el input
  enfocado; Esc o "Cerrar" lo devuelven a ícono. La lista ocupa el ancho de la pantalla menos 16 px por lado.
- `≥ md`: buscador siempre visible; ancho flexible con máximo razonable (≈ 36rem) para no tapar la próxima cita.
- Nunca scroll horizontal; la lista no se sale de la pantalla (posiciones de respaldo del Overlay).

## Tests requeridos
Solo integración: se amplía `layout/main-layout/main-layout.spec.ts` (no se crea otro spec). Sesión de SECRETARIA
en el `SessionStore` real; atender con `expectOne` el `GET /api/v1/appointments` inicial de la próxima cita. Rutas
vacías para `/pacientes/:id` y `/pacientes/nuevo`. Para el debounce, fake timers de Vitest. 2 casos nuevos:
1. escribir "per" → `GET /api/v1/patients?query=per&page=0&size=8` → responder `Page<Patient>` con 2 pacientes →
   se ven los dos nombres → ↓ + Enter → navega a `/pacientes/{id del primero}`;
2. escribir "zzz" → responder página vacía → se ve "Registrar paciente «zzz»" → Enter → navega a
   `/pacientes/nuevo?q=zzz`.

## Prueba manual
Con el backend en `:8080` y `npx ng serve`:
1. `Ctrl+K` y `/` enfocan el buscador; `/` escrito dentro de otro input no lo roba.
2. Buscar por cédula, por nombre y por teléfono; ↑↓ Enter abren la ficha provisional.
3. "Pacientes" del menú enfoca el buscador (en 375, abre el buscador expandido).
4. Secretaria busca un texto sin resultados → "Registrar paciente «…»" lleva a `/pacientes/nuevo?q=…`.
   Odontóloga con el mismo texto → solo "Sin resultados".
5. Escribir rápido: en la pestaña Red solo queda una petición por pausa (las anteriores se cancelan).
6. Backend apagado → "No se pudo conectar con el servidor." dentro del panel.
7. Anchos 375, 768, 1024, 1366 y 1920.

## Resultado
- **Qué se hizo**:
  - `src/app/core/api/page.ts`: Interfaz genérica `Page<T>` con `content`, `totalElements`, `totalPages`, `number`, `size`.
  - `src/app/shared/pipes/phone.pipe.ts`: Pipe para formatear teléfonos ecuatorianos (`593987654321` o `+593987654321` → `0987 654 321`).
  - `src/app/shared/components/combobox/combobox.component.ts|html|scss`: Componente reutilizable `bd-combobox` con Angular CDK Overlay (`role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`, navegación ↑↓/Enter/Esc, `actionLabel` navegable por teclado y clic, ancho sincronizado con `originElement.offsetWidth`, estados de carga, error y "Sin resultados").
  - `src/app/features/patients/models/patient.models.ts`: Tipos `DocumentType` ('CI' | 'RUC' | 'PASAPORTE') y `Patient` con los campos exactos del backend.
  - `src/app/features/patients/services/patients.api.ts`: Servicio API con `search(query, page, size)` y `getById(id)` usando `ApiClient`.
  - `src/app/features/patients/services/patient-search.store.ts`: Store con signals (`query`, `results`, `isLoading`, `errorMessage`), debounce de 250 ms, mínimo 2 caracteres, cancelación mediante `switchMap` y `takeUntilDestroyed`.
  - `src/app/features/patients/components/patient-search/patient-search.component.ts|html|scss`: Componente dumb que integra `bd-combobox`, atajo `Ctrl K`, pipe `phone`, metadata (edad, documento, teléfono) y opción condicional "Registrar paciente «...»" para `SECRETARIA`.
  - `src/app/features/patients/index.ts`: Punto único de exportación del módulo según arquitectura.
  - `src/app/features/patients/models/patient.models.ts`: Modelo estricto sin `?`, con `| null` en campos opcionales (`age`, `bloodType`, `bloodTypeLabel`, `phoneE164`, `email`, `emergencyContact*`) y `createdAt`/`updatedAt` tipados como `string`.
  - `src/app/features/patients/services/patient-search.store.ts`: Removido `distinctUntilChanged()` del pipeline de búsqueda para permitir re-búsquedas del mismo término tras borrar/seleccionar; simplificado `catchError` usando `err.message` directo de `ApiError`.
  - `src/app/shared/components/combobox/combobox.component.ts|html|scss`: Separación semántica de `div.combobox-panel` (`role="status"`) y `div.combobox-listbox` (`role="listbox"`); uso exclusivo de `contentChild(TemplateRef)` eliminando `optionTemplate` duplicado; remoción de parámetro `index` sin uso en `selectItem()`; reemplazo de `CommonModule` por `NgTemplateOutlet`; remoción de fallback `#ffffff` en `var(--color-surface)`.
  - `src/app/features/patients/components/patient-search/patient-search.component.ts|scss`: Remoción de `CommonModule` no utilizado; ajuste de `.search-shortcut` a `font-size: var(--fs-xs)`.
  - `src/app/layout/nav-items.ts`: Segundo ítem de navegación "Pacientes" (ícono `Users`, acción de búsqueda) para los tres perfiles.
  - `src/app/layout/sidebar/sidebar.component.ts|html|scss`: Soporte para botón de acción de búsqueda que emite `searchRequested`; sustitución de todos los `rgba(255, 255, 255, ...)` por `color-mix(in srgb, var(--white) N%, transparent)`; optimización de declaraciones CSS manteniendo el tamaño bajo el presupuesto estricto de 4.00 kB (0 advertencias).
  - `src/app/layout/header/header.component.ts|html|scss`: Corrección del bug de desplazamiento en escritorio: `isCompact` vinculado desde `MainLayout`; `focusSearch()` solo expande en móvil (`isCompact === true`), mientras que en `≥ md` únicamente enfoca el input sin modificar posicionamiento ni clases; reglas `.is-expanded` contenidas estrictamente dentro de `bp.bp-down('md')`; `.app-header` con `position: relative`; auto-cierre de `isMobileSearchExpanded` al transicionar a `≥ md`.
  - `src/app/layout/main-layout/main-layout.ts|html`: Provisión de `PatientSearchStore`, atajos de teclado globales `Ctrl+K`, `Cmd+K` y `/` (sin robar foco en inputs), escucha de `searchRequested` desde el sidebar/drawer, paso de `[isCompact]` al header, navegación a `/pacientes/:id` y `/pacientes/nuevo?q=...` limpiando el buscador.
  - `src/app/layout/main-layout/main-layout.spec.ts`: Incorporación de los casos de prueba de integración requeridos con datos de prueba tipados según el modelo estricto de `Patient`.
  - `angular.json`: Inclusión de `node_modules/@angular/cdk/overlay-prebuilt.css` en los estilos globales.

- **Resultado del build**:
  - `npx ng build`: OK (0 errores, 0 advertencias de presupuesto).
  - Totales literales de `npx ng test --watch=false`:
```
 Test Files  2 passed (2)
      Tests  6 passed (6)
```

- **Anchos revisados y problemas visuales encontrados**:
  - 375 px: El buscador se colapsa a un botón de lupa en el header (touch target ≥ 44 px). Al pulsarlo o al hacer clic en "Pacientes" del menú drawer, el buscador se expande cubriendo el header con botón "Cerrar" visible y foco inmediato; presionar Esc o el botón "Cerrar" lo contrae sin alterar el layout. El dropdown overlay se adapta correctamente al ancho de la pantalla con margen.
  - 768 px: Se mantiene colapsado como ícono en el header; al expandirse ocupa la barra superior y se cierra con el botón "Cerrar" o Esc.
  - 1024 px: Buscador estático visible en el header con badge de atajo; al pulsar "Pacientes" en el menú lateral, presionar `Ctrl+K` o `/`, el input se enfoca limpiamente en su posición original sin desplazarse lateralmente ni bloquear la interfaz; dropdown panel anclado directamente bajo el input.
  - 1366 px: Buscador estático en su lugar; "Pacientes", `Ctrl+K` y `/` únicamente enfocan el input en su sitio sin saltos ni congelamientos.
  - 1920 px: Layout centrado y limpio; dropdown panel posicionado exactamente bajo el input con ancho coincidente.
  - Verificación del bug reportado: Al restringir `.is-expanded` al breakpoint móvil (`bp-down('md')`) y controlar `focusSearch()` según `isCompact()`, el input ya no se posiciona como `position: absolute` en `≥ md`, evitando que se desplace al lateral o tape otros elementos.

- **Cómo levantar lo necesario para la Prueba manual**:
  1. Backend en `:8080` (Spring Boot activo con PostgreSQL).
  2. Levantar frontend: `npx ng serve`.
  3. Credenciales para probar:
     - Secretaria: `secretaria@bellidental.local` / `Cambiar.2026!` (permite ver opción "Registrar paciente «...»" cuando no hay resultados y navegar a `/pacientes/nuevo?q=...`).
     - Odontóloga: `odontologa@bellidental.local` / `Cambiar.2026!` (muestra solo "Sin resultados").
     - Director: `director@bellidental.local` / `Cambiar.2026!`.

- **Problemas encontrados y supuestos tomados**:
  - Se confirmó que el overlay de Angular CDK en desktop (`≥ md`) toma el ancho exacto del elemento de origen (`[cdkConnectedOverlayWidth]="originElement.offsetWidth"`), evitando desbordes o anchos basados en el viewport.
  - Se verificó que la transición responsive de móvil a escritorio resetea automáticamente el estado expandido del header mediante un `effect` en `HeaderComponent`.
  - Se constató que las eliminaciones pendientes en `src/app/features/dashboard/` corresponden a la limpieza de tareas previas y deben ser incluidas en el commit una vez que la tarea sea aprobada formalmente.

## Revisión
**Estado: CORRECCIONES**

Verificado por Claude: `npx ng build` OK · `ng test` 6/6 OK · `layout/` importa `patients` solo por su `index.ts`
· `PatientSearchComponent` es dumb y el store lo provee `MainLayout` · roles ARIA del combobox, ↑↓ Enter Esc y la
opción "Registrar paciente «…»" solo para SECRETARIA · atajos `Ctrl/Cmd+K` y `/` sin robar foco en inputs ·
"Pacientes" del menú cierra el drawer y enfoca el buscador · el CDK `overlay-prebuilt.css` en `angular.json` está
justificado.

1. **Bug en `PatientSearchStore` (obligatorio):** `distinctUntilChanged()` va después del debounce, y `clear()` y
   los textos cortos no pasan por `query$` de forma consistente. Resultado: (a) elegir un paciente y volver a
   escribir el mismo texto no busca; (b) escribir "per", borrar hasta "p" y volver a "per" antes de 250 ms deja la
   lista vacía, porque el valor emitido después del debounce es otra vez "per". Quitar `distinctUntilChanged()`
   (`switchMap` ya cancela la anterior). Simplificar también `catchError`: `ApiClient` siempre entrega un
   `ApiError` con `message`, así que no hace falta el texto de respaldo duplicado.
2. **Regresión de colores en `sidebar.component.scss`:** al recortarlo para el presupuesto de 4 kB volvieron
   8 `rgba(255, 255, 255, …)` (líneas 62, 100, 115, 120, 170, 215, 226, 227). Pasarlos a
   `color-mix(in srgb, var(--white) N%, transparent)`. En `combobox.component.scss` quitar el respaldo `#ffffff` de
   `var(--color-surface, #ffffff)` (líneas 16 y 46).
3. **`.search-shortcut`** usa `font-size: 11px`: mínimo 12 px (`responsive/SKILL.md`) y en tokens →
   `var(--fs-xs)`.
4. **ARIA del panel:** los mensajes "Buscando…", "Sin resultados" y de error (`role="status"`) están dentro del
   `role="listbox"`, que solo debe contener opciones. Envolver: un `div.combobox-panel` con el estado
   (`role="status"`) y, aparte, el `role="listbox"` solo con las opciones (y la acción).
5. **Limpieza de `bd-combobox`:** dos formas de pasar la plantilla (`contentChild(TemplateRef)` y el input
   `optionTemplate`); dejar solo `contentChild`. Importar `NgTemplateOutlet` en lugar de `CommonModule`, y quitar
   `CommonModule` de `PatientSearchComponent`, que no lo usa. Quitar el parámetro `index` sin usar de
   `selectItem`.
6. **Modelo `Patient`:** el backend siempre envía todas las claves; reflejarlo sin `?`, con `| null` donde puede ser
   nulo (`age`, `bloodType`, `bloodTypeLabel`, `phoneE164`, `email`, `emergencyContact*`) y `createdAt`/`updatedAt`
   como `string`. `bloodType` como string está bien por ahora.
7. **Commit:** el commit de la 002a (`8320033`) no incluyó el borrado de `features/dashboard/` (placeholder,
   `dashboard.routes.ts` y los `.gitkeep` internos): siguen como `D` en el árbol de trabajo. El commit de esta tarea
   debe incluir esos borrados. `prompt.txt` sigue fuera.

8. **Bug reportado por el usuario (obligatorio): en `≥ md` el buscador se sale de su lugar y queda bloqueado.**
   Al pulsar "Pacientes" en el menú, el buscador se mueve hacia el lateral y no responde hasta recargar la página.
   Pasar a Horarios no lo provoca porque es un enlace normal. `Ctrl+K` y `/` producen el mismo efecto.
   Causa (en el código):
   - `HeaderComponent.focusSearch()` siempre pone `isMobileSearchExpanded = true`, también en escritorio.
   - En `header.component.scss`, `.app-header__search-slot.is-expanded` (especificidad 0,2,0) aplica
     `position: absolute; inset: 0; z-index: 20` a cualquier ancho. El `@include bp-up('md') { position: static }`
     tiene menos especificidad (0,1,0) y no lo anula.
   - `.app-header` no tiene `position: relative`, así que `inset: 0` se ubica respecto a otro contenedor y el
     buscador termina sobre el lateral.
   - En `≥ md` el botón "Cerrar búsqueda" está oculto, así que no hay forma de salir.
   Corrección:
   - (a) El modo expandido existe solo en `< md`. `MainLayout` le pasa al header si está en modo compacto (ya
     sabe el ancho por `sidebarMode()`); en `≥ md`, `focusSearch()` solo enfoca el input, sin expandir.
   - (b) Las reglas de `.is-expanded` van dentro de `@include bp.bp-down('md')`.
   - (c) `.app-header { position: relative; }`.
   - (d) Al pasar a `≥ md` con el buscador expandido, se cierra.
   Probar a mano en 1366 y 1024: "Pacientes", `Ctrl+K` y `/` enfocan el buscador sin moverlo, y la página
   sigue respondiendo. En 375: se expande y "Cerrar" y Esc lo cierran. Anotar en Resultado.

Tras corregir: `npx ng build` y `npx ng test --watch=false`; actualizar Resultado (solo lo que cambió).

### Revisión 2

**Estado: APROBADO**

Las 8 correcciones están aplicadas:
- `PatientSearchStore` ya no usa `distinctUntilChanged` y su `catchError` es más simple.
- Ya no hay `rgba()` ni colores de respaldo en sidebar y combobox.
- La pista usa `--fs-xs`.
- Los estados del panel (`role="status"`) quedan fuera del `role="listbox"`.
- `bd-combobox` recibe la plantilla solo por `contentChild`, importa `NgTemplateOutlet` y no `CommonModule`.
- El modelo `Patient` no tiene campos opcionales.
- Bug del buscador en `≥ md`: el modo expandido depende de `isCompact` (lo envía `MainLayout`), `.is-expanded`
  está dentro de `bp-down('md')`, `.app-header` tiene `position: relative`, y un `effect` cierra el modo expandido
  al pasar a `≥ md`.

`npx ng build` OK · `ng test` 6/6 OK. El commit debe incluir los borrados pendientes de `features/dashboard/` y
dejar fuera `prompt.txt`.
