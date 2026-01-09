import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  created_at: string;
}

interface AnnouncementPopupProps {
  userId: string | null;
}

export function AnnouncementPopup({ userId }: AnnouncementPopupProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchUnseenAnnouncements = async () => {
      try {
        setLoading(true);

        // Get all active popup announcements
        const { data: allAnnouncements, error: announcementsError } = await supabase
          .from("announcements")
          .select("id, title, content, image_url, cta_text, cta_link, created_at")
          .eq("is_active", true)
          .eq("show_as_popup", true)
          .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
          .order("created_at", { ascending: false });

        if (announcementsError) throw announcementsError;
        if (!allAnnouncements || allAnnouncements.length === 0) {
          setLoading(false);
          return;
        }

        // Get user's viewed/dismissed announcements
        const { data: viewedAnnouncements, error: viewsError } = await supabase
          .from("user_announcement_views")
          .select("announcement_id, dismissed_at")
          .eq("user_id", userId);

        if (viewsError) throw viewsError;

        // Filter out dismissed announcements
        const dismissedIds = new Set(
          (viewedAnnouncements || [])
            .filter((v) => v.dismissed_at !== null)
            .map((v) => v.announcement_id)
        );

        const unseenAnnouncements = allAnnouncements.filter(
          (a) => !dismissedIds.has(a.id)
        );

        if (unseenAnnouncements.length > 0) {
          setAnnouncements(unseenAnnouncements);
          setOpen(true);

          // Mark announcements as viewed
          const viewRecords = unseenAnnouncements.map((a) => ({
            user_id: userId,
            announcement_id: a.id,
            viewed_at: new Date().toISOString(),
          }));

          await supabase
            .from("user_announcement_views")
            .upsert(viewRecords, { onConflict: "user_id,announcement_id" });
        }
      } catch (error) {
        console.error("Error fetching announcements:", error);
      } finally {
        setLoading(false);
      }
    };

    // Delay slightly to let the page settle
    const timer = setTimeout(fetchUnseenAnnouncements, 1000);
    return () => clearTimeout(timer);
  }, [userId]);

  const handleDismiss = async () => {
    if (!userId || announcements.length === 0) return;

    setDismissing(true);
    try {
      // Mark all shown announcements as dismissed
      const dismissRecords = announcements.map((a) => ({
        user_id: userId,
        announcement_id: a.id,
        dismissed_at: new Date().toISOString(),
      }));

      for (const record of dismissRecords) {
        await supabase
          .from("user_announcement_views")
          .update({ dismissed_at: record.dismissed_at })
          .eq("user_id", userId)
          .eq("announcement_id", record.announcement_id);
      }

      setOpen(false);
    } catch (error) {
      console.error("Error dismissing announcements:", error);
      setOpen(false);
    } finally {
      setDismissing(false);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : announcements.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < announcements.length - 1 ? prev + 1 : 0));
  };

  const handleCtaClick = (link: string) => {
    if (link.startsWith("http")) {
      window.open(link, "_blank");
    } else {
      window.location.href = link;
    }
  };

  if (!announcements.length || loading) return null;

  const currentAnnouncement = announcements[currentIndex];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleDismiss();
    }}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 bg-[#0f0f0f] border-muted/30 overflow-hidden [&>button]:hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="absolute right-4 top-4 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Navigation arrows for multiple announcements */}
        {announcements.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-white" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-white" />
            </button>
          </>
        )}

        {/* Image section */}
        {currentAnnouncement.image_url && (
          <div className="relative w-full aspect-video bg-gradient-to-br from-emerald-900/30 to-primary/20">
            <img
              src={currentAnnouncement.image_url}
              alt={currentAnnouncement.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent" />
          </div>
        )}

        {/* Content section */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold font-inter tracking-[-0.5px] text-foreground">
              {currentAnnouncement.title}
            </h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] whitespace-pre-wrap leading-relaxed">
              {currentAnnouncement.content}
            </p>
          </div>

          {/* CTA button */}
          {currentAnnouncement.cta_text && currentAnnouncement.cta_link && (
            <Button
              onClick={() => handleCtaClick(currentAnnouncement.cta_link!)}
              className="w-full h-11 font-inter tracking-[-0.3px] gap-2"
            >
              {currentAnnouncement.cta_text}
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}

          {/* Footer with pagination and timestamp */}
          <div className="flex items-center justify-between pt-2">
            {/* Pagination dots */}
            <div className="flex items-center gap-1.5">
              {announcements.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-200",
                    index === currentIndex
                      ? "w-4 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>

            {/* Timestamp */}
            <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              {formatDistanceToNow(new Date(currentAnnouncement.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
