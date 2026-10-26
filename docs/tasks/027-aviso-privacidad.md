# 027 — Aviso de privacidad público (RF10, requisito de Meta)

## Objetivo
Publicar el aviso de privacidad en `https://app.bellidentalv1.site/privacidad`, sin login, para registrarlo en Meta
(*App settings → Basic → URL de la política de privacidad* y *URL de eliminación de datos*) y poder publicar la app
de WhatsApp. Es el texto largo del aviso que el bot resume al pedir el consentimiento
(`bellidental-agent/app/messages/texts.py`, `CONSENT_NOTICE`).
- Página **estática** (HTML + CSS en línea), servida por nginx desde `public/`: no pasa por Angular, ni guards ni
  rutas. Sin recursos de terceros (fuentes del sistema, sin CDN), como el resto de la app.
- nginx sirve la URL sin extensión (`/privacidad`) además de `/privacidad.html`.

## Archivos a tocar
```
public/
  privacidad.html          nuevo: aviso completo, autocontenido
nginx/
  default.conf             try_files $uri $uri.html $uri/ /index.html;
src/app/                   sin cambios
```

## Criterios de aceptación
1. `GET /privacidad` y `GET /privacidad.html` devuelven la página (200) sin sesión; las rutas de Angular
   (`/pacientes`, `/auth/login`) siguen funcionando igual.
2. `lang="es"`, `<title>Aviso de privacidad — Bellidental</title>`, `meta viewport`, fuente del sistema, colores de
   `src/app/shared/styles/_tokens.scss` copiados como valores en el `<style>` (no se importa el SCSS). Logo de
   `public/brand/` si existe uno apto; si no, solo texto.
3. Contenido, en este orden y en español claro (LOPDP Ecuador):
   1. **Responsable**: clínica odontológica Bellidental. Sistema en etapa piloto (proyecto de titulación, UTA).
      Contacto: `bellidental.piloto@gmail.com` (enlace `mailto:`).
   2. **Datos que tratamos**: por el bot de WhatsApp, número de teléfono, nombre y datos de citas (fecha, hora,
      especialidad, estado), y el texto de los mensajes para interpretarlos. En la clínica, la historia clínica
      (Formulario 033) y los cobros, que solo ve el personal autorizado.
   3. **Para qué**: agendar, reprogramar y cancelar citas; enviar recordatorios; atención y registro clínico.
   4. **Base legal**: consentimiento que el paciente acepta en el chat antes de cualquier gestión; la historia
      clínica, por la obligación sanitaria de llevarla.
   5. **Encargados (terceros que tratan datos por cuenta de la clínica)**: Meta Platforms (WhatsApp Business
      Cloud API, transporte de mensajes); Contabo GmbH (servidor donde se alojan los datos); Groq Inc. (modelo de
      IA que interpreta el texto de los mensajes; no recibe historia clínica). Nota de que pueden procesar datos
      fuera de Ecuador.
   6. **Conservación**: datos de citas y consentimiento mientras el paciente sea atendido en la clínica; la
      historia clínica, por el plazo que exige la normativa sanitaria; los datos clínicos y cobros no se borran,
      se anulan.
   7. **Derechos y eliminación de datos** (sección con `id="eliminacion"`): acceso, rectificación, eliminación,
      oposición y retiro del consentimiento; cómo pedirlo: en recepción de la clínica o por el correo de contacto;
      plazo de respuesta de 15 días. Escribir "No acepto" en el chat detiene el uso del bot.
   8. **Seguridad**: acceso con usuario y contraseña por perfil, conexión cifrada (HTTPS), registro de auditoría.
   9. **Fecha de última actualización**: 2026-10-25.
4. Responsive: legible sin scroll horizontal en 360 px; ancho máximo de lectura ~720 px centrado.
5. `npx ng build` sin errores; `dist/` incluye `privacidad.html`.

## Responsive
Revisar a 360 px, 768 px y 1280 px.

## Tests requeridos
Sin tests (página estática fuera de Angular). Verificar con `npx ng build` y la prueba manual.

## Prueba manual
1. `docker build -t bellidental-frontend:local . && docker run --rm -p 8081:8080 bellidental-frontend:local`.
2. Abrir `http://localhost:8081/privacidad` y `/privacidad.html` sin sesión: se ve el aviso.
3. Abrir `http://localhost:8081/auth/login`: carga el login como antes.
4. Ver la página a 360 px (DevTools): sin scroll horizontal.
5. Tras el despliegue: `https://app.bellidentalv1.site/privacidad` responde y esa URL se pone en Meta en los dos
   campos (privacidad y eliminación de datos: `.../privacidad#eliminacion`).

## Resultado
- **Qué se hizo**:
  - `public/privacidad.html`: Creada la página estática autocontenida de aviso de privacidad para cumplir con los requisitos de la LOPDP (Ecuador) y de Meta para la publicación del bot de WhatsApp. Se incluyeron los 9 apartados en el orden especificado, incluyendo la sección de derechos y eliminación de datos con `id="eliminacion"`, canal de contacto `bellidental.piloto@gmail.com`, valores de diseño tomados de `src/app/shared/styles/_tokens.scss` (sin recursos externos ni CDNs) y el logo de la clínica desde `/brand/bellidental-logo.webp`.
  - `nginx/default.conf`: Actualizada la directiva `try_files` a `try_files $uri $uri.html $uri/ /index.html;` para servir `/privacidad` mediante `/privacidad.html` sin extensión y mantener el routing de Angular para las rutas de la aplicación.
- **Resultado del build**: OK. `npx ng build` generó correctamente el bundle de la aplicación e incluyó `dist/bellidental-frontend/browser/privacidad.html`.
- **Resultado de tests** (`npx ng test --watch=false`):
```
 Test Files  18 passed (18)
      Tests  82 passed (82)
```
- **Responsive**:
  - `360 px`: Verificado en navegador. No presenta scroll horizontal (`scrollWidth <= clientWidth`). La cabecera con el logo, textos, bloques informativos y la sección `#eliminacion` se adaptan adecuadamente.
  - `768 px`: Contenedor centrado, tipografía legible y espaciado proporcional.
  - `1280 px`: Lectura centrada con ancho máximo de ~720 px (`max-width: 720px; margin: 0 auto;`).
- **Prueba manual**:
  - Ejecutar `docker build -t bellidental-frontend:local . && docker run --rm -p 8081:8080 bellidental-frontend:local`.
  - Probar `http://localhost:8081/privacidad` y `http://localhost:8081/privacidad.html` sin autenticación.
  - Probar `http://localhost:8081/auth/login` para corroborar que la aplicación Angular sigue operando con normalidad.
- **Problemas encontrados y supuestos**:
  - Se utilizó ruta absoluta `/brand/bellidental-logo.webp` para que el recurso sea localizado independientemente de si se accede con o sin `.html`.

## Revisión
Estado: APROBADO

- Los 9 apartados en orden; `id="eliminacion"`, `mailto:`, plazo de 15 días, "No acepto", nota de transferencia
  fuera de Ecuador y Groq sin historia clínica: presentes.
- Sin recursos externos (fuente del sistema, logo local `/brand/bellidental-logo.webp`); `max-width: 720px`.
- nginx: solo cambia `try_files` (`$uri.html` antes del fallback a `index.html`); las rutas de Angular no se ven
  afectadas porque no existen `.html` con esos nombres.
- Pendiente del usuario: prueba con Docker y, tras desplegar, registrar en Meta `/privacidad` y
  `/privacidad#eliminacion`.
