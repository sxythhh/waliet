import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";

export type Platform = 'tiktok' | 'instagram' | 'youtube' | 'x';

export interface PlatformLogoSet {
  white: string;
  black: string;
}

export const platformLogos: Record<Exclude<Platform, 'x'>, PlatformLogoSet> = {
  tiktok: {
    white: tiktokLogoWhite,
    black: tiktokLogoBlack,
  },
  instagram: {
    white: instagramLogoWhite,
    black: instagramLogoBlack,
  },
  youtube: {
    white: youtubeLogoWhite,
    black: youtubeLogoBlack,
  },
};

/**
 * Get platform logo based on platform name and theme
 * @param platform - The platform name (tiktok, instagram, youtube)
 * @param isDark - Whether to use dark theme (returns white logo) or light theme (returns black logo)
 * @returns The logo URL or null for unsupported platforms (like 'x')
 */
export function getPlatformLogo(platform: string, isDark: boolean = true): string | null {
  const normalizedPlatform = platform?.toLowerCase() as Exclude<Platform, 'x'>;
  const logos = platformLogos[normalizedPlatform];
  if (!logos) return null;
  return isDark ? logos.white : logos.black;
}

/**
 * Get all platform logos for a given theme
 * @param isDark - Whether to use dark theme
 * @returns Object with platform names as keys and logo URLs as values
 */
export function getPlatformLogos(isDark: boolean = true): Record<string, string> {
  return {
    tiktok: isDark ? platformLogos.tiktok.white : platformLogos.tiktok.black,
    instagram: isDark ? platformLogos.instagram.white : platformLogos.instagram.black,
    youtube: isDark ? platformLogos.youtube.white : platformLogos.youtube.black,
  };
}
