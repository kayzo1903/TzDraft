CREATE TYPE "AccountType" AS ENUM ('REGISTERED', 'GUEST', 'OAUTH_PENDING');

ALTER TABLE "users"
ADD COLUMN "account_type" "AccountType" NOT NULL DEFAULT 'REGISTERED';

UPDATE "users"
SET "account_type" = 'GUEST'
WHERE "phone_number" LIKE 'GUEST_%'
   OR "username" LIKE 'Guest_%';

UPDATE "users"
SET "account_type" = 'OAUTH_PENDING'
WHERE "account_type" = 'REGISTERED'
  AND "oauth_provider" IS NOT NULL
  AND "is_verified" = false;

CREATE INDEX "users_account_type_idx" ON "users"("account_type");
