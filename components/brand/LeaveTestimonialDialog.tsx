import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeaveTestimonialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  creatorId: string;
  creatorName: string;
  creatorAvatarUrl?: string | null;
  onSuccess?: () => void;
}

export function LeaveTestimonialDialog({
  open,
  onOpenChange,
  brandId,
  creatorId,
  creatorName,
  creatorAvatarUrl,
  onSuccess
}: LeaveTestimonialDialogProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [testimonialText, setTestimonialText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!testimonialText.trim()) {
      toast.error("Please write a testimonial");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("creator_testimonials")
        .insert({
          brand_id: brandId,
          creator_id: creatorId,
          creator_name: creatorName,
          creator_avatar_url: creatorAvatarUrl,
          content: testimonialText.trim(),
          rating
        } as any);

      if (error) throw error;

      toast.success("Testimonial submitted successfully");
      setTestimonialText("");
      setRating(5);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error submitting testimonial:", error);
      toast.error("Failed to submit testimonial");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-instrument tracking-tight">Leave a Review</DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            Share your experience working with {creatorName}. This review will appear on their public profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Rating Stars */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.3px] text-sm">Rating</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-0.5 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(null)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      (hoveredRating !== null ? star <= hoveredRating : star <= rating)
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                {rating} star{rating !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Testimonial Text */}
          <div className="space-y-2">
            <Label className="font-inter tracking-[-0.3px] text-sm">Your Review</Label>
            <Textarea
              placeholder="Share your experience working with this creator..."
              value={testimonialText}
              onChange={(e) => setTestimonialText(e.target.value)}
              className="min-h-[120px] font-inter tracking-[-0.3px] text-sm resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] text-right">
              {testimonialText.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="font-inter tracking-[-0.3px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !testimonialText.trim()}
            className="font-inter tracking-[-0.3px]"
          >
            {saving ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}