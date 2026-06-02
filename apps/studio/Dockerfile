# syntax=docker/dockerfile:1

# ---- build stage: compile the Studio static bundle ----
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable

# Install with the workspace manifests first (better layer caching).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/providers/package.json packages/providers/
COPY apps/studio/package.json apps/studio/
RUN pnpm install --frozen-lockfile

# Copy sources and build only the Studio app.
COPY . .
RUN pnpm --filter @executagent/studio build

# ---- runtime stage: serve with nginx, config injected at startup ----
FROM nginx:1.27-alpine AS runtime
COPY apps/studio/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/studio/dist /usr/share/nginx/html
COPY apps/studio/docker-entrypoint.sh /docker-entrypoint.d/99-executagent-config.sh
RUN chmod +x /docker-entrypoint.d/99-executagent-config.sh
EXPOSE 80
# nginx:alpine runs scripts in /docker-entrypoint.d/ then starts nginx, so the
# default CMD is kept; our script writes config.js before nginx serves it.
