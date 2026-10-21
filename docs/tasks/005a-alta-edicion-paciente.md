# 005a — Pacientes: alta y edición

## Objetivo
Primera mitad de P5 (plan §5.5): la secretaria registra un paciente nuevo y corrige sus datos.
- **Alta:** `/pacientes/nuevo`, precargada desde `?q=` del buscador global (002b). Si el documento ya existe
  (409), se muestra el mensaje y un enlace a la ficha existente.
- **Edición:** `/pacientes/:id/editar`, el mismo formulario precargado.

Al guardar se navega a `/pacientes/:id`. La ficha de recepción es la 005b; hasta entonces esa ruta sigue en
"Próximamente".

**Fuera de alcance:** la ficha (005b), desactivar paciente y las citas del paciente.

## Reglas del backend (confirmadas en el código)
- `POST /api/v1/patients` (`PATIENT_CREATE`) → 201 `ApiResponse<Patient>`.
  - Obligatorios: `documentType`, `documentNumber` (≤ 30), `firstName` y `lastName` (≤ 100), `birthDate` (pasada)
    y `sex` (`"M"` | `"F"`).
  - Opcionales: `bloodType` (`O_POS`, `O_NEG`, `A_POS`, `A_NEG`, `B_POS`, `B_NEG`, `AB_POS`, `AB_NEG`),
    `phoneE164` (≤ 15), `email` (≤ 150), `emergencyContactName` (≤ 150), `emergencyContactPhoneE164` (≤ 15) y
    `adminNotes` (≤ 1000; vacío → `null`).
  - `documentType`: `CI` | `RUC` | `PASAPORTE`. Con `CI`, el backend valida el dígito verificador.
  - Teléfonos: el backend guarda `593XXXXXXXXX`, sin "+". El frontend envía ya ese formato.
  - Duplicado: 409 "Ya existe un paciente con el documento '1710034065'.". La respuesta **no** trae el id.
- `PUT /api/v1/patients/{id}` (`PATIENT_UPDATE`) → 200 `ApiResponse<Patient>`. Es una actualización **parcial**:
  un campo `null` o ausente no cambia.
  - Para **borrar** un opcional (correo, teléfono, contacto u observaciones) se envía `""`. Por eso, en edición,
    los opcionales vacíos van como `""`, no como `null`.
  - Si el documento lo usa otro paciente: 409 "El número de documento '…' ya está en uso.".
- `GET /api/v1/patients/{id}` → `Patient`, que ahora incluye `adminNotes: string | null` (backend 006d, G-5).
- `GET /api/v1/patients?query=&page=&size=` → `Page<Patient>` (ya existe en `PatientsApi.search`).

## Archivos a tocar
```
src/app/
  app.routes.ts                              'pacientes/nuevo' y nueva 'pacientes/:id/editar' (ambas con
                                             profileGuard('SECRETARIA')) → loadComponent de PatientFormPage;
                                             'pacientes/:id' sigue en ComingSoonPage
  shared/utils/
    cedula.ts                                isValidCedula(value): 10 dígitos, provincia 01–24 o 30,
                                             tercer dígito < 6, verificador módulo 10 (coeficientes 2,1,2,1…)
    e164.ts                                  toEcuadorE164(raw) → '593…' o null si no es válido
                                             (09XXXXXXXX celular, 0XXXXXXXX fijo, 593… se respeta);
                                             toEcuadorLocal(e164) → '0987654321' para precargar en edición
  features/patients/
    index.ts                                 + CreatePatientRequest, UpdatePatientRequest (no exporta páginas)
    models/patient.models.ts                 + adminNotes en Patient; + BloodType, Sex,
                                             CreatePatientRequest, UpdatePatientRequest
    services/patients.api.ts                 + create(body), update(id, body)
    pages/patient-form/
      patient-form.page.ts                   smart: lee :id y ?q=, arma el FormGroup tipado (nonNullable),
                                             carga en edición, envía, maneja 409 y navega
      patient-form.page.spec.ts              (nuevo) 2 casos
    components/patient-form/
      patient-form.component.ts              dumb: input form (FormGroup), saving, errorMessage,
                                             duplicatePatientId; outputs save y cancel
```
Si la plantilla de `patient-form.component` pasa de ~150 líneas, se divide por secciones en componentes dumb
hermanos dentro de `components/`: por ejemplo `patient-identity-fields/` y `patient-contact-fields/`, que
reciben el `FormGroup` como `input`.

## Criterios de aceptación
**Formulario.** Usa `bd-field` (etiqueta, `hint`, `error`) y las clases globales `.input`, `.btn-*`. Lleva
`bd-page-header` con "Nuevo paciente" o "Editar paciente". Tiene tres secciones con su `<h2>`:
1. **Identificación**
   - Tipo de documento: select con "Cédula" por defecto, "RUC" y "Pasaporte".
   - Número.
   - Nombres y Apellidos.
   - Fecha de nacimiento: `type="date"`, con `max` = hoy de `ClinicClock`.
   - Sexo: radios nativos "Femenino" y "Masculino", con objetivos de 44 px.
   - Tipo de sangre: opcional, select con "Sin registrar" y las etiquetas "O+", "O-", etc., que envían
     `O_POS`, `O_NEG`, etc.
2. **Contacto**
   - Teléfono (`type="tel"`, `inputmode="tel"`, `hint` "Ej. 0987 654 321").
   - Correo.
   - Contacto de emergencia: nombre y teléfono.
3. **Observaciones**
   - `textarea` de 3 filas, máximo 1000 caracteres, con `hint` "Notas administrativas: presupuestos, acuerdos de
     pago…".

**Validación en el cliente.** Solo la que ahorra un viaje al servidor. Los mensajes van en `bd-field` y se muestran
al salir del campo o al enviar:
4. Obligatorios: número, nombres, apellidos, fecha de nacimiento y sexo → "Campo obligatorio".
5. Con "Cédula": `isValidCedula` → "Cédula no válida". Con RUC o Pasaporte solo se exige que no esté vacío.
6. Teléfonos: si tienen texto y `toEcuadorE164` devuelve `null` → "Teléfono no válido (ej. 0987 654 321)".
7. Correo: `Validators.email` → "Correo no válido".
8. Al enviar un formulario inválido: `markAllAsTouched()`, el foco va al primer campo inválido y no se hace ninguna
   petición.

**Alta (`/pacientes/nuevo`)**
9. **Precarga desde `?q=`.**
   - Si `q` solo tiene dígitos (ignorando espacios) → Número, con "Cédula" elegida.
   - Si no → Nombres, con el texto tal cual.
   - El foco inicial va al primer campo vacío obligatorio.
10. **Envío.** `POST /api/v1/patients`:
    - teléfonos convertidos con `toEcuadorE164`;
    - texto con `trim()`;
    - los opcionales vacíos **no** se envían;
    - `birthDate` como `YYYY-MM-DD`.

    Éxito: toast "Paciente registrado: David Pérez" y navegación a `/pacientes/{id}`.
11. **409 duplicado.**
    - Se muestra el `message` del backend en `bd-alert` arriba del botón.
    - Luego se pide `GET /api/v1/patients?query=<documentNumber>&page=0&size=1`. Si el primer resultado tiene ese
      `documentNumber`, se muestra el enlace "Ver su ficha" (`routerLink` `/pacientes/{id}`).
    - Si esa búsqueda falla, solo queda el mensaje, sin error adicional.
12. **Otros errores.** 400 → `message` del backend; 403 → "No tienes permiso"; 0 → "No se pudo conectar con el
    servidor". Nunca un error silencioso.

**Edición (`/pacientes/:id/editar`)**
13. **Carga.** `GET /api/v1/patients/{id}` mientras se muestra `bd-skeleton`, y luego precarga el formulario:
    teléfonos con `toEcuadorLocal` y `bloodType` en el select.
    - Error 404/0 → `bd-alert` con el `message` y el botón "Reintentar".
14. **Envío.** `PUT /api/v1/patients/{id}` con todos los campos. Los opcionales vacíos van como `""` (ver reglas).
    - Éxito: toast "Datos actualizados" y navegación a `/pacientes/{id}`.
    - Errores: como en 11 y 12. En edición, el 409 no busca enlace.
15. **Botones.** "Cancelar" (`.btn-ghost`) vuelve a `/pacientes/{id}` en edición y a `/recepcion` en el alta.
    "Guardar" (`.btn-primary`) dice "Guardando…" y queda deshabilitado mientras envía.

**Reglas generales**
16. La página es smart y el formulario es dumb (solo `input()`/`output()`). El HTTP va solo en `PatientsApi`.
17. Sin colores sueltos y sin `new Date()` para "hoy": se usa `ClinicClock`. `cedula.ts` y `e164.ts` son funciones
    puras sin Angular.

## Responsive
- `< md`: una columna. El pie con los botones queda fijo abajo (`position: sticky`), y "Guardar" ocupa todo el
  ancho.
- `≥ md`: dos columnas dentro de cada sección (grid con `minmax`). Observaciones ocupa el ancho completo. El
  formulario tiene un ancho máximo de ~56rem.
- Sin scroll horizontal y con objetivos táctiles ≥ 44 px.
- Revisar en **375, 768, 1024 y 1366**.

## Tests requeridos
`pages/patient-form/patient-form.page.spec.ts`, con **2 casos**. Usa `provideRouter` con una ruta de prueba
`pacientes/:id` y verifica la URL final con `Router.url`.
1. **Alta válida:**
   - abrir `/pacientes/nuevo?q=1710034065` → el número aparece precargado;
   - completar nombres "David", apellidos "Pérez", fecha `2006-05-10`, sexo "Masculino" y teléfono
     "0987 654 321" → "Guardar";
   - `POST /api/v1/patients` con body exacto
     `{ documentType: 'CI', documentNumber: '1710034065', firstName: 'David', lastName: 'Pérez', birthDate: '2006-05-10', sex: 'M', phoneE164: '593987654321' }`;
   - responder 201 con un `Patient` completo (forma real, `adminNotes: null`) → la URL pasa a `/pacientes/<id>`.
2. **409 duplicado:**
   - mismo alta → responder 409 "Ya existe un paciente con el documento '1710034065'.";
   - el mensaje se ve;
   - `GET /api/v1/patients?query=1710034065&page=0&size=1` → `Page<Patient>` con ese documento;
   - se ve el enlace "Ver su ficha" con `href` `/pacientes/<id>`.

Para el test, `1710034065` es una cédula válida y `1710034064`, una inválida.

## Prueba manual
1. En el buscador global, escribir una cédula que no existe → "Registrar paciente «…»" → el número llega
   precargado.
2. Cédula `1710034064` → "Cédula no válida" al salir del campo.
3. Alta completa → toast → `/pacientes/{id}`, que hasta la 005b muestra "Próximamente".
4. Repetir el alta con la misma cédula → mensaje y "Ver su ficha".
5. Ir a `/pacientes/{id}/editar` → datos precargados (teléfono en formato local) → borrar el correo y cambiar las
   observaciones → guardar → reabrir la edición y comprobar los cambios.
6. Anchos 375 y 1366.

## Resultado

**Archivos creados**
- `src/app/shared/utils/cedula.ts` (`isValidCedula`)
- `src/app/shared/utils/e164.ts` (`toEcuadorE164`, `toEcuadorLocal`)
- `src/app/features/patients/domain/patient-field-error.ts` (mensaje de error por campo; no estaba en la lista, es función pura)
- `src/app/features/patients/pages/patient-form/patient-form.page.ts` (smart: FormGroup tipado, `?q=`, carga en edición, envío, 409, navegación)
- `src/app/features/patients/pages/patient-form/patient-form.page.spec.ts` (2 casos)
- `src/app/features/patients/components/patient-form/patient-form.component.ts` (dumb: 3 secciones, notas, pie sticky)
- `src/app/features/patients/components/patient-identity-fields/patient-identity-fields.component.ts`
- `src/app/features/patients/components/patient-contact-fields/patient-contact-fields.component.ts`

**Archivos modificados**
- `src/app/app.routes.ts`: `pacientes/nuevo` y `pacientes/:id/editar` (SECRETARIA) → `PatientFormPage`.
- `src/app/features/patients/models/patient.models.ts`: `adminNotes`, `Sex`, `BloodType`, `CreatePatientRequest`, `UpdatePatientRequest`. `Patient.sex` pasa a `Sex` y `Patient.bloodType` a `BloodType | null`.
- `src/app/features/patients/services/patients.api.ts`: `create(body)`, `update(id, body)`.
- `src/app/features/appointments/pages/reception-agenda/reception-agenda.page.spec.ts`: mock de `Patient` corregido (ver Problemas). `index.ts` no cambió: su `export *` ya cubre los modelos nuevos.

**Build**: OK (`npx ng build`, sin errores; `patient-form-page` aparece como chunk lazy).

**Test (`npx ng test --watch=false`), copia literal:**
```
 Test Files  4 passed (4)
      Tests  16 passed (16)
```
(Suite de pacientes sola: `Test Files  1 passed (1)` / `Tests  2 passed (2)`.) Los 14 existentes siguen pasando.

**Anchos revisados**: NO visualmente (no hay navegador en esta ejecución). Revisión leyendo el CSS:
- 375 (`< md`): una columna; las secciones son tarjetas; el pie (`Cancelar` + `Guardar` a ancho completo con `flex: 1`) queda `sticky` abajo; `.input` 48 px, radios con `min-height: 44px`, botones con `min-height: 44px`.
- 768 (`< md`): igual que 375 (una columna), el formulario ocupa el ancho disponible.
- 1024 (`≥ md`): dos columnas por sección (`repeat(2, minmax(0, 1fr))`), Observaciones a ancho completo, pie estático alineado a la derecha.
- 1366 (`≥ md`): igual que 1024, con el formulario limitado a `56rem` centrado.
- Sin anchos fijos en px en el layout; no debería haber scroll horizontal. Pendiente de confirmar en DevTools.

**Cómo levantar la prueba manual**: hace falta backend en marcha y un usuario SECRETARIA. Para la edición (paso 5) hace falta un paciente existente (creado en el paso 3).

**Problemas y supuestos**
- **Corrección en un spec existente**: `reception-agenda.page.spec.ts` tenía `bloodType: 'O+'` (no es un valor del enum del backend) y no tenía `adminNotes`. Los cambié a `'O_POS'` y `adminNotes: null` para que compile con el modelo del plan §7. No cambié otra cosa de ese spec.
- **Tipo de sangre al editar**: el backend (`BloodType` enum) no acepta `""`; por eso, si el select queda en "Sin registrar", en la edición se envía `bloodType: null`, que significa "no cambiar". **No se puede borrar el tipo de sangre desde la UI** en esta tarea. Lo dejo anotado para decidir si hace falta un valor de borrado en el backend.
- Validación de cliente extra: `maxLength` (documento 30, nombres/apellidos 100, correo y contacto de emergencia 150, observaciones 1000) y formato de correo, porque ahorran un viaje. No cambian el alcance.
- Foco inicial: primer campo obligatorio vacío (con `?q=` cédula cae en Nombres; con `?q=` nombre cae en Número). Al enviar con errores, el foco va al primer campo inválido.
- En el 409 de la alta, la búsqueda `GET /api/v1/patients?query=<doc>&page=0&size=1` no muestra error extra si falla (como pide la tarea).
- No se hizo commit. `prompt.txt` no se tocó. Los archivos `docs/tasks/005b-*`, `006a-*` y `006b-*` que aparecen en `git status` no los creé yo.
- En el spec, la validación de cédula usa `1710034065` (válida) con `q=` de la cédula; el caso de cédula inválida (`1710034064`) no está cubierto por test (la tarea no lo pide) y solo se verificó por lectura de la regla.

## Revisión

**Revisión 1** — Estado: APROBADO

Revisor: Claude (Opus). Ejecutor: Haiku, por delegación del usuario en esta sesión.

Build OK y `ng test`: 16/16 (4 archivos). Se cumplen:
- **Utilidades:** `isValidCedula` (provincia, tercer dígito y módulo 10) y `toEcuadorE164`/`toEcuadorLocal` son
  funciones puras.
- **Validación en el cliente:** obligatorios, cédula solo con CI (se revalida al cambiar el tipo), teléfonos,
  correo y `maxLength`. Al enviar un formulario inválido, `markAllAsTouched` y foco en el primero inválido, sin
  petición.
- **Precarga desde `?q=`** y foco inicial en el primer obligatorio vacío.
- **Alta y edición:** el alta omite los opcionales vacíos y la edición los envía como `""`.
- **409:** muestra el `message` y busca el documento para mostrar "Ver su ficha". Los mensajes de 0 y 403 los
  traduce `ApiClient` (`getApiErrorMessage`).
- **Componentes:** la página es smart y los componentes dumb. El formulario se dividió en `patient-identity-fields`
  y `patient-contact-fields`. "Sexo" va en un `fieldset` con `legend`, con radios nativos de 44 px.
- **Estilos:** sin colores sueltos y sin `new Date()`.
- **Tests:** los 2 casos tienen el body exacto, verifican `Router.url` y el `href` del enlace.

Se aceptan:
- `features/patients/domain/patient-field-error.ts`, que no estaba en la lista. Es una función pura de mensajes, en
  la carpeta `domain/` del feature.
- La corrección de la fixture de `reception-agenda.page.spec.ts`: `bloodType: 'O_POS'` (el valor real del enum) y
  `adminNotes: null`, por el tipado nuevo.

Queda anotado: en edición, el tipo de sangre no se puede **borrar**. El `PUT` es parcial y `null` no cambia el
valor, y el backend no acepta `""` para un enum. No bloquea el MVP. Si hace falta, será un faltante del backend.
