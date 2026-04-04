-- CreateEnum
CREATE TYPE "PrizeCurrency" AS ENUM ('TSH', 'USD');

-- AlterTable: add hidden flag to tournaments
ALTER TABLE "tournaments" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: prize pool per tournament
CREATE TABLE "tournament_prizes" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "placement" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "PrizeCurrency" NOT NULL DEFAULT 'TSH',
    "label" TEXT,

    CONSTRAINT "tournament_prizes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_prizes_tournament_id_placement_key" ON "tournament_prizes"("tournament_id", "placement");

-- AddForeignKey
ALTER TABLE "tournament_prizes" ADD CONSTRAINT "tournament_prizes_tournament_id_fkey"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
