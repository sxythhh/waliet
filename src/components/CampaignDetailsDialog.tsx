import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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
  if (!campaign) return null;

  const daysUntilEnd = calculateDaysUntilEnd(campaign.end_date);
  const timeAgo = calculateTimeAgo(campaign.created_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4 flex-1">
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
                <h2 className="text-2xl font-bold">{campaign.brand_name}</h2>
                <Check className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground mb-3">{timeAgo}</p>
              <h3 className="text-lg font-semibold">{campaign.title}</h3>
            </div>
          </div>
          <Badge
            variant={campaign.status === "active" ? "default" : "secondary"}
            className="text-sm px-3 py-1"
          >
            {campaign.status === "active" ? "Active" : "Ended"}
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-5 gap-4 p-6 rounded-2xl bg-muted/30 mb-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Ends</p>
            <p className="font-bold text-lg">{daysUntilEnd !== null ? `${daysUntilEnd}d` : "—"}</p>
            {daysUntilEnd !== null && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {((daysUntilEnd / 365) * 100).toFixed(2)}% PAID OUT
              </p>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Language</p>
            <p className="font-bold text-lg">English</p>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Platforms</p>
            <div className="flex justify-center gap-2">
              {campaign.allowed_platforms?.map((platform) => (
                <img
                  key={platform}
                  src={platformIcons[platform.toLowerCase()]}
                  alt={platform}
                  className="w-6 h-6"
                />
              ))}
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Pay Type</p>
            <p className="font-bold text-lg">Per view</p>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-2">Payout</p>
            <p className="font-bold text-lg">${(campaign.rpm_rate * 1000).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Per Million</p>
          </div>
        </div>

        {/* Details Section */}
        <div className="mb-6">
          <h4 className="text-xl font-bold mb-4">Details</h4>
          <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {campaign.description || "No description available."}
          </div>
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
