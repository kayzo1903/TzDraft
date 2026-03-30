-- Bind OTP records to their intended auth flow.
ALTER TABLE "otp_codes" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'signup';

CREATE INDEX "otp_codes_phone_number_purpose_idx"
ON "otp_codes"("phone_number", "purpose");
