import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface Announcement {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  reactions: {
    emoji: string;
    count: number;
    hasReacted: boolean;
  }[];
}

interface UseAnnouncementsOptions {
  sourceType: "campaign" | "boost";
  sourceId: string;
  enabled?: boolean;
}

export function useAnnouncements({
  sourceType,
  sourceId,
  enabled = true,
}: UseAnnouncementsOptions) {
  const { session } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = async () => {
    if (!session?.access_token || !enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-announcements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "list",
            source_type: sourceType,
            source_id: sourceId,
          }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Handle non-success status codes gracefully
      if (!response.ok) {
        setAnnouncements([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setAnnouncements(data.data || []);
      } else {
        // Don't set error - just return empty
        setAnnouncements([]);
      }
    } catch {
      // Fail completely silently - announcements are not critical
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleReaction = async (announcementId: string, emoji: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-announcements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "toggle_reaction",
            announcement_id: announcementId,
            emoji,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          fetchAnnouncements();
        }
      }
    } catch {
      // Fail silently
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [sourceType, sourceId, session?.access_token, enabled]);

  return {
    announcements,
    loading,
    error,
    refetch: fetchAnnouncements,
    toggleReaction,
  };
}
