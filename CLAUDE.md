# Flujo de trabajo — Frontend Bellidental (Angular 22)

- Claude: planifica y revisa. No escribe código salvo correcciones mínimas.
- Gemini (`gemini -p "..."`): ejecuta tareas, escribe código y tests, verifica y hace commit tras la aprobación.
- Alcance: `docs/MVP-SCOPE.md`. Pantallas, API, componentes y orden de tareas: `docs/IMPLEMENTATION-PLAN.md`
  (cada tarea se redacta desde su §5.x; los DTO del backend están en su §7: no releer el backend salvo para
  confirmar un cambio).
- Contexto y visibilidad por perfil: `docs/CONTEXT.md`. Fuentes del dominio (033, ficha rápida, odontograma,
  contexto del backend): `docs/reference/`.

## Ciclo
1. Claude crea `docs/tasks/NNN-nombre.md` (una tarea = una pantalla o un feature) desde su §5.x del plan. Antes de
   redactarla define la estructura según `architecture/SKILL.md`: qué carpetas del feature usa, qué expone en su
   `index.ts` y de qué `index.ts` de otros features depende. En `## Archivos a tocar` la escribe como árbol.
   Tests según `testing/SKILL.md`: **sin unit tests**; como máximo un `*.page.spec.ts` de integración
   (petición → respuesta → UI) con 2–3 casos. El usuario prueba a mano el resto.
   Toda tarea con UI indica los anchos donde se revisa (`responsive/SKILL.md`).
2. Ejecutar: `gemini -p "Ejecuta docs/tasks/NNN-nombre.md siguiendo GEMINI.md."`
3. Claude revisa la sección Resultado (con los totales copiados de la consola) y `git diff --stat` (y los archivos
   críticos si hace falta). No corre `npx ng build` ni `npx ng test --watch=false` salvo que (a) haya corregido
   código él mismo o (b) la tarea toque algo de toda la app: interceptores, rutas, guards, sesión o `core/`.
   Si los corre, una vez y solo los totales. El paso de commit de Gemini vuelve a correrlos.
4. Claude escribe `## Revisión`:
   - No cumple → `Estado: CORRECCIONES` + lista numerada → volver al paso 2.
   - Cumple → `Estado: APROBADO`, y actualiza el plan: estado de la tarea en §9 y, si cambió algo (decisión,
     endpoint, componente compartido nuevo), la sección correspondiente.
5. Commit: `gemini -p "Haz commit de la tarea docs/tasks/NNN-nombre.md siguiendo GEMINI.md."`
6. Claude verifica con `git log -1 --stat` y crea la siguiente tarea.

## Formato de tarea
`## Objetivo` · `## Archivos a tocar` · `## Criterios de aceptación` · `## Responsive` · `## Tests requeridos`
(integración de página, o "Sin tests") · `## Prueba manual` (pasos para el usuario) · `## Resultado` (lo llena
Gemini) · `## Revisión` (lo llena Claude)

## Diseño
- Skill `impeccable` instalada en `.claude/skills` y `.gemini/skills`. Contexto de producto: `PRODUCT.md`
  (se crea con `/impeccable init`); sistema visual: plan §2.3 (paleta y tokens).
- Modo de todas las pantallas: **Operate** (herramienta de trabajo: escaneo rápido, consistencia, pocos clics).
- Pantallas nuevas importantes (agenda, atención, odontograma): Claude usa `/impeccable shape` para el brief y lo
  copia a la tarea; tras aprobar, `/impeccable audit` sobre la pantalla.

Reglas: @.agents/skills/architecture/SKILL.md · @.agents/skills/clean-code/SKILL.md ·
@.agents/skills/responsive/SKILL.md · @.agents/skills/testing/SKILL.md
Ahorrar tokens: mensajes breves, no leer código innecesario, confiar en el Resultado.
