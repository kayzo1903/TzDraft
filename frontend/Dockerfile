# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace manifests for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/cake-engine/package.json ./packages/cake-engine/
COPY packages/shared-client/package.json ./packages/shared-client/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/cake-engine/ ./packages/cake-engine/
COPY packages/shared-client/ ./packages/shared-client/
COPY frontend/ ./frontend/

# Build shared CAKE engine first (frontend imports it via webpack alias)
WORKDIR /app/packages/cake-engine
RUN pnpm build

# Build Next.js frontend
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
RUN pnpm build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-slim AS production

RUN corepack enable

WORKDIR /app

# Workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/cake-engine/package.json ./packages/cake-engine/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Production deps only; --ignore-scripts prevents cake-engine from rebuilding
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# CAKE engine dist (symlinked via pnpm workspace — copy resolves it)
COPY --from=builder /app/packages/cake-engine/dist ./packages/cake-engine/dist

# Next.js build output and public assets
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public

WORKDIR /app/frontend

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["node_modules/.bin/next", "start", "-p", "3000"]
