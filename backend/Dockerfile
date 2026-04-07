# Stage 0: Mkaguzi Linux build
FROM ubuntu:24.04 AS mkaguzi-builder

RUN apt-get update && apt-get install -y --no-install-recommends cmake g++ make && \
    rm -rf /var/lib/apt/lists/*

COPY engines/core/ /mkaguzi/

WORKDIR /mkaguzi
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --config Release

# Stage 1: Backend builder
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

# Copy workspace manifests first for better layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install only backend deps (including devDependencies used by build tools).
RUN pnpm install --filter backend... --frozen-lockfile

# Copy backend source and build it.
COPY backend/ ./backend/

WORKDIR /app/backend
RUN pnpm build

# Stage 2: Production
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

# Workspace manifests for dependency resolution.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json ./backend/

# Install backend deps including devDependencies (prisma CLI is needed at startup).
RUN pnpm install --filter backend... --frozen-lockfile --ignore-scripts

# Copy compiled backend output.
COPY --from=builder /app/backend/dist ./backend/dist

# Prisma schema files are needed by migrate deploy and prisma generate.
COPY --from=builder /app/backend/prisma ./backend/prisma

# Generate Prisma client in this stage to avoid virtual-store path issues.
RUN cd /app/backend && pnpm exec prisma generate

# Copy the Mkaguzi native binary to the path the adapter probes by default.
RUN mkdir -p ./engines/core/build/Release
COPY --from=mkaguzi-builder /mkaguzi/build/mkaguzi ./engines/core/build/Release/mkaguzi

WORKDIR /app/backend

EXPOSE 3002

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/src/main"]
