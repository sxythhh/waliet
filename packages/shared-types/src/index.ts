// Import Tables type for use in this file
import type { Tables } from './database';

// Re-export all types from the auto-generated database types
export type {
  Json,
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from './database';

export { Constants } from './database';

// Convenience type aliases for common table types
export type Profile = Tables<'profiles'>;
export type Campaign = Tables<'campaigns'>;
export type CampaignSubmission = Tables<'campaign_submissions'>;
export type CampaignVideo = Tables<'campaign_videos'>;
export type Brand = Tables<'brands'>;
export type Wallet = Tables<'wallets'>;
export type PaymentLedger = Tables<'payment_ledger'>;
export type BountyCampaign = Tables<'bounty_campaigns'>;
// Alias for backwards compatibility
export type BoostCampaign = Tables<'bounty_campaigns'>;
