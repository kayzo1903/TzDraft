-- AddColumn: invite_code to games table
ALTER TABLE "games" ADD COLUMN "invite_code" TEXT;
ALTER TABLE "games" ADD CONSTRAINT "games_invite_code_key" UNIQUE ("invite_code");
