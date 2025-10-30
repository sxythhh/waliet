import { supabase } from "@/integrations/supabase/client";

interface SendDiscordDMParams {
  userId: string;
  message: string;
  embedTitle?: string;
  embedDescription?: string;
  embedColor?: number; // Decimal color (e.g., 0x5865F2 for Discord Blurple)
}

interface DiscordDMResponse {
  success: boolean;
  message?: string;
  messageId?: string;
  channelId?: string;
  error?: string;
}

/**
 * Send a Discord DM to a user who has linked their Discord account
 * 
 * @example
 * ```typescript
 * // Simple message
 * await sendDiscordDM({
 *   userId: 'user-uuid',
 *   message: 'Hello! Your campaign has been approved!'
 * });
 * 
 * // Message with embed
 * await sendDiscordDM({
 *   userId: 'user-uuid',
 *   message: 'You have a new notification!',
 *   embedTitle: 'Campaign Approved',
 *   embedDescription: 'Your campaign "Summer Sale" has been approved and is now live!',
 *   embedColor: 0x00FF00 // Green
 * });
 * ```
 */
export async function sendDiscordDM(params: SendDiscordDMParams): Promise<DiscordDMResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('send-discord-dm', {
      body: params
    });

    if (error) {
      console.error('Error invoking Discord DM function:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return data;
  } catch (error: any) {
    console.error('Error sending Discord DM:', error);
    return {
      success: false,
      error: error.message || 'Failed to send Discord DM'
    };
  }
}

/**
 * Common Discord embed colors
 */
export const DiscordColors = {
  BLURPLE: 0x5865F2,
  GREEN: 0x57F287,
  YELLOW: 0xFEE75C,
  FUCHSIA: 0xEB459E,
  RED: 0xED4245,
  WHITE: 0xFFFFFF,
  BLACK: 0x000000,
  GREY: 0x99AAB5,
} as const;
