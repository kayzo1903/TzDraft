# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:22-slim AS builder

RUN corepack enable

WORKDIR /app

# Copy workspace manifests for layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/mkaguzi-engine/package.json ./packages/mkaguzi-engine/
COPY packages/shared-client/package.json ./packages/shared-client/
COPY packages/translations/package.json ./packages/translations/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY apps/mobile/package.json ./apps/mobile/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/mkaguzi-engine/ ./packages/mkaguzi-engine/
COPY packages/shared-client/ ./packages/shared-client/
COPY packages/translations/ ./packages/translations/
COPY frontend/ ./frontend/

# Build shared-client first so its dist/ is available to the frontend
WORKDIR /app/packages/shared-client
RUN pnpm build

# Build Mkaguzi engine TypeScript package (frontend imports it via webpack alias)
WORKDIR /app/packages/mkaguzi-engine
RUN pnpm build

# Copy WASM artifacts into public/ so Next.js can serve them as static assets.
# Done here instead of via the prebuild npm hook to avoid re-running the engine
# build inside Docker and to give us an explicit, cacheable layer.
RUN mkdir -p /app/frontend/public/wasm && \
    cp -r /app/packages/mkaguzi-engine/wasm/. /app/frontend/public/wasm/

# Build Next.js frontend
# PNPM_IGNORE_SCRIPTS skips the `prebuild` hook (which would redundantly rebuild
# the engine and re-copy WASM — both already done above).
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
RUN pnpm exec next build

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-slim AS production

RUN corepack enable

WORKDIR /app

# Workspace manifests
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/mkaguzi-engine/package.json ./packages/mkaguzi-engine/
COPY packages/shared-client/package.json ./packages/shared-client/
COPY packages/translations/package.json ./packages/translations/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY apps/mobile/package.json ./apps/mobile/

# Production deps only; --ignore-scripts prevents mkaguzi-engine from rebuilding
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Package dist outputs (symlinked via pnpm workspace — copy resolves them)
COPY --from=builder /app/packages/shared-client/dist ./packages/shared-client/dist
COPY --from=builder /app/packages/mkaguzi-engine/dist ./packages/mkaguzi-engine/dist

# Next.js build output and public assets (includes /wasm/*.js/.wasm artifacts)
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public

WORKDIR /app/frontend

EXPOSE 3000

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["node_modules/.bin/next", "start", "-p", "3000"]
