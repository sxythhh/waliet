import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase,
  Zap,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Pitch {
  id: string;
  type: "creator_to_brand" | "brand_to_creator";
  brand_id: string;
  campaign_id: string | null;
  boost_id: string | null;
  subject: string;
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
    slug: string;
  };
  boost?: {
    id: string;
    title: string;
    slug: string;
  };
}

export function ReceivedPitchesWidget() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [responseAction, setResponseAction] = useState<"accept" | "reject">("accept");
  const [responseMessage, setResponseMessage] = useState("");

  const { data: pitches, isLoading } = useQuery({
    queryKey: ["received-pitches"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("pitches")
        .select(`
          *,
          brand:brand_id (id, name, slug, logo_url),
          campaign:campaign_id (id, title, slug),
          boost:boost_id (id, title, slug)
        `)
        .eq("creator_id", user.id)
        .eq("type", "brand_to_creator")
        .order("created_at", { ascending: false })
        .limit(10);

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

      // If accepted, add to the campaign/boost
      if (status === "accepted" && selectedPitch) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (selectedPitch.campaign_id) {
          // Add to campaign
          await supabase.from("campaign_submissions").insert({
            campaign_id: selectedPitch.campaign_id,
            creator_id: user.id,
            status: "approved",
            submitted_at: new Date().toISOString(),
          });
        } else if (selectedPitch.boost_id) {
          // Add to boost
          await supabase.from("bounty_applications").insert({
            bounty_campaign_id: selectedPitch.boost_id,
            user_id: user.id,
            status: "accepted",
            applied_at: new Date().toISOString(),
          });
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["received-pitches"] });
      queryClient.invalidateQueries({ queryKey: ["my-campaigns"] });
      toast.success(
        variables.status === "accepted" ? "Invitation accepted!" : "Invitation declined",
        {
          description: variables.status === "accepted"
            ? "You've been added to the campaign."
            : "The brand has been notified.",
        }
      );
      setResponseDialogOpen(false);
      setSelectedPitch(null);
      setResponseMessage("");
    },
    onError: (error: Error) => {
      toast.error("Failed to respond", { description: error.message });
    },
  });

  const pendingPitches = pitches?.filter((p) => p.status === "pending") || [];
  const otherPitches = pitches?.filter((p) => p.status !== "pending") || [];

  const handleResponse = (pitch: Pitch, action: "accept" | "reject") => {
    setSelectedPitch(pitch);
    setResponseAction(action);
    if (action === "accept") {
      respondToPitch.mutate({ pitchId: pitch.id, status: "accepted" });
    } else {
      setResponseDialogOpen(true);
    }
  };

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
        return "bg-primary/10 text-primary border-primary/20";
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
    <>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Brand Invitations</h3>
          {pendingPitches.length > 0 && (
            <Badge className="bg-primary text-primary-foreground text-xs">
              {pendingPitches.length} new
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pitches.map((pitch) => {
            const opportunityTitle = pitch.campaign?.title || pitch.boost?.title || "General opportunity";
            const opportunityType = pitch.campaign_id ? "campaign" : pitch.boost_id ? "boost" : null;
            const isPending = pitch.status === "pending";

            return (
              <Card
                key={pitch.id}
                className={cn(
                  "p-4 transition-all hover:bg-muted/30 group",
                  isPending && "border-primary/40 bg-primary/5"
                )}
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
                      <span
                        className="text-sm font-medium truncate cursor-pointer hover:underline"
                        onClick={() => navigate(`/b/${pitch.brand?.slug}`)}
                      >
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

                    {/* Subject */}
                    {pitch.subject && (
                      <p className="text-xs font-medium text-foreground mt-0.5 line-clamp-1">
                        {pitch.subject}
                      </p>
                    )}

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
                          <DollarSign className="h-3 w-3 text-emerald-500" />
                          <span className="text-xs text-emerald-500 font-medium">
                            ${pitch.proposed_rate}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Message preview */}
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {pitch.message}
                    </p>

                    {/* Actions for pending */}
                    {isPending && (
                      <div className="flex items-center gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() => handleResponse(pitch, "accept")}
                          disabled={respondToPitch.isPending && selectedPitch?.id === pitch.id}
                          className="h-7 text-xs gap-1 flex-1"
                        >
                          {respondToPitch.isPending && selectedPitch?.id === pitch.id && responseAction === "accept" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResponse(pitch, "reject")}
                          disabled={respondToPitch.isPending}
                          className="h-7 text-xs gap-1 flex-1 text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                        >
                          <X className="h-3 w-3" />
                          Decline
                        </Button>
                      </div>
                    )}

                    {/* Timestamp */}
                    {!isPending && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {pitch.responded_at
                          ? `Responded ${formatDistanceToNow(new Date(pitch.responded_at), { addSuffix: true })}`
                          : `Received ${formatDistanceToNow(new Date(pitch.created_at), { addSuffix: true })}`}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Decline Dialog */}
      <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Invitation</DialogTitle>
            <DialogDescription>
              Let the brand know why you're declining (optional).
            </DialogDescription>
          </DialogHeader>
          {selectedPitch && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={selectedPitch.brand?.logo_url || ""} />
                  <AvatarFallback className="rounded-lg">
                    {selectedPitch.brand?.name?.charAt(0).toUpperCase() || "B"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {selectedPitch.brand?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPitch.campaign?.title || selectedPitch.boost?.title}
                  </p>
                </div>
              </div>

              <Textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Optional: Add a message to the brand..."
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
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
