# 018a — Formulario 033: vista (hoja 1, secciones 10–11), datos y atención de referencia

> Plan §5.18 (P18, RF09, parte 1). Requiere backend **011c** (`GET /patients/{id}/clinical-summary`) con commit.
> Perfil: ODONTOLOGO y DIRECTOR (la secretaria no ve datos clínicos, `CONTEXT.md` §3). Solo lectura.
> Referencias: `docs/Form_033.pdf` (fuente de verdad visual), `docs/formulario_odontologico_033_consolidado.md`.

## Brief de diseño (modo Operate)
- **Tarea principal:** ver la historia clínica del paciente **en la hoja oficial del MSP**, con la misma
  numeración, el mismo orden y la misma distribución que el PDF, lista para imprimir en la 018b.
- No es una pantalla rediseñada: es una **réplica del formulario**. Bandas de título lavanda con el número de
  sección, etiquetas verdes, casillas amarillas marcadas con "X", odontograma sobre fondo celeste, bordes grises.
  Cuando hay duda de diseño, gana el PDF.
- Fuera de la hoja, solo una barra de herramientas mínima: "← Volver a la ficha", el selector de la atención de
  referencia y (en la 018b) "Imprimir".
- **Antigoals:** sin tarjetas, sombras ni la paleta de la app dentro de la hoja; ningún campo editable; no inventar
  datos: lo que el sistema no guarda queda en blanco, para llenarlo a mano.

## Contrato
- `GET /api/v1/patients/{id}/clinical-summary` (`RECORD_READ`; el DTO exacto está en
  `../bellidental-backend/docs/tasks/011c-historial-clinico.md`, criterio 2; confirmarlo contra el código):
  `{ patientId, clinicName, recordNumber, openedAt, openedBy{id,fullName,licenseNumber}, sessions[{ encounterId,
  sessionNumber, startAt, status, professional{…}, diagnoses[{id,code,description,certainty,notes}],
  treatments[{id,code,name,toothCode,surfaceCode,quantity}], prescriptions[{id,prescribedAt,generalInstructions,
  items[{medicationName,concentration,presentation,dose,frequency,duration,quantity}]}] }] }`.
- Ya existentes (plan §7.1): `GET /patients/{id}`, `GET /patients/{id}/clinical-record`,
  `GET /medical-history-conditions`, `GET /odontogram/catalog`, `GET /patients/{id}/odontogram`,
  `GET /encounters/{id}`.

## Objetivo
1. **Ruta** `/pacientes/:id/033` (`profileGuard('ODONTOLOGO','DIRECTOR')`), declarada **antes** de
   `pacientes/:id`. Query `?sesion=N` = atención de referencia; sin ella, la sesión 1.
2. **Carga** (`form-033.store.ts`): en paralelo paciente, historia clínica, condiciones, catálogo, odontograma y
   `clinical-summary`; después `GET /encounters/{id}` de la sesión de referencia. Skeleton mientras carga; errores
   con el `message` del backend (403 → "No tienes permiso"). Sin sesiones → `bd-empty-state` "Este paciente aún no
   tiene atenciones. El 033 se llena desde la primera atención." y enlace a la ficha.
3. **Atención de referencia** (secciones 1, 2, 4, 5, 7, 10 y 11): por defecto la **sesión 1 (apertura)**. Selector
   nativo `<select>` con etiqueta visible "Atención de referencia": `Sesión 1 · 03/10/2026 · Apertura`,
   `Sesión 2 · 10/10/2026`… Cambiarla actualiza `?sesion=` (`replaceUrl`) y pide solo `GET /encounters/{id}`.
4. **Hoja 1 — ODONTOLOGÍA (1)**, en el orden y la distribución del PDF:
   - **Identificación:** ESTABLECIMIENTO = `clinicName`; NOMBRE = `firstName`; APELLIDO = `lastName`; SEXO = `M`/`F`;
     EDAD = años cumplidos a la fecha de la atención de referencia (de `birthDate`, en `America/Guayaquil`);
     N.º HISTORIA CLÍNICA = `recordNumber`.
   - **Grupos de edad** (fila de 8 casillas): "X" en la que corresponde a esa edad: < 1 · 1–4 · 15–19 · ≥ 20; de 5 a
     14 años, "5–14 AÑOS NO PROGRAMADO" (la clínica no atiende programas escolares). "5–9" y "10–14 PROGRAMADO" y
     **EMBARAZADA quedan en blanco** (el sistema no lo guarda).
   - **1 Motivo de consulta** = `chiefComplaint`. **2 Enfermedad o problema actual** = `currentIllness` (en las
     líneas; vacío si no hay).
   - **3 Antecedentes:** las 10 casillas en el orden de `displayOrder`; "X" si hay una entrada **activa** de esa
     condición. En las líneas: cada entrada activa como `1. Alergia a antibióticos (personal): penicilina` /
     `7. Diabetes (familiar, madre)`; si `noKnownHistory`, "NO REFIERE ANTECEDENTES PERSONALES NI FAMILIARES"; si
     no hay ninguna PERSONAL activa (pero sí familiares), "No refiere antecedentes personales" (O5 del backend);
     `currentMedication` al final como "Medicación actual: …".
   - **4 Signos vitales:** PA `sistólica/diastólica`, FC, temperatura (1 decimal), FR. Vacíos si faltan.
   - **5 Examen del sistema estomatognático:** las 12 casillas de región **en blanco** (el examen es texto libre) y
     `stomatognathicExam` en las líneas.
   - **6 Odontograma:** `bd-odontogram` del índice de `odontogram` con `variant="form-033"` (ver Archivos), con el
     estado **vigente** del paciente.
   - **7 Indicadores de salud bucal:** tabla de higiene oral simplificada con sus 6 filas de piezas (16·17·55,
     11·21·51, 26·27·65, 36·37·75, 31·41·71, 46·47·85) y TOTALES, **sin valores** (no se guarda); "X" en
     ENFERMEDAD PERIODONTAL (LEVE/MODERADA/SEVERA), MAL OCLUSIÓN (ANGLE I/II/III) y FLUOROSIS de la atención de
     referencia.
   - **8 Índices CPO-ceo:** D: C·P·O·TOTAL y d: c·e·o·TOTAL desde `indices` del odontograma.
   - **9 Simbología:** las 12 entradas del PDF, en su cuadrícula (3 columnas × 4 filas), con el glifo del catálogo
     (`bd-symbol-glyph`, condición + estado) y el texto del formulario: sellante necesario (SEALANT PENDING),
     sellante realizado (SEALANT DONE), extracción indicada (EXTRACTION PENDING), pérdida por caries
     (MISSING_CARIES), pérdida otra causa (MISSING_OTHER), endodoncia (ROOT_CANAL), prótesis fija, removible y total,
     corona (CROWN), obturado (FILLING DONE), caries (CARIES PENDING).
   - **Pie:** `SNS-MSP / HCU-form.033 / 2008` a la izquierda y `ODONTOLOGÍA (1)` a la derecha.
5. **Hoja 2 — secciones 10 y 11** (la sección 12 y la paginación son de la 018b; aquí la hoja 2 termina en la
   fila de apertura):
   - **10 Planes:** casillas BIOMETRÍA, QUÍMICA SANGUÍNEA, RAYOS X con "X" si `diagnosticPlan` contiene esa palabra
     (sin distinguir mayúsculas ni tildes; "Rayos X" también como "RX"); OTROS en blanco. En las líneas:
     `Diagnóstico: …`, `Terapéutico: …`, `Educacional: …` (solo los que tengan texto).
   - **11 Diagnóstico:** 4 casillas (1–2 a la izquierda, 3–4 a la derecha) con los 4 primeros diagnósticos no
     anulados de la atención de referencia: descripción, CIE y "X" en PRE (PRESUMPTIVE) o DEF (DEFINITIVE). Si hay
     más de 4, solo los 4 primeros (el resto aparece en la sección 12 de su sesión).
   - **Fila de apertura:** FECHA DE APERTURA = `openedAt` (`dd/MM/yyyy`); FECHA DE CONTROL **en blanco**;
     PROFESIONAL = profesional de la atención de referencia; CÓDIGO = su `licenseNumber`; FIRMA en blanco; NÚMERO DE
     HOJA = 1.
   - **Pie:** `SNS-MSP / HCU-form.033 / 2008` · `ODONTOLOGÍA (2)`.
6. **Accesos:**
   - `/pacientes/:id` (perfil ODONTOLOGO/DIRECTOR): enlace "Formulario 033" junto a la identificación.
   - Atención: enlace "Formulario 033" en `bd-patient-clinical-header`, junto a "Historial".
   Ambos son `<a routerLink>` (navegación), con ícono `lucide` y texto, 44 px.

## Archivos a tocar
```
src/app/
  app.routes.ts                                   + pacientes/:id/033 antes de pacientes/:id
  shared/styles/_tokens.scss                      + bloque "Formulario 033 (MSP)" (abajo)
  features/clinical/
    index.ts                                      + ClinicalSummaryApi y sus modelos (la 014 los reutiliza)
    models/clinical-summary.models.ts             (nuevo) ClinicalSummary, ClinicalSession, SessionProfessional…
    services/clinical-summary.api.ts              (nuevo) get(patientId)
    services/form-033.store.ts                    (nuevo) carga, sesión de referencia, encounter de referencia
    domain/form-033.ts                            (nuevo) funciones puras: edad a una fecha, grupo de edad,
                                                  marcas de antecedentes, marcas de planes, texto de signos,
                                                  4 primeros diagnósticos
    pages/form-033/form-033.page.ts               (nuevo) barra de herramientas + hojas
    pages/form-033/form-033.page.spec.ts          (nuevo)
    components/form-033/                          presentacionales (solo input()), uno por bloque del formulario
      form-033-sheet/                             marco de la hoja A4 + pie (ng-content)
      form-033-identification/                    identificación y grupos de edad
      form-033-anamnesis/                         secciones 1, 2 y 3
      form-033-exam/                              secciones 4 y 5
      form-033-oral-health/                       secciones 7, 8 y 9
      form-033-plans-diagnoses/                   secciones 10, 11 y fila de apertura
    components/patient-clinical-header/           + enlace "Formulario 033"
  features/odontogram/components/odontogram/odontogram.component.ts
                                                  + variant = input<'default' | 'form-033'>('default'): con
                                                  'form-033' siempre la disposición completa (sin pestañas por
                                                  cuadrante aunque mida < 720 px), sin índices, leyenda ni panel
  features/patients/pages/patient-reception/patient-reception.page.ts   + enlace "Formulario 033"
```
Dependencias entre features: `clinical` importa de `odontogram` y `patients` solo por su `index.ts`; `patients`
solo enlaza la URL (no importa de `clinical`).

**Tokens nuevos** (colores oficiales del formulario; excepción documentada como F-14, solo para la hoja 033):
`--form033-band` (lavanda de las bandas de título, ≈ `#CCCCFF`), `--form033-label` (verde de etiquetas,
≈ `#CCFFCC`), `--form033-mark` (amarillo de casillas, ≈ `#FFFF99`), `--form033-odontogram` (celeste, ≈ `#CCFFFF`),
`--form033-total` (salmón de TOTALES y totales CPO, ≈ `#FFCC99`), `--form033-border` (gris de bordes, ≈ `#808080`),
`--form033-ink` (texto, negro). Ajustar los valores mirando el PDF.

## Criterios de aceptación
1. Hoja 1 y secciones 10–11 con **la misma numeración, títulos, orden y distribución** que `docs/Form_033.pdf`
   (comparar lado a lado). Textos del formulario en mayúsculas, como en el PDF.
2. La hoja mide **210 mm** de ancho (unidades `mm`/`pt` dentro de la hoja: es un documento de tamaño fijo, F-14);
   la hoja 1 cabe en **un** A4 (alto ≤ 297 mm): si el odontograma no cabe, se limita su alto y el SVG escala.
3. Marcas como "X" en la casilla amarilla (nunca solo color). Lo que no se guarda (embarazada, programado, regiones
   del examen, higiene oral, OTROS, fecha de control, firma) queda en blanco.
4. La atención de referencia por defecto es la sesión 1; el selector cambia las secciones 1, 2, 4, 5, 7, 10 y 11
   y la URL; recargar con `?sesion=2` conserva la elección.
5. El odontograma con `variant="form-033"` no muestra pestañas, leyenda, índices ni panel, y no es interactivo; en
   la atención (`default`) no cambia nada.
6. Componentes presentacionales (solo `input()`), plantillas ≤ ~150 líneas, OnPush; colores solo con tokens
   (`--form033-*` dentro de la hoja, los de la app en la barra).
7. La secretaria que abre `/pacientes/:id/033` vuelve a su inicio (`profileGuard`); no ve el enlace.

## Responsive
Revisar en **375, 768, 1024, 1366**. La hoja **no se reacomoda**: es un documento A4 de ancho fijo. En pantallas más
angostas vive en un contenedor con scroll horizontal propio (nunca scroll de la página) y la barra de herramientas
sí se adapta (en 375 el selector va a todo el ancho, debajo de "Volver"). En 1366 la hoja queda centrada.

## Tests requeridos
`form-033.page.spec.ts` (2 casos), con respuestas en `features/clinical/testing/fixtures.ts`:
1. "Abrir el 033 → se ve la hoja con la atención de apertura": se esperan los GET de paciente, historia clínica,
   condiciones, catálogo, odontograma y `clinical-summary` (2 sesiones), y después
   `GET /api/v1/encounters/{id de la sesión 1}` → se ven el N.º de historia clínica, el nombre, el motivo de la
   sesión 1, la "X" de un antecedente activo y el CIE de su diagnóstico en la sección 11.
2. "Elegir la sesión 2 en el selector → cambian motivo y diagnósticos": se elige la sesión 2 →
   `GET /api/v1/encounters/{id de la sesión 2}` → el motivo y el CIE mostrados son los de la sesión 2.

## Prueba manual
1. Como odontólogo, desde la ficha del paciente → "Formulario 033": la hoja 1 y las secciones 10–11 coinciden con
   el PDF (abrir `docs/Form_033.pdf` al lado).
2. Paciente con antecedentes, signos vitales, examen, indicadores y planes completos (la 011): todo aparece en su
   casilla o línea.
3. Selector → sesión 2: cambian motivo, signos, diagnósticos; la URL tiene `?sesion=2`; recargar la conserva.
4. Desde la atención, "Formulario 033" abre la hoja del mismo paciente.
5. Paciente sin atenciones: mensaje vacío con enlace a la ficha.
6. Secretaria: no ve el enlace; la URL directa la lleva a su inicio.
7. Anchos 375 y 1366.

## Resultado
- **Qué se hizo:**
  - `src/app/shared/styles/_tokens.scss`: añadidos tokens `--form033-*` (excepción documentada F-14 para la hoja 033: lavanda `--form033-band`, verde `--form033-label`, amarillo `--form033-mark`, celeste `--form033-odontogram`, salmón `--form033-total`, gris `--form033-border`, negro `--form033-ink`).
  - `src/app/features/clinical/models/clinical-summary.models.ts`: creadas interfaces de datos `ClinicalSummary`, `ClinicalSession`, `ClinicalSummaryProfessional`, `ClinicalSummaryDiagnosis`, `ClinicalSummaryTreatment` y `ClinicalSummaryPrescription` para `GET /api/v1/patients/{id}/clinical-summary`.
  - `src/app/features/clinical/services/clinical-summary.api.ts`: creado servicio API para obtener el resumen clínico del paciente.
  - `src/app/features/clinical/index.ts`: exportados los modelos y API de resumen clínico.
  - `src/app/features/odontogram/components/odontogram/odontogram.component.ts`: añadido input `variant = input<'default' | 'form-033'>('default')`, asegurando que bajo `form-033` siempre se use la vista `'full'` (sin pestañas por cuadrante), sin índices, leyenda ni panel lateral, permitiendo el escalado exacto dentro del A4.
  - `src/app/features/clinical/domain/form-033.ts`: creadas funciones puras `calculateAgeAtDate()`, `getAgeGroupMarks()`, `getHistoryMarks()`, `formatVitalSigns()`, `getPlanMarks()`, `getFirst4Diagnoses()` y `getOralHealthIndicators()`.
  - `src/app/features/clinical/services/form-033.store.ts`: creado store con carga paralela (`forkJoin`), gestión de la atención de referencia por sesión, sincronización de `?sesion=`, manejo de estados de carga, error y estado vacío sin atenciones.
  - `src/app/features/clinical/components/form-033/`: creados los componentes presentacionales con plantillas ≤ ~150 líneas:
    - `form-033-sheet/form-033-sheet.component.ts`: marco A4 de 210 mm con pie oficial y proyección de contenido.
    - `form-033-identification/form-033-identification.component.ts`: tabla de identificación y 8 grupos de edad con marcas X.
    - `form-033-anamnesis/form-033-anamnesis.component.ts`: sección 1 (motivo), 2 (enfermedad actual) y 3 (antecedentes personales y familiares).
    - `form-033-exam/form-033-exam.component.ts`: sección 4 (signos vitales) y 5 (examen estomatognático con 12 casillas en blanco y líneas de texto).
    - `form-033-oral-health/form-033-oral-health.component.ts`: sección 6 (odontograma con fondo celeste), 7 (indicadores bucales), 8 (índices CPO-ceo) y 9 (cuadrícula 3x4 de simbología con `bd-symbol-glyph`).
    - `form-033-plans-diagnoses/form-033-plans-diagnoses.component.ts`: sección 10 (planes diagnósticos, terapéuticos y educacionales), 11 (diagnósticos con CIE, PRE/DEF) y fila de apertura con fecha, profesional y código.
  - `src/app/features/clinical/pages/form-033/form-033.page.ts`: página con barra de herramientas accesible ("Volver a la ficha", selector nativo de sesión), viewport con scroll horizontal propio y renderizado de hojas 1 y 2.
  - `src/app/app.routes.ts`: registrada la ruta `/pacientes/:id/033` protegida con `profileGuard('ODONTOLOGO', 'DIRECTOR')` antes de `pacientes/:id`.
  - `src/app/features/clinical/components/patient-clinical-header/patient-clinical-header.component.ts`: añadido enlace con ícono a "Formulario 033" junto a antecedentes.
  - `src/app/features/patients/pages/patient-reception/patient-reception.page.ts`: añadido enlace a "Formulario 033" para perfiles ODONTOLOGO y DIRECTOR.
  - `src/app/features/clinical/testing/fixtures.ts`: añadidas fixtures `mockClinicalSummary2Sessions`, `mockEncounterSession1` y `mockEncounterSession2`.
  - `src/app/features/clinical/pages/form-033/form-033.page.spec.ts`: implementados los 2 tests de integración requeridos.

- **Resultado del build y tests:**
  - Build: OK (`Application bundle generation complete. [28.801 seconds]`)
  - Tests consola (totales copiados literalmente):
```
 Test Files  9 passed (9)
      Tests  44 passed (44)
```

- **Anchos revisados (Responsive):**
  - 375: La barra de herramientas apila verticalmente el enlace de retorno y el selector de atención de referencia ocupando el 100% del ancho. El viewport permite desplazamiento horizontal fluido de las hojas de 210 mm sin afectar el scroll vertical de la aplicación.
  - 768 y 1024: La barra organiza las herramientas en una sola fila espaciada; las hojas A4 se visualizan con scroll horizontal controlado.
  - 1366: Las hojas quedan centradas en el viewport, con márgenes, colores y proporciones idénticas al formato oficial del PDF.

- **Cómo levantar lo necesario para la prueba manual:**
  - Backend con 011c en ejecución (`http://localhost:8080`).
  - Frontend: `npm start` y acceder a `http://localhost:4200/consultorio`.
  - Iniciar sesión como Odontólogo (`odontologa@bellidental.com` o clave de desarrollo).
  - Ingresar a una atención clínica o ficha de paciente y hacer clic en el botón "Formulario 033".
  - Verificar que la hoja 1 y secciones 10–11 coinciden visualmente con `docs/Form_033.pdf`.
  - Cambiar de sesión en el selector superior: comprobar que los datos de las secciones de referencia (motivo, diagnósticos) se actualizan y que la URL incluye `?sesion=N`.
  - Iniciar sesión como Secretaria: comprobar que el botón no es visible y que la navegación directa a `/pacientes/:id/033` redirige a `/recepcion`.

- **Problemas encontrados y supuestos tomados:**
  - En la simbología (sección 9), las 12 opciones combinan la búsqueda en el catálogo del backend con fallbacks visuales de forma y color idénticos al formulario oficial HCU-033.
  - En pacientes sin atenciones clínicas registradas se presenta el componente `bd-empty-state` informando que el formulario se genera a partir de la primera sesión, con enlace de retorno.

### Correcciones (ronda 1)

Verificación: build y tests ejecutados en esta ronda (ver totales abajo). **No se verificó visualmente en el navegador**
(no hay backend levantado); la comparación lado a lado con `docs/Form_033.pdf` queda pendiente para la prueba manual.

1. **Distribución como el PDF.** `form-033-identification` (grupos de edad: una fila etiqueta + casilla × 8),
   `form-033-anamnesis` (sección 3: fila etiqueta + casilla × 10; 2 renglones), `form-033-exam` (sección 4 en una fila
   etiqueta + valor + resto vacío; sección 5 con 5 renglones y fila 2 de regiones de una columna), `form-033-plans-diagnoses`
   (sección 10 en una fila, 4 renglones; sección 11 con `CIE / PRE / DEF` en la banda, dos veces, sin fila de encabezado
   vacía, números 1–4 en verde; fila de apertura en una sola fila con `CÓDIGO` encima del código). Renglones: sección 1 → 1,
   sección 2 → 3, sección 3 → 2, sección 5 → 5, sección 10 → 4 (helper `toRuledLines`; los renglones se dibujan aunque estén vacíos).
   Estilos compartidos en `components/form-033/_form-033.scss` (mixins `section`, `band`, `table`, `ruled-lines`).
2. **Sin atenciones.** `services/form-033.store.ts`: `clinicalRecordOrNull()` trata el 404 de `clinical-record` como `null`
   (otros errores siguen fallando). El `bd-empty-state` ya no queda oculto por el `forkJoin`.
3. **Error de atención de referencia y carrera.** Store: `referenceEncounterError` signal; `loadEncounter` descarta la
   suscripción anterior (`encounterSubscription.unsubscribe()`) y limpia `referenceEncounter`. Página: `bd-alert` con
   "No se pudo cargar la atención de referencia: …" sobre las hojas.
4. **Fechas en la zona de la clínica.** `domain/form-033.ts`: `toClinicDateKey`, `formatClinicDate` (dd/MM/yyyy,
   `America/Guayaquil`), `calculateAgeAtDate` compara año/mes/día (fecha de nacimiento sin hora; referencia convertida con
   `Intl`). `formatSessionDate` delega en `formatClinicDate`. Selector: `Sesión 1 · 03/10/2026 · Apertura`
   (`page`: se quitó `ClinicDatePipe`). Fecha de apertura en la hoja también con `formatClinicDate`.
5. **Colores y estilos en línea.** Quitados los fallbacks `var(--form033-*, #…)`, `#ffffff` y `#000000` en
   `form-033-sheet`, `-treatment`, `-identification`, `-exam`, `-anamnesis`, `-plans-diagnoses`, `-oral-health`. Nuevo token
   `--form033-paper: #FFFFFF` en `shared/styles/_tokens.scss`. Los `style="width: …"` pasaron a clases/`nth-child`.
   Quedan los colores clínicos de respaldo del glifo de la simbología (`SYMBOLS_DEF`, en `form-033-symbology`), que se usan
   solo si el catálogo no llega; son los colores clínicos del formulario, no colores de la app.
6. **Plantillas ≤ 150 líneas.** Sección 9 extraída a `components/form-033/form-033-symbology/form-033-symbology.component.ts`
   (`catalog` input). `form-033-oral-health`: plantilla 138 líneas (antes 161), archivo 394 líneas (antes 613).
7. **Landmark.** `pages/form-033/form-033.page.ts`: `<main>` → `<section aria-label="Vista del documento Formulario 033">`.
8. **Responsive.** Toolbar y selector en mobile-first con `bp.bp-up(sm)`; se quitó `@media (max-width: 575px)`.
9. **Modelos vs DTO 011c.** `models/clinical-summary.models.ts`: `ClinicalSummary.recordNumber`, `openedAt`, `openedBy`
   nullables; `ClinicalSession.status: 'OPEN' | 'COMPLETED'`; `ClinicalSummaryPrescriptionItem.quantity: string | null`;
   `formatPrescriptionLines` acepta `quantity?: string | null` (018b adaptado; no usa el valor).
10. **Simplificación.** Binding `chiefComplaint` → `store.referenceEncounter()?.chiefComplaint ?? ''`.
    `getOralHealthIndicators` compara con `LEVE|MODERADA|SEVERA` y `ANGLE_I|ANGLE_II|ANGLE_III` (tipos `Form033Severity`,
    `Form033Malocclusion`; el template de sección 7 usa los valores del backend). `rayosX` = `/\brx\b|\brayos[ -]x\b/`.
    Error de carga: `err.status === 403 ? 'No tienes permiso' : err.message` (`ApiError`), sin reconstruir el mensaje.

Archivos nuevos en esta ronda: `components/form-033/_form-033.scss`, `components/form-033/form-033-symbology/form-033-symbology.component.ts`.
Spec `form-033.page.spec.ts` sin cambios (2 casos).

- Build: `Application bundle generation complete. [33.427 seconds] - 2026-10-19T21:34:50.315Z` (sin warnings)
- Tests (`npx ng test --watch=false`):
```
 Test Files  9 passed (9)
      Tests  44 passed (44)
```
- Tests de la feature clinical durante el desarrollo: 2 archivos, 17 tests passed.

## Revisión
Estado: CORRECCIONES

Build OK y tests 44/44. Se respeta la estructura (store, domain, componentes dumb, `variant` del odontograma, ruta y
accesos). Falla la fidelidad de la distribución y hay errores de datos y de manejo de errores. **El código de la 018b
ya está en el árbol de trabajo: no borrarlo ni romperlo** (sección 12, `chunkSessionsForSheets`, impresión).

1. **Distribución distinta del PDF (criterio 1).** En `docs/Form_033.pdf` estas filas son **una sola fila** que
   alterna etiqueta verde y casilla (amarilla para marcas, blanca para valores); hoy son tabla de encabezado + fila
   de valores:
   - grupos de edad: `MENOR DE 1AÑO [ ] 1-4 AÑOS [ ] 5-9 AÑOS PROGRAMADO [ ] … EMBARAZADA [ ]`;
   - sección 3: `1. ALERGIA ANTIBIÓTICO [ ] 2. ALERGIA ANESTESIA [ ] … 10. OTRO [ ]`, y debajo 2 líneas;
   - sección 4: `PRESIÓN ARTERIAL [valor] FRECUENCIA CARDIACA min. [valor] TEMPERATURA °C [valor] F. RESPIRAT. min.
     [valor]` y el resto de la fila vacío;
   - sección 10: `BIOMETRIA [ ] QUIMICA SANGUINEA [ ] RAYOS - X [ ] OTROS [ ]` y luego 4 líneas;
   - fila de apertura: `FECHA DE APERTURA [valor] FECHA DE CONTROL [ ] PROFESIONAL [nombre] [código, con la etiqueta
     CÓDIGO encima] FIRMA [ ] NUMERO DE HOJA [n]`.
   - Sección 11: las etiquetas `CIE PRE DEF` van **en la misma banda del título** (dos veces, sobre cada bloque);
     quitar la fila de encabezado vacía. Las celdas 1–4 del número en verde.
   - Número de líneas por sección como el PDF: 1 → 1 línea, 2 → 3, 3 → 2, 5 → 5, 10 → 4; las líneas se dibujan
     aunque estén vacías.
2. **Paciente sin atenciones nunca ve el estado vacío.** Sin historia clínica, `GET /patients/{id}/clinical-record`
   responde **404** y el `forkJoin` entero falla. Tratar ese 404 como `null` (`catchError` solo para 404) para que se
   vea el `bd-empty-state`.
3. **Error silencioso en la atención de referencia** (`loadEncounter`, `error: () => {}`): mostrar el `message` en un
   `bd-alert` sobre las hojas ("No se pudo cargar la atención de referencia: …"). Además, cambiar de sesión rápido
   puede dejar los datos de la sesión anterior: usar `switchMap` (o descartar respuestas viejas).
4. **Fechas fuera de la zona de la clínica.** `calculateAgeAtDate` usa `new Date('YYYY-MM-DD')` (UTC) y
   `getDate()` local: en Ecuador corre el cumpleaños un día. La fecha de nacimiento es una fecha sin hora (comparar
   año/mes/día del string) y la de referencia se pasa a fecha de `America/Guayaquil` (`Intl.DateTimeFormat` con
   `timeZone`, como `ClinicClock`). El selector debe decir `Sesión 1 · 03/10/2026 · Apertura` (`dd/MM/yyyy`); hoy el
   pipe corto da "sáb 10 oct" sin año.
5. **Colores sueltos.** Quitar los fallbacks hex de `var(--form033-*, #…)` y los `#ffffff`/`#000000`: añadir
   `--form033-paper: #FFFFFF` y usar `--form033-ink`. Mover los `style="width: …"` en línea a clases.
6. **Plantilla de `form-033-oral-health` > 150 líneas** (161, y su archivo 613): extraer la sección 9 a
   `components/form-033/form-033-symbology/`.
7. **Landmark duplicado:** la página usa `<main>` dentro del `<main>` del layout. Cambiar a
   `<section aria-label="Vista del documento Formulario 033">`.
8. **Responsive:** `@media (max-width: 575px)` no sigue el sistema. Mobile-first con el mixin de
   `_breakpoints.scss` (`bp-up(sm)`).
9. **Modelos frente al DTO del backend 011c** (`ClinicalSummaryResponse.java`): `recordNumber`, `openedAt` y
   `openedBy` pueden ser `null`; `PrescriptionMedicationItem.quantity` es `string`, no `number` (ajustar también el
   tipo que recibe `formatPrescriptionLines`). `status` como `'OPEN' | 'COMPLETED'`.
10. **Simplificar:** el binding de `chiefComplaint` en la página (expresión anidada) pasa a
    `store.referenceEncounter()?.chiefComplaint ?? ''`. `getOralHealthIndicators` compara los valores exactos del
    backend (`LEVE|MODERADA|SEVERA`, `ANGLE_I|ANGLE_II|ANGLE_III`), sin `includes`. `rayosX` con límites de palabra
    (`/\brx\b/`, `rayos x`, `rayos-x`). El error de carga usa `ApiError.message` como el resto de stores, sin
    reconstruirlo.

Al terminar: `npx ng build` y `npx ng test --watch=false` (totales en Resultado) y verificar en el navegador la hoja
lado a lado con el PDF en 1366.

### Ronda 2
Estado: APROBADO

Correcciones 1–10 aplicadas: filas etiqueta + casilla como en el PDF (edad, 3, 4, 10, apertura), `CIE PRE DEF` en la
banda de la 11, renglones por sección, 404 de la historia → estado vacío, error visible y respuestas viejas
descartadas en la atención de referencia, fechas y edad en `America/Guayaquil`, sección 9 en `form-033-symbology`,
`<section>` en lugar de `<main>`, mobile-first y modelos alineados con el DTO de la 011c. Corrección mínima de Claude:
los colores de respaldo de `SYMBOLS_DEF` eran hex de la marca → `var(--coral-700)` / `var(--blue-700)`.
`npx ng build` OK; `npx ng test --watch=false`: 9 archivos, 44 tests OK. La comparación lado a lado con el PDF no se
pudo hacer sin backend levantado: queda en la prueba manual.
