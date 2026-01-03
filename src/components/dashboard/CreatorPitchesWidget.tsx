import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  Zap,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Pitch {
  id: string;
  type: "creator_to_brand" | "brand_to_creator";
  brand_id: string;
  campaign_id: string | null;
  boost_id: string | null;
  message: string;
  proposed_rate: number | null;
  status: "pending" | "accepted" | "rejected" | "expired";
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
  expires_at: string;
  brand?: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
  };
  campaign?: {
    id: string;
    title: string;
  };
  boost?: {
    id: string;
    title: string;
  };
}

export function CreatorPitchesWidget() {
  const navigate = useNavigate();

  const { data: pitches, isLoading } = useQuery({
    queryKey: ["creator-pitches"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("pitches")
        .select(`
          *,
          brand:brand_id (id, name, slug, logo_url),
          campaign:campaign_id (id, title),
          boost:boost_id (id, title)
        `)
        .eq("creator_id", user.id)
        .eq("type", "creator_to_brand")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Pitch[];
    },
  });

  if (isLoading) {
    return null;
  }

  if (!pitches || pitches.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3.5 w-3.5" />;
      case "accepted":
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "rejected":
        return <XCircle className="h-3.5 w-3.5" />;
      case "expired":
        return <AlertCircle className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "accepted":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "rejected":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "expired":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Your Pitches</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pitches.map((pitch) => {
          const opportunityTitle = pitch.campaign?.title || pitch.boost?.title || "General";
          const opportunityType = pitch.campaign_id ? "campaign" : pitch.boost_id ? "boost" : null;

          return (
            <Card
              key={pitch.id}
              className={cn(
                "p-4 cursor-pointer transition-all hover:bg-muted/30 group",
                pitch.status === "pending" && "border-amber-500/30"
              )}
              onClick={() => navigate(`/b/${pitch.brand?.slug}`)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={pitch.brand?.logo_url || ""} />
                  <AvatarFallback className="rounded-lg text-xs bg-muted">
                    {pitch.brand?.name?.charAt(0).toUpperCase() || "B"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate group-hover:underline">
                      {pitch.brand?.name}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 flex items-center gap-1",
                        getStatusColor(pitch.status)
                      )}
                    >
                      {getStatusIcon(pitch.status)}
                      {pitch.status}
                    </Badge>
                  </div>

                  {/* Opportunity */}
                  <div className="flex items-center gap-1 mt-0.5">
                    {opportunityType === "campaign" && (
                      <Briefcase className="h-3 w-3 text-muted-foreground" />
                    )}
                    {opportunityType === "boost" && (
                      <Zap className="h-3 w-3 text-amber-500" />
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {opportunityTitle}
                    </span>
                    {pitch.proposed_rate && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          ${pitch.proposed_rate}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Message preview or response */}
                  {pitch.status === "accepted" || pitch.status === "rejected" ? (
                    pitch.response_message && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
                        "{pitch.response_message}"
                      </p>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {pitch.message}
                    </p>
                  )}

                  {/* Timestamp */}
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {pitch.responded_at
                      ? `Responded ${formatDistanceToNow(new Date(pitch.responded_at), { addSuffix: true })}`
                      : `Sent ${formatDistanceToNow(new Date(pitch.created_at), { addSuffix: true })}`}
                  </p>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
