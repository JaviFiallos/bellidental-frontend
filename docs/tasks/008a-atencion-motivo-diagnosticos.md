# 008a — Atención: cabecera clínica, motivo, diagnósticos y completar

> Plan §5.8 (P9), parte 1 de 2. Perfil: ODONTOLOGO y DIRECTOR. Ruta: `/consultorio/atencion/:encounterId`, a la que
> llegan "Atender", "Continuar" y "Ver" de la 007.
> - **008a (esta tarea):** la atención completa de principio a fin.
> - **008b:** el panel de antecedentes del 033 (registrar o anular antecedentes, medicación y "No refiere").

## Brief de diseño (`/impeccable shape`, confirmado por el usuario el 2026-10-12)
- **Quién y dónde:** el odontólogo, en la laptop del consultorio (1366×768) o en una tablet, con el paciente en el
  sillón, guantes y poco tiempo. Modo **Operate**: escaneo rápido y pocos clics. Mide la tarea T1 de la tesis.
- **Tarea principal:** dejar el motivo y al menos un diagnóstico y completar la atención.
  - Éxito: la atención queda cerrada, la cita pasa a "Atendida" y vuelve a Mis citas, en el menor número de clics.
  - Nada se pierde si la página se recarga a mitad.
- **Lo que la hace propia de Bellidental:**
  - las alertas médicas del paciente (antecedentes activos) se ven siempre arriba, en coral con ⚠ y texto, nunca
    solo el color;
  - los diagnósticos usan CIE-10 con certeza presuntivo o definitivo, como en el 033;
  - nada se borra, todo se anula.
- **Jerarquía en 1366×768, sin hacer scroll para la tarea principal:**
  1. la cabecera del paciente, compacta, en una o dos líneas;
  2. el motivo y la enfermedad actual;
  3. los diagnósticos;
  4. una franja baja reservada para el odontograma, al final (decisión del usuario: hasta la 009 va abajo; en la
     009 pasa a su lugar del boceto, arriba);
  5. la barra de completar, fija abajo y siempre visible.
- **Completar sin confirmación** (decisión del usuario): un clic, el aviso "Atención completada" y vuelta a
  `/consultorio`. Es reversible, porque el mismo odontólogo puede corregir la atención cerrada (D-6).
- **Antigoals:**
  - sin pestañas ni pasos de asistente: es una sola pantalla;
  - sin botón "Guardar": el guardado es automático y muestra su estado;
  - sin modales para lo frecuente;
  - sin campos del 033 que no sean el motivo o la enfermedad actual (signos vitales, examen, planes: tarea 011).

## Objetivo
Implementar la pantalla de atención:
1. cargar la atención, el paciente y su historia clínica;
2. mostrar la cabecera clínica en solo lectura;
3. editar el motivo y la enfermedad actual con guardado automático;
4. agregar y anular diagnósticos CIE-10;
5. completar la atención.

También cubre la atención cerrada (corregible por quien la atendió), la anulada y la de otro odontólogo (solo
lectura).

**Decisiones:**
- **Sin `clinical.routes.ts`.** La ruta carga `EncounterPage` con `loadComponent`, igual que la 007. El archivo
  de rutas se crea si el feature llega a tener varias páginas.
- **"Anular diagnóstico" pide confirmación, sin motivo.** `POST /encounter-diagnoses/{id}/void` no recibe body, así
  que el plan (§5.8, "pide motivo si la atención está cerrada") no se puede cumplir. Se corrige el plan.
- **Errores de negocio:** el backend responde 409 (no 403) con su `message`, por ejemplo cuando otro odontólogo
  intenta modificar o cuando el diagnóstico está duplicado. La página no espera a ese 409 para lo previsible: si
  `encounter.professionalId` no es el `professionalId` de la sesión, la pantalla es de solo lectura desde el
  inicio.

## Archivos a tocar
```
src/app/
  app.routes.ts                                    /consultorio/atencion/:encounterId → EncounterPage (quita el coming-soon)
  features/clinical/
    index.ts                                       + modelos y APIs nuevos que la 008b reutiliza
    models/encounter.models.ts                     + UpdateEncounterRequest (los 14 campos de §7), AddDiagnosisRequest
    models/clinical-record.models.ts               ClinicalRecord, HistoryEntry (plan §7)
    models/icd10.models.ts                         Icd10Code { id, code, description, category }
    services/encounters.api.ts                     + get, update, addDiagnosis, voidDiagnosis, complete
    services/clinical-records.api.ts               getByPatient(patientId) → GET /patients/{id}/clinical-record
    services/icd10.api.ts                          search(query) → GET /icd10?query=
    services/encounter.store.ts                    carga, permisos de edición, guardado automático, diagnósticos, completar
    pages/encounter/encounter.page.ts              orquesta las secciones y la navegación
    pages/encounter/encounter.page.spec.ts
    components/patient-clinical-header/            identidad + chips de antecedentes + medicación (solo lectura)
    components/encounter-notes/                    motivo + enfermedad actual + estado del guardado
    components/diagnosis-list/                     buscador CIE-10 (bd-combobox) + PRE/DEF + lista con "Anular"
    components/complete-bar/                       barra fija: faltantes + "Completar atención"
```
Dependencias:
- `clinical` importa `Patient` y `PatientsApi` de `features/patients/index.ts`.
- `ConfirmDialogService`, `NotificationService`, `SessionStore` y `ClinicClock` vienen de `shared/` y `core/`.
- Ningún componente presentacional inyecta servicios. Los permisos llegan como `input()`, calculados en el store.

## Criterios de aceptación
**Carga**
1. Con el `encounterId` de la URL, se cargan en este orden:
   - `GET /api/v1/encounters/{id}`;
   - en paralelo, `GET /api/v1/patients/{patientId}` y `GET /api/v1/patients/{patientId}/clinical-record`.
   - **Carga:** skeleton.
   - **Error:** `bd-alert` con el `message` del backend, el botón "Reintentar" y el enlace "Volver a Mis citas".
   - **Atención inexistente (404):** "No se encontró esta atención", con el enlace.
2. Hay un enlace "← Mis citas" a `/consultorio` arriba a la izquierda, de 44 px como mínimo.

**Modos de edición** (calculados en el store)

3. Los modos son:
   - **Editable:** `RECORD_UPDATE`, sin `voidedAt` y con `encounter.professionalId` igual al `professionalId` de la
     sesión. Vale tanto para `OPEN` como para `COMPLETED`.
   - **Cerrada (`COMPLETED`) y editable:** banner informativo "Atención completada el {fecha y hora} · puedes
     corregirla". La barra de completar no muestra el botón.
   - **Anulada (`voidedAt`):** banner "Atención anulada: {voidReason}". Todo en solo lectura.
   - **De otro odontólogo:** banner "Solo lectura: esta atención la registró otro odontólogo". Todo en solo lectura.

   En solo lectura, el motivo y la enfermedad actual se ven como texto (no como inputs deshabilitados), y no hay
   buscador, "Anular" ni "Completar".

**Cabecera clínica (`patient-clinical-header`, solo lectura en esta tarea)**

4. **Primera línea:** `fullName` · "{age} años" · "{documentType} {documentNumber}" · `recordNumber`.
5. **Segunda línea:**
   - **Antecedentes activos** (`historyEntries` con `active`) como chips en coral con ⚠ y texto:
     - personales: "{conditionName}", o la `description` si es "Otro";
     - familiares: "{conditionName} ({relative})".
     - Si no caben, la fila tiene scroll horizontal dentro de su contenedor.
   - **"No refiere antecedentes"**, en gris neutro, si `noKnownHistory` está activo y no hay entradas activas.
   - **"Antecedentes sin registrar"**, en dorado con ícono, si no hay ninguna de las dos cosas. La 008b agrega ahí el
     botón para registrarlos.
   - **"Medicación: {currentMedication}"** si la hay.

**Motivo y enfermedad actual (`encounter-notes`)**

6. **Campos:**
   - "Motivo de consulta *", de una línea y obligatorio (el backend exige `@NotBlank`);
   - "Enfermedad actual (opcional)", de una línea.
7. **Guardado automático:** 800 ms después del último cambio, `PUT /api/v1/encounters/{id}`.
   - El body lleva los 14 campos de `UpdateEncounterRequest`. El store conserva todos los campos del `Encounter`
     cargado y solo reemplaza los dos editados, porque el PUT reemplaza la cabecera completa: un campo omitido se
     borraría.
   - La enfermedad actual vacía se envía como `null`.
8. **Estado del guardado**, junto al motivo, con texto y no solo un ícono, en una región `aria-live="polite"`:
   - "Guardando…";
   - "✓ Guardado";
   - "No se guardó: {message} · Reintentar".
   - Si el motivo queda vacío no se envía nada y se muestra "El motivo es obligatorio" (`aria-invalid`).
9. **Cambios pendientes:**
   - Si hay un guardado pendiente o en curso, "Completar" espera a que termine. Si falla, no completa.
   - Al salir de la página con cambios sin enviar, se envían igual (*flush* en `ngOnDestroy`).

**Diagnósticos (`diagnosis-list`)**

10. **Lista:** muestra los diagnósticos activos (`voidedAt == null`) con:
    - "{code} {description}";
    - la certeza como texto: "Definitivo" o "Presuntivo", abreviados "DEF" y "PRE" en `< sm`, más un
      `aria-label` completo.
11. **Agregar:**
    - Buscador `bd-combobox` con el placeholder "CIE-10: código (K02.1) o texto (caries)". Busca desde 2
      caracteres con un *debounce* de 300 ms en `GET /api/v1/icd10?query=` y muestra hasta 20 resultados como
      "{code} {description}".
    - Antes del buscador, un `bd-segmented` "Definitivo | Presuntivo" con "Definitivo" por defecto.
    - Al elegir un resultado: `POST /api/v1/encounters/{id}/diagnoses { icd10Id, certainty }`. El diagnóstico
      aparece en la lista, el buscador se limpia y conserva el foco para agregar otro.
    - El segmentado vuelve a "Definitivo" después de cada alta.
    - Si el diagnóstico ya está activo (409), aparece el `message` del backend bajo el buscador.
12. **Anular:**
    - "Anular" en cada fila (con `aria-label` "Anular diagnóstico {code}") abre `ConfirmDialogService` con el título
      "Anular diagnóstico" y el texto "{code} {description} quedará anulado en esta atención.", tono `danger` y sin
      campo de motivo.
    - Al confirmar: `POST /api/v1/encounter-diagnoses/{id}/void`. El diagnóstico sale de la lista y aparece un aviso
      de éxito.

**Completar (`complete-bar`)**

13. **La barra:** fija abajo, de ancho completo, con el botón "Completar atención" (48 px) a la derecha.
    - A la izquierda, lo que falta, en texto: "Falta el motivo", "Falta 1 diagnóstico", o los dos separados por "·".
    - Con faltantes, el botón está deshabilitado y su `aria-describedby` apunta a ese texto.
    - Mientras el guardado está pendiente, dice "Guardando…" y no se puede pulsar.
14. **Al pulsar** (sin confirmación, decisión del usuario):
    - `POST /api/v1/encounters/{id}/complete`;
    - el aviso de éxito "Atención completada";
    - la navegación a `/consultorio`.
    - Si hay un error (409), se muestra el `message` en la barra y no se navega.
15. El contenido de la página deja abajo un espacio igual al alto de la barra, para que la barra no tape el último
    diagnóstico.

**Odontograma reservado**

16. Antes de la barra va una franja baja (no un bloque vacío grande) con un ícono y el texto "El odontograma se
    agrega en la próxima versión", en gris neutro.

## Responsive
- **≥ lg (1366):**
  - la cabecera ocupa una o dos líneas;
  - el motivo y la enfermedad actual van uno al lado del otro (2 columnas) cuando el contenedor lo permite, con
    `@container`;
  - los diagnósticos van debajo, a todo el ancho;
  - la tarea principal se ve sin hacer scroll en 1366×768.
- **< md (768, 375):**
  - las secciones van apiladas en una columna;
  - los chips de antecedentes tienen scroll horizontal dentro de su fila;
  - la barra de completar sigue fija abajo, con el texto de faltantes encima del botón, que ocupa todo el ancho
    en `< sm`.
- **Objetivos táctiles:** "Anular", el segmentado y los resultados del buscador miden ≥ 44 px.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
`encounter.page.spec.ts` (página real con hijos reales; sesión de odontóloga con `professionalId: 'prof-1'` y los
permisos `RECORD_READ`, `RECORD_UPDATE` y `RECORD_CREATE`; ruta `consultorio` con un componente vacío). Las
respuestas tienen la forma de §7, en `features/clinical/testing/fixtures.ts`.
1. `carga la atención → cabecera con antecedentes y motivo`:
   - `expectOne` GET `/api/v1/encounters/enc-1`, que se responde con `patientId: 'pat-1'` y
     `professionalId: 'prof-1'`;
   - después GET `/api/v1/patients/pat-1` y GET `/api/v1/patients/pat-1/clinical-record`, con una entrada
     personal activa "Diabetes";
   - se ven el nombre del paciente, el chip "Diabetes" y el motivo en su campo.
2. `agrega un diagnóstico → POST y aparece en la lista`:
   - con la atención cargada sin diagnósticos, se escribe "K02" en el buscador y se avanza 300 ms;
   - `expectOne` GET `/api/v1/icd10?query=K02`, que se responde con un resultado;
   - al elegirlo, `expectOne` POST `/api/v1/encounters/enc-1/diagnoses` con el body
     `{ icd10Id, certainty: 'DEFINITIVE' }`, que se responde con el `Diagnosis`;
   - aparece "K02.1" en la lista y "Completar atención" queda habilitado.
3. `completa la atención → POST y navega a /consultorio`:
   - con una atención que ya tiene motivo y un diagnóstico, se pulsa "Completar atención";
   - `expectOne` POST `/api/v1/encounters/enc-1/complete`, que se responde con el `Encounter` `COMPLETED`;
   - la URL del router es `/consultorio`.

## Prueba manual
Backend levantado, sesión de odontóloga.
1. Desde Mis citas, "Atender" con motivo. La pantalla abre con el motivo cargado y la cabecera del paciente.
   - Un paciente sin historia muestra "Antecedentes sin registrar".
2. **Guardado automático:** cambia el motivo y espera "✓ Guardado". Recarga la página: el cambio persiste.
   - Borra todo el motivo: aparece "El motivo es obligatorio" y no se envía nada.
3. **Diagnósticos:** busca "caries" y agrega uno como Presuntivo.
   - Agrega el mismo otra vez: se ve el mensaje del backend.
   - Anula el diagnóstico confirmando el diálogo.
   - Vuelve a agregar uno: la barra pasa de "Falta 1 diagnóstico" a habilitada.
4. **Completar:** con un clic vuelves a Mis citas y la cita está en Atendidas. Con "Ver" se abre el banner
   "Atención completada el … · puedes corregirla", y el motivo se puede corregir.
5. **Solo lectura:** con el director, abre la misma atención (`/consultorio/atencion/{id}`). Se ve en solo lectura,
   con su banner.
6. **Anchos:**
   - 1366×768: el motivo, los diagnósticos y la barra se ven sin hacer scroll;
   - 1024 y 768: secciones apiladas y barra fija;
   - 375: chips con scroll horizontal y botón de ancho completo.

## Resultado
- **Qué se hizo:**
  - `src/app/app.routes.ts`: se conectó `/consultorio/atencion/:encounterId` a `EncounterPage` eliminando el coming-soon.
  - `src/app/features/clinical/models/clinical-record.models.ts`: se crearon las interfaces `ClinicalRecord` y `HistoryEntry`.
  - `src/app/features/clinical/models/icd10.models.ts`: se creó la interfaz `Icd10Code`.
  - `src/app/features/clinical/models/encounter.models.ts`: se agregaron `UpdateEncounterRequest` (14 campos) y `AddDiagnosisRequest`.
  - `src/app/features/clinical/services/clinical-records.api.ts`: API con `getByPatient(patientId)`.
  - `src/app/features/clinical/services/icd10.api.ts`: API con `search(query)`.
  - `src/app/features/clinical/services/encounters.api.ts`: ampliado con `get`, `update`, `addDiagnosis`, `voidDiagnosis` y `complete`.
  - `src/app/features/clinical/index.ts`: exportación pública de nuevos modelos y APIs.
  - `src/app/features/clinical/services/encounter.store.ts`: store de atención con carga paralela de paciente e historia clínica, modos de edición (`editable`, `completed_editable`, `voided`, `other_professional`), guardado automático debounced a 800 ms con flush en `ngOnDestroy`, adición y anulación de diagnósticos, y finalización de la atención.
  - `src/app/features/clinical/components/patient-clinical-header/patient-clinical-header.component.ts`: cabecera clínica compacta con identidad y chips de antecedentes activos (en coral con ⚠), antecedentes no referidos o sin registrar, y medicación.
  - `src/app/features/clinical/components/encounter-notes/encounter-notes.component.ts`: formulario para motivo de consulta (obligatorio) y enfermedad actual, con indicador visual en vivo del guardado automático ("Guardando…", "✓ Guardado", o error con reintento) y modo solo lectura.
  - `src/app/features/clinical/components/diagnosis-list/diagnosis-list.component.ts`: buscador CIE-10 mediante `bd-combobox` con debounce de 300 ms, segmentado de certeza ("Definitivo" | "Presuntivo"), lista de diagnósticos activos con certeza y botón "Anular" con confirmación.
  - `src/app/features/clinical/components/complete-bar/complete-bar.component.ts`: barra fija inferior con desglose de requisitos faltantes ("Falta el motivo", "Falta 1 diagnóstico") y botón "Completar atención" de 48 px.
  - `src/app/features/clinical/pages/encounter/encounter.page.ts`: orquestador con enlace "← Mis citas", banners por modo de edición, franja reservada para odontograma, diálogo de confirmación para anular y navegación a `/consultorio` al completar.
  - `src/app/features/clinical/testing/fixtures.ts`: fixtures DTO para pruebas de integración de atención.
  - `src/app/features/clinical/pages/encounter/encounter.page.spec.ts`: pruebas de integración para carga inicial con cabecera y motivo, alta de diagnóstico vía CIE-10 y finalización de la atención.

- **Resultado del build y tests:**
  - `npx ng build`: OK (Application bundle generation complete).
  - `npx ng test --watch=false`:
```
Test Files  8 passed (8)
     Tests  27 passed (27)
```

- **Anchos revisados y responsive:**
  - `1366px`: cabecera compacta, motivo y enfermedad actual en dos columnas (`@container`), diagnósticos debajo y barra fija accesible sin requerir scroll para la tarea esencial.
  - `1024px` y `768px`: secciones apiladas en columna fluida, barra fija abajo con padding compensado en el contenedor principal.
  - `375px`: chips de antecedentes con desplazamiento horizontal en su contenedor, certeza de diagnóstico abreviada a DEF / PRE con `aria-label` completo, y botón "Completar atención" a ancho completo (100%).
  - Objetivos táctiles cumplen ≥ 44 px en combobox, segmentado y botones de anulación.

- **Prueba manual:**
  - Iniciar backend en el puerto 8080 y frontend (`npm start`).
  - Como odontóloga, abrir una cita desde `/consultorio` y verificar la carga de datos del paciente, edición con autoguardado de motivo y enfermedad actual, búsqueda y agregado de diagnóstico CIE-10, y completar atención para regresar a `/consultorio`.

- **Problemas encontrados y supuestos tomados:**
  - Se utilizó `PatientsApi.getById(id)` que es el método existente en el feature `patients`.
  - El diálogo de anulación de diagnóstico se configuró con `ConfirmDialogService` sin campo de motivo, en concordancia con el endpoint del backend `POST /encounter-diagnoses/{id}/void`.
  - **Correcciones de Revisión 1 aplicadas:**
    1. Se movió la búsqueda CIE-10 (`searchIcd10`, `clearIcd10Search`, `icd10Results`, `icd10Loading`, `icd10Error`) a `EncounterStore`; `DiagnosisListComponent` quedó como componente presentacional puro recibiendo datos vía `input()` y emitiendo `queryChange`.
    2. En `EncounterStore`, se maneja el error de búsqueda en `switchMap` con `catchError` retornando `of([])` y asignando `icd10Error`, evitando que la cadena se cancele y mostrando el error en `bd-combobox`.
    3. Al agregar un diagnóstico o limpiar la búsqueda, se emite `''` para permitir repetir la misma búsqueda (sin que quede bloqueada).
    4. En `addDiagnosis` y `voidDiagnosis`, se utiliza `this.encounter.update(curr => ...)` en el `tap` para evitar pisar el estado concurrente.
    5. Se agregaron manejadores de error en `onAddDiagnosis`, `onComplete` y `onVoidDiagnosis` (mostrando error vía `NotificationService.error`).
    6. Con el motivo vacío, se mantiene `saveStatus` en `'idle'` para que solo se muestre el mensaje bajo el input sin duplicar el aviso de guardado fallido.
    7. Se implementó control de versión incremental (`changeVersion` y `savedVersion`) para asegurar que cualquier cambio pendiente durante o posterior a un guardado en curso se envíe en `flushSave()`.
    8. La fecha de cierre en el banner de atención completada se formateó con los pipes `clinicDate:'long'` y `clinicTime`.

## Revisión

**Estado: CORRECCIONES** (revisión 1, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 27/27 (8 archivos). La estructura, los modos de
edición, el body completo del PUT, la barra de completar y la cabecera cumplen. Corregir:

1. **`diagnosis-list` hace HTTP.** Inyecta `Icd10Api`, y un componente presentacional no puede hacerlo
   (architecture). Mover la búsqueda al `EncounterStore`: `icd10Query`, `icd10Results`, `icd10Loading` e
   `icd10Error` en signals, con el *debounce* de 300 ms y `switchMap` ahí. El componente recibe `results`, `loading`
   y `searchError` por `input()` y emite `queryChange`.
2. **La búsqueda CIE-10 muere tras un error y falla en silencio.**
   - El `error` llega al `subscribe` del Subject, así que la cadena se completa y no vuelve a buscar.
   - El usuario no ve nada.

   Atrapar el error dentro del `switchMap` (`catchError` → `of([])`) y mostrar el `message` en el `errorMessage` del
   `bd-combobox`.
3. **No se puede repetir la misma búsqueda.** Después de agregar un diagnóstico, la consulta se limpia sin pasar `''`
   por el Subject. Por eso `distinctUntilChanged` descarta volver a escribir "K02" para agregar otro K02.x.
   Emitir `''` al limpiar o quitar `distinctUntilChanged`.
4. **Altas y anulaciones pisan el estado.** `addDiagnosis` y `voidDiagnosis` capturan `enc` antes de la petición y
   hacen `encounter.set({...enc, ...})` al responder. Dos altas seguidas, o una alta mientras vuelve el PUT del
   guardado automático, borran de la lista el diagnóstico anterior. Usar `this.encounter.update(e => …)` en el `tap`.
5. **Errores sin manejar o silenciosos en la página:**
   - `onAddDiagnosis` y `onComplete` hacen `subscribe()` sin `error`. El store relanza el error y queda como un
     error no manejado en la consola. El mensaje ya se muestra por `diagnosisError` y `completeError`, así que basta
     con un `error: () => {}` o con no relanzar.
   - `onVoidDiagnosis` no maneja el error y el store no tiene `catchError`, así que una anulación fallida es
     silenciosa. Mostrar el `message` (con `NotificationService.error` o `diagnosisError`).
6. **Motivo vacío: el mensaje sale dos veces y el criterio 8 no se cumple.** `triggerAutoSave` pone
   `saveStatus = 'error'`, así que, además del "El motivo es obligatorio" del campo, aparece "No se guardó: El motivo
   es obligatorio · Reintentar". Con el motivo vacío, dejar `saveStatus` en `'idle'` y mostrar solo el mensaje del
   campo.
7. **Cambios pendientes que se pierden (criterio 9).** Si un PUT termina mientras el usuario sigue escribiendo, el
   `tap` pone `hasPendingChanges = false` aunque haya cambios nuevos en el *debounce*. Al salir de la página, el
   `flush` de `ngOnDestroy` no los envía. Comparar una versión: un contador que sube en cada cambio, y solo se
   limpia si coincide con el que se envió.
8. **`closedAtText` arma la fecha con `new Date().toLocaleString`.** Usar los pipes `clinicDate` y `clinicTime` en la
   plantilla del banner (clean-code: fechas con los pipes de `shared/pipes`).

Sin tests nuevos: los 3 casos actuales deben seguir pasando.

**Estado: APROBADO** (revisión 2, Claude)

Verificado por Claude: `npx ng build` OK y `npx ng test --watch=false` 27/27 (8 archivos). Las correcciones 1 a 8 están
aplicadas:
- la búsqueda CIE-10 vive en el store, con `catchError` dentro del `switchMap` y el error visible en el combobox;
- al limpiar se emite `''`;
- altas y anulaciones usan `encounter.update`, y el guardado automático conserva `diagnoses`;
- los errores se manejan en la página (la anulación fallida se avisa);
- el motivo vacío deja `saveStatus` en `idle`;
- `changeVersion` y `savedVersion` evitan perder cambios en el *flush*;
- el banner usa `clinicDate` y `clinicTime`.

Anotado (no bloquea):
- `voidDiagnosis` marca `voidedAt` con `new Date()` solo para filtrar la lista local. No se muestra, así que se acepta.
- Si se completa con un guardado en *debounce*, ese guardado se envía después del `complete`. El PUT es válido sobre
  una atención `COMPLETED` (D-6), así que no hay pérdida de datos.
- `/impeccable audit` de la pantalla de atención se hace al aprobar la 008b, cuando la pantalla esté completa.

Commit: `app.routes.ts`, `features/clinical/` (components, pages, services, models, testing, index),
`docs/IMPLEMENTATION-PLAN.md` y este archivo. No incluir `prompt.txt` ni la documentación del flujo sin versionar.
