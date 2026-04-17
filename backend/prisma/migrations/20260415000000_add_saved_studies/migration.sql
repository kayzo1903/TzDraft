-- CreateTable: saved_studies
-- Company uses PENDING rows to source puzzles and playbooks.

CREATE TABLE "saved_studies" (
    "id"           TEXT         NOT NULL,
    "user_id"      TEXT         NOT NULL,
    "name"         TEXT         NOT NULL,
    "description"  TEXT,
    "fen_history"  JSONB        NOT NULL,
    "move_history" JSONB        NOT NULL,
    "move_count"   INTEGER      NOT NULL,
    "status"       TEXT         NOT NULL DEFAULT 'PENDING',
    "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_studies_pkey" PRIMARY KEY ("id")
);

-- FK → users
ALTER TABLE "saved_studies"
    ADD CONSTRAINT "saved_studies_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "saved_studies_user_id_idx"  ON "saved_studies"("user_id");
CREATE INDEX "saved_studies_status_idx"   ON "saved_studies"("status");
