import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";

interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brands?: {
    logo_url: string;
  } | null;
}

interface ConnectedCampaign extends Campaign {
  connection_id: string;
  connected_at: string;
}

interface ManageAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    username: string;
    platform: string;
    account_link?: string | null;
    follower_count?: number | null;
    is_verified?: boolean;
    hidden_from_public?: boolean;
  };
  demographicStatus: 'approved' | 'pending' | 'rejected' | null;
  daysUntilNext: number | null;
  lastSubmissionDate: string | null;
  nextSubmissionDate: Date | null;
  onUpdate: () => void;
  onSubmitDemographics: () => void;
  onReconnect: () => void;
}

export function ManageAccountDialog({
  open,
  onOpenChange,
  account,
  demographicStatus,
  daysUntilNext,
  lastSubmissionDate,
  nextSubmissionDate,
  onUpdate,
  onSubmitDemographics,
  onReconnect,
}: ManageAccountDialogProps) {
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const [hiddenFromPublic, setHiddenFromPublic] = useState(account.hidden_from_public ?? false);

  useEffect(() => {
    if (open) {
      setHiddenFromPublic(account.hidden_from_public ?? false);
    }
  }, [open, account.hidden_from_public]);

  const formatFollowerCount = (count: number | null | undefined) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src={isLightMode ? tiktokLogoBlack : tiktokLogo} alt="TikTok" className="w-5 h-5 object-contain" />;
      case "instagram":
        return <img src={isLightMode ? instagramLogoBlack : instagramLogo} alt="Instagram" className="w-5 h-5 object-contain" />;
      case "youtube":
        return <img src={isLightMode ? youtubeLogoBlack : youtubeLogo} alt="YouTube" className="w-5 h-5 object-contain" />;
      default:
        return null;
    }
  };

  const [connectedCampaigns, setConnectedCampaigns] = useState<ConnectedCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingCampaignId, setLinkingCampaignId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchCampaigns = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: submissions } = await supabase
        .from('campaign_submissions')
        .select('campaign_id')
        .eq('creator_id', user.id)
        .eq('status', 'approved');

      const uniqueCampaignIds = [...new Set(submissions?.map(s => s.campaign_id) || [])];

      const { data: campaignsData } = await supabase
        .from('campaigns')
        .select('id, title, brand_name, brand_logo_url, brands(logo_url)')
        .in('id', uniqueCampaignIds);

      const approvedCampaigns = campaignsData || [];

      const { data: connections } = await supabase
        .from('social_account_campaigns')
        .select(`
          id,
          connected_at,
          campaign_id,
          campaigns(id, title, brand_name, brand_logo_url, brands(logo_url))
        `)
        .eq('social_account_id', account.id)
        .eq('status', 'active');

      const connected = connections?.map(conn => ({
        ...(conn.campaigns as Campaign),
        connection_id: conn.id,
        connected_at: conn.connected_at
      })) || [];
      setConnectedCampaigns(connected);

      const connectedIds = connected.map(c => c.id);
      const available = approvedCampaigns.filter(c => !connectedIds.includes(c.id));
      setAvailableCampaigns(available);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load campaigns"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (campaignId: string) => {
    setLinkingCampaignId(campaignId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { data: existingRecord } = await supabase
        .from('social_account_campaigns')
        .select('id')
        .eq('social_account_id', account.id)
        .eq('campaign_id', campaignId)
        .eq('status', 'disconnected')
        .maybeSingle();

      if (existingRecord) {
        const { error } = await supabase
          .from('social_account_campaigns')
          .update({
            status: 'active',
            disconnected_at: null,
            connected_at: new Date().toISOString()
          })
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('social_account_campaigns')
          .insert({
            social_account_id: account.id,
            campaign_id: campaignId,
            user_id: user.id,
            status: 'active'
          });
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Campaign linked successfully"
      });
      await fetchCampaigns();
      onUpdate();
    } catch (error) {
      console.error('Error linking campaign:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to link campaign"
      });
    } finally {
      setLinkingCampaignId(null);
    }
  };

  const handleUnlink = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('social_account_campaigns')
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString()
        })
        .eq('id', connectionId);
      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign unlinked successfully"
      });
      await fetchCampaigns();
      onUpdate();
    } catch (error) {
      console.error('Error unlinking campaign:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlink campaign"
      });
    }
  };

  const handleToggleVisibility = async (checked: boolean) => {
    setHiddenFromPublic(!checked);
    try {
      const { error } = await supabase
        .from('social_accounts')
        .update({ hidden_from_public: !checked })
        .eq('id', account.id);

      if (error) throw error;

      toast({
        title: checked ? "Visible on profile" : "Hidden from profile",
        description: checked
          ? "This account will appear on your public profile"
          : "This account is now hidden from your public profile"
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating visibility:', error);
      setHiddenFromPublic(!checked ? false : true);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update visibility"
      });
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('social_accounts').delete().eq('id', account.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Social account deleted successfully"
      });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account"
      });
    }
  };

  useEffect(() => {
    if (open) {
      fetchCampaigns();
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-0">
            <DialogTitle className="font-['Inter'] tracking-[-0.5px]">Manage Account</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Account Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-background">
                {getPlatformIcon(account.platform)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold font-['Inter'] tracking-[-0.5px] truncate">{account.username}</p>
                <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                  {formatFollowerCount(account.follower_count)
                    ? `${formatFollowerCount(account.follower_count)} followers`
                    : account.platform.charAt(0).toUpperCase() + account.platform.slice(1)
                  }
                  {account.is_verified ? ' • Verified' : ''}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onReconnect}
                className="flex-1 font-['Inter'] tracking-[-0.5px]"
              >
                Reconnect
              </Button>
              {account.account_link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(account.account_link!, '_blank')}
                  className="flex-1 font-['Inter'] tracking-[-0.5px]"
                >
                  Open Profile
                </Button>
              )}
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="space-y-0.5">
                <Label className="font-['Inter'] tracking-[-0.5px] font-medium">Show on public profile</Label>
                <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                  {hiddenFromPublic ? "Hidden from visitors" : "Visible to visitors"}
                </p>
              </div>
              <Switch
                checked={!hiddenFromPublic}
                onCheckedChange={handleToggleVisibility}
              />
            </div>

            {/* Demographics Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">Audience Insights</p>
                {lastSubmissionDate && (
                  <span className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                    Last: {format(new Date(lastSubmissionDate), "MMM d, yyyy")}
                  </span>
                )}
              </div>

              {demographicStatus === 'approved' && daysUntilNext !== null ? (
                <Button variant="secondary" disabled className="w-full font-['Inter'] tracking-[-0.5px]">
                  Next submission in {daysUntilNext} days
                </Button>
              ) : demographicStatus === 'pending' ? (
                <Button variant="secondary" disabled className="w-full font-['Inter'] tracking-[-0.5px]">
                  Pending Review
                </Button>
              ) : (
                <Button
                  onClick={onSubmitDemographics}
                  className="w-full font-['Inter'] tracking-[-0.5px]"
                  variant={demographicStatus === 'rejected' ? 'destructive' : 'default'}
                >
                  {demographicStatus === 'rejected' ? 'Resubmit Insights' : 'Submit Insights'}
                </Button>
              )}
            </div>

            {/* Connected Campaigns */}
            <div className="space-y-2">
              <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">Connected Campaigns</p>
              {loading ? (
                <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">Loading...</p>
              ) : connectedCampaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground font-['Inter'] tracking-[-0.5px]">No campaigns connected</p>
              ) : (
                <div className="space-y-2">
                  {connectedCampaigns.map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {(campaign.brand_logo_url || campaign.brands?.logo_url) && (
                          <img
                            src={campaign.brand_logo_url || campaign.brands?.logo_url}
                            alt={campaign.brand_name}
                            className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm font-['Inter'] tracking-[-0.5px] truncate">{campaign.title}</p>
                          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">{campaign.brand_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUnlink(campaign.connection_id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 font-['Inter'] tracking-[-0.5px] h-8 px-2"
                      >
                        Unlink
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Campaigns */}
            {availableCampaigns.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium font-['Inter'] tracking-[-0.5px]">Available to Link</p>
                <div className="space-y-2">
                  {availableCampaigns.map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {(campaign.brand_logo_url || campaign.brands?.logo_url) && (
                          <img
                            src={campaign.brand_logo_url || campaign.brands?.logo_url}
                            alt={campaign.brand_name}
                            className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm font-['Inter'] tracking-[-0.5px] truncate">{campaign.title}</p>
                          <p className="text-xs text-muted-foreground font-['Inter'] tracking-[-0.5px]">{campaign.brand_name}</p>
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleLink(campaign.id)}
                        disabled={linkingCampaignId === campaign.id}
                        className="font-['Inter'] tracking-[-0.5px] h-8 px-3"
                      >
                        {linkingCampaignId === campaign.id ? 'Linking...' : 'Link'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delete Button */}
            <Button
              variant="ghost"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 font-['Inter'] tracking-[-0.5px]"
            >
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Inter'] tracking-[-0.5px]">Delete this account?</AlertDialogTitle>
            <AlertDialogDescription className="font-['Inter'] tracking-[-0.5px]">
              This will permanently delete this social account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-['Inter'] tracking-[-0.5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 font-['Inter'] tracking-[-0.5px]">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
