import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";

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
  const queryClient = useQueryClient();
  const [selectedPitch, setSelectedPitch] = useState<Pitch | null>(null);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
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
          await supabase.from("campaign_submissions").insert({
            campaign_id: selectedPitch.campaign_id,
            creator_id: user.id,
            status: "approved",
            submitted_at: new Date().toISOString(),
          });
        } else if (selectedPitch.boost_id) {
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
      setDetailsDialogOpen(false);
      setSelectedPitch(null);
      setResponseMessage("");
    },
    onError: (error: Error) => {
      toast.error("Failed to respond", { description: error.message });
    },
  });

  const pendingPitches = pitches?.filter((p) => p.status === "pending") || [];

  const handleAccept = (pitch: Pitch) => {
    setSelectedPitch(pitch);
    respondToPitch.mutate({ pitchId: pitch.id, status: "accepted" });
  };

  const handleDecline = (pitch: Pitch) => {
    setSelectedPitch(pitch);
    setResponseDialogOpen(true);
  };

  const handleLearnMore = (pitch: Pitch) => {
    setSelectedPitch(pitch);
    setDetailsDialogOpen(true);
  };

  if (isLoading) {
    return null;
  }

  if (!pendingPitches || pendingPitches.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pendingPitches.map((pitch) => {
            const invitedDate = format(new Date(pitch.created_at), "MMMM d");
            const isLoading = respondToPitch.isPending && selectedPitch?.id === pitch.id;

            return (
              <div
                key={pitch.id}
                className="rounded-xl border border-border bg-card p-5 space-y-4"
              >
                {/* Invited badge */}
                <div className="flex items-center gap-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Invited {invitedDate}</span>
                  </div>
                </div>

                {/* Brand info */}
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={pitch.brand?.logo_url || ""} />
                    <AvatarFallback className="text-sm font-medium bg-muted">
                      {pitch.brand?.name?.charAt(0).toUpperCase() || "B"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">
                      {pitch.brand?.name}
                    </h4>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                      {pitch.message || pitch.subject || "You've been invited to collaborate"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLearnMore(pitch)}
                    className="flex-1 h-9 text-sm font-medium"
                  >
                    Learn more
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleAccept(pitch)}
                    disabled={isLoading}
                    className="flex-1 h-9 text-sm font-medium bg-foreground text-background hover:bg-foreground/90"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Accept invite"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitation Details</DialogTitle>
          </DialogHeader>
          {selectedPitch && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={selectedPitch.brand?.logo_url || ""} />
                  <AvatarFallback className="text-base font-medium bg-muted">
                    {selectedPitch.brand?.name?.charAt(0).toUpperCase() || "B"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-foreground">
                    {selectedPitch.brand?.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Invited {format(new Date(selectedPitch.created_at), "MMMM d, yyyy")}
                  </p>
                </div>
              </div>

              {(selectedPitch.campaign || selectedPitch.boost) && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">
                    {selectedPitch.campaign ? "Campaign" : "Boost"}
                  </p>
                  <p className="text-sm font-medium">
                    {selectedPitch.campaign?.title || selectedPitch.boost?.title}
                  </p>
                  {selectedPitch.proposed_rate && (
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                      ${selectedPitch.proposed_rate} offered
                    </p>
                  )}
                </div>
              )}

              {selectedPitch.subject && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Subject</p>
                  <p className="text-sm font-medium">{selectedPitch.subject}</p>
                </div>
              )}

              {selectedPitch.message && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {selectedPitch.message}
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => handleDecline(selectedPitch)}
                  className="flex-1"
                >
                  Decline
                </Button>
                <Button
                  onClick={() => handleAccept(selectedPitch)}
                  disabled={respondToPitch.isPending}
                  className="flex-1 bg-foreground text-background hover:bg-foreground/90"
                >
                  {respondToPitch.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Accept invite"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={selectedPitch.brand?.logo_url || ""} />
                  <AvatarFallback className="text-sm font-medium bg-muted">
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
                  variant="destructive"
                  className="flex-1"
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
