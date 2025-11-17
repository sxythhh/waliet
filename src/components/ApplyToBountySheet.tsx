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
          <div className="grid grid-cols-2 gap-4">
            {/* Monthly Retainer Card */}
            <div className="group relative rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5 transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10">
              <div className="flex items-center gap-2 text-primary/80 text-xs font-medium mb-3 uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
                Monthly Retainer
              </div>
              <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
                ${bounty.monthly_retainer.toLocaleString()}
              </p>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            {/* Videos Per Month Card */}
            <div className="group relative rounded-xl bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20 p-5 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10">
              <div className="flex items-center gap-2 text-blue-400/80 text-xs font-medium mb-3 uppercase tracking-wider">
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <Video className="h-3.5 w-3.5" />
                </div>
                Videos/Month
              </div>
              <p className="text-3xl font-bold text-white tabular-nums tracking-tight">
                {bounty.videos_per_month}
              </p>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            {/* Available Positions Card */}
            <div className={`group relative rounded-xl col-span-2 p-5 transition-all duration-300 ${
              isFull 
                ? 'bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent border border-red-500/20 hover:border-red-500/40 hover:shadow-lg hover:shadow-red-500/10' 
                : 'bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/10'
            }`}>
              <div className={`flex items-center gap-2 text-xs font-medium mb-3 uppercase tracking-wider ${
                isFull ? 'text-red-400/80' : 'text-green-400/80'
              }`}>
                <div className={`p-1.5 rounded-lg ${isFull ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                  <Users className="h-3.5 w-3.5" />
                </div>
                Available Positions
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <p className={`text-3xl font-bold tabular-nums tracking-tight ${
                    isFull ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {bounty.accepted_creators_count}
                  </p>
                  <span className="text-2xl font-semibold text-white/40">/</span>
                  <p className="text-2xl font-semibold text-white/60 tabular-nums">
                    {bounty.max_accepted_creators}
                  </p>
                </div>
                {!isFull && (
                  <div className="px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                    <span className="text-sm font-medium text-green-400">
                      {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left
                    </span>
                  </div>
                )}
                {isFull && (
                  <div className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                    <span className="text-sm font-medium text-red-400">
                      Fully Booked
                    </span>
                  </div>
                )}
              </div>
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${
                isFull ? 'from-red-500/5 to-transparent' : 'from-green-500/5 to-transparent'
              }`} />
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
