import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Check,
  X,
  ExternalLink,
  DollarSign,
  Briefcase,
  Zap,
  Clock,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Pitch {
  id: string;
  type: "creator_to_brand" | "brand_to_creator";
  creator_id: string;
  brand_id: string;
  campaign_id: string | null;
  boost_id: string | null;
  message: string;
  portfolio_links: string[] | null;
  proposed_rate: number | null;
  status: "pending" | "accepted" | "rejected" | "expired";
  response_message: string | null;
  responded_at: string | null;
  created_at: string;
  expires_at: string;
  creator?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
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

interface BrandPitchesPanelProps {
  brandId: string;
}

export function BrandPitchesPanel({ brandId }: BrandPitchesPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseAction, setResponseAction] = useState<"accept" | "reject">("accept");
  const [responseMessage, setResponseMessage] = useState("");

  const { data: pitches, isLoading } = useQuery({
    queryKey: ["brand-pitches", brandId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pitches")
        .select(`
          *,
          creator:creator_id (id, username, full_name, avatar_url),
          campaign:campaign_id (id, title),
          boost:boost_id (id, title)
        `)
        .eq("brand_id", brandId)
        .eq("type", "creator_to_brand")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Pitch[];
    },
  });

  const respondToPitch = useMutation({
    mutationFn: async ({ pitchId, status, message }: { pitchId: string; status: "accepted" | "rejected"; message?: string }) => {
      const { error } = await supabase
        .from("pitches")
        .update({
          status,
          response_message: message || null,
          responded_at: new Date().toISOString(),
        })
        .eq("id", pitchId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["brand-pitches", brandId] });
      toast({
        title: variables.status === "accepted" ? "Pitch accepted" : "Pitch rejected",
        description: variables.status === "accepted"
          ? "The creator has been added to the opportunity."
          : "The creator has been notified.",
      });
      setResponseDialogOpen(false);
      setSelectedPitch(null);
      setResponseMessage("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to respond to pitch",
        description: error.message,
      });
    },
  });

  const pendingPitches = pitches?.filter((p) => p.status === "pending") || [];
  const otherPitches = pitches?.filter((p) => p.status !== "pending") || [];

  const handleQuickAction = (pitch: Pitch, action: "accept" | "reject") => {
    setSelectedPitch(pitch);
    setResponseAction(action);
    if (action === "reject") {
      setResponseDialogOpen(true);
    } else {
      respondToPitch.mutate({ pitchId: pitch.id, status: "accepted" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pitches || pitches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Briefcase className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <h3 className="font-medium text-sm mb-1">No pitches yet</h3>
        <p className="text-xs text-muted-foreground max-w-[220px]">
          When creators pitch to work with you, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Pending Pitches */}
          {pendingPitches.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground px-1">
                New ({pendingPitches.length})
              </h4>
              {pendingPitches.map((pitch) => (
                <PitchCard
                  key={pitch.id}
                  pitch={pitch}
                  onAccept={() => handleQuickAction(pitch, "accept")}
                  onReject={() => handleQuickAction(pitch, "reject")}
                  onSelect={() => setSelectedPitch(pitch)}
                  isProcessing={respondToPitch.isPending && selectedPitch?.id === pitch.id}
                />
              ))}
            </div>
          )}

          {/* Past Pitches */}
          {otherPitches.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground px-1">
                Past ({otherPitches.length})
              </h4>
              {otherPitches.map((pitch) => (
                <PitchCard
                  key={pitch.id}
                  pitch={pitch}
                  onSelect={() => setSelectedPitch(pitch)}
                  showStatus
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Response Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Pitch</DialogTitle>
            <DialogDescription>
              Let the creator know why you're declining their pitch.
            </DialogDescription>
          </DialogHeader>
          {selectedPitch && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedPitch.creator?.avatar_url || ""} />
                  <AvatarFallback>
                    {selectedPitch.creator?.username?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {selectedPitch.creator?.full_name || selectedPitch.creator?.username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{selectedPitch.creator?.username}
                  </p>
                </div>
              </div>

              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Optional: Add a message to the creator..."
                rows={3}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setResponseDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    respondToPitch.mutate({
                      pitchId: selectedPitch.id,
                      status: "rejected",
                      message: responseMessage,
                    })
                  }
                  disabled={respondToPitch.isPending}
                  className="flex-1 bg-rose-600 hover:bg-rose-700"
                >
                  {respondToPitch.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Reject Pitch
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface PitchCardProps {
  pitch: Pitch;
  onAccept?: () => void;
  onReject?: () => void;
  onSelect: () => void;
  showStatus?: boolean;
  isProcessing?: boolean;
}

function PitchCard({
  pitch,
  onAccept,
  onReject,
  onSelect,
  showStatus,
  isProcessing,
}: PitchCardProps) {
  const isPending = pitch.status === "pending";
  const opportunityTitle = pitch.campaign?.title || pitch.boost?.title || "General";
  const opportunityType = pitch.campaign_id ? "campaign" : pitch.boost_id ? "boost" : null;

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-all hover:bg-muted/30",
        isPending && "border-primary/30 bg-primary/5"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={pitch.creator?.avatar_url || ""} />
          <AvatarFallback className="text-xs">
            {pitch.creator?.username?.charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium truncate">
                {pitch.creator?.full_name || pitch.creator?.username}
              </span>
              {showStatus && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    pitch.status === "accepted" && "bg-emerald-500/10 text-emerald-500",
                    pitch.status === "rejected" && "bg-rose-500/10 text-rose-500",
                    pitch.status === "expired" && "bg-muted text-muted-foreground"
                  )}
                >
                  {pitch.status}
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(pitch.created_at), { addSuffix: true })}
            </span>
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

          {/* Message preview */}
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {pitch.message}
          </p>

          {/* Actions for pending */}
          {isPending && onAccept && onReject && (
            <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                onClick={onAccept}
                disabled={isProcessing}
                className="h-7 text-xs gap-1 flex-1"
              >
                {isProcessing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                disabled={isProcessing}
                className="h-7 text-xs gap-1 flex-1 text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
              >
                <X className="h-3 w-3" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
