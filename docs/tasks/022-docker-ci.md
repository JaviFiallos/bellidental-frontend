# 022 — Imagen Docker del frontend y CI/CD

## Objetivo
Construir el frontend como imagen Docker servida por nginx y publicarla en GHCR al integrar en `main`, para que
el compose de producción del backend (backend 018a) la use en el VPS de Contabo.
- **Flujo de ramas:** `main` está protegida (no se hace push directo). Esta tarea se commitea y se sube a
  `feat/auth`; el usuario hace el merge a `main` (PR), actualiza `main` local y crea `develop`, que será la rama
  destino de los push de ahí en adelante. `develop` solo ejecuta `test`; la imagen se publica solo cuando el cambio
  llega a `main`. Igual que el backend.
- **Sin job `deploy`** en esta tarea: el despliegue automático por SSH queda para una tarea posterior (022b) cuando
  el VPS y los secretos estén listos. Mientras tanto se despliega a mano en el VPS con
  `docker compose pull frontend && docker compose up -d frontend`.
- **Docker no está instalado en la máquina de desarrollo:** `docker build` y la prueba del contenedor se verifican
  en GitHub Actions, no en local.
- La imagen solo sirve archivos estáticos. `/api` **no** pasa por nginx: Caddy lo enruta directo al backend.
- Pasos manuales (VPS, secretos de GitHub): `../bellidental-backend/docs/DEPLOY-SETUP.md`.

## Archivos a tocar
```
Dockerfile                    (nuevo)
.dockerignore                 (nuevo)
nginx/
  default.conf                (nuevo)
.github/workflows/
  ci-cd.yml                   (nuevo)
src/app/                      sin cambios
```

## Criterios de aceptación

**Dockerfile** (multi-stage)
1. Etapa `build`: `node:24-alpine`. Copiar `package.json` y `package-lock.json`, `npm ci`
   (`RUN --mount=type=cache,target=/root/.npm`), copiar el resto y `npx ng build` (configuración `production`,
   la de por defecto).
2. Etapa final: `nginxinc/nginx-unprivileged:1.28-alpine` (no root, escucha en 8080). Copiar
   `dist/bellidental-frontend/browser/` a `/usr/share/nginx/html/` y `nginx/default.conf` a
   `/etc/nginx/conf.d/default.conf`.
3. `EXPOSE 8080`. `HEALTHCHECK` con `wget -q --spider http://localhost:8080/ || exit 1`.
4. La imagen final pesa menos de 60 MB.
5. `.dockerignore`: `node_modules/`, `dist/`, `.angular/`, `.git/`, `docs/`, `.claude/`, `.gemini/`, `.agents/`,
   `.impeccable/`, `.vscode/`, `*.md`, `*.txt`.

**`nginx/default.conf`**
6. `listen 8080;`, `server_tokens off;`, `root /usr/share/nginx/html;`.
7. Rutas de Angular: `location / { try_files $uri $uri/ /index.html; }`.
8. `index.html` sin caché: `Cache-Control "no-cache"`. Archivos con hash (`*.js`, `*.css`, `*.woff2`, `media/`):
   `Cache-Control "public, max-age=31536000, immutable"`.
9. Sin `gzip` (lo hace Caddy) y sin `proxy_pass` a `/api`.

**`.github/workflows/ci-cd.yml`**
10. Disparadores: `pull_request` y `push` a `main` y `develop` (`branches: [main, develop]`, como el backend).
    `permissions` mínimos (`contents: read`; `packages: write`
    solo en `image`).
11. Job `test` (en todo disparador: PR, `develop` y `main`): `actions/checkout`, `actions/setup-node` (Node 24, `cache: npm`), `npm ci`,
    `npx ng test --watch=false`, `npx ng build`.
12. Job `image` (solo `push` a `main`: `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`,
    `needs: test`): igual que el backend 018a: `docker/setup-buildx-action`,
    `docker/login-action` a `ghcr.io` con `GITHUB_TOKEN`, `docker/metadata-action` (`latest` y
    `type=sha,prefix=sha-`), `docker/build-push-action` con caché `type=gha`, `linux/amd64`. Imagen:
    `ghcr.io/javifiallos/bellidental-frontend`.
13. Ningún secreto en los logs. Sin job `deploy` ni uso de `VPS_*` (tarea 022b).

## Responsive
No aplica (sin cambios de UI).

## Tests requeridos
Sin tests. Docker no existe en la máquina local, así que el agente **no** corre `docker build` ni `docker run`.
Anota en Resultado:
1. `npx ng build` OK (es lo que copia el Dockerfile) y la ruta exacta de salida (`dist/bellidental-frontend/browser/`,
   confirmar que existe `index.html`);
2. revisión estática del `Dockerfile`, `nginx/default.conf` y `ci-cd.yml` contra los criterios;
3. `actionlint` sobre `ci-cd.yml` solo si está disponible (no lo está en esta máquina).

La verificación de la imagen la hace GitHub Actions en el PR: el job `image` construye de verdad en `main`.
Si falla, se corrige en una 022a con el log de Actions.

## Prueba manual
1. Abrir el PR `feat/auth` → `main`: corre solo el job `test` y debe quedar en verde.
2. Tras el merge a `main`: el job `image` en verde y el paquete `ghcr.io/javifiallos/bellidental-frontend` con las
   etiquetas `latest` y `sha-<hash>`.
3. (Opcional, con Docker en otra máquina) `docker run --rm -p 8081:8080 ghcr.io/javifiallos/bellidental-frontend` →
   `/` con `Cache-Control: no-cache`, una ruta interna da 200, un `.js` es `immutable`.

## Resultado

**Archivos:**
- `Dockerfile`, `.dockerignore`, `nginx/default.conf`: ya existían sin seguimiento en git; revisados contra los criterios 1–5 y 6–9 y se mantienen sin cambios.
- `.github/workflows/ci-cd.yml`: reescrito. Venía copiado del backend (job Maven, imagen `bellidental-backend` y job `deploy` con SSH). Ahora: job `test` con Node 24 (`setup-node` + `cache: npm`, `npm ci`, `npx ng test --watch=false`, `npx ng build`); job `image` con `needs: test`, `packages: write` solo ahí y la imagen `ghcr.io/javifiallos/bellidental-frontend` (`latest` y `sha-`), caché `gha`, `linux/amd64`. Sin job `deploy` ni `VPS_*`.
- `src/app`: sin cambios.

**Build:** `npx ng build` OK. Salida en `dist/bellidental-frontend/browser/` (1,8 MB), existe `index.html`. Aviso no bloqueante: `sidebar.component.scss` supera el presupuesto de 4 kB en 22 bytes (ya existía; no toca esta tarea).

**Tests:** la tarea no pide tests; se corrió `npx ng test --watch=false` una vez por GEMINI.md. Totales de la consola:
`Test Files 10 passed (10)` · `Tests 48 passed (48)`.

**Revisión estática (criterios):**
- Dockerfile: multi-stage `node:24-alpine` → `nginxinc/nginx-unprivileged:1.28-alpine`; `npm ci` con caché; copia a `/usr/share/nginx/html/`; `EXPOSE 8080`; `HEALTHCHECK` con wget. OK.
- nginx: `listen 8080`, `server_tokens off`, `root`, `try_files`, `index.html` `no-cache`, `.css/.js/.woff2` y `/media/` inmutables, sin gzip ni `/api`. OK.
- .dockerignore: incluye todos los exclusiones pedidas. OK.
- ci-cd.yml: YAML válido (verificado con PyYAML: jobs `test` e `image`, `image.needs = test`). Disparadores y permisos según criterio 10.
- actionlint: no disponible en la máquina.

**Sin verificar localmente:** `docker build` y el contenedor (Docker no instalado). Lo valida el job `image` en Actions tras el merge a `main`.

**Supuestos:** no se tocó `docs/`, ni el `ci-cd.yml` del backend. No se hizo commit, push ni cambio de rama.

## Revisión

Estado: APROBADO

- Dockerfile, `.dockerignore`, `nginx/default.conf` y `ci-cd.yml` cumplen los criterios 1–13 (revisión estática).
- `ng build` OK y `ng test`: 10 archivos, 48 tests pasan (corrida propia).
- Pendiente de validar en GitHub Actions (no hay Docker local): el job `image` tras el merge a `main` y el tamaño
  de la imagen (< 60 MB). Si falla, tarea 022a con el log.
