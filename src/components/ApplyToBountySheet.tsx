import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, DollarSign, Video, Users, Calendar } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";

interface BountyCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  status: string;
  brands?: {
    name: string;
    logo_url: string;
  };
}

interface ApplyToBountySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bounty: BountyCampaign | null;
  onSuccess: () => void;
}

export function ApplyToBountySheet({ 
  open, 
  onOpenChange, 
  bounty,
  onSuccess 
}: ApplyToBountySheetProps) {
  const [submitting, setSubmitting] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [applicationText, setApplicationText] = useState("");

  if (!bounty) return null;

  const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
  const isFull = spotsRemaining <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoUrl.trim()) {
      toast.error("Please provide a video URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(videoUrl);
    } catch {
      toast.error("Please provide a valid URL");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to apply");
        return;
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from('bounty_applications')
        .select('id')
        .eq('bounty_campaign_id', bounty.id)
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (existing) {
        toast.error("You've already applied to this bounty");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('bounty_applications')
        .insert({
          bounty_campaign_id: bounty.id,
          user_id: session.user.id,
          video_url: videoUrl.trim(),
          application_text: applicationText.trim() || null
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setVideoUrl("");
      setApplicationText("");
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-xl bg-[#0a0a0a] border-l border-white/10 p-0 overflow-y-auto"
      >
        {/* Banner Image */}
        {bounty.banner_url && (
          <div className="relative w-full h-48 flex-shrink-0 overflow-hidden bg-muted">
            <OptimizedImage
              src={bounty.banner_url}
              alt={bounty.title}
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Header with Brand */}
          <SheetHeader className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              {bounty.brands?.logo_url && (
                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
                  <OptimizedImage 
                    src={bounty.brands.logo_url} 
                    alt={bounty.brands.name || ''} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}
              <div className="flex-1">
                <SheetTitle className="text-2xl font-bold text-white mb-1">
                  {bounty.title}
                </SheetTitle>
                <p className="text-sm text-white/60">{bounty.brands?.name}</p>
              </div>
            </div>
            
            {bounty.description && (
              <SheetDescription className="text-white/70 text-sm leading-relaxed">
                {bounty.description}
              </SheetDescription>
            )}
          </SheetHeader>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/5 p-4">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                <DollarSign className="h-4 w-4" />
                Monthly Retainer
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">
                ${bounty.monthly_retainer.toLocaleString()}
              </p>
            </div>

            <div className="rounded-lg bg-white/5 p-4">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                <Video className="h-4 w-4" />
                Videos/Month
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">
                {bounty.videos_per_month}
              </p>
            </div>

            <div className="rounded-lg bg-white/5 p-4 col-span-2">
              <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
                <Users className="h-4 w-4" />
                Available Positions
              </div>
              <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-bold tabular-nums ${isFull ? 'text-red-500' : 'text-green-500'}`}>
                  {bounty.accepted_creators_count} / {bounty.max_accepted_creators}
                </p>
                {!isFull && (
                  <span className="text-sm text-white/60">
                    {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} remaining
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content Requirements */}
          <div className="rounded-lg bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-2">Content Style Requirements</h3>
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
              {bounty.content_style_requirements}
            </p>
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-2">
            <div>
              <Label htmlFor="video_url" className="text-white flex items-center gap-2 mb-2">
                <ExternalLink className="h-4 w-4" />
                Application Video URL *
              </Label>
              <Input
                id="video_url"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="bg-white/5 border-transparent text-white placeholder:text-white/30"
                required
              />
              <p className="text-xs text-white/50 mt-2">
                Provide a link to a video showcasing your content creation skills
              </p>
            </div>

            <div>
              <Label htmlFor="application_text" className="text-white mb-2 block">
                Why are you a good fit? (Optional)
              </Label>
              <Textarea
                id="application_text"
                value={applicationText}
                onChange={(e) => setApplicationText(e.target.value)}
                placeholder="Tell the brand why you'd be perfect for this bounty..."
                className="bg-white/5 border-transparent text-white placeholder:text-white/30 min-h-[120px] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#0a0a0a] py-4 -mx-6 px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 bg-transparent border-transparent text-white hover:bg-white/5"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || isFull}
                className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : isFull ? "No Spots Available" : "Submit Application"}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
