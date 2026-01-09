// Re-export all types from the shared package
// This file maintains backwards compatibility with existing imports
export type {
  Json,
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
  // Convenience types
  Profile,
  Campaign,
  CampaignSubmission,
  CampaignVideo,
  Brand,
  Wallet,
  PaymentLedger,
  BoostCampaign,
} from '@virality/shared-types';

export { Constants } from '@virality/shared-types';
