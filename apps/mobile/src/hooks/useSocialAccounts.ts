import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageSourcePropType } from 'react-native';
import { supabase } from '../lib/supabase';
import { config } from '../config';
import { useAuth } from '../contexts/AuthContext';

// Platform logo images
const tiktokLogoWhite = require('../assets/tiktok-logo-white.png');
const tiktokLogoBlack = require('../assets/tiktok-logo-black-new.png');
const instagramLogoWhite = require('../assets/instagram-logo-white.png');
const instagramLogoBlack = require('../assets/instagram-logo-black.png');
const youtubeLogoWhite = require('../assets/youtube-logo-white.png');
const youtubeLogoBlack = require('../assets/youtube-logo-black-new.png');
const discordLogo = require('../assets/discord-logo.png');
const xLogo = require('../assets/x-logo.png');
const xLogoLight = require('../assets/x-logo-light.png');

export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'twitter' | 'discord';

export interface SocialAccount {
  id: string;
  platform: Platform;
  username: string;
  avatarUrl: string | null;
  followerCount: number | null;
  isVerified: boolean;
  source: 'social_accounts' | 'profile';
}

interface ProfileSocialData {
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar: string | null;
  twitter_id: string | null;
  twitter_username: string | null;
  twitter_avatar: string | null;
}

interface SocialAccountRow {
  id: string;
  platform: string;
  username: string;
  avatar_url: string | null;
  follower_count: number | null;
  is_verified: boolean;
}

interface VerifyBioResult {
  success: boolean;
  verified?: boolean;
  error?: string;
  bio?: string;
  user?: {
    nickname: string;
    avatar: string | null;
    followerCount: number;
    isVerified: boolean;
  };
}

// Fetch all connected social accounts
export function useConnectedAccounts() {
  const { user, session } = useAuth();

  return useQuery({
    queryKey: ['connected-accounts', user?.id],
    queryFn: async (): Promise<SocialAccount[]> => {
      if (!user?.id) return [];

      const accounts: SocialAccount[] = [];

      // Fetch from social_accounts table (TikTok, Instagram, YouTube)
      const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('id, platform, username, avatar_url, follower_count, is_verified')
        .eq('user_id', user.id);

      if (socialAccounts) {
        for (const account of socialAccounts as SocialAccountRow[]) {
          accounts.push({
            id: account.id,
            platform: account.platform as Platform,
            username: account.username,
            avatarUrl: account.avatar_url,
            followerCount: account.follower_count,
            isVerified: account.is_verified,
            source: 'social_accounts',
          });
        }
      }

      // Fetch Discord and Twitter from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('discord_id, discord_username, discord_avatar, twitter_id, twitter_username, twitter_avatar')
        .eq('id', user.id)
        .single();

      if (profile) {
        const p = profile as ProfileSocialData;

        if (p.discord_id && p.discord_username) {
          accounts.push({
            id: `discord-${p.discord_id}`,
            platform: 'discord',
            username: p.discord_username,
            avatarUrl: p.discord_avatar,
            followerCount: null,
            isVerified: true,
            source: 'profile',
          });
        }

        if (p.twitter_id && p.twitter_username) {
          accounts.push({
            id: `twitter-${p.twitter_id}`,
            platform: 'twitter',
            username: p.twitter_username,
            avatarUrl: p.twitter_avatar,
            followerCount: null,
            isVerified: true,
            source: 'profile',
          });
        }
      }

      return accounts;
    },
    enabled: !!user?.id,
  });
}

// Verify bio and connect account for TikTok/Instagram/YouTube
export function useConnectSocialAccount() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      platform,
      username,
      verificationCode,
    }: {
      platform: Platform;
      username: string;
      verificationCode: string;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id || !session?.access_token) {
        return { success: false, error: 'Not authenticated' };
      }

      // Call verify-social-bio edge function
      const response = await fetch(
        `${config.supabase.url}/functions/v1/verify-social-bio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            username,
            verificationCode,
            platform,
          }),
        }
      );

      const result: VerifyBioResult = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Verification failed' };
      }

      if (!result.verified) {
        return { success: false, error: 'Verification code not found in bio. Make sure you added it and saved your profile.' };
      }

      // Insert into social_accounts table
      const { error: insertError } = await supabase
        .from('social_accounts')
        .insert({
          user_id: user.id,
          platform,
          username,
          avatar_url: result.user?.avatar || null,
          follower_count: result.user?.followerCount || null,
          is_verified: true,
          account_link: getPlatformUrl(platform, username),
        });

      if (insertError) {
        // Handle duplicate
        if (insertError.code === '23505') {
          return { success: false, error: 'This account is already connected' };
        }
        return { success: false, error: insertError.message };
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });

      return { success: true };
    },
  });
}

// Verify bio only (for checking before saving)
export function useVerifyBio() {
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({
      platform,
      username,
      verificationCode,
    }: {
      platform: Platform;
      username: string;
      verificationCode: string;
    }): Promise<VerifyBioResult> => {
      if (!session?.access_token) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${config.supabase.url}/functions/v1/verify-social-bio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            username,
            verificationCode,
            platform,
          }),
        }
      );

      return await response.json();
    },
  });
}

// Disconnect a social account
export function useDisconnectAccount() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      account,
    }: {
      account: SocialAccount;
    }): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id || !session?.access_token) {
        return { success: false, error: 'Not authenticated' };
      }

      // For accounts stored in social_accounts table
      if (account.source === 'social_accounts') {
        const { error } = await supabase
          .from('social_accounts')
          .delete()
          .eq('id', account.id);

        if (error) {
          return { success: false, error: error.message };
        }
      }
      // For Discord stored in profiles
      else if (account.platform === 'discord') {
        const response = await fetch(
          `${config.supabase.url}/functions/v1/discord-oauth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: 'disconnect',
              userId: user.id,
            }),
          }
        );

        const result = await response.json();
        if (!result.success && result.error) {
          return { success: false, error: result.error };
        }
      }
      // For Twitter/X stored in profiles
      else if (account.platform === 'twitter') {
        const response = await fetch(
          `${config.supabase.url}/functions/v1/x-oauth`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              action: 'disconnect',
              userId: user.id,
            }),
          }
        );

        const result = await response.json();
        if (!result.success && result.error) {
          return { success: false, error: result.error };
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['connected-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      return { success: true };
    },
  });
}

// Helper function to get platform URL
export function getPlatformUrl(platform: Platform, username: string): string {
  switch (platform) {
    case 'tiktok':
      return `https://tiktok.com/@${username}`;
    case 'instagram':
      return `https://instagram.com/${username}`;
    case 'youtube':
      return `https://youtube.com/@${username}`;
    case 'twitter':
      return `https://x.com/${username}`;
    case 'discord':
      return `https://discord.com/users/${username}`;
    default:
      return '#';
  }
}

// Platform configuration with logo images
export interface PlatformConfig {
  name: string;
  icon: string; // Fallback icon name from MaterialCommunityIcons
  bg: string;
  logoWhite: ImageSourcePropType;
  logoBlack: ImageSourcePropType;
}

export const platformConfig: Record<Platform, PlatformConfig> = {
  tiktok: {
    name: 'TikTok',
    icon: 'music-note',
    bg: '#000000',
    logoWhite: tiktokLogoWhite,
    logoBlack: tiktokLogoBlack,
  },
  instagram: {
    name: 'Instagram',
    icon: 'instagram',
    bg: '#E1306C',
    logoWhite: instagramLogoWhite,
    logoBlack: instagramLogoBlack,
  },
  youtube: {
    name: 'YouTube',
    icon: 'youtube',
    bg: '#FF0000',
    logoWhite: youtubeLogoWhite,
    logoBlack: youtubeLogoBlack,
  },
  twitter: {
    name: 'X',
    icon: 'twitter',
    bg: '#000000',
    logoWhite: xLogoLight,
    logoBlack: xLogo,
  },
  discord: {
    name: 'Discord',
    icon: 'discord',
    bg: '#5865F2',
    logoWhite: discordLogo,
    logoBlack: discordLogo,
  },
};

// Generate a 6-character verification code
export function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Parse username from URL
export function parseUsernameFromUrl(input: string, platform: Platform): string {
  const trimmed = input.trim();

  // If it's already just a username (no URL)
  if (!trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed.replace('@', '');
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const pathname = url.pathname;

    switch (platform) {
      case 'tiktok':
        // https://tiktok.com/@username or https://www.tiktok.com/@username
        const tiktokMatch = pathname.match(/@([^/?]+)/);
        return tiktokMatch ? tiktokMatch[1] : trimmed.replace('@', '');

      case 'instagram':
        // https://instagram.com/username or https://www.instagram.com/username
        const igParts = pathname.split('/').filter(Boolean);
        return igParts[0] || trimmed;

      case 'youtube':
        // https://youtube.com/@username or https://youtube.com/channel/UCxxx
        const ytHandle = pathname.match(/@([^/?]+)/);
        if (ytHandle) return ytHandle[1];
        const ytChannel = pathname.match(/channel\/([^/?]+)/);
        if (ytChannel) return ytChannel[1];
        return trimmed;

      default:
        return trimmed;
    }
  } catch {
    // Not a valid URL, treat as username
    return trimmed.replace('@', '');
  }
}
