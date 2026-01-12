import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BrandFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  creatorId: string;
  creatorName: string;
  campaignId?: string;
  boostId?: string;
  skillTypeId?: string;
  onSuccess?: () => void;
}

interface FeedbackRating {
  quality: number | null;
  communication: number | null;
  timeliness: number | null;
  adherence: number | null;
}

const RATING_LABELS = {
  quality: "Content Quality",
  communication: "Communication",
  timeliness: "Timeliness",
  adherence: "Brief Adherence",
};

const RATING_DESCRIPTIONS = {
  quality: "Quality of the delivered content",
  communication: "Responsiveness and clarity",
  timeliness: "Meeting deadlines",
  adherence: "Following brand guidelines",
};

export function BrandFeedbackDialog({
  open,
  onOpenChange,
  brandId,
  creatorId,
  creatorName,
  campaignId,
  boostId,
  skillTypeId,
  onSuccess,
}: BrandFeedbackDialogProps) {
  const [ratings, setRatings] = useState<FeedbackRating>({
    quality: null,
    communication: null,
    timeliness: null,
    adherence: null,
  });
  const [wouldHireAgain, setWouldHireAgain] = useState<boolean | null>(null);
  const [recommendForRetainer, setRecommendForRetainer] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRatingChange = (category: keyof FeedbackRating, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [category]: prev[category] === value ? null : value,
    }));
  };

  const handleSubmit = async () => {
    // Require at least one rating
    const hasRating = Object.values(ratings).some((r) => r !== null);
    if (!hasRating) {
      toast({
        variant: "destructive",
        title: "Rating required",
        description: "Please provide at least one rating.",
      });
      return;
    }

    setLoading(true);
    try {
      const feedbackData = {
        brand_id: brandId,
        creator_id: creatorId,
        campaign_id: campaignId || null,
        boost_id: boostId || null,
        quality_score: ratings.quality,
        communication_score: ratings.communication,
        timeliness_score: ratings.timeliness,
        adherence_score: ratings.adherence,
        would_hire_again: wouldHireAgain,
        recommended_for_retainer: recommendForRetainer,
        feedback_text: feedbackText.trim() || null,
        internal_notes: internalNotes.trim() || null,
        skill_type_id: skillTypeId || null,
      };

      const { error } = await supabase
        .from("brand_creator_feedback")
        .upsert(feedbackData, {
          onConflict: campaignId ? "brand_id,creator_id,campaign_id" : "brand_id,creator_id,boost_id",
        });

      if (error) throw error;

      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      setRatings({ quality: null, communication: null, timeliness: null, adherence: null });
      setWouldHireAgain(null);
      setRecommendForRetainer(false);
      setFeedbackText("");
      setInternalNotes("");
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        variant: "destructive",
        title: "Error submitting feedback",
        description: error.message || "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({
    category,
    value,
  }: {
    category: keyof FeedbackRating;
    value: number | null;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
          {RATING_LABELS[category]}
        </Label>
        <span className="text-xs text-muted-foreground font-inter">
          {RATING_DESCRIPTIONS[category]}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(category, star)}
            className={cn(
              "p-1 rounded transition-colors",
              "hover:bg-muted/50"
            )}
          >
            <Star
              className={cn(
                "w-6 h-6 transition-colors",
                value !== null && star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/30"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            Rate your experience with {creatorName}
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            Your feedback helps improve creator matching and quality.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Ratings */}
          <div className="space-y-4">
            {(Object.keys(RATING_LABELS) as Array<keyof FeedbackRating>).map(
              (category) => (
                <StarRating
                  key={category}
                  category={category}
                  value={ratings[category]}
                />
              )
            )}
          </div>

          {/* Would Hire Again */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
              Would you hire this creator again?
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={wouldHireAgain === true ? "default" : "outline"}
                size="sm"
                onClick={() => setWouldHireAgain(true)}
                className="flex-1 font-inter"
              >
                Yes
              </Button>
              <Button
                type="button"
                variant={wouldHireAgain === false ? "default" : "outline"}
                size="sm"
                onClick={() => setWouldHireAgain(false)}
                className="flex-1 font-inter"
              >
                No
              </Button>
            </div>
          </div>

          {/* Recommend for Retainer */}
          {wouldHireAgain === true && (
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
                  Recommend for retainer
                </Label>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                  Would you consider ongoing work with this creator?
                </p>
              </div>
              <Switch
                checked={recommendForRetainer}
                onCheckedChange={setRecommendForRetainer}
              />
            </div>
          )}

          {/* Written Feedback */}
          <div className="space-y-2">
            <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
              Feedback (optional)
            </Label>
            <Textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Share your experience working with this creator..."
              className="h-20 bg-muted/30 border-0 font-inter resize-none"
            />
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              This feedback may be shared with the creator
            </p>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium font-inter tracking-[-0.5px]">
              Internal notes (private)
            </Label>
            <Textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Notes for your team only..."
              className="h-16 bg-muted/30 border-0 font-inter resize-none"
            />
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              Only visible to your team
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 font-inter"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 font-inter"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
