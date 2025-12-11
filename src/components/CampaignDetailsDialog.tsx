import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, CheckCircle, TrendingUp, AlertTriangle, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import tiktokIcon from "@/assets/tiktok-logo-black.png";
import instagramIcon from "@/assets/instagram-logo-new.png";
import youtubeIcon from "@/assets/youtube-logo-new.png";
import xIcon from "@/assets/x-logo.png";

interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  description: string | null;
  status: string;
  budget: number;
  rpm_rate: number;
  allowed_platforms: string[] | null;
  end_date: string | null;
  created_at: string;
  hashtags?: string[] | null;
  guidelines?: string | null;
  embed_url?: string | null;
}

interface CampaignDetailsDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin?: () => void;
}

const platformIcons: Record<string, string> = {
  tiktok: tiktokIcon,
  instagram: instagramIcon,
  youtube: youtubeIcon,
  x: xIcon,
};

const calculateTimeAgo = (createdAt: string) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  return `${diffHours}h ago`;
};

const calculateDaysUntilEnd = (endDate: string | null) => {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

export function CampaignDetailsDialog({
  campaign,
  open,
  onOpenChange,
  onJoin,
}: CampaignDetailsDialogProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);

  if (!campaign) return null;

  const daysUntilEnd = calculateDaysUntilEnd(campaign.end_date);
  const timeAgo = calculateTimeAgo(campaign.created_at);
  const description = campaign.description || "";
  const isLongDescription = description.length > 300;
  const displayDescription = showFullDescription ? description : description.slice(0, 300);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          {campaign.brand_logo_url && (
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-border bg-muted">
              <img
                src={campaign.brand_logo_url}
                alt={campaign.brand_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{campaign.brand_name}</h2>
              <Check className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">{timeAgo}</p>
            <h3 className="text-base font-semibold">{campaign.title}</h3>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4 p-5 rounded-xl border border-border mb-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Ends</p>
            <p className="font-bold text-base">{daysUntilEnd !== null ? `${daysUntilEnd}m` : "—"}</p>
            {daysUntilEnd !== null && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {daysUntilEnd === 0 ? "100.00" : ((1 - daysUntilEnd / 365) * 100).toFixed(2)}% PAID OUT
              </p>
            )}
          </div>

          <div className="text-center border-l border-border">
            <p className="text-xs text-muted-foreground mb-1">Language</p>
            <p className="font-bold text-base">English</p>
          </div>

          <div className="text-center border-l border-border">
            <p className="text-xs text-muted-foreground mb-1">Platforms</p>
            <div className="flex justify-center gap-1.5 mt-1">
              {campaign.allowed_platforms?.map((platform) => (
                <img
                  key={platform}
                  src={platformIcons[platform.toLowerCase()]}
                  alt={platform}
                  className="w-5 h-5"
                />
              ))}
            </div>
          </div>

          <div className="text-center border-l border-border">
            <p className="text-xs text-muted-foreground mb-1">Pay Type</p>
            <p className="font-bold text-base">Per view</p>
          </div>

          <div className="text-center border-l border-border">
            <p className="text-xs text-muted-foreground mb-1">Payout</p>
            <p className="font-bold text-base">${campaign.rpm_rate.toFixed(2)} cpm</p>
          </div>
        </div>

        {/* Details Section */}
        <div className="mb-6">
          <h4 className="text-xl font-bold mb-3">Details</h4>
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {displayDescription || "No description available."}
            {isLongDescription && !showFullDescription && "..."}
          </div>
          {isLongDescription && (
            <button
              onClick={() => setShowFullDescription(!showFullDescription)}
              className="text-sm font-medium text-foreground mt-2 flex items-center gap-1 hover:underline"
            >
              {showFullDescription ? (
                <>Show less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show more <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>

        {/* What to include Section */}
        {campaign.hashtags && campaign.hashtags.length > 0 && (
          <div className="mb-6 pt-6 border-t border-border">
            <h4 className="text-xl font-bold mb-4">What to include</h4>
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Caption, tags, text</p>
                <p className="text-xs text-primary font-medium mt-1">REQUIRED HASHTAGS</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {campaign.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Link Card */}
        {campaign.embed_url && (
          <div className="mb-6 p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">)l.</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{campaign.brand_name} | Vyro</p>
                  <p className="text-xs text-muted-foreground">{campaign.embed_url}</p>
                </div>
              </div>
              <a href={campaign.embed_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </a>
            </div>
          </div>
        )}

        {/* Campaigns on Vyro Section */}
        <div className="mb-6 pt-6 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">CAMPAIGNS ON VYRO</p>
          <h4 className="text-xl font-bold mb-6">How it works</h4>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm mb-1">Clip approval</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  After you post, clients review to confirm your clip complies with all stated requirements, in its discretion. Only approved clips count toward your views, so be sure to follow all of the campaign instructions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <TrendingUp className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm mb-1">View requirements</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A minimum of 1,000 total views is required to be eligible for payout. Views from all approved clips will be added together.
                  <br />Max earnings per post: $1,000
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <AlertTriangle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm mb-1">No botting, stealing, or reposting</p>
                <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
                  <li>Using bots to inflate views is strictly prohibited and will result in a ban.</li>
                  <li>Clips must be your own. Posting someone else's clips is not allowed.</li>
                  <li>Posting the same clip multiple times on the same social account is not allowed.</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-sm text-center text-muted-foreground mt-6">
            All posts must comply with the{" "}
            <a href="#" className="underline text-foreground hover:text-primary">Content Requirements.</a>
          </p>
        </div>

        {/* Join Button */}
        {onJoin && (
          <Button
            onClick={onJoin}
            className="w-full h-14 text-lg font-semibold rounded-full"
            size="lg"
          >
            Join campaign
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
