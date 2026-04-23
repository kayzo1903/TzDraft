# Stage 0: Mkaguzi Linux build
FROM ubuntu:24.04 AS mkaguzi-builder

RUN for i in 1 2 3; do apt-get update --fix-missing && break || sleep 10; done && \
    apt-get install -y --no-install-recommends cmake g++ make && \
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

# Copy the entire workspace to ensure all dependencies and links are present
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build shared-client first so its types/output are available to backend
RUN pnpm --filter @tzdraft/shared-client build

WORKDIR /app/backend
RUN pnpm build

# Stage 2: Production
FROM node:22-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

# Copy the entire workspace
COPY . .

# Install production dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

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

CMD ["sh", "-c", "\
  echo '>>> Running prisma migrate deploy...' && \
  node_modules/.bin/prisma migrate deploy; \
  PRISMA_EXIT=$?; \
  echo \">>> prisma migrate deploy exited with code: $PRISMA_EXIT\"; \
  if [ \"$PRISMA_EXIT\" != \"0\" ]; then exit $PRISMA_EXIT; fi; \
  echo '>>> Starting node dist/src/main...'; \
  node dist/src/main; \
  NODE_EXIT=$?; \
  echo \">>> node dist/src/main exited with code: $NODE_EXIT (137=OOM 139=SIGSEGV 1=AppError)\"; \
  exit $NODE_EXIT \
"]
