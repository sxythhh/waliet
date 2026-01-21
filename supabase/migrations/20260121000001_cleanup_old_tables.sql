-- Cleanup old marketplace tables from previous schema
DROP TABLE IF EXISTS "public"."BuyerAnalytics" CASCADE;
DROP TABLE IF EXISTS "public"."CommissionChange" CASCADE;
DROP TABLE IF EXISTS "public"."CommunityConfig" CASCADE;
DROP TABLE IF EXISTS "public"."Payout" CASCADE;
DROP TABLE IF EXISTS "public"."Purchase" CASCADE;
DROP TABLE IF EXISTS "public"."RateChange" CASCADE;
DROP TABLE IF EXISTS "public"."RefundRequest" CASCADE;
DROP TABLE IF EXISTS "public"."Review" CASCADE;
DROP TABLE IF EXISTS "public"."SellerDailyStats" CASCADE;
DROP TABLE IF EXISTS "public"."SellerGoal" CASCADE;
DROP TABLE IF EXISTS "public"."SellerProfile" CASCADE;
DROP TABLE IF EXISTS "public"."Session" CASCADE;
DROP TABLE IF EXISTS "public"."User" CASCADE;
DROP TABLE IF EXISTS "public"."WalletBalance" CASCADE;
