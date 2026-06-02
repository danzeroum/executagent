# 07 · Deploy with Docker (VPS, behind a reverse proxy)

Frontend-only container: the Studio static bundle served by nginx, talking to the
**managed Supabase** project. The image takes its config at **runtime** (no rebuild to
re-point), and exposes only port 80 on your shared proxy network — so it coexists with the
other projects on the VPS.

## What's built

- `apps/studio/Dockerfile` — multi-stage: build the Vite bundle, serve with `nginx:alpine`.
- `apps/studio/docker-entrypoint.sh` — runs before nginx; writes `/config.js` from container
  env (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). The browser reads `window.__EXECUTAGENT_CONFIG__`.
- `apps/studio/nginx.conf` — SPA fallback, immutable caching for `/assets`, no-store for
  `config.js`/`index.html`, baseline security headers (TLS/HSTS handled by your proxy).
- `docker-compose.yml` — one `studio` service on the external `proxy` network with Traefik labels.

## Quick start

```bash
cp .env.docker.example .env     # fill SUPABASE_URL, SUPABASE_ANON_KEY, STUDIO_HOST
docker network create proxy     # only if your Traefik network doesn't exist yet
docker compose up -d --build
```

Traefik discovers the container via labels and routes `https://$STUDIO_HOST` to it with TLS
from your existing certresolver. No host ports are published.

### Env (`.env`)

| Var | Meaning |
| --- | --- |
| `SUPABASE_URL` | Managed project URL (e.g. `https://<ref>.supabase.co`). |
| `SUPABASE_ANON_KEY` | Anon/publishable key (browser-safe). |
| `STUDIO_HOST` | Public hostname Traefik routes to the Studio. |
| `PROXY_NETWORK` | Name of your existing proxy network (default `proxy`). |
| `TRAEFIK_CERTRESOLVER` | Your Traefik cert resolver (default `letsencrypt`). |

## Using nginx-proxy instead of Traefik

Drop the `labels:` block and add the env the [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy)
companion expects, keeping the service on its network:

```yaml
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}
      VIRTUAL_HOST: ${STUDIO_HOST}
      VIRTUAL_PORT: "80"
      LETSENCRYPT_HOST: ${STUDIO_HOST}
```

## Notes

- **Backend stays in the cloud.** This deploys only the UI. The edge functions + DB remain on
  the Supabase project; see `supabase/` to manage them. Full self-hosting of Supabase is the
  documented heavier alternative (`docs/02-scale-vision.md`).
- **Enable anonymous sign-in** (Supabase → Auth) for the demo flow, or wire email/OAuth.
- If `SUPABASE_URL`/`SUPABASE_ANON_KEY` are unset, the entrypoint logs a warning and the UI
  runs in clearly-labeled **DEMO** mode.
- Reconfigure without rebuilding: change `.env` and `docker compose up -d` re-runs the
  entrypoint, regenerating `config.js`.
