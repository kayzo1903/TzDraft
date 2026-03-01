-- Allow white_player_id to be NULL so the creator can choose the BLACK side
-- (previously only blackPlayerId was nullable, forcing creator into the white slot)
ALTER TABLE "games" ALTER COLUMN "white_player_id" DROP NOT NULL;
