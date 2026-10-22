# 023d — Cambiar mi contraseña: usar el 400 del backend (G-13 resuelto)

## Objetivo
Con el backend 023, `PUT /api/v1/auth/password` responde **400** con `message` «La contraseña actual no es
correcta.» cuando la actual no coincide; el 401 queda solo para sesión vencida. Se quita la excepción de la 023b:
- `/auth/password` sale de `SESSION_SAFE_401_URLS` (un 401 ahí vuelve a cerrar la sesión, como en cualquier URL);
- la página deja de traducir el 401 a un texto propio y muestra el `message` del backend (400).

## Decisiones a revisar
- Ninguna nueva: cierra G-13 y la decisión de la 023b.

## Archivos a tocar
```
src/app/core/interceptors/error.interceptor.ts                    (modif.) SESSION_SAFE_401_URLS = ['/auth/login']
src/app/features/auth/pages/change-password/change-password.page.ts      (modif.) sin caso especial de 401
src/app/features/auth/pages/change-password/change-password.page.spec.ts (modif.) el caso de error responde 400
```

## Criterios de aceptación
1. Contraseña actual incorrecta → el backend responde 400 → se ve exactamente su `message` en el formulario y la
   sesión sigue abierta.
2. Un 401 en `/auth/password` (token vencido) cierra la sesión y lleva al login, como el resto de la app.
3. No queda código muerto del manejo anterior (constantes o textos sin uso).

## Responsive
Sin cambios de UI.

## Tests requeridos
Cambiar el caso de error existente de `change-password.page.spec.ts`: responder **400**
`{ success: false, message: 'La contraseña actual no es correcta.' }` (forma `ApiResponse` de error usada en los
demás specs) → se ve ese texto. Sin casos nuevos.

## Prueba manual
1. Con el backend 023: escribir mal la contraseña actual → «La contraseña actual no es correcta.» y no se cierra la
   sesión.
2. Cambiarla bien → mensaje de éxito; entrar de nuevo con la nueva.

## Resultado
- **Qué se hizo**:
  - `src/app/core/interceptors/error.interceptor.ts`: se eliminó `'/auth/password'` de `SESSION_SAFE_401_URLS`, quedando únicamente `['/auth/login']`. Cualquier 401 en cambio de contraseña vuelve a cerrar sesión por expiración.
  - `src/app/features/auth/pages/change-password/change-password.page.ts`: se eliminó el caso especial y código muerto `WRONG_CURRENT_MESSAGE`; la página ahora muestra directamente el `message` que responde el backend ante error 400.
  - `src/app/features/auth/pages/change-password/change-password.page.spec.ts`: se actualizó el caso de prueba para responder 400 Bad Request con `{ success: false, message: 'La contraseña actual no es correcta.' }` y verificar que dicho mensaje se renderiza en la UI sin desloguear.
- **Resultado del build**: OK (`Application bundle generation complete`).
- **Totales de `ng test`**:
```
Test Files  15 passed (15)
     Tests  70 passed (70)
```
- **Anchos revisados y problemas visuales encontrados**: Sin cambios de UI.
- **Prueba manual**:
  - Iniciar backend y frontend (`npm start`).
  - Iniciar sesión con un usuario.
  - Ir a «Cambiar mi contraseña».
  - Ingresar una contraseña actual incorrecta y confirmar: se muestra «La contraseña actual no es correcta.» y la sesión permanece activa.
  - Ingresar los datos correctos: cambio exitoso.
- **Problemas encontrados y supuestos tomados**: Ninguno.

## Revisión
Estado: APROBADO

- Cumple: `SESSION_SAFE_401_URLS = ['/auth/login']`, la página muestra el `message` del backend, sin
  `WRONG_CURRENT_MESSAGE`; el spec responde 400.
- Toca `core/` (interceptor): Claude corrió `npx ng build` OK · `Test Files 15 passed (15)` · `Tests 70 passed (70)`.
