-- Add attempts counter to otp_codes for brute-force lockout
ALTER TABLE "otp_codes" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
