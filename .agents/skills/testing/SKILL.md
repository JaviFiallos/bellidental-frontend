Principio: **sin unit tests**. Solo tests de integración de página que prueban el ciclo completo
petición a la API → respuesta del backend → actualización de la interfaz. El resto lo prueba el usuario a mano.
Runner: Vitest con el builder `@angular/build:unit-test` (jsdom).

- Quién: Gemini escribe y corre los tests de cada tarea, en la misma tarea que implementa la pantalla.
- Escribir solo los tests listados en `## Tests requeridos`; nunca añadir otros por iniciativa propia.
- Tareas sin llamada nueva a la API (estilos, layout puro) no llevan tests.

**Test de integración de página (`<pagina>.page.spec.ts`) — el único tipo permitido**
- Como máximo uno por tarea, con 2–3 casos:
  1. el flujo principal: el usuario hace la acción → se verifica la petición (método, URL, query, body) →
     se responde con el JSON real del backend (`ApiResponse<T>`) → se verifica lo que el usuario ve;
  2. el error que más importa (403, 409, 401, validación del backend) → se verifica el mensaje visible.
- `TestBed` con la página real y sus hijos reales; `provideHttpClient()` + `provideHttpClientTesting()`;
  `HttpTestingController` con `expectOne` sobre la URL relativa `/api/v1/...` y `verify()` al final.
  Sin mocks de servicios propios ni espías sobre métodos internos.
- Interactuar como el usuario: escribir en inputs, hacer clic en botones, leer texto visible o atributos ARIA.
- Respuestas con la forma exacta de los DTO del backend (`docs/IMPLEMENTATION-PLAN.md` §7). Si varios casos
  las reutilizan, van en `testing/fixtures.ts` dentro del feature.

**Prohibido**
- Unit tests de funciones, servicios, pipes, guards, signals, componentes presentacionales o lógica de `domain/`.
- Tests de estilos, de responsive o de validaciones simples (`Validators.required`).
- E2E (Playwright/Cypress) en el MVP.

**Correr tests (ahorrar tokens)**
- Durante el desarrollo: `npx ng test --watch=false --include='src/app/features/<feature>/**/*.spec.ts'`.
- Al final, una sola vez: `npx ng build` y `npx ng test --watch=false`. No pegar el log completo: copiar solo la
  línea de totales; si algo falla, solo el bloque del test que falla.

**General**
- Nombre: `describe('<Página>')` + `it('<acción> → <resultado esperado>')`, en español.
- Reportar el resumen real, copiado de la consola, no inventado.
- Un test que falla no se borra ni se marca `skip`: se reporta en Resultado.
- Los tests existentes no se borran salvo en una tarea dedicada (el `app.spec.ts` inicial se borra en la 001).
- La verificación visual (responsive, colores, foco) es manual: Gemini anota en Resultado qué revisó y el usuario
  la confirma probando.
