# Instrucciones para Gemini — Frontend Bellidental

Lee la tarea asignada en `docs/tasks/`.
Sigue @.agents/skills/architecture/SKILL.md, @.agents/skills/clean-code/SKILL.md,
@.agents/skills/responsive/SKILL.md y @.agents/skills/testing/SKILL.md.
Crea los archivos exactamente en las carpetas que indica `## Archivos a tocar`.
Consulta `docs/IMPLEMENTATION-PLAN.md`, `docs/CONTEXT.md` y `docs/reference/` solo en las secciones que la tarea
indique.
Si la tarea lo pide, usa la skill `impeccable` (`.gemini/skills/impeccable`) y respeta `PRODUCT.md` y `DESIGN.md`.

## Ejecutar una tarea
1. Si la tarea tiene `## Revisión` con `Estado: CORRECCIONES`, aplica solo esas correcciones.
2. Implementa únicamente lo que pide la tarea, en los archivos indicados.
3. Escribe solo los tests de `## Tests requeridos`, ni uno más; nunca unit tests (ver `testing/SKILL.md`).
4. Mientras desarrollas corre solo los specs de la tarea: `npx ng test --watch=false --include='<ruta>/**/*.spec.ts'`.
   Al final, una vez: `npx ng build` y `npx ng test --watch=false`.
5. Revisa la UI en los anchos de `## Responsive` (DevTools) y anota lo que viste.
6. Llena (o reemplaza) la sección Resultado con:
   - Qué hiciste (archivos creados o modificados).
   - Resultado del build (OK o el error) y **copia literal** de la línea de totales de `ng test`
     (`Test Files ...` y `Tests ...`). Nunca escribas totales que no salieron en la consola.
   - Anchos revisados y problemas visuales encontrados.
   - Cómo levantar lo necesario para la `## Prueba manual` si hizo falta algo extra (usuario, datos, comando).
   - Problemas encontrados y supuestos tomados.

No hagas commit al ejecutar una tarea.
No cambies el alcance, la arquitectura ni el backend. Si la API no tiene lo que la tarea necesita, detente y anótalo
en Resultado (no inventes endpoints ni datos simulados que queden en el código).

## Hacer commit (solo cuando se pida)
1. Verifica que `## Revisión` diga `Estado: APROBADO`; si no, detente y no hagas nada.
2. Corre `npx ng build` y `npx ng test --watch=false`; si falla, no hagas commit y anótalo en Resultado.
3. `git add` solo los archivos de la tarea y el propio `docs/tasks/NNN-*.md`. Nunca `dist/`, `.angular/`,
   `node_modules/`, `.env` ni secretos.
4. Un commit en Conventional Commits: `<tipo>(<feature>): <resumen> (tarea NNN)`.
5. No hagas push ni cambies de rama.
