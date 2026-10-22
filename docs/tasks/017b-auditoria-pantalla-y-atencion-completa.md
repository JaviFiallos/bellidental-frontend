# 017b — Auditoría: pantalla de actividad y historial completo de la atención

## Objetivo
Con el backend 025 (G-7 resuelto):
1. Vuelve **`/direccion/auditoria`** (DIRECTOR) con el ítem «Auditoría» en el menú: una **línea de tiempo** de
   cambios agrupada por día, con filtros (rango, usuario, tipo de registro, paciente) y paginación. Cada fila abre
   el detalle «antes → después» en el diálogo de la 017.
2. El botón «Historial de cambios» de la **atención** usa `GET /audit/encounters/{id}/full`: muestra también
   diagnósticos, hallazgos, tratamientos y recetas, con una etiqueta por tipo.
3. En la **ficha del paciente**, junto a «Historial de cambios», un enlace «Ver toda la actividad del paciente» →
   `/direccion/auditoria?paciente={id}`.

## Decisiones a revisar
- F-15 se revierte: hay pantalla de auditoría (antes se quitó por falta de lista en el backend).
- La lista muestra resumen (quién, cuándo, qué, paciente); el detalle de campos se carga al abrir una fila
  (`GET /audit/{entity}/{id}`), para no traer todos los cambios en la lista.
- Rango por defecto: últimos 7 días; máximo 92 días (límite del backend).
- El filtro de usuario es un selector con `GET /users` (ya usado por la 023a); el de paciente solo llega por la URL
  desde la ficha (no hay buscador de pacientes en esta pantalla; se muestra un chip «Paciente: Nombre ✕»).

## Archivos a tocar
```
src/app/features/management/
  models/audit.models.ts                         (modif.) AuditLogEntry, AuditLogQuery; AuditEntry + entity, entityId;
                                                 AuditEntityName + 'treatments' | 'specialties' si faltan
  services/audit.api.ts                          (modif.) list(query) → Page<AuditLogEntry>; encounterFull(id)
  services/audit-log.store.ts                    (nuevo) filtros desde la URL, carga y paginación con signals
  services/audit-history-dialog.service.ts       (modif.) admite una fuente «atención completa»
  domain/audit-display.ts                        (modif.) etiquetas de entidad/acción y frase de resumen
  components/audit-filters/audit-filters.component.ts   (nuevo) presentacional
  components/audit-timeline/audit-timeline.component.ts (nuevo) presentacional, agrupado por día
  components/audit-history-dialog/audit-history-dialog.component.ts (modif.) muestra la etiqueta de entidad
                                                 por entrada cuando la lista mezcla entidades
  pages/audit-log/audit-log.page.ts              (nuevo)
  pages/audit-log/audit-log.page.spec.ts         (nuevo)
src/app/app.routes.ts                            (modif.) direccion/auditoria con profileGuard('DIRECTOR')
src/app/layout/nav-items.ts                      (modif.) «Auditoría» (ícono lucide p. ej. ShieldCheck) en DIRECTOR
src/app/features/clinical/pages/encounter/encounter.page.ts         (modif.) onOpenChangesHistory → atención completa
src/app/features/patients/pages/patient-reception/patient-reception.page.ts (modif.) enlace a la actividad del paciente
```

## Criterios de aceptación
1. Modelos (backend 025):
   ```ts
   export interface AuditLogEntry { revision: number; at: string; userId: string | null; username: string | null;
     entity: AuditEntityName; entityId: string; type: AuditRevisionType; patientId: string | null;
     patientName: string | null; }
   ```
   `AuditEntry` añade `entity: AuditEntityName; entityId: string`.
   `AuditApi.list({ from, to, entity?, userId?, patientId?, page, size })` → `GET /api/v1/audit` con esos query
   params (omitir los vacíos), respuesta `Page<AuditLogEntry>` (`core/api/page.ts`).
   `AuditApi.encounterFull(id)` → `GET /api/v1/audit/encounters/{id}/full` → `AuditEntry[]`.
2. **Página** `/direccion/auditoria`: filtros en la URL (`?desde&hasta&tipo&usuario&paciente&pagina`); cambiar un
   filtro vuelve a la página 0. `size` 50. Línea de tiempo agrupada por día (`clinic-date`, zona America/Guayaquil),
   cada fila: hora, usuario («Sistema» si `username` es null), frase «creó / modificó / eliminó» + tipo en español
   (`audit-display.ts`: «la atención», «un diagnóstico», «un abono»…), paciente (enlace a `/pacientes/{id}` si hay)
   y botón «Ver cambios» (abre el diálogo de la 017 con `entity`/`entityId`). Estados: skeleton, vacío
   («Sin cambios en este período»), error con «Reintentar». Paginación «Anterior / Siguiente» con «Página N de M».
3. `DEL` no ocurre en datos clínicos (se anulan), pero si llega se muestra como «eliminó».
4. **Atención completa**: el diálogo de la atención muestra todas las entradas ordenadas, cada una con su etiqueta
   de tipo («Atención», «Diagnóstico», «Hallazgo», «Tratamiento», «Receta», «Ítem de receta») además de los cambios.
5. Solo el perfil DIRECTOR ve la ruta, el menú, el enlace de la ficha y el botón (`SessionStore.profile()`, sin
   comparar roles).

## Responsive
375, 768, 1024, 1366. En 375 los filtros se apilan (o se pliegan bajo «Filtros»), la línea de tiempo es una sola
columna; en lg+ filtros en una fila.

## Tests requeridos
`audit-log.page.spec.ts`, 2 casos:
1. `abrir con ?paciente=P1 → GET /api/v1/audit?from&to&patientId=P1&page=0&size=50 → se ven las filas agrupadas por
   día con "modificó la atención" y el nombre del paciente; "Ver cambios" → GET /audit/encounters/{id} → se ve el
   cambio de campo`.
2. `respuesta 400 del backend (rango inválido) → se ve su message`.
Responder también `GET /api/v1/users` si la página lo pide al iniciar.

## Prueba manual
1. Como director: menú «Auditoría» → últimos 7 días con los cambios de todos.
2. Filtrar por usuario «secretaria» y tipo «Abonos» → solo sus cobros/anulaciones.
3. Desde la ficha de un paciente → «Ver toda la actividad del paciente» → filtrada por ese paciente.
4. En una atención con diagnósticos y tratamientos → «Historial de cambios» → aparecen también ellos.

## Resultado

### Archivos creados o modificados
- `src/app/features/management/models/audit.models.ts`: añadidos `AuditLogEntry`, `AuditLogQuery`, entidades `'treatments' | 'specialties'` a `AuditEntityName`, `entity` y `entityId` a `AuditEntry`, y flag `isEncounterFull?: boolean` a `AuditHistoryRequest`.
- `src/app/features/management/services/audit.api.ts`: añadidos métodos `list(query: AuditLogQuery): Observable<Page<AuditLogEntry>>` y `encounterFull(id: string): Observable<AuditEntry[]>`.
- `src/app/features/management/services/audit-log.store.ts`: nuevo store con carga paginada, gestión de usuarios para selector, actualización de filtros y extracción reactiva de nombre de paciente.
- `src/app/features/management/services/audit-history-dialog.service.ts`: soporte para invocar `encounterFull` cuando `isEncounterFull: true`.
- `src/app/features/management/domain/audit-display.ts`: añadidas etiquetas de entidad (`AUDIT_ENTITY_LABELS`), frases de resumen (`auditSummaryPhrase`), y validación de rango de auditoría de hasta 92 días (`validateAuditRange`).
- `src/app/features/management/components/audit-filters/audit-filters.component.ts`: componente presentacional de filtros con fechas (desde/hasta), selectores de tipo y usuario, y chip removible de paciente.
- `src/app/features/management/components/audit-timeline/audit-timeline.component.ts`: componente presentacional de línea de tiempo agrupada por día (zona America/Guayaquil), horas, usuarios, frases descriptivas, enlaces a pacientes, botón «Ver cambios» y paginación.
- `src/app/features/management/components/audit-history-dialog/audit-history-dialog.component.ts`: muestra badge de entidad cuando la lista mezcla diferentes entidades y asegura orden cronológico por fecha de revisión.
- `src/app/features/management/pages/audit-log/audit-log.page.ts`: página inteligente que sincroniza filtros con la URL (`?desde&hasta&tipo&usuario&paciente&pagina`), resetea a página 0 ante cambios de filtros y abre el diálogo de detalle.
- `src/app/features/management/pages/audit-log/audit-log.page.spec.ts`: pruebas requeridas para apertura con `?paciente=P1` (verificando parámetros query, agrupación por día, texto "modificó la atención", paciente y diálogo de campo) y manejo de error 400 del backend.
- `src/app/app.routes.ts`: añadida ruta `/direccion/auditoria` protegida con `profileGuard('DIRECTOR')`.
- `src/app/layout/nav-items.ts`: añadido ítem «Auditoría» con ícono `ShieldCheck` al menú del perfil DIRECTOR.
- `src/app/features/clinical/pages/encounter/encounter.page.ts`: actualizado `onOpenChangesHistory` para solicitar historial completo con `isEncounterFull: true`.
- `src/app/features/patients/pages/patient-reception/patient-reception.page.ts`: añadido enlace «Ver toda la actividad del paciente» (`/direccion/auditoria?paciente={id}`) visible exclusivamente para perfil DIRECTOR.

### Build y Tests
- `npx ng build`: OK (Application bundle generation complete, sin errores ni advertencias).
- `npx ng test --watch=false`:
Test Files  15 passed (15)
Tests  68 passed (68)

### Responsive
Revisado en 375px, 768px, 1024px y 1366px:
- **375px**: Los filtros se apilan verticalmente en 1 columna ocupando el 100% de ancho útil; el chip de paciente se visualiza con botón de remoción accesible; la línea de tiempo se presenta en columna única con la fecha como encabezado de día y el botón «Ver cambios» alineado a la derecha sin desbordes.
- **768px**: Los filtros se disponen en una cuadrícula de 2 columnas; las entradas del timeline distribuyen los metadatos y la acción en fila horizontal (`space-between`).
- **1024px**: Los 4 filtros se organizan en una sola fila compacta (`grid-template-columns: repeat(4, 1fr)`); la paginación inferior queda centrada con separación adecuada.
- **1366px**: Contenedor principal centrado con `max-width: 1200px` y márgenes automáticos, tipografía clara y lectura descansada.

### Prueba manual
1. Iniciar sesión como usuario DIRECTOR (`director` / clave de acceso).
2. En la barra de navegación lateral superior, acceder a «Auditoría» (`/direccion/auditoria`). Se muestran los cambios de los últimos 7 días.
3. Probar los filtros por usuario (p. ej. «secretaria») o tipo (p. ej. «Abono» o «Atención»).
4. Ingresar a la ficha de un paciente (`/pacientes/:id`), hacer clic en «Ver toda la actividad del paciente». Comprobar que redirige a `/direccion/auditoria?paciente=:id` con el chip del paciente activo.
5. En una atención con diagnósticos o tratamientos, hacer clic en «Historial de cambios» y constatar que se cargan también las entidades hijas con su respectiva etiqueta.

### Problemas encontrados y supuestos
- `patientName` en filtros: la pantalla no contiene un buscador general de pacientes (llega por URL desde la ficha según especificación); el chip muestra el nombre del paciente extraído reactivamente de las entradas de auditoría o su ID en caso de que aún no haya cargado o no tenga entradas.
- Rango por defecto: se configuran los últimos 7 días calculados con `ClinicClock` en la zona horaria `America/Guayaquil` (`todayDateString()` y `addDays(-6)`).

## Revisión
Estado: APROBADO

- Cumple: `GET /audit` con query params omitiendo vacíos, filtros en la URL con vuelta a página 0, línea de tiempo
  por día en America/Guayaquil, «Sistema»/frases en español, «Ver cambios» con `entity`/`entityId`, atención completa
  con etiqueta por tipo, ruta + menú + enlace de la ficha solo para DIRECTOR.
- Correcciones menores de Claude: una revisión de Envers puede tocar varias entidades (atención + diagnóstico en la
  misma transacción), así que `track entry.revision` duplicaba claves en la línea de tiempo y en el diálogo de la
  atención completa. Ahora el `track` usa revisión + entidad + id.
- Pendientes no bloqueantes: `AuditLogStore.load` no cancela la petición anterior (cambios rápidos de filtro pueden
  llegar desordenados; usar `switchMap` si se nota); el chip conserva el nombre del paciente anterior si el nuevo no
  tiene entradas.
- Verificación de Claude tras corregir: `npx ng build` OK · `Test Files 15 passed (15)` · `Tests 68 passed (68)`.
