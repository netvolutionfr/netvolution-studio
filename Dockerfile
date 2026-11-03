# syntax=docker/dockerfile:1
# Netvolution Studio (ADR-0015): compiled application + API on one port, behind a reverse proxy
# providing HTTPS and access protection. Persistent data in the /data volume.

# 1. Build of the application (development dependencies included)
# Node 26 LTS (active), version and checksum pinned; Dependabot proposes the patches.
FROM node:26.13.0-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
COPY apps/studio/package.json apps/studio/
COPY apps/guide/package.json apps/guide/
COPY packages/core/package.json packages/core/
COPY packages/components/package.json packages/components/
COPY packages/export-astro/package.json packages/export-astro/
COPY tests/e2e/package.json tests/e2e/
COPY tests/fidelity/package.json tests/fidelity/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build -w @ns/studio

# 2. Runtime dependencies only, then the sources run by Node (native TypeScript)
FROM node:26.13.0-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS runtime-deps
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/apps/studio/package.json apps/studio/
COPY --from=build /app/apps/guide/package.json apps/guide/
COPY --from=build /app/packages/core/package.json packages/core/
COPY --from=build /app/packages/components/package.json packages/components/
COPY --from=build /app/packages/export-astro/package.json packages/export-astro/
COPY --from=build /app/tests/e2e/package.json tests/e2e/
COPY --from=build /app/tests/fidelity/package.json tests/fidelity/
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY packages packages
COPY templates templates
COPY fonts/catalog.json fonts/
COPY fonts/files fonts/files
COPY apps/studio/server.ts apps/studio/
COPY apps/studio/dev-server apps/studio/dev-server
COPY --from=build /app/apps/studio/dist apps/studio/dist

# 3. Final image: unprivileged user; npm and tar serve the export (Astro build, archive)
FROM node:26.13.0-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94
# The day's Alpine security patches, on every build.
RUN apk upgrade --no-cache && apk add --no-cache tar && mkdir /data && chown node:node /data
WORKDIR /app
COPY --from=runtime-deps /app ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 NS_DATA_DIR=/data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
CMD ["node", "apps/studio/server.ts"]
