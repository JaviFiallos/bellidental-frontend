# 026 — Atención: botón «Control de ortodoncia» (cambio de ligas en un clic)

## Objetivo
La mayoría de atenciones son cambios de ligas. Hoy el odontólogo tiene que escribir el motivo, buscar el CIE-10 y
buscar el tratamiento. Además, el catálogo no tenía nada de esto (G-17). Decisión del usuario (2026-10-25, D-32 del
backend):
- La ortodoncia se cobra con **un monto total** («Ortodoncia (tratamiento completo)», `D8080`, precio editable)
  que se registra **una vez** con el flujo normal de tratamientos, y se paga con **abonos libres** (015a/025). El
  saldo muestra cuánto falta.
- Cada control: diagnóstico **Z46.4** + tratamiento **`D8670` Control de ortodoncia a $0**. Así se puede completar
  la atención y queda en la historia sin sumar deuda.

Esta tarea agrega en la atención un botón **«Control de ortodoncia»** que deja todo listo para «Completar
atención». No cambia la regla de completar ni el cobro.

Depende de: **backend 030** (V22: Z46.4, especialidad Ortodoncia, D8080, D8670), 008a, 012a.

## Archivos a tocar
```
src/app/features/clinical/
  services/orthodontic-control.service.ts     nuevo: orquesta motivo + diagnóstico + tratamiento
                                              (provisto en la página, usa EncounterStore, Icd10Api y
                                               TreatmentsStore de treatments/index.ts)
  components/diagnosis-list/                  botón secundario «Control de ortodoncia» en la cabecera
                                              de la sección (input `showOrthodonticControl`, output
                                              `orthodonticControl`); sin lógica
  pages/encounter/encounter.page.ts           provee el servicio, conecta el output, toast de éxito
  pages/encounter/encounter.page.spec.ts      +2 casos
```
De otros features solo usa `treatments/index.ts` (`TreatmentsStore`, `Treatment`), que ya se importa en la página.
No se exporta nada nuevo.

## Criterios de aceptación
1. **Botón:** «Control de ortodoncia» (secundario, ícono lucide `smile` o similar con texto; **no** acento: el
   acento sigue siendo «Completar atención»), en la cabecera de la sección Diagnósticos. Se ve solo si la atención
   es editable (`!store.isReadOnly()`). Mientras trabaja: deshabilitado con «Registrando…».
2. **Al hacer clic** (`OrthodonticControlService.apply()`), en orden y sin duplicar:
   1. Si el motivo está vacío → `setChiefComplaint('Control de ortodoncia (cambio de ligas)')` y `flushSave()`
      (el `PUT` sale ya, sin esperar los 800 ms).
   2. Si no hay diagnóstico activo con `code === 'Z46.4'` → `Icd10Api.search('Z46.4')`, se toma el resultado con
      código **exacto** `Z46.4` → `store.addDiagnosis({ icd10Id, certainty: 'DEFINITIVE' })`.
   3. Si no hay un tratamiento no anulado con `treatmentCode === 'D8670'` → `treatmentsStore.ensureCatalog()`, se
      busca `D8670` en el catálogo → `treatmentsStore.record({ treatmentId, quantity: 1, price: basePrice,
      encounterDiagnosisId: <id del Z46.4> })`. Sin pieza ni cara.
   4. Toast «Control de ortodoncia registrado». No completa la atención: eso lo hace el odontólogo con «Completar
      atención» (la barra ya no muestra faltantes).
   - Un segundo clic no crea nada nuevo: toast «El control de ortodoncia ya está registrado».
3. **Errores** (nunca silenciosos, en la sección Diagnósticos con `bd-alert`):
   - Z46.4 no encontrado → «No se encontró el diagnóstico Z46.4 en el catálogo CIE-10».
   - D8670 no encontrado o inactivo → «Falta el tratamiento "Control de ortodoncia" (D8670) en el catálogo; pídele
     al director que lo active».
   - Error de la API (409, 403, 0) → `message` del backend con los textos estándar.
   - Si falla el paso 3, el diagnóstico del paso 2 se queda: un nuevo clic retoma desde el paso que falta.
4. El tratamiento completo `D8080` **no** lo agrega el botón. Se registra una vez con «Agregar tratamiento» (012a),
   con el precio acordado.
5. Sin colores sueltos; botón ≥ 44 px de alto; foco visible.

## Responsive
375, 768, 1024, 1366. En 375 el botón pasa debajo del título de la sección a ancho completo, sin scroll
horizontal.

## Tests requeridos
`encounter.page.spec.ts`, 2 casos nuevos (con las fixtures existentes):
1. «clic en Control de ortodoncia → PUT con motivo, POST diagnóstico Z46.4 y POST tratamiento D8670 a $0 → se ven
   Z46.4 y el control en la lista». Verificar: `GET /api/v1/icd10?query=Z46.4`,
   `POST /api/v1/encounters/{id}/diagnoses` con body `{ icd10Id, certainty: 'DEFINITIVE' }`, `GET
   /api/v1/treatments`, `POST /api/v1/encounters/{id}/treatments` con `{ treatmentId, quantity: 1, price: 0,
   encounterDiagnosisId }`.
2. «sin D8670 en el catálogo → mensaje "Falta el tratamiento…" y no hay POST de tratamiento».

## Prueba manual
Primero aplicar el backend 030 y, como director:
- **Profesionales:** asignar la especialidad «Ortodoncia» a la doctora. Sin esto, la agenda no deja agendar con
  esa especialidad.
- **Catálogo:** revisar la duración de Ortodoncia (15 min; múltiplo de 15) y el precio de referencia de D8080.

Después:
1. Agendar una cita «Ortodoncia» → ocupa 15 min en la agenda.
2. Abrir la atención → «Control de ortodoncia» → aparecen motivo, Z46.4 y «Control de ortodoncia $0,00».
   «Completar atención» queda habilitado.
3. Volver a hacer clic → «ya está registrado», sin duplicados.
4. En la primera visita de un paciente: «Agregar tratamiento» → «Ortodoncia (tratamiento completo)» con el monto
   acordado → completar → como secretaria, registrar un abono parcial → el saldo muestra lo que falta.
5. Desactivar D8670 en el Catálogo → el botón muestra el mensaje de catálogo. Volver a activarlo.

## Resultado
**Archivos**
- Nuevo `src/app/features/clinical/services/orthodontic-control.service.ts`: `OrthodonticControlService` (provisto en la página). `apply()` ejecuta motivo (`flushSave`), Z46.4 (búsqueda exacta + `addDiagnosis` DEFINITIVE) y D8670 (`ensureCatalog` + espera del catálogo + `record`), saltando lo que ya existe. Expone `working` y `error` (signals). Devuelve `REGISTERED` o `ALREADY_REGISTERED`; los errores no se propagan, quedan en `error`.
- `components/diagnosis-list/diagnosis-list.component.ts`: cabecera con el botón «Control de ortodoncia» (`btn btn-outline`, ícono `Smile` vía `bd-icon`; con «Registrando…» y `disabled` mientras trabaja); `bd-alert` de error en la sección. Inputs nuevos: `showOrthodonticControl`, `orthodonticBusy`, `orthodonticError`. Output: `orthodonticControl`.
- `pages/encounter/encounter.page.ts`: provee el servicio; `[showOrthodonticControl]="!store.isReadOnly()"`; `onOrthodonticControl()` con toast «Control de ortodoncia registrado» o «El control de ortodoncia ya está registrado».
- `pages/encounter/encounter.page.spec.ts`: 2 casos nuevos (flujo completo con PUT, icd10, POST diagnóstico, GET catálogo, POST tratamiento a $0; y catálogo sin D8670 con mensaje y sin POST de tratamiento).
- `testing/fixtures.ts`: mocks de Z46.4 (icd10, diagnóstico), catálogo con D8670 y tratamiento realizado.
- No se tocó `nav-items.ts` ni `IMPLEMENTATION-PLAN.md`. No hay commit ni `git add`.

**Build:** OK (`Application bundle generation complete.`, exit 0).

**Tests:**
- Durante el desarrollo, `--include='src/app/features/clinical/**/*.spec.ts'`: `Test Files 3 passed (3)` · `Tests 27 passed (27)`.
- Final, `npx ng test --watch=false`:
  `Test Files 18 passed (18)`
  `Tests 82 passed (82)`

**Responsive:** no revisado en DevTools (queda para la prueba manual). CSS aplicado: `.diagnosis-list__header` es flex con `flex-wrap: wrap`; el botón tiene `width: 100%` y `min-height: 44px` por debajo de `sm` (600 px), así que en 375 px baja debajo del título a ancho completo. Desde `sm` pasa a `width: auto`.

**Desviaciones y supuestos**
1. Precio: el criterio dice `price: basePrice`, pero el objetivo y el test piden $0. Implementé `price: basePrice` (literal del criterio) y el mock de D8670 tiene `basePrice: 0`. Si el catálogo real tiene D8670 con precio mayor que 0, el control se cobraría. Conviene confirmar que D8670 esté en $0 en el catálogo, o cambiar a `price: 0`.
2. Inputs `orthodonticBusy` y `orthodonticError` no estaban en la lista de archivos. Los necesito para «Registrando…» y para el `bd-alert`.
3. `TreatmentsStore` solo expone signals, así que el servicio espera el catálogo con `toObservable` sobre un `computed` de `catalog`, `catalogLoading` y `catalogError`. Funcionó en los tests sin cambios en `treatments/`.
4. Si `addDiagnosis` falla, el mensaje aparece en dos sitios: en el `bd-alert` del control y en el texto de error que ya muestra el store en la lista de diagnósticos.
5. Si el usuario hace clic antes de que termine de cargar la lista de tratamientos, la comprobación de D8670 no lo ve y podría registrar un duplicado. No lo cubrí porque la tarea no lo pide.
6. Prueba manual pendiente del usuario (backend 030 aplicado, especialidad Ortodoncia y D8670 activo).

## Revisión
Estado: APROBADO (revisó Claude Opus; ejecutó Haiku)

- Cumple los criterios 1–5: `OrthodonticControlService` provisto en la página, pasos idempotentes (motivo con
  `flushSave`, Z46.4 por código exacto, D8670 desde el catálogo de `treatments/index.ts`), mensajes de catálogo y de
  la API con el mismo `errorMessageOf` que los stores, y un botón secundario de 44 px que ocupa el ancho completo
  en `< sm`.
- Desviaciones aceptadas: los inputs `orthodonticBusy` y `orthodonticError` (necesarios para «Registrando…» y el
  alerta); `price: treatment.basePrice` (literal del criterio; D8670 está a $0 en V22 y el director puede cambiarlo).
- Corrección mínima de Claude (punto 5 del Resultado): el botón queda deshabilitado mientras carga la lista de
  tratamientos (`orthodonticBusy = working() || treatmentsStore.loading()`), para que no se duplique D8670.
- Verificación tras la corrección: `npx ng build` OK; `Test Files 18 passed (18)` · `Tests 82 passed (82)`.
- Queda la prueba manual del usuario (necesita el backend 030 con commit y aplicado, y Ortodoncia asignada a la
  doctora).
