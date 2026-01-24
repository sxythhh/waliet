// Re-export clients
export { createClient as createBrowserClient } from "./client";
export { createClient as createServerClient } from "./server";

// Re-export types
export type { Database, Tables, TablesInsert, TablesUpdate, Enums, Json } from "./database.types";
import type { Tables, Enums } from "./database.types";

// Convenience type aliases
export type User = Tables<"User">;
export type SellerProfile = Tables<"SellerProfile">;
export type WalletBalance = Tables<"WalletBalance">;
export type Purchase = Tables<"Purchase">;
export type Session = Tables<"Session">;
export type Review = Tables<"Review">;
export type Payout = Tables<"Payout">;
export type SellerDailyStats = Tables<"SellerDailyStats">;
export type SellerGoal = Tables<"SellerGoal">;
export type BuyerAnalytics = Tables<"BuyerAnalytics">;
export type CommunityConfig = Tables<"CommunityConfig">;
export type RefundRequest = Tables<"RefundRequest">;
export type RateChange = Tables<"RateChange">;
export type CommissionChange = Tables<"CommissionChange">;

// Enum types
export type SessionStatus = Enums<"SessionStatus">;
export type PurchaseStatus = Enums<"PurchaseStatus">;
export type PayoutStatus = Enums<"PayoutStatus">;
export type RefundStatus = Enums<"RefundStatus">;
export type ReviewType = Enums<"ReviewType">;
