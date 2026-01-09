export interface PublicFormSettings {
  require_discord?: boolean;
  require_phone?: boolean;
  require_social_account?: boolean;
  social_platforms?: ('tiktok' | 'instagram' | 'youtube')[];
  custom_intro_text?: string;
  success_message?: string;
}

export interface PublicBoostApplication {
  id: string;
  bounty_campaign_id: string;
  email: string;
  phone_number: string | null;
  discord_id: string | null;
  discord_username: string | null;
  social_accounts: SocialAccountEntry[];
  application_answers: Record<string, unknown> | null;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted' | 'converted';
  waitlist_position: number | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  converted_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialAccountEntry {
  platform: 'tiktok' | 'instagram' | 'youtube';
  username: string;
  account_link?: string;
  follower_count?: number;
}

export const DEFAULT_PUBLIC_FORM_SETTINGS: PublicFormSettings = {
  require_discord: false,
  require_phone: false,
  require_social_account: false,
  social_platforms: ['tiktok', 'instagram', 'youtube'],
  custom_intro_text: '',
  success_message: 'Thank you for applying! We will review your application and get back to you soon.',
};

export function parsePublicFormSettings(settings: unknown): PublicFormSettings {
  if (!settings || typeof settings !== 'object') {
    return DEFAULT_PUBLIC_FORM_SETTINGS;
  }
  return { ...DEFAULT_PUBLIC_FORM_SETTINGS, ...settings } as PublicFormSettings;
}
