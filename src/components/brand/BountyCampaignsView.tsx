import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Video, Users, Trash2, Copy, Check, Lock } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";


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
  created_at: string;
  is_private?: boolean;
}

interface BountyCampaignsViewProps {
  bounties: BountyCampaign[];
  onViewApplications?: (bounty: { id: string; title: string; maxAccepted: number; currentAccepted: number }) => void;
  onDelete?: (bounty: BountyCampaign) => void;
  onRefresh?: () => void;
  onBoostSelect?: (boostId: string | null) => void;
}

export function BountyCampaignsView({ bounties, onViewApplications, onDelete, onRefresh, onBoostSelect }: BountyCampaignsViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyUrl = (bountyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/boost/${bountyId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(bountyId);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCardClick = (bountyId: string) => {
    onBoostSelect?.(bountyId);
  };

  if (bounties.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
        <p className="text-muted-foreground">No boost campaigns yet</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Create your first boost to hire creators on retainer</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {bounties.map((bounty) => {
        const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
        const isFull = spotsRemaining <= 0;
        const fillPercentage = (bounty.accepted_creators_count / bounty.max_accepted_creators) * 100;

        return (
          <Card
            key={bounty.id}
            className="group bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden"
            onClick={() => handleCardClick(bounty.id)}
          >
            {/* Banner */}
            {bounty.banner_url && (
              <div className="relative h-28 overflow-hidden">
                <OptimizedImage
                  src={bounty.banner_url}
                  alt={bounty.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
              </div>
            )}
            
            <CardContent className="p-5 font-inter tracking-[-0.5px]">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground truncate mb-2">
                    {bounty.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      bounty.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {bounty.status}
                    </span>
                    {bounty.is_private && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        Private
                      </span>
                    )}
                  </div>
                </div>
                {onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(bounty);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Retainer highlight */}
              <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Retainer</span>
                  <span className="text-lg font-semibold text-primary">${bounty.monthly_retainer.toLocaleString()}</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Video className="h-3.5 w-3.5" />
                  <span>{bounty.videos_per_month} videos/mo</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span className={isFull ? 'text-destructive' : ''}>
                    {spotsRemaining} spots left
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFull ? 'bg-destructive' : 'bg-primary'
                    }`}
                    style={{ width: `${fillPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>{bounty.accepted_creators_count} accepted</span>
                  <span>{bounty.max_accepted_creators} max</span>
                </div>
              </div>

              {/* Copy link button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 text-sm font-medium border-border/50 hover:bg-muted/50"
                onClick={(e) => handleCopyUrl(bounty.id, e)}
              >
                {copiedId === bounty.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}