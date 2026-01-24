import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  DollarSign,
  Calendar,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Campaign {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  status: string;
  review_status: string;
  review_notes: string | null;
  created_at: string;
  brand_id: string;
  brands: {
    name: string;
    logo_url: string | null;
    slug: string;
  };
}

interface CampaignReviewDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete: () => void;
}

export function CampaignReviewDialog({
  campaign,
  open,
  onOpenChange,
  onReviewComplete,
}: CampaignReviewDialogProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"approve" | "reject" | "changes" | null>(null);

  const handleReview = async (reviewAction: "approve" | "reject" | "changes") => {
    setLoading(true);
    setAction(reviewAction);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let newReviewStatus: string;
      let newStatus: string | undefined;

      switch (reviewAction) {
        case "approve":
          newReviewStatus = "approved";
          newStatus = "active"; // Activate the campaign
          break;
        case "reject":
          newReviewStatus = "rejected";
          break;
        case "changes":
          newReviewStatus = "changes_requested";
          break;
        default:
          throw new Error("Invalid action");
      }

      const updateData: any = {
        review_status: newReviewStatus,
        review_notes: notes || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      if (newStatus) {
        updateData.status = newStatus;
      }

      const { error } = await supabase
        .from("bounty_campaigns")
        .update(updateData)
        .eq("id", campaign.id);

      if (error) throw error;

      toast.success(
        reviewAction === "approve"
          ? "Campaign approved and activated"
          : reviewAction === "reject"
          ? "Campaign rejected"
          : "Changes requested from brand"
      );

      onReviewComplete();
    } catch (error: any) {
      console.error("Error reviewing campaign:", error);
      toast.error(error.message || "Failed to review campaign");
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {campaign.brands?.logo_url ? (
              <img
                src={campaign.brands.logo_url}
                alt={campaign.brands.name}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <span className="block">{campaign.title}</span>
              <span className="text-sm font-normal text-muted-foreground">
                by {campaign.brands?.name}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  Reward
                </div>
                <p className="text-lg font-semibold">
                  ${campaign.reward_amount} per submission
                </p>
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  Submitted
                </div>
                <p className="text-sm font-medium">
                  {format(new Date(campaign.created_at), "PPP")}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <FileText className="h-4 w-4" />
                Description
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {campaign.description || "No description provided"}
                </p>
              </div>
            </div>

            {campaign.brands?.slug && (
              <a
                href={`/portal/${campaign.brands.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                View Brand Portal
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <Separator />

          {/* Review Notes */}
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Review Notes (optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes for the brand about this review..."
              className="mt-2"
              rows={3}
            />
          </div>

          {/* Previous Notes */}
          {campaign.review_notes && (
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <p className="text-xs text-amber-600 font-medium mb-1">
                Previous Review Notes:
              </p>
              <p className="text-sm">{campaign.review_notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => handleReview("reject")}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              {loading && action === "reject" && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>

            <Button
              variant="outline"
              onClick={() => handleReview("changes")}
              disabled={loading}
            >
              {loading && action === "changes" && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              <AlertTriangle className="h-4 w-4 mr-2" />
              Request Changes
            </Button>

            <Button
              onClick={() => handleReview("approve")}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading && action === "approve" && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve & Launch
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
