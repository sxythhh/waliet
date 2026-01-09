import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { Flag, DollarSign, Clock, CheckCircle2, XCircle, AlertTriangle, ExternalLink, RefreshCw, Loader2 } from "lucide-react";

interface FlaggedItem {
  id: string;
  payout_request_id: string;
  submission_id: string;
  amount: number;
  source_type: string;
  source_id: string;
  flagged_at: string;
  flagged_by: string;
  flag_reason: string | null;
  clawback_status: string | null;
  created_at: string;
  // Joined data
  submission?: {
    id: string;
    video_url: string;
    video_thumbnail_url: string | null;
    video_author_username: string | null;
    platform: string;
    creator_id: string;
    views: number | null;
  };
  payout_request?: {
    id: string;
    user_id: string;
    status: string;
    clearing_ends_at: string;
  };
  creator?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  brand?: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  flagger?: {
    id: string;
    username: string;
  };
}

export function FlaggedReviewsTab() {
  const [flaggedItems, setFlaggedItems] = useState<FlaggedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [clawbackDialogOpen, setClawbackDialogOpen] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FlaggedItem | null>(null);
  const [clawbackReason, setClawbackReason] = useState("");

  useEffect(() => {
    fetchFlaggedItems();
  }, []);

  const fetchFlaggedItems = async () => {
    setLoading(true);
    try {
      // Fetch payout items that have been flagged and are pending review
      const { data, error } = await supabase
        .from("submission_payout_items")
        .select(`
          *,
          payout_request:submission_payout_requests!payout_request_id (
            id,
            user_id,
            status,
            clearing_ends_at
          )
        `)
        .not("flagged_at", "is", null)
        .or("clawback_status.is.null,clawback_status.eq.pending_review")
        .order("flagged_at", { ascending: false });

      if (error) throw error;

      // Fetch additional data for each item
      const enrichedItems: FlaggedItem[] = [];
      
      for (const item of data || []) {
        // Get submission details
        const { data: submission } = await supabase
          .from("video_submissions")
          .select("id, video_url, video_thumbnail_url, video_author_username, platform, creator_id, views")
          .eq("id", item.submission_id)
          .single();

        // Get creator profile
        let creator = null;
        if (submission?.creator_id) {
          const { data: creatorData } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", submission.creator_id)
            .single();
          creator = creatorData;
        }

        // Get brand info based on source
        let brand = null;
        if (item.source_type === "campaign") {
          const { data: campaign } = await supabase
            .from("campaigns")
            .select("brand_id, brand_name, brand_logo_url")
            .eq("id", item.source_id)
            .single();
          if (campaign) {
            brand = { id: campaign.brand_id, name: campaign.brand_name, logo_url: campaign.brand_logo_url };
          }
        } else if (item.source_type === "boost") {
          const { data: boost } = await supabase
            .from("bounty_campaigns")
            .select("brand_id, brands!inner(id, name, logo_url)")
            .eq("id", item.source_id)
            .single();
          if (boost?.brands) {
            brand = boost.brands as any;
          }
        }

        // Get flagger info
        let flagger = null;
        if (item.flagged_by) {
          const { data: flaggerData } = await supabase
            .from("profiles")
            .select("id, username")
            .eq("id", item.flagged_by)
            .single();
          flagger = flaggerData;
        }

        enrichedItems.push({
          ...item,
          submission: submission || undefined,
          payout_request: item.payout_request as any,
          creator: creator || undefined,
          brand: brand || undefined,
          flagger: flagger || undefined,
        });
      }

      setFlaggedItems(enrichedItems);
    } catch (error) {
      console.error("Error fetching flagged items:", error);
      toast.error("Failed to load flagged submissions");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteClawback = async () => {
    if (!selectedItem) return;
    setProcessing(selectedItem.id);

    try {
      const { data, error } = await supabase.functions.invoke("execute-clawback", {
        body: {
          payout_item_id: selectedItem.id,
          reason: clawbackReason.trim() || "Flagged content violation",
        },
      });

      if (error) throw error;

      toast.success("Clawback executed successfully");
      setClawbackDialogOpen(false);
      setSelectedItem(null);
      setClawbackReason("");
      fetchFlaggedItems();
    } catch (error) {
      console.error("Error executing clawback:", error);
      toast.error("Failed to execute clawback");
    } finally {
      setProcessing(null);
    }
  };

  const handleClearFlag = async () => {
    if (!selectedItem) return;
    setProcessing(selectedItem.id);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update the payout item to clear the flag
      const { error } = await supabase
        .from("submission_payout_items")
        .update({
          clawback_status: "cleared",
          clawed_back_at: new Date().toISOString(),
          clawed_back_by: user.id,
        })
        .eq("id", selectedItem.id);

      if (error) throw error;

      // Remove the flag from the video submission
      if (selectedItem.submission_id) {
        await supabase
          .from("video_submissions")
          .update({ is_flagged: false })
          .eq("id", selectedItem.submission_id);
      }

      // Send notification to creator
      if (selectedItem.creator?.id) {
        await supabase.functions.invoke("send-discord-dm", {
          body: {
            userId: selectedItem.creator.id,
            message: {
              content: `Good news! The flag on your video has been reviewed and cleared. Your payout will proceed as scheduled.`,
            },
          },
        });
      }

      toast.success("Flag cleared - payout will proceed");
      setClearDialogOpen(false);
      setSelectedItem(null);
      fetchFlaggedItems();
    } catch (error) {
      console.error("Error clearing flag:", error);
      toast.error("Failed to clear flag");
    } finally {
      setProcessing(null);
    }
  };

  const getDaysRemaining = (clearingEndsAt: string) => {
    const endDate = new Date(clearingEndsAt);
    const now = new Date();
    return Math.max(0, differenceInDays(endDate, now));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (flaggedItems.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Flag className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-lg font-medium text-muted-foreground">No flagged submissions</p>
          <p className="text-sm text-muted-foreground mt-1">
            Flagged submissions pending review will appear here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium tracking-[-0.5px]">
            {flaggedItems.length} flagged submission{flaggedItems.length !== 1 ? "s" : ""} pending review
          </h3>
          <p className="text-xs text-muted-foreground tracking-[-0.5px]">
            Review and decide whether to clawback or clear each flag
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchFlaggedItems}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Flagged Items List */}
      <div className="grid gap-3">
        {flaggedItems.map((item) => {
          const daysRemaining = item.payout_request?.clearing_ends_at
            ? getDaysRemaining(item.payout_request.clearing_ends_at)
            : 0;

          return (
            <div
              key={item.id}
              className="bg-card/50 rounded-xl p-4 border border-amber-500/20"
            >
              {/* Top Row: Creator, Brand, Amount */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border/40">
                    <AvatarImage src={item.creator?.avatar_url || undefined} />
                    <AvatarFallback className="text-sm bg-muted/40">
                      {item.creator?.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm tracking-[-0.5px]">
                      {item.creator?.full_name || item.creator?.username || "Unknown Creator"}
                    </p>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                      @{item.creator?.username || "unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                    <Flag className="h-3 w-3 mr-1" />
                    Flagged
                  </Badge>
                  <div className="text-right">
                    <p className="text-lg font-bold tracking-[-0.5px]">${Number(item.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground tracking-[-0.5px]">at risk</p>
                  </div>
                </div>
              </div>

              {/* Video Info */}
              <div className="flex items-center gap-4 py-3 border-y border-border/30">
                {item.submission?.video_thumbnail_url && (
                  <img
                    src={item.submission.video_thumbnail_url}
                    alt="Video thumbnail"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate tracking-[-0.5px]">
                    {item.submission?.video_author_username
                      ? `@${item.submission.video_author_username}`
                      : "Video submission"}
                  </p>
                  <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                    {item.submission?.platform} • {item.submission?.views?.toLocaleString() || 0} views
                  </p>
                  {item.submission?.video_url && (
                    <a
                      href={item.submission.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary flex items-center gap-1 mt-1 hover:underline"
                    >
                      View video <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground tracking-[-0.5px]">Brand</p>
                  <p className="text-sm font-medium tracking-[-0.5px]">{item.brand?.name || "Unknown"}</p>
                </div>
              </div>

              {/* Flag Details */}
              <div className="py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium tracking-[-0.5px]">Flag Reason</p>
                    <p className="text-sm text-muted-foreground tracking-[-0.5px]">
                      {item.flag_reason || "No reason provided"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Flagged by @{item.flagger?.username || "unknown"}</span>
                  <span>•</span>
                  <span>{item.flagged_at ? formatDistanceToNow(new Date(item.flagged_at), { addSuffix: true }) : "Unknown"}</span>
                  <span>•</span>
                  <span className={daysRemaining <= 2 ? "text-amber-500 font-medium" : ""}>
                    {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} until auto-clear
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setSelectedItem(item);
                    setClawbackDialogOpen(true);
                  }}
                  disabled={processing === item.id}
                  className="gap-1.5 h-8 text-xs tracking-[-0.5px]"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Execute Clawback
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedItem(item);
                    setClearDialogOpen(true);
                  }}
                  disabled={processing === item.id}
                  className="gap-1.5 h-8 text-xs tracking-[-0.5px] text-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/10"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Clear Flag
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clawback Confirmation Dialog */}
      <Dialog open={clawbackDialogOpen} onOpenChange={setClawbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Execute Clawback
            </DialogTitle>
            <DialogDescription>
              This will cancel the ${selectedItem?.amount?.toFixed(2)} payout and refund the brand.
              The creator will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-medium text-destructive tracking-[-0.5px]">
                Warning: This action cannot be undone
              </p>
              <p className="text-xs text-muted-foreground mt-1 tracking-[-0.5px]">
                The funds will be returned to the brand's wallet immediately.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm tracking-[-0.5px]">
                Clawback Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why this clawback is being executed..."
                value={clawbackReason}
                onChange={(e) => setClawbackReason(e.target.value)}
                className="min-h-[80px] text-sm tracking-[-0.5px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setClawbackDialogOpen(false);
                setSelectedItem(null);
                setClawbackReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleExecuteClawback}
              disabled={processing !== null}
            >
              {processing ? "Processing..." : "Execute Clawback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Flag Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-5 w-5" />
              Clear Flag
            </DialogTitle>
            <DialogDescription>
              This will dismiss the flag and allow the ${selectedItem?.amount?.toFixed(2)} payout to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-sm font-medium text-emerald-500 tracking-[-0.5px]">
                The creator will be notified that their submission was cleared.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setClearDialogOpen(false);
                setSelectedItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearFlag}
              disabled={processing !== null}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {processing ? "Processing..." : "Clear Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
