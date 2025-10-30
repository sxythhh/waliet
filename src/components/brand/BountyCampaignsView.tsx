import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Video, Users, Eye, Trash2 } from "lucide-react";
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
  created_at: string;
}

interface BountyCampaignsViewProps {
  bounties: BountyCampaign[];
  onViewApplications: (bounty: { id: string; title: string; maxAccepted: number; currentAccepted: number }) => void;
  onDelete?: (bounty: BountyCampaign) => void;
}

export function BountyCampaignsView({ bounties, onViewApplications, onDelete }: BountyCampaignsViewProps) {
  if (bounties.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
        <p className="text-muted-foreground">No bounty campaigns yet</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Create your first bounty to hire creators on retainer</p>
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
            className="group bg-card border transition-all duration-300 animate-fade-in flex flex-col overflow-hidden hover:bg-accent/50"
          >
            {bounty.banner_url && (
              <div className="relative w-full h-32 flex-shrink-0 overflow-hidden bg-muted">
                <OptimizedImage
                  src={bounty.banner_url}
                  alt={bounty.title}
                  className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
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
                </div>
                {onDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(bounty)}
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
              <Button
                onClick={() => onViewApplications({
                  id: bounty.id,
                  title: bounty.title,
                  maxAccepted: bounty.max_accepted_creators,
                  currentAccepted: bounty.accepted_creators_count
                })}
                variant="outline"
                size="sm"
                className="w-full mt-auto"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Applications
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}