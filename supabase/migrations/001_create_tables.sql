-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT,
  email TEXT,
  avatar TEXT,
  username TEXT,
  bio TEXT,
  "whopUserId" TEXT UNIQUE,
  "supabaseUserId" TEXT UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"(email);
CREATE INDEX IF NOT EXISTS "User_whopUserId_idx" ON "User"("whopUserId");
CREATE INDEX IF NOT EXISTS "User_supabaseUserId_idx" ON "User"("supabaseUserId");

-- Create SellerProfile table
CREATE TABLE IF NOT EXISTS "SellerProfile" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT UNIQUE NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "hourlyRate" INTEGER DEFAULT 0,
  bio TEXT,
  tagline TEXT,
  timezone TEXT,
  "averageRating" FLOAT,
  "totalSessionsCompleted" INTEGER DEFAULT 0,
  "totalHoursDelivered" FLOAT DEFAULT 0,
  "totalReviews" INTEGER DEFAULT 0,
  "isVerified" BOOLEAN DEFAULT FALSE,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create WalletBalance table
CREATE TABLE IF NOT EXISTS "WalletBalance" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "holderId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "sellerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "balanceUnits" INTEGER DEFAULT 0,
  "reservedUnits" INTEGER DEFAULT 0,
  "totalPaid" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("holderId", "sellerId")
);

-- Create Purchase table
CREATE TABLE IF NOT EXISTS "Purchase" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "buyerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  units INTEGER NOT NULL,
  status TEXT DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Session table
CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "buyerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "sellerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING',
  duration INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP WITH TIME ZONE,
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Review table
CREATE TABLE IF NOT EXISTS "Review" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "authorId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Payout table
CREATE TABLE IF NOT EXISTS "Payout" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sellerId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SellerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WalletBalance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payout" ENABLE ROW LEVEL SECURITY;

-- Create policies for public read (adjust as needed)
CREATE POLICY "Allow public read" ON "User" FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON "SellerProfile" FOR SELECT USING (true);

-- Create policies for service role full access
CREATE POLICY "Service role full access" ON "User" FOR ALL USING (true);
CREATE POLICY "Service role full access" ON "SellerProfile" FOR ALL USING (true);
CREATE POLICY "Service role full access" ON "WalletBalance" FOR ALL USING (true);
CREATE POLICY "Service role full access" ON "Purchase" FOR ALL USING (true);
CREATE POLICY "Service role full access" ON "Session" FOR ALL USING (true);
CREATE POLICY "Service role full access" ON "Review" FOR ALL USING (true);
CREATE POLICY "Service role full access" ON "Payout" FOR ALL USING (true);
