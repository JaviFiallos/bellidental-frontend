# 022b — Despliegue automático del frontend en el VPS

## Objetivo
Que cada push a `main` del frontend, además de publicar la imagen (022), la despliegue en el VPS. Hoy el pipeline
del backend levanta el frontend pero **no** vuelve a bajar su imagen, así que una versión nueva del frontend no
llega al servidor sin `docker compose pull frontend` a mano.
- El VPS ya está listo (backend 018e) y el compose y el `Caddyfile` viven en `/opt/bellidental` (los instala el
  backend 018a). Este repo **no** copia archivos al VPS: solo actualiza su servicio.
- Corrige además el `HEALTHCHECK`: con `localhost`, Alpine resuelve a `::1` y nginx solo escucha IPv4, así que el
  contenedor sale `unhealthy` aunque sirve bien (`Connection refused` en el log de salud).
- Flujo de ramas: se trabaja en `develop`; `deploy` corre solo con push a `main` (PR `develop` → `main`).
- Pasos manuales (environment y secretos): `../bellidental-backend/docs/DEPLOY-SETUP.md` §4.3.

## Archivos a tocar
```
Dockerfile                    HEALTHCHECK con 127.0.0.1
.github/workflows/
  ci-cd.yml                   job deploy nuevo
src/app/                      sin cambios
```

## Criterios de aceptación

**Dockerfile**
1. `HEALTHCHECK` igual que hoy, cambiando solo la URL: `wget -q --spider http://127.0.0.1:8080/ || exit 1`.

**`.github/workflows/ci-cd.yml`** (los jobs `test` e `image` no cambian)
2. Job `deploy`: `needs: image`, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`,
   `runs-on: ubuntu-latest`, `environment: production`, `concurrency: { group: deploy-production,
   cancel-in-progress: false }`. `permissions` heredados (`contents: read`).
3. Paso "Preparar claves SSH", idéntico al backend: escribe `VPS_SSH_KEY` en `~/.ssh/id_ed25519` (`chmod 600`) y
   `VPS_KNOWN_HOSTS` en `~/.ssh/known_hosts` con `printf '%s\n'`, pasándolos por `env:` (nunca interpolados en
   `run:`).
4. Paso "Desplegar en el VPS": `ssh "$VPS_USER@$VPS_HOST" 'bash -s' <<'REMOTE'` con `set -euo pipefail` y:
   - si no existe `/opt/bellidental/docker-compose.yml`: `echo` de aviso y `exit 0` (lo instala el backend);
   - `cd /opt/bellidental && docker compose pull frontend && docker compose up -d frontend`;
   - esperar hasta 60 s (12 × 5 s) a que el contenedor de `frontend` esté `healthy`
     (`docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q frontend)"`); si no, mostrar
     `docker compose logs --tail=80 frontend` y `exit 1`;
   - `docker image prune -f`.
5. Paso "Comprobar la aplicación": `curl -fsS "https://${{ vars.APP_DOMAIN }}/" -o /dev/null`.
6. Ningún secreto en los logs; sin `scp` ni otros servicios del compose.

## Responsive
No aplica (sin cambios de UI).

## Tests requeridos
Sin tests nuevos. Anotar en Resultado:
1. `npx ng test --watch=false` (totales) y `npx ng build` OK;
2. si Docker está disponible: `docker build -t bellidental-frontend .`, `docker run -d --name fe -p 8081:8080
   bellidental-frontend`, y tras ~10 s `docker inspect --format '{{.State.Health.Status}}' fe` = `healthy`
   (luego `docker rm -f fe`); si no, indicarlo;
3. revisión estática del `ci-cd.yml` contra los criterios 2–6.

## Prueba manual (desarrollador)
1. En el repo del frontend en GitHub: Settings → Environments → `production` (ese nombre exacto):
   secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS` (mismos valores que en el backend) y
   variable `APP_DOMAIN` = `app.bellidentalv1.site`.
2. PR `develop` → `main` y merge: `test` → `image` → `deploy` en verde.
3. En el VPS: `docker compose ps frontend` → `healthy`.

## Resultado

**Archivos modificados**
- `Dockerfile`: `HEALTHCHECK` ahora usa `http://127.0.0.1:8080/` (resto sin cambios).
- `.github/workflows/ci-cd.yml`: añadido el job `deploy` al final (jobs `test` e `image` sin cambios). Contiene:
  `needs: image`, `if` de main + push, `environment: production`, `concurrency` (`deploy-production`, sin cancelar),
  paso "Preparar claves SSH" idéntico al backend, paso "Desplegar en el VPS" (`ssh ... 'bash -s' <<'REMOTE'`, aviso y
  `exit 0` si falta `/opt/bellidental/docker-compose.yml`, `pull`/`up -d frontend`, espera de 12 × 5 s a `healthy`,
  logs y `exit 1` si no, `docker image prune -f`) y paso "Comprobar la aplicación" con `curl -fsS "https://${{ vars.APP_DOMAIN }}/"`.
- Sin `scp`, sin secretos interpolados en `run:`, `.npmrc` no tocado.

**Verificaciones**
- `npx ng build`: OK.
- `npx ng test --watch=false`:
  `Test Files  10 passed (10)`
  `Tests  48 passed (48)`
- YAML: `ci-cd.yml` parsea correctamente; jobs `test`, `image`, `deploy`; `deploy.needs` = `image`; pasos del deploy:
  "Preparar claves SSH", "Desplegar en el VPS", "Comprobar la aplicación".
- Revisión estática del `ci-cd.yml` contra criterios 2–6: cumple.
- Docker: **no verificado en local.** `docker build` falla porque falta el componente `buildx` (`BuildKit is enabled but
  the buildx component is missing or broken`). Sin buildx no se pudo probar `docker build`, `docker run` ni el
  `HEALTHCHECK` con `127.0.0.1`. Queda pendiente de comprobar en el primer run de CI (o instalando `docker-buildx`
  localmente).
- Responsive: no aplica.

**Supuestos y notas**
- Se usó `ssh ... 'bash -s'` (sin argumento del SHA, a diferencia del backend) porque el criterio 4 no pide el SHA.
- La comprobación de `healthy` solo mira el contenedor `frontend`; no se toca el backend ni el compose.
- Pasos manuales de la Prueba manual (secrets/variable del environment `production`) no se ejecutaron: son del desarrollador.

## Revisión

Estado: APROBADO

- `Dockerfile` (HEALTHCHECK con `127.0.0.1`) y job `deploy` cumplen los criterios 1–6 (revisión del diff).
- `src/app` sin cambios; `ng build` OK y `ng test`: 10 archivos, 48 tests en verde (corrida del agente).
- Sin verificar: Docker local falla por falta de `buildx`; el `HEALTHCHECK` y el despliegue se validan en el primer
  run de Actions tras el PR `develop` → `main`.
