-- no_transaction
-- ALTER TYPE ... ADD VALUE cannot run inside a PostgreSQL transaction.
-- IF NOT EXISTS keeps the migration safe across environments that may already have some values.
ALTER TYPE "EndReason" ADD VALUE IF NOT EXISTS 'NO_MOVES';
ALTER TYPE "EndReason" ADD VALUE IF NOT EXISTS 'DRAW_REPETITION';
ALTER TYPE "EndReason" ADD VALUE IF NOT EXISTS 'DRAW_30_MOVE';
ALTER TYPE "EndReason" ADD VALUE IF NOT EXISTS 'DRAW_THREE_KINGS';
ALTER TYPE "EndReason" ADD VALUE IF NOT EXISTS 'DRAW_ENDGAME';
