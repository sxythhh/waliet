/**
 * Hook for constructing Proxatore embed URLs
 * Proxatore is a content proxy for viewing videos from TikTok, Instagram, YouTube, etc.
 */
export function useProxatoreUrl() {
  const proxatoreBaseUrl = import.meta.env.VITE_PROXATORE_URL || '';

  /**
   * Constructs a Proxatore embed URL from a video URL
   * @param videoUrl - The original video URL (e.g., TikTok, Instagram, YouTube)
   * @param platform - The platform name (tiktok, instagram, youtube)
   * @returns The Proxatore embed URL or null if not configured
   */
  const getEmbedUrl = (videoUrl: string, platform: string): string | null => {
    if (!proxatoreBaseUrl || !videoUrl) return null;

    // Proxatore accepts the video URL as a path parameter
    // The URL needs to be properly formatted for Proxatore to parse
    const normalizedUrl = normalizeVideoUrl(videoUrl, platform);

    // Proxatore URL format: {baseUrl}/{videoUrl}
    return `${proxatoreBaseUrl}/${normalizedUrl}`;
  };

  /**
   * Normalizes video URLs to ensure consistent format for Proxatore
   */
  const normalizeVideoUrl = (url: string, platform: string): string => {
    // Remove any trailing slashes and clean up the URL
    let cleanUrl = url.trim();

    // Ensure HTTPS
    if (cleanUrl.startsWith('http://')) {
      cleanUrl = cleanUrl.replace('http://', 'https://');
    }

    // Platform-specific normalization
    const platformLower = platform.toLowerCase();

    if (platformLower === 'tiktok') {
      // Ensure we have the full TikTok URL format
      // Handle both vm.tiktok.com and www.tiktok.com URLs
      if (cleanUrl.includes('vm.tiktok.com')) {
        // Short URLs work directly with Proxatore
        return cleanUrl;
      }
    }

    if (platformLower === 'instagram') {
      // Instagram URLs should be in format: instagram.com/reel/ID or /p/ID
      // Ensure www. prefix for consistency
      if (!cleanUrl.includes('www.')) {
        cleanUrl = cleanUrl.replace('instagram.com', 'www.instagram.com');
      }
    }

    if (platformLower === 'youtube') {
      // YouTube URLs can be:
      // - youtube.com/watch?v=ID
      // - youtube.com/shorts/ID
      // - youtu.be/ID
      // All formats work with Proxatore
    }

    return cleanUrl;
  };

  /**
   * Checks if Proxatore is configured and available
   */
  const isProxatoreConfigured = (): boolean => {
    return !!proxatoreBaseUrl;
  };

  /**
   * Gets the direct video playback URL if available
   * For some platforms, Proxatore can return a direct video URL
   */
  const getDirectVideoUrl = async (videoUrl: string, platform: string): Promise<string | null> => {
    const embedUrl = getEmbedUrl(videoUrl, platform);
    if (!embedUrl) return null;

    try {
      // Try to fetch video info from Proxatore
      // The /video endpoint returns direct video URLs
      const videoInfoUrl = `${proxatoreBaseUrl}/video/${encodeURIComponent(videoUrl)}`;
      const response = await fetch(videoInfoUrl);

      if (response.ok) {
        const data = await response.json();
        return data.videoUrl || null;
      }
    } catch (error) {
      console.error('Failed to get direct video URL from Proxatore:', error);
    }

    return null;
  };

  return {
    getEmbedUrl,
    isProxatoreConfigured,
    getDirectVideoUrl,
    proxatoreBaseUrl
  };
}
