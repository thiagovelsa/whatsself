-- Add first-contact configuration fields to SystemConfig
ALTER TABLE "SystemConfig"
ADD COLUMN IF NOT EXISTS "firstContactEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "firstContactMessage" TEXT;

