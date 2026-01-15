import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Plus, Megaphone, X } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";
import tiktokIcon from "@/assets/tiktok-logo-white.png";
import tiktokIconBlack from "@/assets/tiktok-logo-black-new.png";
import instagramIcon from "@/assets/instagram-logo-white.png";
import instagramIconBlack from "@/assets/instagram-logo-black.png";
import youtubeIcon from "@/assets/youtube-logo-white.png";
import youtubeIconBlack from "@/assets/youtube-logo-black-new.png";
import xIcon from "@/assets/x-logo.png";
import xIconLight from "@/assets/x-logo-light.png";
import {
  SourceDetailsSidebarProvider,
  useSourceDetails,
  SourceDetailsLeftSidebar,
  SourceDetailsRightPanel,
} from "@/components/source-details";
import { SourceDetailsMobileLayout } from "@/components/source-details/mobile";
import type { TrainingModule } from "@/components/source-details/SourceDetailsLeftSidebar";
import { useTrainingCompletion } from "@/hooks/useTrainingCompletion";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";
import { LinkAccountDialog } from "@/components/LinkAccountDialog";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { ManageAccountDialog } from "@/components/ManageAccountDialog";
import { SubmitAudienceInsightsDialog } from "@/components/SubmitAudienceInsightsDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SubmissionsTab } from "@/components/dashboard/SubmissionsTab";
import { TransactionsTable, Transaction } from "@/components/dashboard/TransactionsTable";
import { AssetLibrary, AssetRequestDialog } from "@/components/assets";
import { JoinCampaignSheet } from "@/components/JoinCampaignSheet";

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
  asset_links?: AssetLink[] | null;
  requirements?: string[] | null;
  campaign_update?: string | null;
  campaign_update_at?: string | null;
  blueprint_id?: string | null;
  payment_model?: string | null;
  post_rate?: number | null;
  banner_url?: string | null;
  is_verified?: boolean;
  brand_slug?: string | null;
  discord_guild_id?: string | null;
  connected_accounts?: ConnectedAccount[];
}

interface Boost {
  id: string;
  title: string;
  slug: string | null;
  brand_id?: string;
  brand_name: string;
  brand_logo_url: string | null;
  brand_color?: string | null;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements?: string | null;
  blueprint_id?: string | null;
  blueprint_embed_url?: string | null;
  banner_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  discord_guild_id?: string | null;
  is_verified?: boolean;
  brand_slug?: string | null;
  max_accepted_creators?: number;
  accepted_creators_count?: number;
}

const calculateDaysUntilEnd = (endDate: string | null) => {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
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

const getFaviconUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
  } catch {
    return null;
  }
};

// Inner component that uses the context
function PublicCampaignContent({
  isMember,
  sourceType: detectedSourceType,
  resolvedSourceId
}: {
  isMember: boolean;
  sourceType: 'campaign' | 'boost';
  resolvedSourceId: string | null;
}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const { activeSection, setActiveSection, isMobile, isPublicView } = useSourceDetails();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [boost, setBoost] = useState<Boost | null>(null);
  const [loading, setLoading] = useState(true);
  const isBoost = detectedSourceType === 'boost';
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [blueprintContent, setBlueprintContent] = useState<string | null>(null);
  const [blueprintAssets, setBlueprintAssets] = useState<AssetLink[] | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [members, setMembers] = useState<Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    username?: string;
    views?: number;
    joined_at?: string;
  }>>([]);
  const [trainingModules, setTrainingModules] = useState<TrainingModule[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Member-only state
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [approvedSubmissions, setApprovedSubmissions] = useState(0);
  const [earnings, setEarnings] = useState<Transaction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [expectedPayout, setExpectedPayout] = useState<{ views: number; amount: number } | null>(null);
  const [hasUserDiscord, setHasUserDiscord] = useState(false);

  // Dialog state (member-only)
  const [showSubmitVideoDialog, setShowSubmitVideoDialog] = useState(false);
  const [showAssetRequestDialog, setShowAssetRequestDialog] = useState(false);
  const [linkAccountDialogOpen, setLinkAccountDialogOpen] = useState(false);
  const [addAccountDialogOpen, setAddAccountDialogOpen] = useState(false);
  const [manageAccountDialogOpen, setManageAccountDialogOpen] = useState(false);
  const [submitDemographicsDialogOpen, setSubmitDemographicsDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null);
  const [leaveCampaignDialogOpen, setLeaveCampaignDialogOpen] = useState(false);
  const [leavingCampaign, setLeavingCampaign] = useState(false);
  const [isBrandAdmin, setIsBrandAdmin] = useState(false);
  const [showJoinSheet, setShowJoinSheet] = useState(false);

  // Training hook
  const training = useTrainingCompletion(campaign?.blueprint_id || undefined);

  // Fetch real announcements
  const { announcements: realAnnouncements, toggleReaction } = useAnnouncements({
    sourceType: "campaign",
    sourceId: campaign?.id || "",
    enabled: !!campaign?.id,
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

  // Fetch source data (campaign or boost)
  useEffect(() => {
    const fetchSourceData = async () => {
      if (!id || !resolvedSourceId) {
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }

        if (isBoost) {
          // Fetch boost details
          const { data: boostData, error } = await supabase
            .from("bounty_campaigns")
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
            .eq("id", resolvedSourceId)
            .single();

          if (error || !boostData) {
            console.error('Error fetching boost:', error);
            setLoading(false);
            navigate('/');
            return;
          }

          const brandData = boostData.brands as any;
          setBoost({
            ...boostData,
            brand_name: brandData?.name || 'Unknown Brand',
            brand_logo_url: brandData?.logo_url || null,
            brand_color: brandData?.brand_color,
            is_verified: brandData?.is_verified,
            brand_slug: brandData?.slug,
            // Use boost's blueprint_id
            blueprint_id: boostData.blueprint_id,
          });
          setLoading(false);
        } else {
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
            .eq("id", resolvedSourceId)
            .single();

          if (error || !campaignData) {
            console.error('Error fetching campaign:', error);
            setLoading(false);
            navigate('/');
            return;
          }

          // If member, fetch connected accounts
          let connectedAccounts: ConnectedAccount[] = [];
          if (isMember && user) {
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
              .eq("campaign_id", campaignData.id)
              .eq("user_id", user.id)
              .eq("status", "active");

            accountCampaigns?.forEach((connection: any) => {
              if (connection.social_accounts) {
                connectedAccounts.push(connection.social_accounts);
              }
            });
          }

          const brandData = campaignData.brands as any;
          setCampaign({
            ...campaignData,
            brand_name: brandData?.name || campaignData.brand_name,
            brand_logo_url: brandData?.logo_url || campaignData.brand_logo_url,
            brand_color: brandData?.brand_color,
            is_verified: brandData?.is_verified,
            brand_slug: brandData?.slug,
            // Use campaign's blueprint_id
            blueprint_id: campaignData.blueprint_id,
            connected_accounts: connectedAccounts
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in fetchSourceData:', error);
        setLoading(false);
      }
    };

    fetchSourceData();
  }, [id, navigate, isMember, isBoost, resolvedSourceId]);

  // Fetch secondary data
  useEffect(() => {
    const fetchSecondaryData = async () => {
      if (!resolvedSourceId) return;
      // Wait for campaign or boost to be loaded before fetching secondary data
      if (isBoost && !boost) return;
      if (!isBoost && !campaign) return;

      const { data: { user } } = await supabase.auth.getUser();

      // Run all fetches in parallel - handle both campaigns and boosts
      const fetchPromises: Promise<any>[] = isBoost ? [
        // Boost: Member count from bounty_applications
        supabase
          .from('bounty_applications')
          .select('user_id', { count: 'exact', head: true })
          .eq('bounty_campaign_id', resolvedSourceId)
          .eq('status', 'accepted'),

        // Boost: Members list from bounty_applications
        supabase
          .from('bounty_applications')
          .select(`user_id, created_at`)
          .eq('bounty_campaign_id', resolvedSourceId)
          .eq('status', 'accepted')
          .order('created_at', { ascending: true })
          .limit(20),

        // Blueprint data - fetch by blueprint_id if set, otherwise by brand_id
        boost?.blueprint_id
          ? supabase.from('blueprints').select('id, content, assets').eq('id', boost.blueprint_id).maybeSingle()
          : boost?.brand_id
            ? supabase.from('blueprints').select('id, content, assets').eq('brand_id', boost.brand_id).maybeSingle()
            : Promise.resolve({ data: null }),

        // Training modules - will be fetched after blueprint is resolved
        Promise.resolve({ data: null })
      ] : [
        // Campaign: Member count
        supabase
          .from('social_account_campaigns')
          .select('user_id', { count: 'exact', head: true })
          .eq('campaign_id', resolvedSourceId)
          .eq('status', 'active'),

        // Campaign: Members list
        supabase
          .from('social_account_campaigns')
          .select(`user_id, created_at, social_accounts (username)`)
          .eq('campaign_id', resolvedSourceId)
          .eq('status', 'active')
          .order('created_at', { ascending: true })
          .limit(20),

        // Blueprint data - fetch by blueprint_id if set, otherwise by brand_id
        campaign?.blueprint_id
          ? supabase.from('blueprints').select('id, content, assets').eq('id', campaign.blueprint_id).maybeSingle()
          : campaign?.brand_id
            ? supabase.from('blueprints').select('id, content, assets').eq('brand_id', campaign.brand_id).maybeSingle()
            : Promise.resolve({ data: null }),

        // Training modules - will be fetched after blueprint is resolved
        Promise.resolve({ data: null })
      ];

      // Add member-only fetches
      if (isMember && user) {
        fetchPromises.push(
          // Submissions
          supabase
            .from('video_submissions')
            .select('status')
            .eq('source_type', isBoost ? 'boost' : 'campaign')
            .eq('source_id', resolvedSourceId)
            .eq('creator_id', user.id),

          // Earnings
          supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', user.id)
            .in('type', isBoost ? ['earning', 'boost_earning'] : ['earning'])
            .order('created_at', { ascending: false }),

          // Discord status
          supabase.from('profiles').select('discord_id').eq('id', user.id).single(),

          // Expected payout metrics (campaigns only)
          !isBoost
            ? supabase
                .from('campaign_video_metrics')
                .select('total_views, recorded_at')
                .eq('campaign_id', resolvedSourceId)
                .order('recorded_at', { ascending: false })
                .limit(1)
            : Promise.resolve({ data: null })
        );
      }

      const results = await Promise.all(fetchPromises);

      const [memberCountResult, membersResult, blueprintResult, modulesResult] = results;

      setMemberCount(memberCountResult.count || 0);

      // Process members
      if (membersResult.data && membersResult.data.length > 0) {
        const userIds = [...new Set(membersResult.data.map((link: any) => link.user_id))];

        const [profilesResult, memberSubmissionsResult] = await Promise.all([
          supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', userIds),
          supabase.from('video_submissions').select('creator_id, views')
            .eq('source_type', isBoost ? 'boost' : 'campaign').eq('source_id', resolvedSourceId).eq('status', 'approved')
        ]);

        const profileMap = new Map(profilesResult.data?.map(p => [p.id, p]) || []);
        const viewsByCreator = new Map<string, number>();
        memberSubmissionsResult.data?.forEach((sub: any) => {
          const views = Number(sub.views) || 0;
          viewsByCreator.set(sub.creator_id, (viewsByCreator.get(sub.creator_id) || 0) + views);
        });

        const userMap = new Map<string, any>();
        membersResult.data.forEach((link: any) => {
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
          if (user && a.id === user.id) return -1;
          if (user && b.id === user.id) return 1;
          return (b.views || 0) - (a.views || 0);
        });
        setMembers(membersList);
      }

      // Process blueprint and fetch training modules
      console.log('Blueprint fetch result:', blueprintResult);
      console.log('Campaign brand_id:', campaign?.brand_id);
      console.log('Campaign blueprint_id:', campaign?.blueprint_id);
      if (blueprintResult.data) {
        console.log('Setting blueprint content:', blueprintResult.data.content?.substring(0, 100));
        setBlueprintContent(blueprintResult.data.content || null);
        if (blueprintResult.data.assets && Array.isArray(blueprintResult.data.assets) && blueprintResult.data.assets.length > 0) {
          const mappedAssets = blueprintResult.data.assets.map((asset: any) => ({
            label: asset.notes || asset.label || 'Asset Link',
            url: asset.link || asset.url || ''
          })).filter((asset: AssetLink) => asset.url);
          setBlueprintAssets(mappedAssets.length > 0 ? mappedAssets : null);
        }

        // Fetch training modules using the blueprint id
        if (blueprintResult.data.id) {
          const { data: modulesData } = await supabase
            .from('blueprint_training_modules')
            .select('id, title, required, order_index')
            .eq('blueprint_id', blueprintResult.data.id)
            .order('order_index');
          if (modulesData) {
            setTrainingModules(modulesData);
          }
        }
      }

      // Process member-only data
      if (isMember && user && results.length > 4) {
        const [, , , , submissionsResult, earningsResult, discordResult, metricsResult] = results;

        // Submissions
        if (submissionsResult?.data) {
          setPendingSubmissions(submissionsResult.data.filter((s: any) => s.status === 'pending').length);
          setApprovedSubmissions(submissionsResult.data.filter((s: any) => s.status === 'approved').length);
        }

        // Earnings
        if (earningsResult?.data) {
          const sourceTxns = earningsResult.data.filter((txn: any) => {
            const metadata = txn.metadata as { campaign_id?: string; boost_id?: string } | null;
            if (isBoost) {
              return metadata?.boost_id === resolvedSourceId;
            }
            return metadata?.campaign_id === resolvedSourceId;
          });
          const transactions: Transaction[] = sourceTxns.map((txn: any) => ({
            id: txn.id,
            type: 'earning' as const,
            amount: Number(txn.amount) || 0,
            date: new Date(txn.created_at),
            status: txn.status,
            campaign: !isBoost && campaign ? {
              id: campaign.id,
              title: campaign.title,
              brand_name: campaign.brand_name,
              brand_logo_url: campaign.brand_logo_url,
            } : null,
            boost: isBoost && boost ? {
              id: boost.id,
              title: boost.title,
              brand_name: boost.brand_name,
              brand_logo_url: boost.brand_logo_url,
            } : null,
            recipient: null,
            sender: null,
          }));
          setEarnings(transactions);
          setTotalEarnings(transactions.reduce((sum, t) => sum + t.amount, 0));
        }

        // Discord
        setHasUserDiscord(!!discordResult?.data?.discord_id);

        // Expected payout
        if (metricsResult?.data && metricsResult.data.length > 0) {
          const totalViews = Number(metricsResult.data[0]?.total_views) || 0;
          const amount = totalViews / 1000 * campaign.rpm_rate;
          setExpectedPayout({ views: totalViews, amount });
        }
      }

      // Check brand admin status
      if (user) {
        const brandId = isBoost ? boost?.brand_id : campaign?.brand_id;
        if (brandId) {
          const { data: membershipData } = await supabase
            .from('brand_members')
            .select('role')
            .eq('brand_id', brandId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (membershipData) {
            const role = membershipData.role;
            setIsBrandAdmin(role === 'owner' || role === 'admin');
          } else {
            setIsBrandAdmin(false);
          }
        } else {
          setIsBrandAdmin(false);
        }
      } else {
        setIsBrandAdmin(false);
      }
    };

    fetchSecondaryData();
  }, [resolvedSourceId, isBoost, campaign, boost, isMember]);

  const refreshCampaignData = async () => {
    if (!sourceId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!isBoost && campaign) {
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
        .eq("campaign_id", campaign.id)
        .eq("user_id", user.id)
        .eq("status", "active");

      const connectedAccounts: ConnectedAccount[] = [];
      accountCampaigns?.forEach((connection: any) => {
        if (connection.social_accounts) {
          connectedAccounts.push(connection.social_accounts);
        }
      });

      setCampaign(prev => prev ? { ...prev, connected_accounts: connectedAccounts } : null);
    }
  };

  const handleLeaveCampaign = async () => {
    if (!sourceId) return;
    setLeavingCampaign(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (isBoost) {
        // Leave boost - update bounty_applications status
        await supabase
          .from("bounty_applications")
          .update({ status: 'withdrawn' })
          .eq("bounty_campaign_id", sourceId)
          .eq("user_id", user.id);

        toast({
          title: "Left Opportunity",
          description: "You have successfully left this opportunity"
        });
      } else {
        const { data: linkedAccounts } = await supabase
          .from("social_account_campaigns")
          .select("social_account_id")
          .eq("campaign_id", sourceId)
          .eq("user_id", user.id);

        // Disconnect all social accounts
        await supabase
          .from("social_account_campaigns")
          .update({
            status: 'disconnected',
            disconnected_at: new Date().toISOString()
          })
          .eq("campaign_id", sourceId)
          .in("social_account_id", linkedAccounts?.map(l => l.social_account_id) || []);

        toast({
          title: "Left Campaign",
          description: "You have successfully left this campaign"
        });
      }

      // Refresh to show public view
      window.location.reload();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave campaign"
      });
    } finally {
      setLeavingCampaign(false);
      setLeaveCampaignDialogOpen(false);
    }
  };

  if (loading) {
    return null;
  }

  // Either campaign or boost must be loaded
  const source = isBoost ? boost : campaign;
  if (!source) {
    return null;
  }

  // Common source properties
  const sourceId = source.id;
  const sourceTitle = source.title;
  const sourceSlug = source.slug;
  const sourceBrandName = source.brand_name;
  const sourceBrandLogo = source.brand_logo_url;
  const sourceBrandColor = source.brand_color;
  const sourceBannerUrl = source.banner_url;
  const sourceIsVerified = source.is_verified;
  const sourceBrandSlug = source.brand_slug;
  const sourceBlueprintId = isBoost ? boost?.blueprint_id : campaign?.blueprint_id;
  const sourceDescription = source.description;
  const sourceEndDate = source.end_date;
  const sourceDiscordGuildId = isBoost ? boost?.discord_guild_id : campaign?.discord_guild_id;
  const sourceBrandId = source.brand_id;

  const daysUntilEnd = calculateDaysUntilEnd(sourceEndDate || null);
  const hasConnectedAccounts = !isBoost && campaign?.connected_accounts && campaign.connected_accounts.length > 0;
  const hasAssetLinks = !isBoost && campaign?.asset_links && campaign.asset_links.length > 0;
  const hasRequirements = !isBoost && campaign?.requirements && campaign.requirements.length > 0;

  // Render Overview Content
  const renderOverviewContent = () => (
    <div className="space-y-6">
      {/* Join CTA Banner - Only show if not a member */}
      {!isMember && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
                Join this {isBoost ? 'opportunity' : 'campaign'}
              </h3>
              <p className="text-sm text-muted-foreground font-inter">
                {isBoost && boost
                  ? `$${boost.monthly_retainer.toLocaleString()}/mo for ${boost.videos_per_month} videos`
                  : campaign
                    ? `Start earning $${(campaign.rpm_rate * 1000).toLocaleString()} per 1M views`
                    : ''}
              </p>
            </div>
            <Link to={`/join/${sourceSlug}`}>
              <Button className="bg-primary hover:bg-primary/90 text-white">
                Apply Now
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Campaign Update Banner - only for campaigns */}
      {!isBoost && campaign?.campaign_update && (
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
      {(blueprintContent || sourceDescription || (isBoost && boost?.content_style_requirements)) && (
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
                {renderDescriptionWithLinks(sourceDescription || (isBoost && boost?.content_style_requirements) || '')}
              </div>
            )}
            {!showFullDescription && (blueprintContent && blueprintContent.length > 200 || (sourceDescription || (isBoost && boost?.content_style_requirements)) && (sourceDescription || boost?.content_style_requirements || '').length > 200) && (
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            )}
          </div>
          {(blueprintContent && blueprintContent.length > 200 || (sourceDescription || (isBoost && boost?.content_style_requirements)) && (sourceDescription || boost?.content_style_requirements || '').length > 200) && (
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
        {isBoost ? (
          <>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Videos/Mo</p>
              <p className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">{boost?.videos_per_month || 0}</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Pay Type</p>
              <p className="font-semibold text-sm text-foreground font-inter tracking-[-0.5px]">Monthly</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Per Month</p>
              <p className="font-semibold text-sm text-primary font-inter tracking-[-0.5px]">${boost?.monthly_retainer?.toLocaleString() || 0}</p>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground/60 mb-1 uppercase tracking-wide font-inter">Platforms</p>
              <div className="flex justify-center gap-1 mt-1.5">
                {campaign?.allowed_platforms?.map(platform => {
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
              <p className="font-semibold text-sm text-primary font-inter tracking-[-0.5px]">${((campaign?.rpm_rate || 0) * 1000).toLocaleString()}</p>
            </div>
          </>
        )}
      </div>

      {/* Connected Accounts Section (Member only, campaigns only) */}
      {isMember && !isBoost && (
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
              {campaign?.connected_accounts?.map(account => (
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
      )}

      {/* Requirements Section (campaigns only) */}
      {hasRequirements && (
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 font-inter tracking-[-0.5px]">Campaign Requirements</h4>
          <div className="space-y-2">
            {campaign?.requirements?.map((req, index) => (
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

      {/* Member Avatars */}
      {memberCount > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {members.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="w-8 h-8 rounded-full border-2 border-background overflow-hidden bg-muted flex items-center justify-center"
              >
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">
                    {member.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            ))}
          </div>
          {memberCount > 3 && (
            <span className="text-sm text-muted-foreground font-inter">
              +{memberCount - 3} more
            </span>
          )}
        </div>
      )}

      {/* Join CTA at bottom (non-member only) */}
      {!isMember && (
        <div className="pt-4">
          <Link to={`/join/${sourceSlug}`} className="block">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-base">
              Apply to Join {isBoost ? 'Opportunity' : 'Campaign'}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );

  // Render Blueprint Content
  const renderBlueprintContent = () => {
    const sortedModules = [...(isMember ? training.modules : trainingModules)].sort((a, b) => a.order_index - b.order_index);
    const hasModules = sortedModules.length > 0;
    const completedModuleIds = isMember ? training.completedModuleIds : new Set<string>();
    const guidelines = !isBoost && campaign?.guidelines;
    const boostRequirements = isBoost && boost?.content_style_requirements;

    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Content Guide</h2>
          {guidelines ? (
            <div
              className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground font-inter"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(guidelines) }}
            />
          ) : blueprintContent ? (
            <div
              className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground font-inter"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blueprintContent) }}
            />
          ) : boostRequirements ? (
            <div
              className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground font-inter"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boostRequirements) }}
            />
          ) : (
            <p className="text-muted-foreground font-inter">No specific content guidelines provided for this {isBoost ? 'opportunity' : 'campaign'}.</p>
          )}
        </div>

        {hasModules && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Training Modules</h2>
              <span className="text-sm text-muted-foreground font-inter">
                {completedModuleIds.size}/{sortedModules.length} completed
              </span>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  (isMember ? training.progress : 0) === 100 ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${isMember ? training.progress : 0}%` }}
              />
            </div>

            <div className="space-y-2">
              {sortedModules.map((module, index) => {
                const isCompleted = completedModuleIds.has(module.id);
                return (
                  <button
                    key={module.id}
                    onClick={() => isMember && setActiveSection({ type: 'training', moduleId: module.id })}
                    disabled={!isMember}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-muted/20 border border-border/50 transition-all text-left group",
                      isMember && "hover:bg-muted/50 hover:border-border"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold transition-colors",
                      isCompleted
                        ? "bg-green-500/20 text-green-500"
                        : "bg-muted text-muted-foreground"
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
                  </button>
                );
              })}
            </div>

            {!isMember && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center">
                <p className="text-sm text-muted-foreground font-inter mb-3">
                  Join to access training materials
                </p>
                <Link to={`/join/${sourceSlug}`}>
                  <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                    Apply Now
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render Submissions Content (Member only)
  const renderSubmissionsContent = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Your Submissions</h2>
      <SubmissionsTab campaignId={isBoost ? undefined : sourceId} boostId={isBoost ? sourceId : undefined} compact />
    </div>
  );

  // Render Earnings Content (Member only)
  const renderEarningsContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Earnings</h2>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground font-inter tracking-[-0.5px]">
            ${totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground font-inter">Total earned from this {isBoost ? 'opportunity' : 'campaign'}</p>
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

  // Render Support Content (Member only)
  const renderSupportContent = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Get Support</h2>
      <div className="p-4 rounded-xl border border-border/50 bg-white dark:bg-muted/20">
        <h3 className="font-medium text-foreground mb-2 font-inter">Need Help?</h3>
        <p className="text-sm text-muted-foreground mb-4 font-inter">
          If you have any questions about this {isBoost ? 'opportunity' : 'campaign'}, contact us through the main dashboard.
        </p>
        <Link to="/dashboard?tab=support">
          <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted/50">
            Go to Support
          </Button>
        </Link>
      </div>
    </div>
  );

  // Render Assets Content
  const renderAssetsContent = () => {
    if (sourceBrandId) {
      return (
        <div className="space-y-6">
          <AssetLibrary
            brandId={sourceBrandId}
            isAdmin={isBrandAdmin}
            selectedAsset={null}
            onSelectAsset={() => {}}
            onRequestAsset={isMember ? () => setShowAssetRequestDialog(true) : undefined}
          />
        </div>
      );
    }

    const assets = blueprintAssets || (!isBoost && campaign?.asset_links) || [];

    if (assets.length === 0) {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1 font-inter tracking-[-0.5px]">Assets</h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Brand resources and materials</p>
          </div>
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-muted/30 rounded-xl">
            <p className="text-sm text-muted-foreground font-inter text-center">No assets available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1 font-inter tracking-[-0.5px]">Assets</h2>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Brand resources and materials</p>
        </div>
        <div className="grid gap-3">
          {assets.map((asset, index) => {
            const faviconUrl = getFaviconUrl(asset.url);
            return (
              <a
                key={index}
                href={asset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-4 bg-card border border-border/50 rounded-xl hover:border-primary/30 hover:bg-muted/30 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                  {faviconUrl ? (
                    <img src={faviconUrl} alt="" className="w-5 h-5 rounded" />
                  ) : (
                    <Icon icon="material-symbols:link" className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
      case 'training':
        return renderBlueprintContent();
      case 'assets':
        return renderAssetsContent();
      case 'submissions':
        return isMember ? renderSubmissionsContent() : renderOverviewContent();
      case 'earnings':
        return isMember ? renderEarningsContent() : renderOverviewContent();
      case 'support':
        return isMember ? renderSupportContent() : renderOverviewContent();
      case 'overview':
      default:
        return renderOverviewContent();
    }
  };

  return (
    <>
      {/* Mobile Layout */}
      {isMobile ? (
        <SourceDetailsMobileLayout
          sourceId={sourceId}
          sourceTitle={sourceTitle}
          sourceSlug={sourceSlug}
          brandName={sourceBrandName}
          brandLogoUrl={sourceBrandLogo}
          brandColor={sourceBrandColor}
          bannerUrl={sourceBannerUrl}
          memberCount={memberCount}
          isVerified={sourceIsVerified}
          onSubmitVideo={isMember ? () => setShowSubmitVideoDialog(true) : undefined}
          onLeave={isMember ? () => setLeaveCampaignDialogOpen(true) : undefined}
          brandSlug={sourceBrandSlug}
          blueprintId={sourceBlueprintId}
          hasConnectedAccounts={hasConnectedAccounts}
          paymentModel={!isBoost ? campaign?.payment_model : null}
          hasDiscordServer={!!sourceDiscordGuildId}
          hasDiscordConnected={hasUserDiscord}
          hasAssets={!!(blueprintAssets && blueprintAssets.length > 0) || hasAssetLinks}
          modules={isMember ? training.modules : trainingModules}
          completedModuleIds={isMember ? training.completedModuleIds : new Set()}
          trainingProgress={isMember ? training.progress : 0}
          budget={!isBoost ? campaign?.budget : undefined}
          budgetUsed={!isBoost ? (campaign?.budget_used || 0) : 0}
          submissionCount={pendingSubmissions + approvedSubmissions}
          progressStats={isBoost && boost ? {
            videosThisMonth: approvedSubmissions,
            videosRequired: boost.videos_per_month,
            monthlyRetainer: boost.monthly_retainer,
          } : undefined}
          rightPanel={
            <SourceDetailsRightPanel
              members={members}
              memberCount={memberCount}
              currentUserId={currentUserId}
              announcements={realAnnouncements}
              onReaction={toggleReaction}
              creatorStats={isMember ? {
                views: expectedPayout?.views || 0,
                earnings: totalEarnings,
                videos: approvedSubmissions,
              } : undefined}
              deadlines={sourceEndDate ? [{
                id: 'source-end',
                label: isBoost ? 'Opportunity ends' : 'Campaign ends',
                date: sourceEndDate,
                type: 'campaign_end' as const,
              }] : []}
              className="w-full border-0"
            />
          }
        >
          <div className="relative min-h-[60vh]">
            <div className={cn(
              "p-4 max-w-4xl mx-auto",
              !isMember && "blur-md pointer-events-none select-none"
            )}>
              {renderContent()}
            </div>

            {/* Non-member Join CTA Overlay (Mobile) */}
            {!isMember && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="bg-card border border-border/50 rounded-2xl p-6 max-w-sm mx-4 text-center shadow-lg">
                  <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {sourceBrandLogo ? (
                      <img src={sourceBrandLogo} alt={sourceBrandName} className="w-full h-full object-cover" />
                    ) : (
                      <Icon icon="material-symbols:lock" className="w-7 h-7 text-primary" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 font-inter tracking-[-0.5px]">
                    Join to Access Full Details
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5 font-inter">
                    {isBoost && boost
                      ? `Earn $${boost.monthly_retainer.toLocaleString()}/mo`
                      : campaign
                        ? `Earn $${((campaign.rpm_rate || 0) * 1000).toLocaleString()} per 1M views`
                        : 'Apply to join this campaign'}
                  </p>
                  {!isBoost && campaign ? (
                    <Button
                      onClick={() => setShowJoinSheet(true)}
                      className="w-full bg-primary hover:bg-primary/90 text-white py-5 text-base font-medium tracking-[-0.5px]"
                    >
                      Apply Now
                    </Button>
                  ) : (
                    <Link to={`/join/${sourceSlug}`}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-white py-5 text-base font-medium tracking-[-0.5px]">
                        Apply Now
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </SourceDetailsMobileLayout>
      ) : (
        /* Desktop Layout */
        <div className="flex h-full">
          {/* Left Sidebar */}
          <SourceDetailsLeftSidebar
            modules={isMember ? training.modules : trainingModules}
            completedModuleIds={isMember ? training.completedModuleIds : new Set()}
            trainingProgress={isMember ? training.progress : 0}
            budget={!isBoost ? campaign?.budget : undefined}
            budgetUsed={!isBoost ? (campaign?.budget_used || 0) : 0}
            submissionCount={pendingSubmissions + approvedSubmissions}
            memberCount={memberCount}
            brandName={sourceBrandName}
            brandLogoUrl={sourceBrandLogo}
            brandColor={sourceBrandColor}
            bannerUrl={sourceBannerUrl}
            isVerified={sourceIsVerified}
            sourceTitle={sourceTitle}
            className="h-full"
            onSubmitVideo={isMember ? () => setShowSubmitVideoDialog(true) : undefined}
            onLeave={isMember ? () => setLeaveCampaignDialogOpen(true) : undefined}
            brandSlug={sourceBrandSlug}
            blueprintId={sourceBlueprintId}
            sourceSlug={sourceSlug}
            hasConnectedAccounts={hasConnectedAccounts}
            paymentModel={!isBoost ? campaign?.payment_model : null}
            hasDiscordServer={!!sourceDiscordGuildId}
            hasDiscordConnected={hasUserDiscord}
            hasAssets={!!(blueprintAssets && blueprintAssets.length > 0) || hasAssetLinks}
            progressStats={isBoost && boost ? {
              videosThisMonth: approvedSubmissions,
              videosRequired: boost.videos_per_month,
              monthlyRetainer: boost.monthly_retainer,
            } : undefined}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto bg-background relative">
            <div className={cn(
              "p-6 max-w-4xl mx-auto",
              !isMember && "blur-md pointer-events-none select-none"
            )}>
              {renderContent()}
            </div>

            {/* Non-member Join CTA Overlay */}
            {!isMember && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="bg-card border border-border/50 rounded-2xl p-8 max-w-md mx-4 text-center shadow-lg">
                  <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4 overflow-hidden">
                    {sourceBrandLogo ? (
                      <img src={sourceBrandLogo} alt={sourceBrandName} className="w-full h-full object-cover" />
                    ) : (
                      <Icon icon="material-symbols:lock" className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2 font-inter tracking-[-0.5px]">
                    Join to Access Full Details
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 font-inter">
                    {isBoost && boost
                      ? `Apply to earn $${boost.monthly_retainer.toLocaleString()}/month for creating ${boost.videos_per_month} videos`
                      : campaign
                        ? `Start earning $${((campaign.rpm_rate || 0) * 1000).toLocaleString()} per 1M views on your content`
                        : 'Apply to join this campaign and start earning'}
                  </p>
                  {!isBoost && campaign ? (
                    <Button
                      onClick={() => setShowJoinSheet(true)}
                      className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-base font-medium tracking-[-0.5px]"
                    >
                      Apply to Join Campaign
                    </Button>
                  ) : (
                    <Link to={`/join/${sourceSlug}`}>
                      <Button className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-base font-medium tracking-[-0.5px]">
                        Apply to Join Opportunity
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Right Panel */}
          <SourceDetailsRightPanel
            members={members}
            memberCount={memberCount}
            currentUserId={currentUserId}
            announcements={realAnnouncements}
            onReaction={toggleReaction}
            creatorStats={isMember ? {
              views: expectedPayout?.views || 0,
              earnings: totalEarnings,
              videos: approvedSubmissions,
            } : undefined}
            deadlines={sourceEndDate ? [{
              id: 'source-end',
              label: isBoost ? 'Opportunity ends' : 'Campaign ends',
              date: sourceEndDate,
              type: 'campaign_end' as const,
            }] : []}
          />
        </div>
      )}

      {/* Member-only dialogs */}
      {isMember && source && (
        <>
          {/* Campaign-specific dialogs */}
          {!isBoost && campaign && (
            <>
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
                onSuccess={refreshCampaignData}
              />

              <LinkAccountDialog
                open={linkAccountDialogOpen}
                onOpenChange={setLinkAccountDialogOpen}
                campaignId={campaign.id}
                onAddNewAccount={() => setAddAccountDialogOpen(true)}
                onSuccess={refreshCampaignData}
              />

              <AddSocialAccountDialog
                open={addAccountDialogOpen}
                onOpenChange={setAddAccountDialogOpen}
                onSuccess={refreshCampaignData}
              />

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
            </>
          )}

          {/* Asset request dialog (both campaigns and boosts) */}
          {sourceBrandId && (
            <AssetRequestDialog
              brandId={sourceBrandId}
              open={showAssetRequestDialog}
              onOpenChange={setShowAssetRequestDialog}
            />
          )}

          {/* Leave dialog (both campaigns and boosts) */}
          <AlertDialog open={leaveCampaignDialogOpen} onOpenChange={setLeaveCampaignDialogOpen}>
            <AlertDialogContent className="max-w-md">
              <button
                onClick={() => setLeaveCampaignDialogOpen(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-semibold pr-8">
                  Leave '{sourceTitle}'
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base text-muted-foreground">
                  Are you sure you want to leave <span className="font-semibold text-foreground">{sourceTitle}</span>?
                  {isBoost
                    ? " You won't be able to rejoin unless you are re-invited."
                    : " This will unlink all connected social accounts and you won't be able to rejoin unless re-invited."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-3 mt-4 sm:flex-row">
                <AlertDialogCancel className="flex-1 m-0 bg-zinc-800 hover:bg-zinc-700 border-0 text-white font-medium h-12">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLeaveCampaign}
                  className="flex-1 m-0 bg-red-500 hover:bg-red-600 border-0 ring-0 ring-offset-0 text-white font-medium h-12"
                  style={{ boxShadow: 'inset 0 1px 0 0 rgba(255,150,150,0.3)' }}
                >
                  {leavingCampaign ? "Leaving..." : `Leave ${isBoost ? 'Opportunity' : 'Campaign'}`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      {/* Non-member join dialog for campaigns */}
      {!isMember && !isBoost && campaign && (
        <JoinCampaignSheet
          campaign={{
            id: campaign.id,
            title: campaign.title,
            description: campaign.description || '',
            brand_name: campaign.brand_name,
            brand_logo_url: campaign.brand_logo_url || '',
            budget: campaign.budget,
            budget_used: campaign.budget_used || 0,
            rpm_rate: campaign.rpm_rate,
            status: campaign.status,
            start_date: campaign.start_date || null,
            banner_url: null,
            platforms: campaign.allowed_platforms || [],
            slug: campaign.slug,
            guidelines: campaign.guidelines || null,
            application_questions: [],
            requires_application: false,
            blueprint_id: campaign.blueprint_id,
            brands: campaign.brand_logo_url ? {
              logo_url: campaign.brand_logo_url,
              is_verified: campaign.is_verified
            } : undefined
          }}
          open={showJoinSheet}
          onOpenChange={setShowJoinSheet}
          onSuccess={() => window.location.reload()}
        />
      )}
    </>
  );
}

// Wrapper that checks membership before rendering
export default function PublicCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [sourceType, setSourceType] = useState<'campaign' | 'boost'>('campaign');
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceSlug, setSourceSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMembership = async () => {
      console.log('[PublicCampaignPage] checkMembership started, id:', id);
      if (!id) {
        navigate('/');
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[PublicCampaignPage] User:', user?.id || 'not logged in');

        // Check if id looks like a UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        console.log('[PublicCampaignPage] isUUID:', isUUID);

        // First try to find in campaigns table
        let campaignData = null;
        if (isUUID) {
          const { data } = await supabase
            .from("campaigns")
            .select("id, slug")
            .eq("id", id)
            .maybeSingle();
          campaignData = data;
        }
        if (!campaignData) {
          const { data } = await supabase
            .from("campaigns")
            .select("id, slug")
            .eq("slug", id)
            .maybeSingle();
          campaignData = data;
        }

        if (campaignData) {
          setSourceType('campaign');
          setSourceId(campaignData.id);
          setSourceSlug(campaignData.slug || id);

          if (!user) {
            // Not logged in, allow viewing but not as member
            setIsMember(false);
            setLoading(false);
            return;
          }

          // Check if user has joined the campaign
          const { data: membership } = await supabase
            .from("social_account_campaigns")
            .select("id")
            .eq("campaign_id", campaignData.id)
            .eq("user_id", user.id)
            .eq("status", "active")
            .limit(1)
            .maybeSingle();

          // Set member status without redirecting
          setIsMember(!!membership);
          setLoading(false);
          return;
        }

        // If not found in campaigns, try bounty_campaigns (boosts)
        console.log('[PublicCampaignPage] Campaign not found, checking bounty_campaigns');
        let boostData = null;
        if (isUUID) {
          const { data, error } = await supabase
            .from("bounty_campaigns")
            .select("id, slug")
            .eq("id", id)
            .maybeSingle();
          console.log('[PublicCampaignPage] Boost query by UUID:', { data, error });
          boostData = data;
        }
        if (!boostData) {
          const { data, error } = await supabase
            .from("bounty_campaigns")
            .select("id, slug")
            .eq("slug", id)
            .maybeSingle();
          console.log('[PublicCampaignPage] Boost query by slug:', { data, error });
          boostData = data;
        }

        if (boostData) {
          console.log('[PublicCampaignPage] Boost found:', boostData.id);
          setSourceType('boost');
          setSourceId(boostData.id);
          setSourceSlug(boostData.slug || id);

          if (!user) {
            // Not logged in, allow viewing but not as member
            console.log('[PublicCampaignPage] No user, allowing non-member view');
            setIsMember(false);
            setLoading(false);
            return;
          }

          // Check if user has been accepted to the boost
          const { data: membership } = await supabase
            .from("bounty_applications")
            .select("id")
            .eq("bounty_campaign_id", boostData.id)
            .eq("user_id", user.id)
            .eq("status", "accepted")
            .limit(1)
            .maybeSingle();

          // Set member status without redirecting
          setIsMember(!!membership);
          setLoading(false);
          return;
        }

        // Not found in either table, redirect to join page with the slug
        console.warn('Campaign/boost not found:', id);
        console.log('Checked campaigns and bounty_campaigns tables');
        navigate(`/join/${id}`, { replace: true });
      } catch (error) {
        console.error('Error checking membership:', error);
        // On error, redirect to join page instead of home
        navigate(`/join/${id}`, { replace: true });
      }
    };

    checkMembership();
  }, [id, navigate]);

  // Show nothing while loading
  if (loading || !sourceId || isMember === null) {
    return null;
  }

  // Render for everyone (members and non-members)
  return (
    <SourceDetailsSidebarProvider sourceType={sourceType} isPublicView={!isMember}>
      <PublicCampaignContent isMember={isMember} sourceType={sourceType} resolvedSourceId={sourceId} />
    </SourceDetailsSidebarProvider>
  );
}
