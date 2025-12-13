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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {bounties.map((bounty) => {
        const spotsRemaining = bounty.max_accepted_creators - bounty.accepted_creators_count;
        const isFull = spotsRemaining <= 0;

        return (
          <Card
            key={bounty.id}
            className="bg-card border animate-fade-in flex flex-col overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => handleCardClick(bounty.id)}
          >
            {bounty.banner_url && (
              <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                <OptimizedImage
                  src={bounty.banner_url}
                  alt={bounty.title}
                  className="w-full h-full object-cover object-center"
                />
              </div>
            )}
            
            <CardContent className="p-4 flex-1 flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold line-clamp-2 leading-snug mb-1">
                    {bounty.title}
                  </h3>
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge
                      variant="outline"
                      className={
                        bounty.status === 'active'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                      }
                    >
                      {bounty.status}
                    </Badge>
                    {bounty.is_private && (
                      <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/20">
                        <Lock className="h-3 w-3 mr-1" />
                        Private
                      </Badge>
                    )}
                  </div>
                </div>
                {onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(bounty);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Monthly Retainer
                  </span>
                  <span className="font-semibold">${bounty.monthly_retainer.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Video className="h-4 w-4" />
                    Videos/Month
                  </span>
                  <span className="font-semibold">{bounty.videos_per_month}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    Positions
                  </span>
                  <span className={`font-semibold ${isFull ? 'text-red-500' : 'text-green-500'}`}>
                    {bounty.accepted_creators_count} / {bounty.max_accepted_creators}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => handleCopyUrl(bounty.id, e)}
                >
                  {copiedId === bounty.id ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copiedId === bounty.id ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}