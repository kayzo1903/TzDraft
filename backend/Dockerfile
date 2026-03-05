# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/cake-engine/package.json ./packages/cake-engine/
COPY backend/package.json ./backend/
# frontend/package.json must exist so pnpm can wire the full workspace
COPY frontend/package.json ./frontend/

# Install all deps (devDeps needed for build tools: tsc, prisma CLI, etc.)
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/cake-engine/ ./packages/cake-engine/
COPY backend/ ./backend/

# Build shared CAKE engine first (backend imports it)
WORKDIR /app/packages/cake-engine
RUN pnpm build

# Build backend: merge schemas → prisma generate → tsc
WORKDIR /app/backend
RUN pnpm build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

# Workspace manifests for dep resolution
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/cake-engine/package.json ./packages/cake-engine/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all deps including devDeps (prisma CLI needed for migrate deploy)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy compiled backend
COPY --from=builder /app/backend/dist ./backend/dist

# Copy compiled CAKE engine (backend requires it at runtime)
COPY --from=builder /app/packages/cake-engine/dist ./packages/cake-engine/dist

# Copy Prisma generated client (binary must match OS — both stages use node:22-slim)
COPY --from=builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma/client ./backend/node_modules/@prisma/client

# Prisma schema files (needed by migrate deploy)
COPY --from=builder /app/backend/prisma ./backend/prisma

# Sidra CLI — NOTE: sidra-cli.exe is a Windows binary and will NOT run in Linux
# containers. AI vs Sidra opponents will be unavailable until a Linux build is
# compiled from engines/sidra/. CAKE-based games are unaffected.
COPY engines/ ./engines/

WORKDIR /app/backend

EXPOSE 3002

# Run migrations then start server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main"]
