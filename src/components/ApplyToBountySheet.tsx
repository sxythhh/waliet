import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OptimizedImage } from "@/components/OptimizedImage";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { RequireContactDialog } from "@/components/RequireContactDialog";
import discordIcon from "@/assets/discord-icon.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import alternateEmailIcon from "@/assets/alternate-email-icon.svg";
import fullscreenIcon from "@/assets/fullscreen-icon.svg";
import fullscreenIconDark from "@/assets/fullscreen-icon-dark.svg";
import { useTheme } from "@/components/ThemeProvider";
import { ApplicationQuestionsRenderer, validateApplicationAnswers } from "@/components/ApplicationQuestionsRenderer";
import { ApplicationAnswer, parseApplicationQuestions } from "@/types/applicationQuestions";
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
  blueprint_id?: string | null;
  slug?: string | null;
  application_questions?: any;
  brands?: {
    name: string;
    logo_url: string;
    is_verified?: boolean;
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
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [showAddSocialDialog, setShowAddSocialDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [hasPhone, setHasPhone] = useState(false);
  const [blueprint, setBlueprint] = useState<any>(null);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, ApplicationAnswer>>({});
  
  const questions = parseApplicationQuestions(bounty?.application_questions);
  const hasContactInfo = hasPhone || discordConnected;

  // Check for connected accounts and fetch blueprint when sheet opens
  useEffect(() => {
    if (open) {
      checkConnectedAccounts();
      if (bounty?.blueprint_id) {
        fetchBlueprint(bounty.blueprint_id);
      } else {
        setBlueprint(null);
      }
    }
  }, [open, bounty?.blueprint_id]);
  const fetchBlueprint = async (blueprintId: string) => {
    const {
      data
    } = await supabase.from('blueprints').select('*').eq('id', blueprintId).single();
    setBlueprint(data);
  };
  const checkConnectedAccounts = async () => {
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;

      // Check for Discord connection and phone number
      const {
        data: profile
      } = await supabase.from('profiles').select('discord_id, phone_number').eq('id', session.user.id).single();
      setDiscordConnected(!!profile?.discord_id);
      setHasPhone(!!profile?.phone_number);
    } catch (error) {
      console.error("Error checking accounts:", error);
    }
  };
  if (!bounty) return null;
  const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
  const isFull = spotsRemaining <= 0;
  const isPaused = bounty.status === 'paused';
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for contact info requirement
    if (!hasContactInfo) {
      setShowContactDialog(true);
      return;
    }

    // Validate required application questions
    const validation = validateApplicationAnswers(bounty?.application_questions, questionAnswers);
    if (!validation.valid) {
      toast.error(`Please answer required questions: ${validation.missingRequired.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to apply");
        return;
      }

      // Check if already applied
      const {
        data: existing
      } = await supabase.from('bounty_applications').select('id').eq('bounty_campaign_id', bounty.id).eq('user_id', session.user.id).maybeSingle();
      if (existing) {
        toast.error("You've already applied to this boost");
        setSubmitting(false);
        return;
      }

      // Check if boost is full - if so, add to waitlist
      const applicationStatus = isFull ? 'waitlisted' : 'pending';

      // Prepare application answers for storage
      const answersToStore = Object.keys(questionAnswers).length > 0 ? questionAnswers : null;

      const {
        error
      } = await supabase.from('bounty_applications').insert({
        bounty_campaign_id: bounty.id,
        user_id: session.user.id,
        application_answers: answersToStore as any,
        status: applicationStatus
      } as any);
      if (error) throw error;
      toast.success(isFull ? "You've been added to the waitlist!" : "Application submitted successfully!");
      onSuccess();
      onOpenChange(false);

      // Reset form
      setQuestionAnswers({});
    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast.error(error.message || "Failed to submit application");
      setIsUploading(false);
    } finally {
      setSubmitting(false);
    }
  };
  return <>
      <AddSocialAccountDialog open={showAddSocialDialog} onOpenChange={setShowAddSocialDialog} onSuccess={checkConnectedAccounts} />
      
      <RequireContactDialog 
        open={showContactDialog} 
        onOpenChange={setShowContactDialog} 
        onSuccess={checkConnectedAccounts}
        hasPhone={hasPhone}
        hasDiscord={discordConnected}
      />
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl bg-background border-0 p-0 overflow-visible flex flex-col">
          {/* Floating Fullscreen Button */}
          <button onClick={() => {
          onOpenChange(false);
          navigate(`/c/${bounty.slug || bounty.id}`);
        }} className="absolute -left-12 top-4 w-9 h-9 rounded-lg bg-card backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted transition-colors z-50" title="Open full page">
            <img src={resolvedTheme === 'dark' ? fullscreenIcon : fullscreenIconDark} alt="Fullscreen" className="w-5 h-5" />
          </button>
          {/* Always show boost details */}
          <>
              {/* Banner Image */}
              {bounty.banner_url && <div className="relative w-full h-48 flex-shrink-0 overflow-hidden bg-muted">
            <OptimizedImage src={bounty.banner_url} alt={bounty.title} className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          </div>}

        <div className="p-6 space-y-6 flex-1 overflow-y-auto pb-24">
          {/* Header with Brand */}
          <SheetHeader className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              {bounty.brands?.logo_url && <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                  <OptimizedImage src={bounty.brands.logo_url} alt={bounty.brands.name || ''} className="w-full h-full object-cover" />
                </div>}
              <div className="flex-1 -mt-0.5">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm text-foreground font-medium">{bounty.brands?.name}</p>
                  {bounty.brands?.is_verified && <VerifiedBadge />}
                </div>
                <SheetTitle className="text-2xl font-bold text-foreground">
                  {bounty.title}
                </SheetTitle>
              </div>
            </div>
            
          </SheetHeader>

          {/* Stats Cards - Visual grid layout */}
          


          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-2 py-0">
              {/* Custom Application Questions */}
              {questions.length > 0 ? (
                <ApplicationQuestionsRenderer
                  questions={bounty?.application_questions}
                  answers={questionAnswers}
                  onChange={setQuestionAnswers}
                  campaignId={bounty?.id}
                />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No application questions configured for this boost.
                </p>
              )}

              <div className="flex gap-3 fixed bottom-0 left-0 right-0 bg-background py-4 px-6 border-t border-border sm:left-auto sm:right-0 sm:w-full sm:max-w-xl">
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 font-['Inter'] tracking-[-0.5px]" disabled={submitting || isUploading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || isPaused || isUploading || questions.length === 0} className="flex-1 font-['Inter'] tracking-[-0.5px]">
                  {isUploading ? "Uploading..." : submitting ? "Submitting..." : isPaused ? "Boost Paused" : isFull ? "Join Waitlist" : "Submit Application"}
                </Button>
              </div>
            </form>
              </div>
            </>
        </SheetContent>
      </Sheet>
    </>;
}