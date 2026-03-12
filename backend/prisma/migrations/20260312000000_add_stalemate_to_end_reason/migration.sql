-- no_transaction
-- ALTER TYPE ... ADD VALUE cannot run inside a PostgreSQL transaction.
-- The "-- no_transaction" directive tells Prisma to skip the BEGIN/COMMIT wrapper.
-- IF NOT EXISTS makes this idempotent (safe to re-run).
ALTER TYPE "EndReason" ADD VALUE IF NOT EXISTS 'STALEMATE';
