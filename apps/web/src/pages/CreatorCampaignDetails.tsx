import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight, ExternalLink, Megaphone, Link2, Plus, Loader2, Menu } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";
import { ManageAccountDialog } from "@/components/ManageAccountDialog";
import { SubmitAudienceInsightsDialog } from "@/components/SubmitAudienceInsightsDialog";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { LinkAccountDialog } from "@/components/LinkAccountDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";
import warningIcon from "@/assets/warning-icon.svg";
import tiktokIcon from "@/assets/tiktok-logo-white.png";
import tiktokIconBlack from "@/assets/tiktok-logo-black-new.png";
import instagramIcon from "@/assets/instagram-logo-white.png";
import instagramIconBlack from "@/assets/instagram-logo-black.png";
import youtubeIcon from "@/assets/youtube-logo-white.png";
import youtubeIconBlack from "@/assets/youtube-logo-black-new.png";
import xIcon from "@/assets/x-logo.png";
import xIconLight from "@/assets/x-logo-light.png";
import { SubmissionsTab } from "@/components/dashboard/SubmissionsTab";
import { TransactionsTable, Transaction } from "@/components/dashboard/TransactionsTable";
import { AssetLibrary, AssetRequestDialog, AssetUploadDialog, AssetDeleteDialog, AssetDetailPanel } from "@/components/assets";
import type { BrandAsset } from "@/types/assets";
import {
  SourceDetailsSidebarProvider,
  useSourceDetails,
  SourceDetailsLeftSidebar,
  SourceDetailsRightPanel,
} from "@/components/source-details";
import { SourceDetailsMobileLayout } from "@/components/source-details/mobile";
import { useTrainingCompletion } from "@/hooks/useTrainingCompletion";
import { useAnnouncements } from "@/hooks/useAnnouncements";

interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
}

interface AssetLink {
  label: string;
  url: string;
}

interface Campaign {
  id: string;
  title: string;
  slug: string;
  brand_id?: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_color?: string | null;
  description: string | null;
  status: string;
  budget: number;
  budget_used?: number | null;
  rpm_rate: number;
  allowed_platforms: string[] | null;
  start_date?: string | null;
  end_date: string | null;
  created_at: string;
  hashtags?: string[] | null;
  guidelines?: string | null;
  embed_url?: string | null;
  connected_accounts?: ConnectedAccount[];
  asset_links?: AssetLink[] | null;
  requirements?: string[] | null;
  campaign_update?: string | null;
  campaign_update_at?: string | null;
  payout_day_of_week?: number | null;
  blueprint_id?: string | null;
  payment_model?: string | null;
  post_rate?: number | null;
  banner_url?: string | null;
  is_verified?: boolean;
  discord_guild_id?: string | null;
}

const calculateDaysUntilEnd = (endDate: string | null) => {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

const getNextPayoutDate = (payoutDayOfWeek: number = 2) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  let daysUntilPayout = (payoutDayOfWeek - dayOfWeek + 7) % 7;
  if (daysUntilPayout === 0) daysUntilPayout = 7;
  const nextPayoutDate = new Date(now);
  nextPayoutDate.setDate(now.getDate() + daysUntilPayout);
  nextPayoutDate.setHours(12, 0, 0, 0);
  return {
    date: nextPayoutDate,
    daysUntil: daysUntilPayout
  };
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getFaviconUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch {
    return null;
  }
};

const renderDescriptionWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{part}</a>;
    }
    return part;
  });
};

// Inner component that uses the context
function CampaignDetailsContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const { activeSection, setActiveSection, isMobile, mobileNavOpen, setMobileNavOpen } = useSourceDetails();

  // Get campaign from navigation state if available (instant load)
  const passedCampaign = (location.state as { campaign?: Campaign } | null)?.campaign;

  const [campaign, setCampaign] = useState<Campaign | null>(passedCampaign || null);
  const [loading, setLoading] = useState(!passedCampaign);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expectedPayout, setExpectedPayout] = useState<{ views: number; amount: number } | null>(null);
  const [blueprintContent, setBlueprintContent] = useState<string | null>(null);
  const [blueprintAssets, setBlueprintAssets] = useState<AssetLink[] | null>(null);
  const [showSubmitVideoDialog, setShowSubmitVideoDialog] = useState(false);
  const [showAssetRequestDialog, setShowAssetRequestDialog] = useState(false);
  const [showAssetUploadDialog, setShowAssetUploadDialog] = useState(false);
  const [deleteAsset, setDeleteAsset] = useState<BrandAsset | null>(null);
  const [editAsset, setEditAsset] = useState<BrandAsset | null>(null);
  const [selectedAssetForPanel, setSelectedAssetForPanel] = useState<BrandAsset | null>(null);
  const [isBrandAdmin, setIsBrandAdmin] = useState(false);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [approvedSubmissions, setApprovedSubmissions] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [earnings, setEarnings] = useState<Transaction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [calculatedBudgetUsed, setCalculatedBudgetUsed] = useState<number | null>(null);
  const [members, setMembers] = useState<Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    username?: string;
    views?: number;
    joined_at?: string;
  }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Training hook
  const training = useTrainingCompletion(campaign?.blueprint_id || undefined);

  // Clear selected asset when navigating away from assets tab
  useEffect(() => {
    if (activeSection.type !== 'assets') {
      setSelectedAssetForPanel(null);
    }
  }, [activeSection.type]);

  // Account management state
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [linkAccountDialogOpen, setLinkAccountDialogOpen] = useState(false);
  const [manageAccountDialogOpen, setManageAccountDialogOpen] = useState(false);
  const [submitDemographicsDialogOpen, setSubmitDemographicsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null);

  // Leave campaign state
  const [leaveCampaignDialogOpen, setLeaveCampaignDialogOpen] = useState(false);
  const [leavingCampaign, setLeavingCampaign] = useState(false);

  // User Discord connection status
  const [hasUserDiscord, setHasUserDiscord] = useState(false);

  // Conversation state
  const [creatingConversation, setCreatingConversation] = useState(false);

  // Fetch real announcements
  const { announcements: realAnnouncements, toggleReaction } = useAnnouncements({
    sourceType: "campaign",
    sourceId: id || "",
    enabled: !!id,
  });

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokIconBlack : tiktokIcon;
      case "instagram":
        return isLightMode ? instagramIconBlack : instagramIcon;
      case "youtube":
        return isLightMode ? youtubeIconBlack : youtubeIcon;
      case "x":
        return isLightMode ? xIconLight : xIcon;
      default:
        return null;
    }
  };

  // Fetch brand data if missing (when campaign is passed via navigation state)
  useEffect(() => {
    const fetchBrandData = async () => {
      if (!campaign?.id || (campaign.brand_color && campaign.brand_logo_url)) return;

      const { data: campaignData } = await supabase
        .from("campaigns")
        .select("brand_id, brands(brand_color, logo_url)")
        .eq("id", campaign.id)
        .single();

      if (campaignData?.brands) {
        const brandData = campaignData.brands as any;
        if (brandData.brand_color || brandData.logo_url) {
          setCampaign(prev => prev ? {
            ...prev,
            brand_color: brandData.brand_color || prev.brand_color,
            brand_logo_url: brandData.logo_url || prev.brand_logo_url
          } : null);
        }
      }
    };
    fetchBrandData();
  }, [campaign?.id]);

  // Track if we've fetched complete data
  const [hasFetchedComplete, setHasFetchedComplete] = useState(false);

  // Reset fetch flag when campaign ID changes (keep existing content visible during transition)
  useEffect(() => {
    setHasFetchedComplete(false);
  }, [id]);

  // Fetch campaign data (always fetch to ensure complete data including asset_links)
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id) return;
      // Skip if we've already fetched complete data for THIS campaign
      // (campaign?.id check ensures we refetch when switching to a different campaign)
      if (hasFetchedComplete && campaign?.id === id) return;

      // Only show loading spinner on initial load, not when switching campaigns
      if (!campaign) {
        setLoading(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch campaign details
      const { data: campaignData, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          brands (
            name,
            logo_url,
            is_verified,
            slug,
            brand_color
          )
        `)
        .eq("id", id)
        .single();

      if (error || !campaignData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load campaign details"
        });
        navigate('/dashboard');
        return;
      }

      // Fetch connected accounts for this campaign
      const { data: accountCampaigns } = await supabase
        .from("social_account_campaigns")
        .select(`
          campaign_id,
          social_accounts (
            id,
            platform,
            username
          )
        `)
        .eq("campaign_id", id)
        .eq("user_id", user.id)
        .eq("status", "active");

      const connectedAccounts: ConnectedAccount[] = [];
      accountCampaigns?.forEach((connection: any) => {
        if (connection.social_accounts) {
          connectedAccounts.push(connection.social_accounts);
        }
      });

      const brandData = campaignData.brands as any;
      setCampaign({
        ...campaignData,
        brand_name: brandData?.name || campaignData.brand_name,
        brand_logo_url: brandData?.logo_url || campaignData.brand_logo_url,
        brand_color: brandData?.brand_color,
        is_verified: brandData?.is_verified,
        connected_accounts: connectedAccounts
      });
      setHasFetchedComplete(true);
      setLoading(false);
    };

    fetchCampaign();
  }, [id, navigate, toast, hasFetchedComplete, passedCampaign]);

  // Consolidated fetch for all secondary data - runs in parallel for faster loading
  useEffect(() => {
    const fetchAllSecondaryData = async () => {
      if (!campaign?.id) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Run all fetches in parallel
      const [
        submissionsResult,
        memberCountResult,
        earningsResult,
        accountLinksResult,
        blueprintResult,
        discordResult,
        metricsResult,
        brandMembershipResult,
        campaignBudgetResult
      ] = await Promise.all([
        // 1. Submission stats
        supabase
          .from('video_submissions')
          .select('status')
          .eq('source_type', 'campaign')
          .eq('source_id', campaign.id)
          .eq('creator_id', user.id),

        // 2. Member count
        supabase
          .from('social_account_campaigns')
          .select('user_id', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'active'),

        // 3. Earnings
        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'earning')
          .order('created_at', { ascending: false }),

        // 4. Account links for members
        supabase
          .from('social_account_campaigns')
          .select(`user_id, created_at, social_accounts (username)`)
          .eq('campaign_id', campaign.id)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(20),

        // 5. Blueprint data - fetch by blueprint_id if set, otherwise by brand_id
        campaign.blueprint_id
          ? supabase.from('blueprints').select('id, content, assets').eq('id', campaign.blueprint_id).maybeSingle()
          : campaign.brand_id
            ? supabase.from('blueprints').select('id, content, assets').eq('brand_id', campaign.brand_id).maybeSingle()
            : Promise.resolve({ data: null }),

        // 6. Discord status
        supabase.from('profiles').select('discord_id').eq('id', user.id).single(),

        // 7. Expected payout metrics
        supabase
          .from('campaign_video_metrics')
          .select('total_views, recorded_at')
          .eq('campaign_id', campaign.id)
          .order('recorded_at', { ascending: false })
          .limit(1),

        // 8. Brand membership check (for asset management)
        campaign.brand_id
          ? supabase
              .from('brand_members')
              .select('role')
              .eq('brand_id', campaign.brand_id)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),

        // 9. Campaign budget from wallet_transactions (includes balance_corrections)
        supabase
          .from('wallet_transactions')
          .select('amount, type')
          .eq('metadata->>campaign_id', campaign.id)
          .in('type', ['earning', 'balance_correction'])
      ]);

      // Process submission stats
      if (submissionsResult.data) {
        setPendingSubmissions(submissionsResult.data.filter(s => s.status === 'pending').length);
        setApprovedSubmissions(submissionsResult.data.filter(s => s.status === 'approved').length);
      }

      // Process member count
      setMemberCount(memberCountResult.count || 0);

      // Process earnings
      if (earningsResult.data) {
        const campaignTxns = earningsResult.data.filter(txn => {
          const metadata = txn.metadata as { campaign_id?: string } | null;
          return metadata?.campaign_id === campaign.id;
        });
        const transactions: Transaction[] = campaignTxns.map(txn => ({
          id: txn.id,
          type: 'earning' as const,
          amount: Number(txn.amount) || 0,
          date: new Date(txn.created_at),
          status: txn.status,
          campaign: {
            id: campaign.id,
            title: campaign.title,
            brand_name: campaign.brand_name,
            brand_logo_url: campaign.brand_logo_url,
          },
          boost: null,
          recipient: null,
          sender: null,
        }));
        setEarnings(transactions);
        setTotalEarnings(transactions.reduce((sum, t) => sum + t.amount, 0));
      }

      // Process members
      if (accountLinksResult.data && accountLinksResult.data.length > 0) {
        const userIds = [...new Set(accountLinksResult.data.map(link => link.user_id))];

        // Fetch profiles and submission views in parallel
        const [profilesResult, memberSubmissionsResult] = await Promise.all([
          supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds),
          supabase.from('video_submissions').select('creator_id, views')
            .eq('source_type', 'campaign').eq('source_id', campaign.id).eq('status', 'approved')
        ]);

        const profileMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
        const viewsByCreator = new Map<string, number>();
        memberSubmissionsResult.data?.forEach((sub: any) => {
          const views = Number(sub.views) || 0;
          viewsByCreator.set(sub.creator_id, (viewsByCreator.get(sub.creator_id) || 0) + views);
        });

        const userMap = new Map<string, {
          id: string; name: string; avatar_url: string | null; username?: string; views?: number; joined_at?: string;
        }>();

        accountLinksResult.data.forEach((link: any) => {
          if (!userMap.has(link.user_id)) {
            const profile = profileMap.get(link.user_id);
            userMap.set(link.user_id, {
              id: link.user_id,
              name: profile?.full_name || profile?.username || 'Creator',
              avatar_url: profile?.avatar_url || null,
              username: profile?.username || link.social_accounts?.username,
              views: viewsByCreator.get(link.user_id) || 0,
              joined_at: link.created_at
            });
          }
        });

        const membersList = Array.from(userMap.values()).sort((a, b) => {
          if (a.id === user.id) return -1;
          if (b.id === user.id) return 1;
          return (b.views || 0) - (a.views || 0);
        });
        setMembers(membersList);
      } else {
        setMembers([]);
      }

      // Process blueprint
      if (blueprintResult.data) {
        setBlueprintContent(blueprintResult.data.content || null);
        if (blueprintResult.data.assets && Array.isArray(blueprintResult.data.assets) && blueprintResult.data.assets.length > 0) {
          const mappedAssets = blueprintResult.data.assets.map((asset: any) => ({
            label: asset.notes || asset.label || 'Asset Link',
            url: asset.link || asset.url || ''
          })).filter((asset: AssetLink) => asset.url);
          setBlueprintAssets(mappedAssets.length > 0 ? mappedAssets : null);
        } else {
          setBlueprintAssets(null);
        }
      } else {
        setBlueprintContent(null);
        setBlueprintAssets(null);
      }

      // Process Discord status
      setHasUserDiscord(!!discordResult.data?.discord_id);

      // Process expected payout
      if (metricsResult.data && metricsResult.data.length > 0) {
        const totalViews = Number(metricsResult.data[0]?.total_views) || 0;
        const amount = totalViews / 1000 * campaign.rpm_rate;
        setExpectedPayout({ views: totalViews, amount });
      } else {
        setExpectedPayout(null);
      }

      // Process brand membership (for asset management permissions)
      if (brandMembershipResult.data) {
        const role = brandMembershipResult.data.role;
        setIsBrandAdmin(role === 'owner' || role === 'admin');
      } else {
        setIsBrandAdmin(false);
      }

      // Process campaign budget from wallet_transactions
      if (campaignBudgetResult.data && campaignBudgetResult.data.length > 0) {
        const totalBudgetUsed = campaignBudgetResult.data.reduce((sum, txn) => {
          return sum + (Number(txn.amount) || 0);
        }, 0);
        setCalculatedBudgetUsed(totalBudgetUsed);
      } else {
        setCalculatedBudgetUsed(null);
      }
    };

    fetchAllSecondaryData();
  }, [campaign?.id, campaign?.blueprint_id, campaign?.rpm_rate, campaign?.title, campaign?.brand_name, campaign?.brand_logo_url, campaign?.brand_id]);

  const handleLeaveCampaign = async () => {
    if (!campaign?.id) return;
    setLeavingCampaign(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to leave campaign"
        });
        return;
      }

      // Delete campaign submissions
      const { error: submissionError } = await supabase
        .from("campaign_submissions")
        .delete()
        .eq("campaign_id", campaign.id)
        .eq("creator_id", user.id);
      if (submissionError) throw submissionError;

      // Get linked social accounts
      const { data: linkedAccounts } = await supabase
        .from("social_account_campaigns")
        .select("social_account_id, social_accounts(id)")
        .eq("campaign_id", campaign.id)
        .eq("user_id", user.id);

      // Stop tracking in Shortimize for each linked account
      if (linkedAccounts && linkedAccounts.length > 0) {
        for (const link of linkedAccounts) {
          try {
            const { error: untrackError } = await supabase.functions.invoke('untrack-shortimize-account', {
              body: {
                campaignId: campaign.id,
                socialAccountId: link.social_account_id
              }
            });
            if (untrackError) {
              console.error('Error stopping tracking:', untrackError);
            }
          } catch (error) {
            console.error('Error calling untrack function:', error);
          }
        }
      }

      // Disconnect all social accounts from this campaign
      const { error: unlinkError } = await supabase
        .from("social_account_campaigns")
        .update({
          status: 'disconnected',
          disconnected_at: new Date().toISOString()
        })
        .eq("campaign_id", campaign.id)
        .in("social_account_id", linkedAccounts?.map(l => l.social_account_id) || []);
      if (unlinkError) throw unlinkError;

      toast({
        title: "Left Campaign",
        description: "You have successfully left this campaign"
      });

      navigate('/dashboard');
    } catch (error) {
      console.error("Error leaving campaign:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave campaign. Please try again."
      });
    } finally {
      setLeavingCampaign(false);
      setLeaveCampaignDialogOpen(false);
    }
  };

  const startConversationWithBrand = async () => {
    if (!campaign?.brand_id || !currentUserId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to start conversation. Please try again."
      });
      return;
    }

    setCreatingConversation(true);
    try {
      // Check if conversation already exists
      const { data: existingConvo } = await supabase
        .from("conversations")
        .select("id")
        .eq("brand_id", campaign.brand_id)
        .eq("creator_id", currentUserId)
        .maybeSingle();

      let conversationId = existingConvo?.id;

      // Create new conversation if none exists
      if (!conversationId) {
        const { data: newConvo, error: createError } = await supabase
          .from("conversations")
          .insert({
            brand_id: campaign.brand_id,
            creator_id: currentUserId
          })
          .select("id")
          .single();

        if (createError) throw createError;
        conversationId = newConvo?.id;
      }

      // Navigate to dashboard - the messages widget will open with this conversation
      navigate('/dashboard', { state: { conversationId } });
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start conversation. Please try again."
      });
    } finally {
      setCreatingConversation(false);
    }
  };

  const handleModuleComplete = async (moduleId: string) => {
    if (!campaign?.blueprint_id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('blueprint_training_completions')
      .insert({
        user_id: user.id,
        blueprint_id: campaign.blueprint_id,
        module_id: moduleId
      });

    if (!error) {
      training.refetch();
    }
  };

  const refreshCampaignData = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch connected accounts for this campaign
    const { data: accountCampaigns } = await supabase
      .from("social_account_campaigns")
      .select(`
        campaign_id,
        social_accounts (
          id,
          platform,
          username
        )
      `)
      .eq("campaign_id", id)
      .eq("user_id", user.id)
      .eq("status", "active");

    const connectedAccounts: ConnectedAccount[] = [];
    accountCampaigns?.forEach((connection: any) => {
      if (connection.social_accounts) {
        connectedAccounts.push(connection.social_accounts);
      }
    });

    setCampaign(prev => prev ? { ...prev, connected_accounts: connectedAccounts } : null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const daysUntilEnd = calculateDaysUntilEnd(campaign.end_date);
  const hasConnectedAccounts = campaign.connected_accounts && campaign.connected_accounts.length > 0;
  const hasAssetLinks = campaign.asset_links && campaign.asset_links.length > 0;
  const hasRequirements = campaign.requirements && campaign.requirements.length > 0;
  const nextPayout = getNextPayoutDate(campaign.payout_day_of_week ?? 2);
  const startDate = campaign.start_date || campaign.created_at;

  // Render Overview Content
  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Campaign Update Banner */}
      {campaign.campaign_update && (
        <div className="p-4 rounded-xl bg-primary/15 border border-primary/25 flex items-start gap-3">
          <Megaphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary mb-1 font-inter tracking-[-0.3px]">
              Campaign Update
            </p>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap font-inter tracking-[-0.3px]">
              {campaign.campaign_update}
            </p>
          </div>
        </div>
      )}

      {/* Description */}
      {(blueprintContent || campaign.description) && (
        <div>
          <div className="relative">
            {blueprintContent ? (
              <div
                className={`text-sm text-muted-foreground leading-relaxed overflow-hidden transition-all prose prose-sm prose-invert max-w-none break-words prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground font-inter ${showFullDescription ? '' : 'max-h-[120px]'}`}
                style={{ fontFamily: 'Inter', letterSpacing: '-0.3px', overflowWrap: 'break-word', wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blueprintContent) }}
              />
            ) : (
              <div
                className={`text-sm text-muted-foreground leading-relaxed overflow-hidden transition-all whitespace-pre-line break-words font-inter ${showFullDescription ? '' : 'max-h-[120px]'}`}
                style={{ fontFamily: 'Inter', letterSpacing: '-0.3px', overflowWrap: 'break-word', wordBreak: 'break-word' }}
              >
                {renderDescriptionWithLinks(campaign.description!)}
              </div>
            )}
            {!showFullDescription && (blueprintContent && blueprintContent.length > 200 || campaign.description && campaign.description.length > 200) && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            )}
          </div>
          {(blueprintContent && blueprintContent.length > 200 || campaign.description && campaign.description.length > 200) && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none font-inter tracking-[-0.3px]"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-white dark:bg-muted/20 border border-border/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Ends</p>
          <p className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">{daysUntilEnd !== null ? `${daysUntilEnd}d` : "—"}</p>
        </div>
        <div className="text-center hidden sm:block">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Language</p>
          <p className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">English</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Platforms</p>
          <div className="flex justify-center gap-1 mt-1.5">
            {campaign.allowed_platforms?.map(platform => {
              const iconSrc = getPlatformIcon(platform);
              return iconSrc ? <img key={platform} src={iconSrc} alt={platform} className="w-4 h-4" /> : null;
            })}
          </div>
        </div>
        <div className="text-center hidden sm:block">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Pay Type</p>
          <p className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">Per view</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Per 1M Views</p>
          <p className="font-semibold text-sm text-primary font-inter tracking-[-0.5px]">${(campaign.rpm_rate * 1000).toLocaleString()}</p>
        </div>
      </div>

      {/* Connected Accounts Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">Your Connected Accounts</h4>
          <button
            onClick={() => setLinkAccountDialogOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-primary hover:bg-primary/80 transition-colors font-inter tracking-[-0.3px]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>

        {hasConnectedAccounts ? (
          <div className="flex flex-wrap gap-2">
            {campaign.connected_accounts!.map(account => (
              <button
                key={account.id}
                onClick={() => {
                  setSelectedAccount(account);
                  setManageAccountDialogOpen(true);
                }}
                className="group relative flex items-center gap-2.5 pl-3 pr-4 py-2.5 transition-all duration-200 cursor-pointer bg-white dark:bg-muted/20 rounded-lg border border-border/50 hover:bg-muted dark:hover:bg-muted/60 hover:border-border"
              >
                <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center">
                  {getPlatformIcon(account.platform) && (
                    <img src={getPlatformIcon(account.platform)!} alt={account.platform} className="w-4 h-4" />
                  )}
                </div>
                <span className="font-medium text-sm text-foreground font-inter tracking-[-0.3px]">{account.username}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border bg-white dark:bg-muted/20">
            <div>
              <p className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">No accounts connected</p>
              <p className="text-xs text-muted-foreground font-inter">Connect an account to start earning</p>
            </div>
          </div>
        )}
      </div>

      {/* Requirements Section */}
      {hasRequirements && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 font-inter tracking-[-0.5px]">Campaign Requirements</h4>
          <div className="space-y-2">
            {campaign.requirements!.map((req, index) => (
              <div key={index} className="gap-3 p-3 rounded-xl bg-white dark:bg-muted/20 flex items-center justify-start border border-border/50">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm text-foreground leading-relaxed font-inter">{req}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render Blueprint Content (content guide + training modules)
  const renderBlueprintContent = () => {
    const sortedModules = [...training.modules].sort((a, b) => a.order_index - b.order_index);
    const hasModules = sortedModules.length > 0;

    return (
      <div className="space-y-8">
        {/* Content Guidelines */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Content Guide</h2>
          {campaign.guidelines ? (
            <div
              className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground font-inter"
              style={{ fontFamily: 'Inter, sans-serif' }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(campaign.guidelines) }}
            />
          ) : blueprintContent ? (
            <div
              className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground font-inter"
              style={{ fontFamily: 'Inter, sans-serif' }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blueprintContent) }}
            />
          ) : (
            <p className="text-muted-foreground font-inter">No specific content guidelines provided for this campaign.</p>
          )}
        </div>

        {/* Training Modules */}
        {hasModules && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Training Modules</h2>
              <span className="text-sm text-muted-foreground font-inter">
                {training.completedModuleIds.size}/{sortedModules.length} completed
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  training.progress === 100 ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${training.progress}%` }}
              />
            </div>

            {/* Module list */}
            <div className="space-y-2">
              {sortedModules.map((module, index) => {
                const isCompleted = training.completedModuleIds.has(module.id);
                return (
                  <button
                    key={module.id}
                    onClick={() => setActiveSection({ type: 'training', moduleId: module.id })}
                    className="w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-muted/20 border border-border/50 hover:bg-muted/50 hover:border-border transition-all text-left group"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-colors",
                      isCompleted
                        ? "bg-green-500/20 text-green-500"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                    )}>
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate font-inter tracking-[-0.3px]">
                        {module.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-inter">
                        {isCompleted ? "Completed" : module.required ? "Required" : "Optional"}
                      </p>
                    </div>
                    {module.required && !isCompleted && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                    )}
                    <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Submissions Content
  const renderSubmissionsContent = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Your Submissions</h2>
      <SubmissionsTab campaignId={campaign.id} compact />
    </div>
  );

  // Render Support Content
  const renderSupportContent = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Get Support</h2>
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-muted/20">
          <h3 className="font-medium text-foreground mb-2 font-inter">Need Help?</h3>
          <p className="text-sm text-muted-foreground mb-4 font-inter">
            If you have any questions about this campaign, send a message directly to the brand.
          </p>
          <Button
            onClick={startConversationWithBrand}
            disabled={creatingConversation || !campaign?.brand_id}
            variant="outline"
            className="w-full border-border text-foreground hover:bg-muted/50"
          >
            {creatingConversation ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opening conversation...
              </>
            ) : (
              "Message Brand"
            )}
          </Button>
        </div>
        {campaign.embed_url && (
          <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-muted/20">
            <h3 className="font-medium text-foreground mb-2 font-inter">Campaign Resources</h3>
            <a
              href={campaign.embed_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline font-inter"
            >
              <ExternalLink className="w-4 h-4" />
              View External Resources
            </a>
          </div>
        )}
      </div>
    </div>
  );

  // Render Earnings Content
  const renderEarningsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Earnings</h2>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground font-inter tracking-[-0.5px]">
            ${totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground font-inter">Total earned from this campaign</p>
        </div>
      </div>

      {earnings.length > 0 ? (
        <TransactionsTable
          transactions={earnings}
          variant="compact"
          showPagination={true}
          itemsPerPage={10}
        />
      ) : (
        <div className="p-8 rounded-xl border border-border/50 bg-white dark:bg-muted/20 text-center">
          <Icon icon="material-symbols:payments" className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-medium text-foreground mb-1 font-inter">No earnings yet</h3>
          <p className="text-sm text-muted-foreground font-inter">
            Your earnings from this campaign will appear here once you start getting paid views.
          </p>
        </div>
      )}
    </div>
  );

  // Render Training Module Content
  const renderTrainingContent = () => {
    const currentModule = training.modules.find(m => m.id === activeSection.moduleId);
    if (!currentModule) {
      // If no module selected, show the blueprint content instead
      return renderBlueprintContent();
    }

    const isCompleted = training.completedModuleIds.has(currentModule.id);

    return (
      <div className="space-y-6">
        {/* Back to Blueprint */}
        <button
          onClick={() => setActiveSection({ type: 'blueprint' })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-inter"
        >
          <Icon icon="material-symbols:arrow-back" className="w-4 h-4" />
          Back to Blueprint
        </button>

        {/* Module Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">{currentModule.title}</h2>
            {currentModule.required && !isCompleted && (
              <span className="text-xs text-amber-500 font-medium font-inter">Required</span>
            )}
          </div>
          {isCompleted && (
            <span className="flex items-center gap-1.5 text-sm text-green-400 font-medium bg-green-400/10 px-3 py-1 rounded-full font-inter">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Completed
            </span>
          )}
        </div>

        {/* Video if available */}
        {currentModule.video_url && (
          <div className="aspect-video rounded-xl overflow-hidden bg-black/50 border border-border/50">
            <iframe
              src={currentModule.video_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={currentModule.title}
            />
          </div>
        )}

        {/* Module Content */}
        {currentModule.content && (
          <div
            className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground font-inter"
            style={{ fontFamily: 'Inter, sans-serif' }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentModule.content) }}
          />
        )}

        {/* Complete button */}
        {!isCompleted && (!currentModule.quiz || currentModule.quiz.length === 0) && (
          <button
            onClick={() => handleModuleComplete(currentModule.id)}
            className="w-full py-3 px-4 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors font-inter"
          >
            Mark as Complete
          </button>
        )}
      </div>
    );
  };

  // Render assets content
  const renderAssetsContent = () => {
    // Use the new AssetLibrary component with the brand_id
    if (campaign.brand_id) {
      return (
        <div className="space-y-6">
          <AssetLibrary
            brandId={campaign.brand_id}
            isAdmin={isBrandAdmin}
            selectedAsset={selectedAssetForPanel}
            onSelectAsset={setSelectedAssetForPanel}
            onUpload={isBrandAdmin ? () => setShowAssetUploadDialog(true) : undefined}
            onRequestAsset={() => setShowAssetRequestDialog(true)}
            onEdit={isBrandAdmin ? (asset) => setEditAsset(asset) : undefined}
            onDelete={isBrandAdmin ? (asset) => setDeleteAsset(asset) : undefined}
          />
        </div>
      );
    }

    // Fallback for legacy assets (blueprintAssets / asset_links)
    const assets = blueprintAssets || campaign.asset_links || [];

    if (assets.length === 0) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1 font-inter tracking-[-0.5px]">Folders</h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Brand resources and materials</p>
          </div>
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/30 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Icon icon="material-symbols:folder-outline" className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-inter text-center">No assets available for this campaign</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1 font-inter tracking-[-0.5px]">Folders</h2>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Brand resources and materials for your content</p>
        </div>
        <div className="grid gap-3">
          {assets.map((asset, index) => {
            const faviconUrl = getFaviconUrl(asset.url);
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(asset.url);
            const isVideo = /\.(mp4|mov|webm|avi)$/i.test(asset.url);
            const isPdf = /\.pdf$/i.test(asset.url);
            const isGoogleDrive = asset.url.includes('drive.google.com');
            const isDropbox = asset.url.includes('dropbox.com');

            let iconType = 'link';
            if (isImage) iconType = 'image';
            else if (isVideo) iconType = 'video';
            else if (isPdf) iconType = 'pdf';
            else if (isGoogleDrive) iconType = 'drive';
            else if (isDropbox) iconType = 'dropbox';

            const iconMap: Record<string, string> = {
              link: 'material-symbols:link',
              image: 'material-symbols:image',
              video: 'material-symbols:videocam',
              pdf: 'material-symbols:picture-as-pdf',
              drive: 'logos:google-drive',
              dropbox: 'logos:dropbox',
            };

            return (
              <a
                key={index}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:bg-muted/30 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                  {faviconUrl && !isImage && !isVideo && !isPdf ? (
                    <img src={faviconUrl} alt="" className="w-5 h-5 rounded" />
                  ) : (
                    <Icon icon={iconMap[iconType]} className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate font-inter tracking-[-0.3px] group-hover:text-primary transition-colors">
                    {asset.label}
                  </p>
                  <p className="text-xs text-muted-foreground truncate font-inter">
                    {new URL(asset.url).hostname}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </a>
            );
          })}
        </div>
      </div>
    );
  };

  // Render content based on active section
  const renderContent = () => {
    switch (activeSection.type) {
      case 'blueprint':
        return renderBlueprintContent();
      case 'training':
        return renderTrainingContent();
      case 'assets':
        return renderAssetsContent();
      case 'submissions':
        return renderSubmissionsContent();
      case 'earnings':
        return renderEarningsContent();
      case 'support':
        return renderSupportContent();
      case 'overview':
      default:
        return renderOverviewContent();
    }
  };

  // Mobile nav sidebar content
  const mobileNavContent = (
    <SourceDetailsLeftSidebar
      modules={training.modules}
      completedModuleIds={training.completedModuleIds}
      trainingProgress={training.progress}
      budget={campaign.budget}
      budgetUsed={calculatedBudgetUsed ?? campaign.budget_used ?? 0}
      submissionCount={pendingSubmissions + approvedSubmissions}
      memberCount={memberCount}
      brandName={campaign.brand_name}
      brandLogoUrl={campaign.brand_logo_url}
      brandColor={campaign.brand_color}
      bannerUrl={campaign.banner_url}
      isVerified={campaign.is_verified}
      sourceTitle={campaign.title}
      className="border-0 h-full"
      // Quick action props
      onSubmitVideo={() => setShowSubmitVideoDialog(true)}
      onLeave={() => setLeaveCampaignDialogOpen(true)}
      brandSlug={(campaign as any).brands?.slug}
      blueprintId={campaign.blueprint_id}
      sourceSlug={campaign.slug}
      hasConnectedAccounts={hasConnectedAccounts}
      paymentModel={campaign.payment_model}
      // Discord props
      hasDiscordServer={!!campaign.discord_guild_id}
      hasDiscordConnected={hasUserDiscord}
      // Assets props
      hasAssets={!!(blueprintAssets && blueprintAssets.length > 0) || hasAssetLinks}
    />
  );

  return (
    <>
      {/* Mobile Layout */}
      {isMobile ? (
        <SourceDetailsMobileLayout
          sourceId={campaign.id}
          sourceTitle={campaign.title}
          sourceSlug={campaign.slug}
          brandName={campaign.brand_name}
          brandLogoUrl={campaign.brand_logo_url}
          brandColor={campaign.brand_color}
          bannerUrl={campaign.banner_url}
          memberCount={memberCount}
          isVerified={campaign.is_verified}
          // Quick action props
          onSubmitVideo={() => setShowSubmitVideoDialog(true)}
          onLeave={() => setLeaveCampaignDialogOpen(true)}
          brandSlug={(campaign as any).brands?.slug}
          blueprintId={campaign.blueprint_id}
          hasConnectedAccounts={hasConnectedAccounts}
          paymentModel={campaign.payment_model}
          // Discord props
          hasDiscordServer={!!campaign.discord_guild_id}
          hasDiscordConnected={hasUserDiscord}
          // Assets props
          hasAssets={!!(blueprintAssets && blueprintAssets.length > 0) || hasAssetLinks}
          // Training props
          modules={training.modules}
          completedModuleIds={training.completedModuleIds}
          trainingProgress={training.progress}
          budget={campaign.budget}
          budgetUsed={calculatedBudgetUsed ?? campaign.budget_used ?? 0}
          submissionCount={pendingSubmissions + approvedSubmissions}
          // Right panel for mobile
          rightPanel={
            <SourceDetailsRightPanel
              members={members}
              memberCount={memberCount}
              currentUserId={currentUserId}
              announcements={realAnnouncements}
              onReaction={toggleReaction}
              creatorStats={{
                views: expectedPayout?.views || 0,
                earnings: totalEarnings,
                videos: approvedSubmissions,
                percentile: memberCount > 10 && approvedSubmissions > 0
                  ? Math.min(95, Math.max(5, Math.floor((1 - (approvedSubmissions / Math.max(1, memberCount))) * 100)))
                  : undefined,
              }}
              deadlines={[
                {
                  id: 'next-payout',
                  label: 'Next payout cycle',
                  date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                  type: 'payout' as const,
                },
                ...(campaign.end_date ? [{
                  id: 'campaign-end',
                  label: 'Campaign ends',
                  date: campaign.end_date,
                  type: 'campaign_end' as const,
                }] : []),
              ]}
              className="w-full border-0"
            />
          }
        >
          <div className="p-4 max-w-4xl mx-auto">
            {renderContent()}
          </div>
        </SourceDetailsMobileLayout>
      ) : (
        /* Desktop Layout */
        <div className="flex h-full">
          {/* Left Sidebar */}
          <SourceDetailsLeftSidebar
            modules={training.modules}
            completedModuleIds={training.completedModuleIds}
            trainingProgress={training.progress}
            budget={campaign.budget}
            budgetUsed={calculatedBudgetUsed ?? campaign.budget_used ?? 0}
            submissionCount={pendingSubmissions + approvedSubmissions}
            memberCount={memberCount}
            brandName={campaign.brand_name}
            brandLogoUrl={campaign.brand_logo_url}
            brandColor={campaign.brand_color}
            bannerUrl={campaign.banner_url}
            isVerified={campaign.is_verified}
            sourceTitle={campaign.title}
            className="h-full"
            // Quick action props
            onSubmitVideo={() => setShowSubmitVideoDialog(true)}
            onLeave={() => setLeaveCampaignDialogOpen(true)}
            brandSlug={(campaign as any).brands?.slug}
            blueprintId={campaign.blueprint_id}
            sourceSlug={campaign.slug}
            hasConnectedAccounts={hasConnectedAccounts}
            paymentModel={campaign.payment_model}
            // Discord props
            hasDiscordServer={!!campaign.discord_guild_id}
            hasDiscordConnected={hasUserDiscord}
            // Assets props
            hasAssets={!!(blueprintAssets && blueprintAssets.length > 0) || hasAssetLinks}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="p-6 max-w-4xl mx-auto">
              {renderContent()}
            </div>
          </main>

          {/* Right Panel - conditionally show asset detail or member panel */}
          {activeSection.type === 'assets' && selectedAssetForPanel ? (
            <AssetDetailPanel
              asset={selectedAssetForPanel}
              onClose={() => setSelectedAssetForPanel(null)}
              onDownload={() => {
                // Download handled by the panel itself
              }}
              onEdit={isBrandAdmin ? () => setEditAsset(selectedAssetForPanel) : undefined}
              onDelete={isBrandAdmin ? () => setDeleteAsset(selectedAssetForPanel) : undefined}
              className="h-full"
              fullHeight
            />
          ) : (
            <SourceDetailsRightPanel
              members={members}
              memberCount={memberCount}
              currentUserId={currentUserId}
              announcements={realAnnouncements}
              onReaction={toggleReaction}
              creatorStats={{
                views: expectedPayout?.views || 0,
                earnings: totalEarnings,
                videos: approvedSubmissions,
                percentile: memberCount > 10 && approvedSubmissions > 0
                  ? Math.min(95, Math.max(5, Math.floor((1 - (approvedSubmissions / Math.max(1, memberCount))) * 100)))
                  : undefined,
              }}
              deadlines={[
                {
                  id: 'next-payout',
                  label: 'Next payout cycle',
                  date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                  type: 'payout' as const,
                },
                ...(campaign.end_date ? [{
                  id: 'campaign-end',
                  label: 'Campaign ends',
                  date: campaign.end_date,
                  type: 'campaign_end' as const,
                }] : []),
              ]}
            />
          )}
        </div>
      )}

      {/* Submit Video Dialog */}
      <SubmitVideoDialog
        campaign={{
          id: campaign.id,
          title: campaign.title,
          brand_name: campaign.brand_name,
          payment_model: campaign.payment_model,
          rpm_rate: campaign.rpm_rate,
          post_rate: campaign.post_rate,
          allowed_platforms: campaign.allowed_platforms || undefined
        }}
        open={showSubmitVideoDialog}
        onOpenChange={setShowSubmitVideoDialog}
        onSuccess={() => {
          const fetchStats = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: submissions } = await supabase
              .from('video_submissions')
              .select('status')
              .eq('source_type', 'campaign')
              .eq('source_id', campaign.id)
              .eq('creator_id', user.id);
            if (submissions) {
              setPendingSubmissions(submissions.filter(s => s.status === 'pending').length);
              setApprovedSubmissions(submissions.filter(s => s.status === 'approved').length);
            }
          };
          fetchStats();
        }}
      />

      {/* Asset Request Dialog */}
      {campaign.brand_id && (
        <AssetRequestDialog
          brandId={campaign.brand_id}
          open={showAssetRequestDialog}
          onOpenChange={setShowAssetRequestDialog}
        />
      )}

      {/* Asset Upload Dialog (for brand admins) */}
      {campaign.brand_id && isBrandAdmin && (
        <AssetUploadDialog
          brandId={campaign.brand_id}
          open={showAssetUploadDialog || !!editAsset}
          onOpenChange={(open) => {
            if (!open) {
              setShowAssetUploadDialog(false);
              setEditAsset(null);
            } else {
              setShowAssetUploadDialog(true);
            }
          }}
          editAsset={editAsset || undefined}
          onEditComplete={() => {
            setShowAssetUploadDialog(false);
            setEditAsset(null);
          }}
        />
      )}

      {/* Asset Delete Dialog (for brand admins) */}
      {campaign.brand_id && deleteAsset && (
        <AssetDeleteDialog
          asset={deleteAsset}
          brandId={campaign.brand_id}
          open={!!deleteAsset}
          onOpenChange={(open) => !open && setDeleteAsset(null)}
        />
      )}

      {/* Link Account Dialog */}
      <LinkAccountDialog
        open={linkAccountDialogOpen}
        onOpenChange={setLinkAccountDialogOpen}
        campaignId={campaign.id}
        onAddNewAccount={() => setAddAccountDialogOpen(true)}
        onSuccess={refreshCampaignData}
      />

      {/* Add Account Dialog */}
      <AddSocialAccountDialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen} onSuccess={refreshCampaignData} />

      {/* Manage Account Dialog */}
      {selectedAccount && (
        <>
          <ManageAccountDialog
            open={manageAccountDialogOpen}
            onOpenChange={setManageAccountDialogOpen}
            account={{
              id: selectedAccount.id,
              username: selectedAccount.username,
              platform: selectedAccount.platform,
              account_link: null
            }}
            demographicStatus={null}
            daysUntilNext={null}
            lastSubmissionDate={null}
            nextSubmissionDate={null}
            onUpdate={refreshCampaignData}
            onSubmitDemographics={() => setSubmitDemographicsDialogOpen(true)}
            platformIcon={
              <div className="w-6 h-6">
                <img src={getPlatformIcon(selectedAccount.platform) || ''} alt={selectedAccount.platform} className="w-full h-full" />
              </div>
            }
          />

          <SubmitAudienceInsightsDialog
            open={submitDemographicsDialogOpen}
            onOpenChange={setSubmitDemographicsDialogOpen}
            socialAccountId={selectedAccount.id}
            platform={selectedAccount.platform}
            username={selectedAccount.username}
            onSuccess={() => {
              setSubmitDemographicsDialogOpen(false);
              refreshCampaignData();
            }}
          />
        </>
      )}

      {/* Leave Campaign Confirmation Dialog */}
      <AlertDialog open={leaveCampaignDialogOpen} onOpenChange={setLeaveCampaignDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this campaign? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Withdraw your application</li>
                <li>Unlink all connected social accounts</li>
                <li>Remove your access to campaign resources</li>
              </ul>
              <p className="mt-2">You can always reapply later if the campaign is still active.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveCampaign} className="bg-destructive hover:bg-destructive/90">
              {leavingCampaign ? "Leaving..." : "Leave Campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Main export wraps with provider
export default function CreatorCampaignDetails() {
  return (
    <SourceDetailsSidebarProvider sourceType="campaign">
      <CampaignDetailsContent />
    </SourceDetailsSidebarProvider>
  );
}
