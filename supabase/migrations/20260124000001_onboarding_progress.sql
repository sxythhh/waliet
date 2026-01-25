-- Create user onboarding progress table
CREATE TABLE IF NOT EXISTS "OnboardingProgress" (
  "userId" TEXT PRIMARY KEY REFERENCES "User"(id) ON DELETE CASCADE,
  "completedTasks" TEXT[] DEFAULT '{}',
  "lastUpdated" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE "OnboardingProgress" ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role
CREATE POLICY "Service role full access" ON "OnboardingProgress" FOR ALL USING (true);
