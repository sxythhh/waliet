import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Plus, Check } from "lucide-react";

interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
}

interface ConnectedCampaign extends Campaign {
  connection_id: string;
  connected_at: string;
}

interface ManageCampaignsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountUsername: string;
  accountPlatform: string;
  onUpdate: () => void;
}

export function ManageCampaignsDialog({
  open,
  onOpenChange,
  accountId,
  accountUsername,
  accountPlatform,
  onUpdate,
}: ManageCampaignsDialogProps) {
  const [connectedCampaigns, setConnectedCampaigns] = useState<ConnectedCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCampaigns();
    }
  }, [open, accountId]);

  const fetchCampaigns = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch campaigns the user has joined (approved only)
    const { data: submissions } = await supabase
      .from("campaign_submissions")
      .select("campaign_id, campaigns(id, title, brand_name, brand_logo_url, allowed_platforms)")
      .eq("creator_id", user.id)
      .eq("status", "approved");

    const joinedCampaignIds = submissions?.map(s => s.campaign_id) || [];

    // Fetch connected campaigns for this account
    const { data: connections } = await supabase
      .from("social_account_campaigns")
      .select(`
        id,
        campaign_id,
        connected_at,
        campaigns (
          id,
          title,
          brand_name,
          brand_logo_url,
          allowed_platforms
        )
      `)
      .eq("social_account_id", accountId);

    const connected = connections?.map((conn: any) => ({
      connection_id: conn.id,
      connected_at: conn.connected_at,
      ...conn.campaigns,
    })) || [];

    setConnectedCampaigns(connected);

    // Get available campaigns (joined but not connected to this account)
    // AND that allow this account's platform
    const connectedIds = new Set(connected.map(c => c.id));
    const available = submissions
      ?.filter(s => {
        if (!s.campaigns || connectedIds.has(s.campaign_id)) return false;
        
        // Check if the campaign allows this account's platform
        const allowedPlatforms = s.campaigns.allowed_platforms || [];
        return allowedPlatforms.includes(accountPlatform.toLowerCase());
      })
      .map(s => s.campaigns)
      .filter((c, index, self) => 
        c && self.findIndex(t => t.id === c.id) === index
      ) as Campaign[] || [];

    setAvailableCampaigns(available);
    setLoading(false);
  };

  const handleLink = async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from("social_account_campaigns")
        .insert({
          social_account_id: accountId,
          campaign_id: campaignId,
        });

      if (error) throw error;

      toast.success("Campaign linked successfully");
      fetchCampaigns();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to link campaign");
    }
  };

  const handleUnlink = async (connectionId: string, campaignTitle: string) => {
    try {
      const { error } = await supabase
        .from("social_account_campaigns")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      toast.success(`Unlinked from ${campaignTitle}`);
      fetchCampaigns();
      onUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to unlink campaign");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Campaigns</DialogTitle>
          <DialogDescription>
            Link or unlink <span className="font-medium capitalize">{accountPlatform}</span> account{" "}
            <span className="font-medium">@{accountUsername}</span> to campaigns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Connected Campaigns */}
          {connectedCampaigns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Connected Campaigns ({connectedCampaigns.length})</h4>
              <div className="space-y-2">
                {connectedCampaigns.map((campaign) => (
                  <div
                    key={campaign.connection_id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {campaign.brand_logo_url && (
                        <img
                          src={campaign.brand_logo_url}
                          alt={campaign.brand_name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{campaign.title}</p>
                        <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        <Check className="w-3 h-3 mr-1" />
                        Linked
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(campaign.connection_id, campaign.title)}
                      className="ml-2 h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Campaigns */}
          {availableCampaigns.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Available to Link ({availableCampaigns.length})</h4>
              <div className="space-y-2">
                {availableCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {campaign.brand_logo_url && (
                        <img
                          src={campaign.brand_logo_url}
                          alt={campaign.brand_name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{campaign.title}</p>
                        <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleLink(campaign.id)}
                      className="ml-2 h-8 gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty States */}
          {connectedCampaigns.length === 0 && availableCampaigns.length === 0 && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No campaigns available to link. Join campaigns from the Discover tab first.
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading campaigns...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
