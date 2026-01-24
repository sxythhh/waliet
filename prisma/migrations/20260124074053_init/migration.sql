-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_CONFIRMATION', 'PAID_OUT', 'RATED', 'NO_SHOW_BUYER', 'NO_SHOW_SELLER', 'DISPUTED');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('BUYER_TO_SELLER', 'SELLER_TO_BUYER');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'PROCESSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "whopUserId" TEXT,
    "supabaseUserId" TEXT,
    "email" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "bio" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "whopCompanyId" TEXT,
    "payoutSetupComplete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hourlyRate" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "bio" VARCHAR(500),
    "tagline" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "availabilityJson" TEXT,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 24,
    "maxOutstandingHours" INTEGER,
    "totalSessionsCompleted" INTEGER NOT NULL DEFAULT 0,
    "totalHoursDelivered" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "customPlatformFeeBps" INTEGER,
    "customCommunityFeeBps" INTEGER,
    "commissionNotes" VARCHAR(500),
    "commissionUpdatedAt" TIMESTAMP(3),
    "commissionUpdatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateChange" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "previousRate" INTEGER NOT NULL,
    "newRate" INTEGER NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletBalance" (
    "id" TEXT NOT NULL,
    "holderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "balanceUnits" INTEGER NOT NULL DEFAULT 0,
    "reservedUnits" INTEGER NOT NULL DEFAULT 0,
    "avgPurchasePricePerUnit" INTEGER NOT NULL,
    "totalPaid" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "pricePerUnit" INTEGER NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "communityFee" INTEGER NOT NULL,
    "sellerReceives" INTEGER NOT NULL,
    "whopPaymentId" TEXT,
    "whopCheckoutConfigId" TEXT,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "communityId" TEXT,
    "experienceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "units" INTEGER NOT NULL,
    "topic" VARCHAR(500) NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "scheduledEndAt" TIMESTAMP(3),
    "timezone" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "actualMinutes" INTEGER,
    "status" "SessionStatus" NOT NULL DEFAULT 'REQUESTED',
    "meetingUrl" TEXT,
    "meetingProvider" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "extensionRequested" BOOLEAN NOT NULL DEFAULT false,
    "extensionUnits" INTEGER,
    "completedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "autoReleaseAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "pricePerUnit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" VARCHAR(1000),
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "reviewType" "ReviewType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "whopTransferId" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityConfig" (
    "id" TEXT NOT NULL,
    "whopCompanyId" TEXT NOT NULL,
    "communityFeeBps" INTEGER NOT NULL DEFAULT 500,
    "customPlatformFeeBps" INTEGER,
    "minSellerRating" DOUBLE PRECISION,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "totalVolume" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT,
    "sessionId" TEXT,
    "requesterId" TEXT NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "amountRequested" INTEGER NOT NULL,
    "amountApproved" INTEGER,
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionChange" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT,
    "communityConfigId" TEXT,
    "feeType" TEXT NOT NULL,
    "previousBps" INTEGER,
    "newBps" INTEGER,
    "reason" VARCHAR(500),
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerDailyStats" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "purchases" INTEGER NOT NULL DEFAULT 0,
    "sessions" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "newBuyers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerAnalytics" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "firstPurchaseAt" TIMESTAMP(3) NOT NULL,
    "lastPurchaseAt" TIMESTAMP(3) NOT NULL,
    "totalPurchases" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "lifetimeValue" INTEGER NOT NULL DEFAULT 0,
    "churnRisk" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerGoal" (
    "id" TEXT NOT NULL,
    "sellerProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 0,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_whopUserId_key" ON "User"("whopUserId");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_userId_key" ON "SellerProfile"("userId");

-- CreateIndex
CREATE INDEX "SellerProfile_isActive_idx" ON "SellerProfile"("isActive");

-- CreateIndex
CREATE INDEX "SellerProfile_hourlyRate_idx" ON "SellerProfile"("hourlyRate");

-- CreateIndex
CREATE INDEX "WalletBalance_holderId_idx" ON "WalletBalance"("holderId");

-- CreateIndex
CREATE INDEX "WalletBalance_sellerId_idx" ON "WalletBalance"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletBalance_holderId_sellerId_key" ON "WalletBalance"("holderId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_whopPaymentId_key" ON "Purchase"("whopPaymentId");

-- CreateIndex
CREATE INDEX "Purchase_buyerId_idx" ON "Purchase"("buyerId");

-- CreateIndex
CREATE INDEX "Purchase_sellerId_idx" ON "Purchase"("sellerId");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "Purchase_whopPaymentId_idx" ON "Purchase"("whopPaymentId");

-- CreateIndex
CREATE INDEX "Session_buyerId_idx" ON "Session"("buyerId");

-- CreateIndex
CREATE INDEX "Session_sellerId_idx" ON "Session"("sellerId");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_scheduledAt_idx" ON "Session"("scheduledAt");

-- CreateIndex
CREATE INDEX "Session_autoReleaseAt_idx" ON "Session"("autoReleaseAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_sessionId_key" ON "Review"("sessionId");

-- CreateIndex
CREATE INDEX "Review_subjectId_idx" ON "Review"("subjectId");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_whopTransferId_key" ON "Payout"("whopTransferId");

-- CreateIndex
CREATE INDEX "Payout_sellerId_idx" ON "Payout"("sellerId");

-- CreateIndex
CREATE INDEX "Payout_status_idx" ON "Payout"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityConfig_whopCompanyId_key" ON "CommunityConfig"("whopCompanyId");

-- CreateIndex
CREATE INDEX "RefundRequest_status_idx" ON "RefundRequest"("status");

-- CreateIndex
CREATE INDEX "CommissionChange_sellerProfileId_idx" ON "CommissionChange"("sellerProfileId");

-- CreateIndex
CREATE INDEX "CommissionChange_communityConfigId_idx" ON "CommissionChange"("communityConfigId");

-- CreateIndex
CREATE INDEX "SellerDailyStats_sellerId_date_idx" ON "SellerDailyStats"("sellerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SellerDailyStats_sellerId_date_key" ON "SellerDailyStats"("sellerId", "date");

-- CreateIndex
CREATE INDEX "BuyerAnalytics_sellerId_idx" ON "BuyerAnalytics"("sellerId");

-- CreateIndex
CREATE INDEX "BuyerAnalytics_lastPurchaseAt_idx" ON "BuyerAnalytics"("lastPurchaseAt");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerAnalytics_buyerId_sellerId_key" ON "BuyerAnalytics"("buyerId", "sellerId");

-- CreateIndex
CREATE INDEX "SellerGoal_sellerProfileId_idx" ON "SellerGoal"("sellerProfileId");

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateChange" ADD CONSTRAINT "RateChange_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletBalance" ADD CONSTRAINT "WalletBalance_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletBalance" ADD CONSTRAINT "WalletBalance_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionChange" ADD CONSTRAINT "CommissionChange_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionChange" ADD CONSTRAINT "CommissionChange_communityConfigId_fkey" FOREIGN KEY ("communityConfigId") REFERENCES "CommunityConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerGoal" ADD CONSTRAINT "SellerGoal_sellerProfileId_fkey" FOREIGN KEY ("sellerProfileId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
