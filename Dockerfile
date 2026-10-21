# Intezaam — one container serving the JSON API and the built web app on the same origin.
#
# Stage 1 installs every workspace dependency and builds core -> web -> server.
# Stage 2 installs the server's production dependencies only and copies the three dist folders,
# so the runtime image carries no compilers, sources, dev tooling or web-only packages.

FROM node:24-alpine AS build
WORKDIR /app

# Manifests first: the dependency layer stays cached until a package.json or the lockfile changes.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

# Sources only (not whole package folders) so a developer's local .env can never enter a layer.
COPY packages/core/tsconfig.json packages/core/
COPY packages/core/src packages/core/src
COPY apps/server/tsconfig.json apps/server/
COPY apps/server/src apps/server/src
COPY apps/web apps/web
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
# Pick up Alpine security patches released after the base image was published.
RUN apk upgrade --no-cache
ENV NODE_ENV=production \
    PORT=8080

# Every workspace manifest is copied so npm sees the same workspace set the lockfile describes;
# the install filter below, not the copy, decides what lands in the image.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
# Efficiency: only the server workspace's production tree is installed (express, helmet,
# compression, zod and a link to the core workspace it imports). React, React Router and the
# web fonts are already bundled into apps/web/dist by Vite, so the server never loads them;
# skipping them drops 11 packages and roughly halves node_modules (about 26 MB to 12 MB).
RUN npm ci --omit=dev --workspace @intezaam/server --include-workspace-root=false \
      --no-audit --no-fund \
  && npm cache clean --force

COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/apps/server/dist apps/server/dist
COPY --from=build /app/apps/web/dist apps/web/dist

USER node
EXPOSE 8080
# Docker marks the container unhealthy if /api/health stops answering; every 30 s is two requests
# a minute, far under the API limiter's 120 a minute per client. Node 24 has fetch built in.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "apps/server/dist/index.js"]
