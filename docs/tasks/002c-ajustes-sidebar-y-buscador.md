# 002c — Shell y buscador: hover completo en sidebar, feedback de foco y búsqueda por cédula

> Plan §5.2 y §9 (tarea de corrección y pulido derivada de 002a y 002b).
> Perfil: todos. Base visual: sidebar del shell y buscador global del header.

## Objetivo
Resolver los comportamientos observados en el shell y en el buscador de pacientes:
1. **Hover en sidebar:** El elemento "Pacientes" (y cualquier botón `.sidebar__link--btn`) debe extender su fondo `:hover` al 100% del ancho del contenedor, igual que los enlaces `<a>`, en lugar de cortarse a la mitad.
2. **Feedback visual al pulsar "Pacientes":** Dado que "Pacientes" activa el buscador global del header por diseño (§3.3 F-1), en escritorio debe ofrecer un indicador visual claro e inmediato (destello o anillo de foco evidente en el header) para que el usuario no sienta que el botón "no responde".
3. **Búsqueda por cédula:** Soportar búsquedas por documento de identidad limpiando separadores habituales (guiones, espacios) antes de enviar la consulta al backend, y verificar el contrato con `GET /api/v1/patients?query=`.

## Archivos a tocar
```
src/app/
  layout/
    sidebar/
      sidebar.component.scss                 width: 100% y alineación en .sidebar__link
    header/
      header.component.ts|scss               animación/resalto temporal al invocar focusSearch() en desktop
  features/patients/
    services/
      patient-search.store.ts                normalización de documento/query antes de invocar la API
    components/
      patient-search/
        patient-search.component.ts|scss     estilos de foco/resalto accesible
  layout/main-layout/
    main-layout.spec.ts                      verificación de focusSearch y emisión
```

## Criterios de aceptación
**1. Hover del botón en Sidebar (`sidebar.component.scss`)**
- `.sidebar__link` tiene `width: 100%`, `box-sizing: border-box`, `text-align: left`.
- Tanto los enlaces `<a>` como el botón `<button>` de "Pacientes" llenan el ancho completo del `<li>` (232 px en modo `--full` y `--drawer`; 72 px centrado en `--icons`).
- Al pasar el cursor sobre "Pacientes", el color de fondo `:hover` (`color-mix(in srgb, var(--white) 8%, transparent)`) cubre toda la fila de borde a borde.

**2. Feedback visual al activar búsqueda (`header` y `patient-search`)**
- Cuando se pulsa "Pacientes" en el menú, o se usan los atajos `Ctrl+K`, `Cmd+K` o `/`:
  - En móvil (`< md`): se mantiene el comportamiento existente (cierra drawer, expande el header con input enfocado y botón cerrar).
  - En escritorio (`≥ md`): además de hacer `input.focus()` y `input.select()`, el campo de búsqueda activa una animación suave de destello o anillo de resalte visual (`var(--color-focus)` o borde destacado temporal durante ~1.2 s) para confirmar al usuario que el buscador ha sido enfocado y está listo para recibir texto.
- No se produce ningún desalineamiento del header ni saltos de scroll.

**3. Búsqueda por cédula y normalización (`patient-search.store.ts`)**
- Si el usuario ingresa un término que parece cédula o documento con formato (por ejemplo `171003406-5` o `17 1003 4065`), el store limpia caracteres no alfanuméricos separadores (`-`, `.`, ` `) antes de enviarlo a `GET /api/v1/patients?query=`, facilitando la coincidencia exacta.
- Si el término es texto alfabético regular (nombres/apellidos), se envía tal cual (trim).
- Si el backend devuelve resultados, se despliegan en el combobox mostrando `fullName`, `documentNumber`, edad y teléfono.
- Si el backend aún no incluye `document_number` en su consulta interna de base de datos, el frontend envía la petición correctamente limpia y se documenta en el Resultado el comportamiento para el reporte de backend.

## Responsive
- **1366 px y 1024 px:**
  - El hover de "Pacientes" en el sidebar cubre los 232 px exactos.
  - Al hacer clic en "Pacientes", el input del header parpadea con un halo de foco notorio.
- **768 px y 375 px:**
  - En drawer (pantalla colapsada), el botón "Pacientes" llena el ancho del drawer (232 px).
  - Al pulsarlo, el drawer se cierra y el header se expande en modo búsqueda con el cursor dentro del input.

## Tests requeridos
En `main-layout.spec.ts` y/o specs de componentes involucrados:
1. Verificar que al hacer clic en el botón "Pacientes" del sidebar, se ejecuta `focusSearch()` y el header aplica el estado de foco resaltado.
2. Verificar que `PatientSearchStore` normaliza términos de documento con guiones/espacios al disparar la búsqueda a la API.

## Prueba manual
1. Iniciar sesión como secretaria o como odontóloga.
2. Posar el cursor del mouse sobre "Pacientes" en el sidebar:
   - El fondo coloreado debe cubrir todo el ancho del sidebar, idéntico a "Agenda" y "Horarios".
3. En pantalla completa de escritorio (1366 px), hacer clic en "Pacientes":
   - El buscador en el Header debe resaltarse visiblemente con un efecto de foco claro y el cursor debe quedar parpadeando dentro del input.
4. Escribir una cédula en el buscador (con o sin guión):
   - Verificar la petición en la pestaña Red (Network) de DevTools.
5. Reducir la pantalla a 375 px (móvil) y abrir el menú drawer:
   - Tocar "Pacientes": el drawer se cierra y se abre la barra de búsqueda ocupando el header con el teclado listo.

## Resultado
*(Pendiente de ejecución)*

## Revisión
*(Pendiente de revisión)*
