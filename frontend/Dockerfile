# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace manifests for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/mkaguzi-engine/package.json ./packages/mkaguzi-engine/
COPY packages/shared-client/package.json ./packages/shared-client/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/mkaguzi-engine/ ./packages/mkaguzi-engine/
COPY packages/shared-client/ ./packages/shared-client/
COPY frontend/ ./frontend/

# Build Mkaguzi engine TypeScript package first (frontend imports it via webpack alias)
WORKDIR /app/packages/mkaguzi-engine
RUN pnpm build

# Build Next.js frontend
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BETTER_AUTH_URL
ARG NEXT_PUBLIC_SANITY_PROJECT_ID
ARG NEXT_PUBLIC_SANITY_DATASET=production
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BETTER_AUTH_URL=$NEXT_PUBLIC_BETTER_AUTH_URL
ENV NEXT_PUBLIC_SANITY_PROJECT_ID=$NEXT_PUBLIC_SANITY_PROJECT_ID
ENV NEXT_PUBLIC_SANITY_DATASET=$NEXT_PUBLIC_SANITY_DATASET
RUN pnpm build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-slim AS production

RUN corepack enable

WORKDIR /app

# Workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/mkaguzi-engine/package.json ./packages/mkaguzi-engine/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Production deps only; --ignore-scripts prevents mkaguzi-engine from rebuilding
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Mkaguzi engine dist (symlinked via pnpm workspace — copy resolves it)
COPY --from=builder /app/packages/mkaguzi-engine/dist ./packages/mkaguzi-engine/dist

# Next.js build output and public assets (includes /wasm/*.js/.wasm artifacts)
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public

WORKDIR /app/frontend

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["node_modules/.bin/next", "start", "-p", "3000"]
