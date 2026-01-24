import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ChevronDown } from "lucide-react";
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

  // Collapsible section states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [connectedOpen, setConnectedOpen] = useState(true);
  const [availableOpen, setAvailableOpen] = useState(true);

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

  // Reusable collapsible section component
  const CollapsibleSection = ({
    title,
    count,
    open,
    onOpenChange,
    children,
    rightElement
  }: {
    title: string;
    count?: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    rightElement?: React.ReactNode;
  }) => (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">
            {title}
          </span>
          {count !== undefined && count > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rightElement}
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="p-0 overflow-hidden bg-background border-border [&>button]:hidden max-h-[85vh]">
          {/* Header with Account Info */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-muted dark:bg-muted/60 flex items-center justify-center flex-shrink-0">
                {getPlatformIcon(account.platform)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] truncate">
                    {account.username}
                  </h2>
                  {account.is_verified && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                {formatFollowerCount(account.follower_count) && (
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    {formatFollowerCount(account.follower_count)} followers
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="px-6 pb-6 space-y-4 overflow-y-auto max-h-[calc(85vh-180px)]">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={onReconnect}
                className="flex-1 h-10 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted transition-colors text-sm font-medium font-inter tracking-[-0.3px]"
              >
                Reconnect
              </button>
              {account.account_link && (
                <button
                  onClick={() => window.open(account.account_link!, '_blank')}
                  className="flex-1 h-10 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted transition-colors text-sm font-medium font-inter tracking-[-0.3px]"
                >
                  Open Profile
                </button>
              )}
            </div>

            {/* Settings Section */}
            <CollapsibleSection title="Settings" open={settingsOpen} onOpenChange={setSettingsOpen}>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/50 dark:bg-muted/30">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">Show on public profile</p>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    {hiddenFromPublic ? "Hidden from visitors" : "Visible to visitors"}
                  </p>
                </div>
                <Switch
                  checked={!hiddenFromPublic}
                  onCheckedChange={handleToggleVisibility}
                />
              </div>
            </CollapsibleSection>

            {/* Audience Insights Section */}
            <CollapsibleSection
              title="Audience Insights"
              open={insightsOpen}
              onOpenChange={setInsightsOpen}
              rightElement={lastSubmissionDate ? (
                <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                  Last: {format(new Date(lastSubmissionDate), "MMM d")}
                </span>
              ) : undefined}
            >
              {demographicStatus === 'approved' && daysUntilNext !== null ? (
                <div className="p-3.5 rounded-xl bg-muted/50 dark:bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    Next submission in <span className="font-medium text-foreground">{daysUntilNext} days</span>
                  </p>
                </div>
              ) : demographicStatus === 'pending' ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 text-center">
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-inter tracking-[-0.3px]">
                    Pending Review
                  </p>
                </div>
              ) : (
                <button
                  onClick={onSubmitDemographics}
                  className={`w-full h-10 rounded-xl text-sm font-medium font-inter tracking-[-0.3px] transition-colors ${
                    demographicStatus === 'rejected'
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {demographicStatus === 'rejected' ? 'Resubmit Insights' : 'Submit Insights'}
                </button>
              )}
            </CollapsibleSection>

            {/* Connected Campaigns */}
            <CollapsibleSection
              title="Connected Campaigns"
              count={connectedCampaigns.length}
              open={connectedOpen}
              onOpenChange={setConnectedOpen}
            >
              {loading ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">Loading...</p>
                </div>
              ) : connectedCampaigns.length === 0 ? (
                <div className="p-4 rounded-xl bg-muted/30 dark:bg-muted/20 text-center">
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">No campaigns connected</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {connectedCampaigns.map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 dark:bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        {(campaign.brand_logo_url || campaign.brands?.logo_url) ? (
                          <img
                            src={campaign.brand_logo_url || campaign.brands?.logo_url}
                            alt={campaign.brand_name}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium font-inter tracking-[-0.3px] truncate">{campaign.title}</p>
                          <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">{campaign.brand_name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlink(campaign.connection_id)}
                        className="text-xs font-medium text-destructive hover:text-destructive/80 font-inter tracking-[-0.3px] px-2 py-1"
                      >
                        Unlink
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleSection>

            {/* Available Campaigns */}
            {availableCampaigns.length > 0 && (
              <CollapsibleSection
                title="Available to Link"
                count={availableCampaigns.length}
                open={availableOpen}
                onOpenChange={setAvailableOpen}
              >
                <div className="space-y-1.5">
                  {availableCampaigns.map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 dark:bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        {(campaign.brand_logo_url || campaign.brands?.logo_url) ? (
                          <img
                            src={campaign.brand_logo_url || campaign.brands?.logo_url}
                            alt={campaign.brand_name}
                            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-muted flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium font-inter tracking-[-0.3px] truncate">{campaign.title}</p>
                          <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">{campaign.brand_name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleLink(campaign.id)}
                        disabled={linkingCampaignId === campaign.id}
                        className="text-xs font-medium text-primary hover:text-primary/80 font-inter tracking-[-0.3px] px-2 py-1 disabled:opacity-50"
                      >
                        {linkingCampaignId === campaign.id ? 'Linking...' : 'Link'}
                      </button>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border/50 flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl bg-muted/60 dark:bg-muted/40 hover:bg-muted transition-colors text-sm font-medium font-inter tracking-[-0.3px]"
            >
              Done
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="h-11 px-5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium font-inter tracking-[-0.3px]"
            >
              Delete
            </button>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-inter tracking-[-0.5px]">Delete this account?</AlertDialogTitle>
            <AlertDialogDescription className="font-inter tracking-[-0.5px]">
              This will permanently delete this social account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-inter tracking-[-0.5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 font-inter tracking-[-0.5px]">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
