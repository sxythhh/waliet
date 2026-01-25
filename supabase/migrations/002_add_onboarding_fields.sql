-- Add onboarding fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT FALSE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralSource" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "monthlyBudget" TEXT;

-- Create index for account type queries
CREATE INDEX IF NOT EXISTS "User_accountType_idx" ON "User"("accountType");
CREATE INDEX IF NOT EXISTS "User_onboardingCompleted_idx" ON "User"("onboardingCompleted");
