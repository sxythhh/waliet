import { useState, useCallback } from "react";

interface CobaltResponse {
  status: "tunnel" | "redirect" | "picker" | "error";
  url?: string;
  urls?: string[];
  picker?: Array<{ url: string; type: string }>;
  error?: string | { code: string };
}

interface VideoResult {
  url: string;
  type: "video" | "embed";
  platform: string;
}

/**
 * Extracts video ID from TikTok URL
 * Handles both /video/ID and /photo/ID (slideshow) URLs
 */
function extractTikTokVideoId(url: string): string | null {
  const match = url.match(/\/(video|photo)\/(\d+)/);
  return match ? match[2] : null;
}

/**
 * Extracts video ID from Instagram URL
 */
function extractInstagramVideoId(url: string): string | null {
  const match = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
  return match ? match[2] : null;
}

/**
 * Hook for fetching video URLs - uses Cobalt for supported platforms,
 * falls back to official embeds for TikTok/Instagram
 */
export function useCobaltVideo() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cobaltApiUrl = import.meta.env.VITE_COBALT_API_URL || "";

  const isConfigured = useCallback(() => {
    return true; // Always configured since we have fallbacks
  }, []);

  const fetchVideoUrl = useCallback(
    async (videoUrl: string, platform?: string): Promise<VideoResult | null> => {
      setLoading(true);
      setError(null);

      const platformLower = (platform || "").toLowerCase();

      try {
        // TikTok - use official embed (Cobalt blocked by TikTok)
        if (platformLower === "tiktok" || videoUrl.includes("tiktok.com")) {
          const videoId = extractTikTokVideoId(videoUrl);
          if (videoId) {
            return {
              url: `https://www.tiktok.com/embed/v2/${videoId}`,
              type: "embed",
              platform: "tiktok",
            };
          }
          // Check if it's a short URL that we can't parse
          if (videoUrl.includes("vm.tiktok.com") || videoUrl.includes("vt.tiktok.com")) {
            throw new Error("Short TikTok URLs not supported - use full video URL");
          }
          throw new Error("Invalid TikTok URL format");
        }

        // Instagram - use official embed
        if (platformLower === "instagram" || videoUrl.includes("instagram.com")) {
          const videoId = extractInstagramVideoId(videoUrl);
          if (videoId) {
            return {
              url: `https://www.instagram.com/p/${videoId}/embed`,
              type: "embed",
              platform: "instagram",
            };
          }
          throw new Error("Invalid Instagram URL format");
        }

        // YouTube and others - use Cobalt for direct video URL
        if (cobaltApiUrl) {
          const response = await fetch(cobaltApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              url: videoUrl,
              videoQuality: "720",
            }),
          });

          const data: CobaltResponse = await response.json();

          if (data.status === "error") {
            const errorCode = typeof data.error === "object" ? data.error.code : data.error;
            throw new Error(errorCode || "Failed to fetch video");
          }

          if (data.status === "tunnel" || data.status === "redirect") {
            if (data.url) {
              return { url: data.url, type: "video", platform: platformLower };
            }
          }

          if (data.status === "picker" && data.picker && data.picker.length > 0) {
            const videoOption = data.picker.find((p) => p.type === "video");
            if (videoOption) {
              return { url: videoOption.url, type: "video", platform: platformLower };
            }
            return { url: data.picker[0].url, type: "video", platform: platformLower };
          }
        }

        throw new Error("Could not fetch video");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("Video fetch error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [cobaltApiUrl]
  );

  return {
    fetchVideoUrl,
    isConfigured,
    loading,
    error,
    clearError: () => setError(null),
  };
}
