import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, User, ChevronUp, ChevronDown, Users, Database, ArrowLeft, MessageSquare, StickyNote, CheckSquare, Square, BarChart3, DollarSign, MapPin, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { CreatorNotesDialog } from "@/components/brand/CreatorNotesDialog";
import { RequestAudienceInsightsDialog } from "@/components/brand/RequestAudienceInsightsDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useBrandUsage } from "@/hooks/useBrandUsage";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
type StatusFilter = "all" | "pending" | "approved" | "rejected" | "waitlisted";
interface Application {
  id: string;
  campaign_id?: string;
  bounty_campaign_id?: string;
  creator_id?: string;
  user_id?: string;
  platform?: string;
  content_url?: string;
  video_url?: string;
  status: string;
  submitted_at?: string;
  applied_at?: string;
  reviewed_at: string | null;
  application_answers?: {
    question: string;
    answer: string;
  }[] | null;
  application_text?: string | null;
  campaign_title?: string;
  is_boost?: boolean;
  // Rate negotiation fields for flat-rate boosts
  proposed_rate?: number | null;
  approved_rate?: number | null;
  rate_status?: string | null;
  profile?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    trust_score: number | null;
    audience_quality_score: number | null;
    bio: string | null;
    city: string | null;
    country: string | null;
    content_niches: string[] | null;
  };
  social_accounts?: {
    platform: string;
    username: string;
    follower_count: number | null;
    verified: boolean | null;
    profile_url: string | null;
  }[];
  tier_assignment?: {
    tier_id: string;
    tier: {
      name: string;
      color: string | null;
      tier_order: number;
      rpm_multiplier: number;
      description: string | null;
    } | null;
  } | null;
  submission_stats?: {
    total_submissions: number;
    approved_submissions: number;
    total_views: number;
  } | null;
  // Shortimize auto-tracking flags (legacy)
  campaign_auto_track_shortimize?: boolean;
  bounty_auto_track_shortimize?: boolean;
  // Analytics provider selection ('none', 'shortimize', 'viral')
  campaign_analytics_provider?: string;
  bounty_analytics_provider?: string;
}
interface CampaignApplicationsViewProps {
  campaignId?: string;
  boostId?: string;
  brandId?: string; // For "all programs" mode
  subscriptionPlan?: string | null;
  onApplicationReviewed?: () => void;
}
const PLATFORM_LOGOS: Record<string, string> = {
  tiktok: tiktokLogoWhite,
  instagram: instagramLogoWhite,
  youtube: youtubeLogoWhite
};
export function CampaignApplicationsView({
  campaignId,
  boostId,
  brandId,
  subscriptionPlan,
  onApplicationReviewed
}: CampaignApplicationsViewProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get('workspace');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [notesCreator, setNotesCreator] = useState<{ id: string; name: string; username: string; avatarUrl?: string | null } | null>(null);
  const [insightsDialogOpen, setInsightsDialogOpen] = useState(false);
  const [insightsCreator, setInsightsCreator] = useState<{ id: string; username: string; full_name: string | null; avatar_url: string | null } | null>(null);
  const [currentBrandId, setCurrentBrandId] = useState<string | null>(null);
  const [currentSubscriptionPlan, setCurrentSubscriptionPlan] = useState<string | null>(subscriptionPlan || null);

  // Bulk selection state
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [bulkActionDialog, setBulkActionDialog] = useState<{ type: 'accept' | 'reject' | 'waitlist' | 'message' | null; open: boolean }>({ type: null, open: false });
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Shareable campaign link state
  const [shareableCampaignSlug, setShareableCampaignSlug] = useState<string | null>(null);

  // Boost payment model state (for flat-rate boosts)
  const [boostPaymentInfo, setBoostPaymentInfo] = useState<{
    payment_model: string | null;
    flat_rate_min: number | null;
    flat_rate_max: number | null;
  } | null>(null);
  const [counterOfferRate, setCounterOfferRate] = useState<string>("");
  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterProcessing, setCounterProcessing] = useState(false);

  // Tier management state
  const [availableTiers, setAvailableTiers] = useState<{
    id: string;
    name: string;
    color: string | null;
    tier_order: number;
    rpm_multiplier: number;
    description: string | null;
  }[]>([]);
  const [tierSource, setTierSource] = useState<'boost' | 'brand' | null>(null);
  const [tierChangeProcessing, setTierChangeProcessing] = useState(false);

  const isBoost = !!boostId && !brandId;
  const isFlatRateBoost = isBoost && boostPaymentInfo?.payment_model === 'flat_rate';

  // Use the brand ID to get usage limits
  const { canHireCreator, hiresUsed, hiresLimit } = useBrandUsage(currentBrandId || undefined, currentSubscriptionPlan);

  // Fetch brand ID and subscription plan from workspace slug
  useEffect(() => {
    const fetchBrandData = async () => {
      if (brandId) {
        setCurrentBrandId(brandId);
        // Fetch subscription plan if not provided
        if (!subscriptionPlan) {
          const { data: brand } = await supabase
            .from('brands')
            .select('subscription_plan')
            .eq('id', brandId)
            .single();
          if (brand) {
            setCurrentSubscriptionPlan(brand.subscription_plan);
          }
        }
        return;
      }
      if (!workspace) return;

      const { data: brand } = await supabase
        .from('brands')
        .select('id, subscription_plan')
        .eq('slug', workspace)
        .single();

      if (brand) {
        setCurrentBrandId(brand.id);
        if (!subscriptionPlan) {
          setCurrentSubscriptionPlan(brand.subscription_plan);
        }
      }
    };
    fetchBrandData();
  }, [workspace, brandId, subscriptionPlan]);

  // Fetch boost payment model info for flat-rate boosts
  useEffect(() => {
    const fetchBoostPaymentInfo = async () => {
      if (!boostId) {
        setBoostPaymentInfo(null);
        return;
      }
      const { data } = await supabase
        .from('bounty_campaigns')
        .select('payment_model, flat_rate_min, flat_rate_max')
        .eq('id', boostId)
        .single();
      if (data) {
        setBoostPaymentInfo(data);
      }
    };
    fetchBoostPaymentInfo();
  }, [boostId]);

  // Fetch available tiers (brand-level)
  useEffect(() => {
    const fetchAvailableTiers = async () => {
      let targetBrandId: string | null = null;

      // Get brand_id either directly or from boost
      if (brandId) {
        targetBrandId = brandId;
      } else if (boostId) {
        const { data: boost } = await supabase
          .from('bounty_campaigns')
          .select('brand_id')
          .eq('id', boostId)
          .single();
        targetBrandId = boost?.brand_id || null;
      } else if (workspace) {
        // Fallback: get brand_id from workspace slug
        const { data: brand } = await supabase
          .from('brands')
          .select('id')
          .eq('slug', workspace)
          .single();
        targetBrandId = brand?.id || null;
      }

      if (targetBrandId) {
        const { data: brandTiers } = await supabase
          .from('creator_tiers')
          .select('id, name, color, tier_order, rpm_multiplier, description')
          .eq('brand_id', targetBrandId)
          .order('tier_order', { ascending: true });

        if (brandTiers && brandTiers.length > 0) {
          setAvailableTiers(brandTiers);
          setTierSource('brand');
        } else {
          setAvailableTiers([]);
          setTierSource(null);
        }
      } else {
        setAvailableTiers([]);
        setTierSource(null);
      }
    };
    fetchAvailableTiers();
  }, [boostId, brandId, workspace]);

  const isAllMode = !!brandId && !campaignId && !boostId;
  useEffect(() => {
    fetchApplications();
  }, [campaignId, boostId, brandId]);
  const fetchApplications = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      let campaignMap = new Map<string, string>();
      let boostCampaignMap = new Map<string, string>();
      let campaignAutoTrackMap = new Map<string, boolean>();
      let boostAutoTrackMap = new Map<string, boolean>();
      let campaignAnalyticsProviderMap = new Map<string, string>();
      let boostAnalyticsProviderMap = new Map<string, string>();
      if (isAllMode && brandId) {
        // Fetch all applications across all campaigns and boosts for this brand
        const [campaignsResult, boostCampaignsResult] = await Promise.all([supabase.from("campaigns").select("id, title, slug, auto_track_shortimize, analytics_provider").eq("brand_id", brandId), supabase.from("bounty_campaigns").select("id, title, auto_track_shortimize, analytics_provider").eq("brand_id", brandId)]);

        // Set the first campaign slug for sharing
        if (campaignsResult.data && campaignsResult.data.length > 0) {
          setShareableCampaignSlug(campaignsResult.data[0].slug);
        } else {
          setShareableCampaignSlug(null);
        }
        const campaigns = campaignsResult.data || [];
        const boostCampaigns = boostCampaignsResult.data || [];
        const campaignIds = campaigns.map(c => c.id);
        const boostCampaignIds = boostCampaigns.map(c => c.id);
        campaignMap = new Map(campaigns.map(c => [c.id, c.title]));
        boostCampaignMap = new Map(boostCampaigns.map(c => [c.id, c.title]));
        campaignAutoTrackMap = new Map(campaigns.map(c => [c.id, c.auto_track_shortimize ?? false]));
        boostAutoTrackMap = new Map(boostCampaigns.map(c => [c.id, c.auto_track_shortimize ?? false]));
        campaignAnalyticsProviderMap = new Map(campaigns.map(c => [c.id, c.analytics_provider ?? 'none']));
        boostAnalyticsProviderMap = new Map(boostCampaigns.map(c => [c.id, c.analytics_provider ?? 'none']));
        const [campaignSubmissionsResult, bountyApplicationsResult] = await Promise.all([campaignIds.length > 0 ? supabase.from("campaign_submissions").select("*").in("campaign_id", campaignIds).order("submitted_at", {
          ascending: false
        }) : Promise.resolve({
          data: [],
          error: null
        }), boostCampaignIds.length > 0 ? supabase.from("bounty_applications").select("*").in("bounty_campaign_id", boostCampaignIds).order("applied_at", {
          ascending: false
        }) : Promise.resolve({
          data: [],
          error: null
        })]);
        if (campaignSubmissionsResult.error) throw campaignSubmissionsResult.error;
        if (bountyApplicationsResult.error) throw bountyApplicationsResult.error;

        // Normalize bounty applications
        const normalizedBountyApps = (bountyApplicationsResult.data || []).map(app => ({
          id: app.id,
          campaign_id: app.bounty_campaign_id,
          bounty_campaign_id: app.bounty_campaign_id,
          creator_id: app.user_id,
          user_id: app.user_id,
          platform: "boost" as string,
          content_url: app.video_url,
          video_url: app.video_url,
          status: app.status,
          submitted_at: app.applied_at,
          applied_at: app.applied_at,
          reviewed_at: app.reviewed_at,
          application_answers: app.application_answers as { question: string; answer: string }[] | null,
          application_text: app.application_text,
          is_boost: true,
          proposed_rate: app.proposed_rate,
          approved_rate: app.approved_rate,
          rate_status: app.rate_status
        }));
        const allSubmissions = [...(campaignSubmissionsResult.data || []).map(app => ({
          ...app,
          is_boost: false
        })), ...normalizedBountyApps];

        // Sort by submitted_at descending
        allSubmissions.sort((a, b) => new Date(b.submitted_at || b.applied_at).getTime() - new Date(a.submitted_at || a.applied_at).getTime());
        data = allSubmissions.map(app => ({
          ...app,
          campaign_title: app.is_boost ? boostCampaignMap.get(app.bounty_campaign_id || app.campaign_id) : campaignMap.get(app.campaign_id),
          campaign_auto_track_shortimize: app.is_boost ? undefined : campaignAutoTrackMap.get(app.campaign_id),
          bounty_auto_track_shortimize: app.is_boost ? boostAutoTrackMap.get(app.bounty_campaign_id || app.campaign_id) : undefined,
          campaign_analytics_provider: app.is_boost ? undefined : campaignAnalyticsProviderMap.get(app.campaign_id),
          bounty_analytics_provider: app.is_boost ? boostAnalyticsProviderMap.get(app.bounty_campaign_id || app.campaign_id) : undefined
        }));
      } else if (boostId) {
        // Fetch boost info including auto_track_shortimize and analytics_provider
        const { data: boostInfo } = await supabase
          .from("bounty_campaigns")
          .select("auto_track_shortimize, analytics_provider")
          .eq("id", boostId)
          .single();
        const boostAutoTrack = boostInfo?.auto_track_shortimize ?? false;
        const boostProvider = boostInfo?.analytics_provider ?? 'none';
        boostAutoTrackMap.set(boostId, boostAutoTrack);
        boostAnalyticsProviderMap.set(boostId, boostProvider);

        // Fetch all boost applications with rate fields
        const {
          data: boostData,
          error
        } = await supabase.from("bounty_applications").select("*, proposed_rate, approved_rate, rate_status").eq("bounty_campaign_id", boostId).order("applied_at", {
          ascending: false
        });
        if (error) throw error;
        data = (boostData || []).map(app => ({
          ...app,
          is_boost: true,
          proposed_rate: app.proposed_rate,
          approved_rate: app.approved_rate,
          rate_status: app.rate_status,
          bounty_auto_track_shortimize: boostAutoTrack,
          bounty_analytics_provider: boostProvider
        }));
      } else if (campaignId) {
        // Fetch campaign slug, auto_track_shortimize and analytics_provider for sharing
        const { data: campaignInfo } = await supabase
          .from("campaigns")
          .select("slug, auto_track_shortimize, analytics_provider")
          .eq("id", campaignId)
          .single();
        if (campaignInfo?.slug) {
          setShareableCampaignSlug(campaignInfo.slug);
        }
        const campaignAutoTrack = campaignInfo?.auto_track_shortimize ?? false;
        const campaignProvider = campaignInfo?.analytics_provider ?? 'none';
        campaignAutoTrackMap.set(campaignId, campaignAutoTrack);
        campaignAnalyticsProviderMap.set(campaignId, campaignProvider);

        // Fetch all campaign applications
        const {
          data: campaignData,
          error
        } = await supabase.from("campaign_submissions").select("*").eq("campaign_id", campaignId).order("submitted_at", {
          ascending: false
        });
        if (error) throw error;
        data = (campaignData || []).map(app => ({
          ...app,
          is_boost: false,
          campaign_auto_track_shortimize: campaignAutoTrack,
          campaign_analytics_provider: campaignProvider
        }));
      }

      // Fetch profiles for all creators
      const creatorIds = [...new Set(data?.map(a => a.creator_id || a.user_id).filter(Boolean) || [])];
      if (creatorIds.length > 0) {
        // Fetch profiles with expanded fields
        const {
          data: profiles
        } = await supabase.from("profiles").select("id, username, full_name, avatar_url, email, trust_score, audience_quality_score, bio, city, country, content_niches").in("id", creatorIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Fetch social accounts for all creators
        const { data: socialAccounts } = await supabase
          .from("social_accounts")
          .select("user_id, platform, username, follower_count, verified, profile_url")
          .in("user_id", creatorIds);

        // Group social accounts by user_id
        const socialAccountsMap = new Map<string, typeof socialAccounts>();
        (socialAccounts || []).forEach(account => {
          const existing = socialAccountsMap.get(account.user_id) || [];
          existing.push(account);
          socialAccountsMap.set(account.user_id, existing);
        });

        // Fetch tier assignments (brand-level tiers)
        let tierAssignmentsMap = new Map<string, Application['tier_assignment']>();

        // Get the brand_id from props, boost, or workspace
        let tierBrandId: string | null = null;
        if (brandId) {
          tierBrandId = brandId;
        } else if (boostId) {
          const { data: boostInfo } = await supabase
            .from("bounty_campaigns")
            .select("brand_id")
            .eq("id", boostId)
            .single();
          tierBrandId = boostInfo?.brand_id || null;
        } else if (workspace) {
          const { data: brand } = await supabase
            .from("brands")
            .select("id")
            .eq("slug", workspace)
            .single();
          tierBrandId = brand?.id || null;
        }

        if (tierBrandId) {
          // Fetch tier assignments - join to brand-level creator_tiers table
          const { data: tierAssignments } = await supabase
            .from("creator_tier_assignments")
            .select("user_id, tier_id, tier:creator_tiers!tier_id(name, color, tier_order, rpm_multiplier, description)")
            .eq("brand_id", tierBrandId)
            .in("user_id", creatorIds);

          (tierAssignments || []).forEach((ta: { user_id: string; tier_id: string; tier: { name: string; color: string | null; tier_order: number; rpm_multiplier: number; description: string | null } | null }) => {
            tierAssignmentsMap.set(ta.user_id, { tier_id: ta.tier_id, tier: ta.tier });
          });
        }

        // Fetch submission stats for accepted creators (boost submissions)
        let submissionStatsMap = new Map<string, Application['submission_stats']>();
        const acceptedCreatorIds = data
          ?.filter(a => a.status === 'accepted' || a.status === 'approved')
          .map(a => a.creator_id || a.user_id)
          .filter(Boolean) || [];

        if (boostId && acceptedCreatorIds.length > 0) {
          const { data: submissions } = await supabase
            .from("boost_submissions")
            .select("user_id, status, views")
            .eq("bounty_campaign_id", boostId)
            .in("user_id", acceptedCreatorIds);

          // Aggregate stats per user
          const statsMap = new Map<string, { total: number; approved: number; views: number }>();
          (submissions || []).forEach(sub => {
            const existing = statsMap.get(sub.user_id) || { total: 0, approved: 0, views: 0 };
            existing.total++;
            if (sub.status === 'approved') {
              existing.approved++;
              existing.views += sub.views || 0;
            }
            statsMap.set(sub.user_id, existing);
          });

          statsMap.forEach((stats, userId) => {
            submissionStatsMap.set(userId, {
              total_submissions: stats.total,
              approved_submissions: stats.approved,
              total_views: stats.views
            });
          });
        }

        const applicationsWithProfiles: Application[] = data?.map(app => {
          const creatorId = app.creator_id || app.user_id;
          return {
            ...app,
            application_answers: app.application_answers as {
              question: string;
              answer: string;
            }[] | null,
            profile: profileMap.get(creatorId),
            social_accounts: socialAccountsMap.get(creatorId) || [],
            tier_assignment: tierAssignmentsMap.get(creatorId) || null,
            submission_stats: submissionStatsMap.get(creatorId) || null
          };
        }) || [];
        setApplications(applicationsWithProfiles);

        // Auto-select first application (prioritize pending)
        if (applicationsWithProfiles.length > 0 && !selectedAppId) {
          const pendingApp = applicationsWithProfiles.find(a => a.status === 'pending');
          setSelectedAppId(pendingApp?.id || applicationsWithProfiles[0].id);
        }
      } else {
        setApplications([]);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateStatus = async (applicationId: string, newStatus: 'approved' | 'rejected' | 'accepted' | 'pending') => {
    // Check hire limit when approving/accepting
    if ((newStatus === 'approved' || newStatus === 'accepted') && !canHireCreator) {
      toast.error("Hire limit reached. Upgrade your plan to work with more creators.");
      return;
    }
    setProcessing(applicationId);
    try {
      const application = applications.find(a => a.id === applicationId);
      if (!application) throw new Error("Application not found");
      const appIsBoost = application.is_boost || !!application.bounty_campaign_id;
      const tableName = appIsBoost ? "bounty_applications" : "campaign_submissions";
      const finalStatus = appIsBoost && newStatus === 'approved' ? 'accepted' : newStatus;

      // Build update payload
      const updatePayload: Record<string, unknown> = {
        status: finalStatus,
        reviewed_at: new Date().toISOString()
      };

      // For flat-rate boosts, also approve the rate when accepting
      if (appIsBoost && (newStatus === 'accepted' || finalStatus === 'accepted') && isFlatRateBoost) {
        // Use counter rate if set, otherwise use proposed rate
        const rateToApprove = application.approved_rate ?? application.proposed_rate;
        if (rateToApprove != null) {
          updatePayload.approved_rate = rateToApprove;
          updatePayload.rate_status = 'approved';
        }
      }

      const { error } = await supabase.from(tableName).update(updatePayload).eq("id", applicationId);
      if (error) throw error;

      // Track in analytics provider if configured
      // Use analytics_provider column, with fallback to legacy auto_track_shortimize
      const campaignProvider = application.campaign_analytics_provider || (application.campaign_auto_track_shortimize ? 'shortimize' : 'none');
      const boostProvider = application.bounty_analytics_provider || (application.bounty_auto_track_shortimize ? 'shortimize' : 'none');

      const shouldTrackCampaign = !appIsBoost && newStatus === 'approved' && campaignProvider !== 'none';
      const shouldTrackBoost = appIsBoost && (newStatus === 'accepted' || finalStatus === 'accepted') && boostProvider !== 'none';

      if (shouldTrackCampaign) {
        const appCampaignId = application.campaign_id || campaignId;
        if (appCampaignId) {
          try {
            // Choose the appropriate Edge Function based on provider
            const functionName = campaignProvider === 'viral' ? 'track-campaign-user-viral' : 'track-campaign-user';
            await supabase.functions.invoke(functionName, {
              body: {
                campaignId: appCampaignId,
                userId: application.creator_id || application.user_id
              }
            });
          } catch (trackError) {
            console.error(`Error tracking campaign account (${campaignProvider}):`, trackError);
          }
        }
      }

      if (shouldTrackBoost) {
        const appBoostId = application.bounty_campaign_id || boostId;
        if (appBoostId) {
          try {
            // Choose the appropriate Edge Function based on provider
            const functionName = boostProvider === 'viral' ? 'track-boost-user-viral' : 'track-boost-user';
            await supabase.functions.invoke(functionName, {
              body: {
                bountyId: appBoostId,
                userId: application.user_id || application.creator_id
              }
            });
          } catch (trackError) {
            console.error(`Error tracking boost account (${boostProvider}):`, trackError);
          }
        }
      }

      // Find next application before updating the list
      const currentIndex = filteredApplications.findIndex(a => a.id === applicationId);
      const nextPendingApp = applications.find((a, i) => a.id !== applicationId && a.status === 'pending');
      const nextApp = nextPendingApp || filteredApplications[currentIndex + 1] || filteredApplications[currentIndex - 1];

      // Update status in list instead of removing
      setApplications(prev => prev.map(a => {
        if (a.id !== applicationId) return a;
        const updated = { ...a, status: finalStatus };
        // Also update rate fields if this was a flat-rate boost acceptance
        if (appIsBoost && (newStatus === 'accepted' || finalStatus === 'accepted') && isFlatRateBoost && a.proposed_rate != null) {
          updated.approved_rate = a.approved_rate ?? a.proposed_rate;
          updated.rate_status = 'approved';
        }
        return updated;
      }));

      // Auto-select next application
      if (nextApp && nextApp.id !== applicationId) {
        setSelectedAppId(nextApp.id);
      }

      // Notify parent that an application was reviewed
      onApplicationReviewed?.();
      toast.success(`Application ${finalStatus}`);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    } finally {
      setProcessing(null);
    }
  };
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved' || a.status === 'accepted').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;
  const waitlistedCount = applications.filter(a => a.status === 'waitlisted').length;
  const totalCount = applications.length;
  const filteredApplications = useMemo(() => {
    if (statusFilter === "all") return applications;
    if (statusFilter === "approved") return applications.filter(a => a.status === 'approved' || a.status === 'accepted');
    return applications.filter(a => a.status === statusFilter);
  }, [applications, statusFilter]);
  const selectedApp = filteredApplications.find(a => a.id === selectedAppId) || filteredApplications[0];

  // Auto-select first filtered application when filter changes
  useEffect(() => {
    if (filteredApplications.length > 0 && !filteredApplications.find(a => a.id === selectedAppId)) {
      setSelectedAppId(filteredApplications[0].id);
    }
  }, [filteredApplications, selectedAppId]);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'accepted':
        return <Badge variant="outline" className="text-xs font-medium tracking-[-0.3px] text-emerald-500 border-0 bg-emerald-500/10 w-[70px] justify-center">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-xs font-medium tracking-[-0.3px] text-red-500 border-0 bg-red-500/10 w-[70px] justify-center">Rejected</Badge>;
      case 'waitlisted':
        return <Badge variant="outline" className="text-xs font-medium tracking-[-0.3px] text-blue-500 border-0 bg-blue-500/10 w-[70px] justify-center">Waitlisted</Badge>;
      default:
        return <Badge variant="outline" className="text-xs font-inter font-medium tracking-[-0.5px] text-amber-500 border-0 bg-amber-500/10 w-[70px] justify-center">Pending</Badge>;
    }
  };
  const getAppUrl = (app: Application) => app.content_url || app.video_url;
  const getSubmittedAt = (app: Application) => app.submitted_at || app.applied_at;

  // Format follower count for display
  const formatFollowerCount = (count: number | null): string => {
    if (count === null || count === undefined) return "—";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  // Handle mobile application selection
  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
    setMobileShowDetail(true);
  };
  const handleMobileBack = () => {
    setMobileShowDetail(false);
  };

  // Handle message button click
  const handleMessage = async (creatorId: string) => {
    if (!workspace) return;

    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', workspace)
      .single();

    if (!brand) {
      toast.error('Could not find brand');
      return;
    }

    // Check for existing conversation
    const { data: existingConvo } = await supabase
      .from('conversations')
      .select('id')
      .eq('brand_id', brand.id)
      .eq('creator_id', creatorId)
      .single();

    if (!existingConvo) {
      // Create new conversation
      await supabase
        .from('conversations')
        .insert({
          brand_id: brand.id,
          creator_id: creatorId,
          last_message_at: new Date().toISOString()
        });
    }

    // Navigate to messages tab
    navigate(`/dashboard?workspace=${workspace}&tab=creators&subtab=messages`);
  };

  // Handle approve rate for flat-rate boosts
  const handleApproveRate = async (applicationId: string, rate: number) => {
    setCounterProcessing(true);
    try {
      const { error } = await supabase
        .from("bounty_applications")
        .update({
          approved_rate: rate,
          rate_status: 'approved'
        })
        .eq("id", applicationId);

      if (error) throw error;

      // Update local state
      setApplications(prev => prev.map(a =>
        a.id === applicationId
          ? { ...a, approved_rate: rate, rate_status: 'approved' }
          : a
      ));

      setShowCounterInput(false);
      setCounterOfferRate("");
      toast.success(`Rate of $${rate.toFixed(2)} approved`);
    } catch (error) {
      console.error("Error approving rate:", error);
      toast.error("Failed to approve rate");
    } finally {
      setCounterProcessing(false);
    }
  };

  // Handle counter offer for flat-rate boosts
  const handleCounterOffer = async (applicationId: string) => {
    const rate = parseFloat(counterOfferRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    setCounterProcessing(true);
    try {
      const { error } = await supabase
        .from("bounty_applications")
        .update({
          approved_rate: rate,
          rate_status: 'countered'
        })
        .eq("id", applicationId);

      if (error) throw error;

      // Update local state
      setApplications(prev => prev.map(a =>
        a.id === applicationId
          ? { ...a, approved_rate: rate, rate_status: 'countered' }
          : a
      ));

      setShowCounterInput(false);
      setCounterOfferRate("");
      toast.success(`Counter offer of $${rate.toFixed(2)} sent`);
    } catch (error) {
      console.error("Error sending counter offer:", error);
      toast.error("Failed to send counter offer");
    } finally {
      setCounterProcessing(false);
    }
  };

  // Handle tier change for a creator (brand-level tiers)
  const handleTierChange = async (userId: string, newTierId: string) => {
    setTierChangeProcessing(true);
    try {
      const newTier = availableTiers.find(t => t.id === newTierId);
      if (!newTier) throw new Error("Tier not found");

      // Get the brand_id from props, boost, or workspace
      let targetBrandId: string | null = null;

      if (brandId) {
        targetBrandId = brandId;
      } else if (boostId) {
        const { data: boostInfo } = await supabase
          .from("bounty_campaigns")
          .select("brand_id")
          .eq("id", boostId)
          .single();
        targetBrandId = boostInfo?.brand_id || null;
      } else if (workspace) {
        const { data: brand } = await supabase
          .from("brands")
          .select("id")
          .eq("slug", workspace)
          .single();
        targetBrandId = brand?.id || null;
      }

      if (!targetBrandId) throw new Error("Brand not found");

      // Check if assignment exists (by brand, not boost)
      const { data: existingAssignment } = await supabase
        .from("creator_tier_assignments")
        .select("id, tier_id")
        .eq("brand_id", targetBrandId)
        .eq("user_id", userId)
        .single();

      if (existingAssignment) {
        // Update existing assignment
        const { error } = await supabase
          .from("creator_tier_assignments")
          .update({
            tier_id: newTierId,
            previous_tier_id: existingAssignment.tier_id,
            assigned_at: new Date().toISOString(),
            assigned_by: 'manual'
          })
          .eq("id", existingAssignment.id);

        if (error) throw error;
      } else {
        // Create new assignment (brand-level)
        const { error } = await supabase
          .from("creator_tier_assignments")
          .insert({
            brand_id: targetBrandId,
            user_id: userId,
            tier_id: newTierId,
            assigned_at: new Date().toISOString(),
            assigned_by: 'manual'
          });

        if (error) throw error;
      }

      // Update local state
      setApplications(prev => prev.map(a => {
        if ((a.creator_id || a.user_id) !== userId) return a;
        return {
          ...a,
          tier_assignment: {
            tier_id: newTierId,
            tier: newTier
          }
        };
      }));

      toast.success(`Assigned to ${newTier.name} tier`);
    } catch (error) {
      console.error("Error changing tier:", error);
      toast.error("Failed to change tier");
    } finally {
      setTierChangeProcessing(false);
    }
  };

  // Bulk selection helpers
  const pendingAppsInFilter = filteredApplications.filter(a => a.status === 'pending');
  const toggleAppSelection = (appId: string) => {
    const newSet = new Set(selectedApps);
    if (newSet.has(appId)) {
      newSet.delete(appId);
    } else {
      newSet.add(appId);
    }
    setSelectedApps(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedApps.size === pendingAppsInFilter.length && pendingAppsInFilter.length > 0) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(pendingAppsInFilter.map(a => a.id)));
    }
  };

  // Bulk action handlers
  const handleBulkAccept = async () => {
    const selectedIds = Array.from(selectedApps);
    const selectedApplications = applications.filter(a => selectedIds.includes(a.id) && a.status === 'pending');

    // Early check with cached values
    if (hiresUsed + selectedApplications.length > hiresLimit) {
      toast.error(`Cannot accept ${selectedApplications.length} applications. Only ${Math.max(0, hiresLimit - hiresUsed)} more hires allowed on your plan.`);
      setBulkActionDialog({ type: null, open: false });
      return;
    }

    setBulkProcessing(true);
    try {
      // RACE CONDITION FIX: Re-fetch current hire count from database
      // This prevents exceeding hire limit during concurrent bulk accepts
      if (currentBrandId) {
        const [boostResult, campaignResult] = await Promise.all([
          supabase
            .from('bounty_applications')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', currentBrandId)
            .eq('status', 'accepted'),
          supabase
            .from('campaign_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', currentBrandId)
            .eq('status', 'approved')
        ]);

        const freshHiresUsed = (boostResult.count ?? 0) + (campaignResult.count ?? 0);

        if (freshHiresUsed + selectedApplications.length > hiresLimit) {
          toast.error(`Cannot accept ${selectedApplications.length} applications. Only ${Math.max(0, hiresLimit - freshHiresUsed)} more hires allowed. Another user may have just accepted applications.`);
          setBulkProcessing(false);
          setBulkActionDialog({ type: null, open: false });
          return;
        }
      }

      for (const app of selectedApplications) {
        const appIsBoost = app.is_boost || !!app.bounty_campaign_id;
        const tableName = appIsBoost ? "bounty_applications" : "campaign_submissions";
        const newStatus = appIsBoost ? 'accepted' : 'approved';

        await supabase
          .from(tableName)
          .update({ status: newStatus, reviewed_at: new Date().toISOString() })
          .eq("id", app.id);
      }

      // Update local state
      setApplications(prev => prev.map(a =>
        selectedIds.includes(a.id) && a.status === 'pending'
          ? { ...a, status: applications.find(app => app.id === a.id)?.is_boost ? 'accepted' : 'approved' }
          : a
      ));

      setSelectedApps(new Set());
      onApplicationReviewed?.();
      toast.success(`${selectedApplications.length} application${selectedApplications.length > 1 ? 's' : ''} accepted`);
    } catch (error) {
      console.error("Error bulk accepting:", error);
      toast.error("Failed to accept applications");
    } finally {
      setBulkProcessing(false);
      setBulkActionDialog({ type: null, open: false });
    }
  };

  const handleBulkReject = async () => {
    setBulkProcessing(true);
    try {
      const selectedIds = Array.from(selectedApps);
      const selectedApplications = applications.filter(a => selectedIds.includes(a.id) && a.status === 'pending');

      for (const app of selectedApplications) {
        const appIsBoost = app.is_boost || !!app.bounty_campaign_id;
        const tableName = appIsBoost ? "bounty_applications" : "campaign_submissions";

        await supabase
          .from(tableName)
          .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
          .eq("id", app.id);
      }

      // Update local state
      setApplications(prev => prev.map(a =>
        selectedIds.includes(a.id) && a.status === 'pending'
          ? { ...a, status: 'rejected' }
          : a
      ));

      setSelectedApps(new Set());
      onApplicationReviewed?.();
      toast.success(`${selectedApplications.length} application${selectedApplications.length > 1 ? 's' : ''} rejected`);
    } catch (error) {
      console.error("Error bulk rejecting:", error);
      toast.error("Failed to reject applications");
    } finally {
      setBulkProcessing(false);
      setBulkActionDialog({ type: null, open: false });
    }
  };

  const handleBulkWaitlist = async () => {
    setBulkProcessing(true);
    try {
      const selectedIds = Array.from(selectedApps);
      const selectedApplications = applications.filter(a => selectedIds.includes(a.id) && a.status === 'pending');

      for (const app of selectedApplications) {
        const appIsBoost = app.is_boost || !!app.bounty_campaign_id;
        if (!appIsBoost) continue; // Only boost applications can be waitlisted

        await supabase
          .from("bounty_applications")
          .update({ status: 'waitlisted', reviewed_at: new Date().toISOString() })
          .eq("id", app.id);
      }

      // Update local state
      setApplications(prev => prev.map(a =>
        selectedIds.includes(a.id) && a.status === 'pending' && (a.is_boost || !!a.bounty_campaign_id)
          ? { ...a, status: 'waitlisted' }
          : a
      ));

      setSelectedApps(new Set());
      onApplicationReviewed?.();
      toast.success(`Applications added to waitlist`);
    } catch (error) {
      console.error("Error bulk waitlisting:", error);
      toast.error("Failed to add to waitlist");
    } finally {
      setBulkProcessing(false);
      setBulkActionDialog({ type: null, open: false });
    }
  };
  if (applications.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px] p-8">
        <div className="max-w-md w-full text-center">
          {/* Title */}
          <h3 className="text-xl font-semibold text-foreground mb-2 font-inter tracking-[-0.5px]">
            No applications yet
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 font-inter tracking-[-0.3px]">
            When creators apply to {isAllMode ? "your campaigns" : isBoost ? "this boost" : "this campaign"}, they'll appear here for review.
          </p>

          {/* CTA Button - only show if there's a campaign to share */}
          {shareableCampaignSlug && (
            <Button
              className="bg-foreground text-background hover:bg-foreground/90 font-medium px-6"
              onClick={() => {
                const baseUrl = window.location.origin;
                navigator.clipboard.writeText(`${baseUrl}/join/${shareableCampaignSlug}`);
                toast.success("Link copied to clipboard");
              }}
            >
              Share campaign
            </Button>
          )}
        </div>
      </div>
    );
  }
  return <>
    <div className="flex h-full">
      {/* Applications List - Left Column (hidden on mobile when detail is shown) */}
      <div className={`w-full md:w-80 border-r border-border flex flex-col ${mobileShowDetail ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {loading ? (
              // Skeleton loader for sidebar
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))
            ) : filteredApplications.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">
                No {statusFilter} applications
              </div> : filteredApplications.map(app => {
            const timeAgo = formatDistanceToNow(new Date(getSubmittedAt(app) || new Date()), {
              addSuffix: true
            });
            const capitalizedTime = timeAgo.charAt(0).toUpperCase() + timeAgo.slice(1);
            return (
              <ContextMenu key={app.id}>
                <ContextMenuTrigger asChild>
                  <button
                    onClick={() => handleSelectApp(app.id)}
                    className={`group w-full p-3 rounded-lg text-left transition-all ${selectedAppId === app.id ? "bg-muted/50" : "md:hover:bg-muted/30"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={app.profile?.avatar_url || ""} />
                          <AvatarFallback>
                            {app.profile?.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {/* Checkbox overlay when in selection mode */}
                        {selectedApps.size > 0 && app.status === 'pending' && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAppSelection(app.id);
                            }}
                            className="absolute -top-1 -left-1"
                          >
                            <Checkbox
                              checked={selectedApps.has(app.id)}
                              className="h-4 w-4 rounded-[4px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary bg-background"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium tracking-[-0.5px] truncate max-w-[120px]">
                            {app.profile?.full_name || app.profile?.username || "Unknown"}
                          </p>
                          {app.status !== 'pending' && getStatusBadge(app.status)}
                        </div>
                        {isFlatRateBoost && app.proposed_rate != null && (
                          <p className="text-xs font-medium text-foreground/80 tracking-[-0.3px]">
                            ${app.proposed_rate.toLocaleString()}/post
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                          {capitalizedTime}
                        </p>
                      </div>
                    </div>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {app.status === 'pending' && (
                    <>
                      <ContextMenuItem onClick={() => toggleAppSelection(app.id)} className="gap-2">
                        <span className="material-symbols-rounded text-[18px]">
                          {selectedApps.has(app.id) ? 'remove_done' : 'check_box'}
                        </span>
                        {selectedApps.has(app.id) ? "Deselect" : "Select"}
                      </ContextMenuItem>
                      <ContextMenuItem onClick={toggleSelectAll} className="gap-2">
                        <span className="material-symbols-rounded text-[18px]">select_all</span>
                        {selectedApps.size === pendingAppsInFilter.length && pendingAppsInFilter.length > 0
                          ? "Deselect All"
                          : `Select All (${pendingAppsInFilter.length})`}
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => handleUpdateStatus(app.id, app.is_boost ? 'accepted' : 'approved')}
                        disabled={!canHireCreator}
                        className="gap-2"
                      >
                        <span className="material-symbols-rounded text-[18px]">check</span>
                        Accept
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleUpdateStatus(app.id, 'rejected')} className="gap-2">
                        <span className="material-symbols-rounded text-[18px]">close</span>
                        Reject
                      </ContextMenuItem>
                    </>
                  )}
                  {app.status !== 'pending' && (
                    <ContextMenuItem onClick={() => app.profile?.id && handleMessage(app.profile.id)} className="gap-2">
                      <span className="material-symbols-rounded text-[18px]">mail</span>
                      Message
                    </ContextMenuItem>
                  )}
                  <ContextMenuItem onClick={() => setStatusFilter("all")} disabled={statusFilter === "all"} className="gap-2">
                    <span className="material-symbols-rounded text-[18px]">lists</span>
                    Show All ({totalCount})
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setStatusFilter("pending")} disabled={statusFilter === "pending"} className="gap-2">
                    <span className="material-symbols-rounded text-[18px]">pending</span>
                    Pending ({pendingCount})
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setStatusFilter("approved")} disabled={statusFilter === "approved"} className="gap-2">
                    <span className="material-symbols-rounded text-[18px]">verified</span>
                    Approved ({approvedCount})
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
          </div>
        </div>
      </div>

      {/* Application Details - Right Column (hidden on mobile when list is shown) */}
      <div className={`flex-1 flex flex-col relative ${mobileShowDetail ? 'flex' : 'hidden md:flex'}`}>
        {selectedApp ? <>
            <div className="flex-1 overflow-auto p-4 md:p-6 pb-24">
              <div className="space-y-5">

                {/* Creator Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Navigation Arrows - Hidden on mobile */}
                    <div className="items-center gap-1 hidden md:flex flex-col">
                      <button onClick={() => {
                    const currentIndex = filteredApplications.findIndex(a => a.id === selectedApp.id);
                    if (currentIndex > 0) {
                      setSelectedAppId(filteredApplications[currentIndex - 1].id);
                    }
                  }} disabled={filteredApplications.findIndex(a => a.id === selectedApp.id) === 0} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button onClick={() => {
                    const currentIndex = filteredApplications.findIndex(a => a.id === selectedApp.id);
                    if (currentIndex < filteredApplications.length - 1) {
                      setSelectedAppId(filteredApplications[currentIndex + 1].id);
                    }
                  }} disabled={filteredApplications.findIndex(a => a.id === selectedApp.id) === filteredApplications.length - 1} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                    <Avatar className="h-12 w-12 ring-2 ring-border/50">
                      <AvatarImage src={selectedApp.profile?.avatar_url || ""} />
                      <AvatarFallback className="text-base font-medium tracking-[-0.5px]">
                        {selectedApp.profile?.username?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold tracking-[-0.5px] truncate">
                          {selectedApp.profile?.full_name || selectedApp.profile?.username || "Unknown Creator"}
                        </span>
                        {getStatusBadge(selectedApp.status)}
                      </div>
                      <p className="text-sm text-muted-foreground tracking-[-0.3px] truncate">
                        @{selectedApp.profile?.username}
                        {isAllMode && selectedApp.campaign_title && ` · ${selectedApp.campaign_title}`}
                      </p>
                      {(selectedApp.profile?.city || selectedApp.profile?.country) && (
                        <p className="text-xs text-muted-foreground tracking-[-0.2px] flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[selectedApp.profile?.city, selectedApp.profile?.country].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bio & Content Niches */}
                {(selectedApp.profile?.bio || (selectedApp.profile?.content_niches && selectedApp.profile.content_niches.length > 0)) && (
                  <div className="space-y-3">
                    {selectedApp.profile?.bio && (
                      <p className="text-sm text-foreground/80 tracking-[-0.3px] leading-relaxed">
                        {selectedApp.profile.bio}
                      </p>
                    )}
                    {selectedApp.profile?.content_niches && selectedApp.profile.content_niches.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedApp.profile.content_niches.map((niche, index) => (
                          <span
                            key={index}
                            className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                          >
                            {niche}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Trust & Quality Metrics */}
                {(selectedApp.profile?.trust_score != null || selectedApp.profile?.audience_quality_score != null) && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">Creator Metrics</p>
                    <div className="flex gap-3">
                      {selectedApp.profile?.trust_score != null && (
                        <div className="flex-1 p-3 rounded-xl border border-border/50 bg-muted/20">
                          <p className="text-xs text-muted-foreground mb-1">Trust Score</p>
                          <p className="text-lg font-semibold tracking-[-0.5px]">
                            {Math.round(selectedApp.profile.trust_score)}%
                          </p>
                        </div>
                      )}
                      {selectedApp.profile?.audience_quality_score != null && (
                        <div className="flex-1 p-3 rounded-xl border border-border/50 bg-muted/20">
                          <p className="text-xs text-muted-foreground mb-1">Quality Score</p>
                          <p className="text-lg font-semibold tracking-[-0.5px]">
                            {Math.round(selectedApp.profile.audience_quality_score)}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tier Assignment - For Accepted/Approved Members */}
                {(selectedApp.status === 'accepted' || selectedApp.status === 'approved') && availableTiers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">Tier</p>
                    <Select
                      value={selectedApp.tier_assignment?.tier_id || ""}
                      onValueChange={(value) => {
                        const userId = selectedApp.creator_id || selectedApp.user_id;
                        if (userId) handleTierChange(userId, value);
                      }}
                      disabled={tierChangeProcessing}
                    >
                      <SelectTrigger className="w-full h-auto p-3 rounded-xl border-border/50 bg-muted/20">
                        {selectedApp.tier_assignment?.tier ? (
                          <div className="flex items-center gap-3 text-left">
                            <div
                              className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold"
                              style={{ backgroundColor: `${selectedApp.tier_assignment.tier.color || '#6366f1'}20`, color: selectedApp.tier_assignment.tier.color || '#6366f1' }}
                            >
                              {selectedApp.tier_assignment.tier.tier_order}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium tracking-[-0.3px]" style={{ color: selectedApp.tier_assignment.tier.color || '#6366f1' }}>
                                {selectedApp.tier_assignment.tier.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {selectedApp.tier_assignment.tier.rpm_multiplier}x RPM
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Select tier...</span>
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {availableTiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-5 w-5 rounded flex items-center justify-center text-xs font-bold"
                                style={{ backgroundColor: `${tier.color || '#6366f1'}20`, color: tier.color || '#6366f1' }}
                              >
                                {tier.tier_order}
                              </div>
                              <span style={{ color: tier.color || '#6366f1' }}>{tier.name}</span>
                              <span className="text-muted-foreground text-xs">
                                {tier.rpm_multiplier}x RPM
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Submission Stats - For Accepted Members */}
                {(selectedApp.status === 'accepted' || selectedApp.status === 'approved') && selectedApp.submission_stats && selectedApp.submission_stats.total_submissions > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">With This Boost</p>
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-muted/20">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{selectedApp.submission_stats.total_submissions}</span>
                        <span className="text-xs text-muted-foreground">submitted</span>
                      </div>
                      <div className="w-px h-4 bg-border" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{selectedApp.submission_stats.approved_submissions}</span>
                        <span className="text-xs text-muted-foreground">approved</span>
                      </div>
                      {selectedApp.submission_stats.total_views > 0 && (
                        <>
                          <div className="w-px h-4 bg-border" />
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{formatFollowerCount(selectedApp.submission_stats.total_views)}</span>
                            <span className="text-xs text-muted-foreground">views</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Social Accounts - Multi-platform */}
                {selectedApp.social_accounts && selectedApp.social_accounts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">Connected Accounts</p>
                    <div className="space-y-2">
                      {selectedApp.social_accounts.map((account, index) => (
                        <a
                          key={index}
                          href={account.profile_url || `https://${account.platform.toLowerCase()}.com/@${account.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group"
                        >
                          {PLATFORM_LOGOS[account.platform?.toLowerCase?.()] && (
                            <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0">
                              <img src={PLATFORM_LOGOS[account.platform.toLowerCase()]} alt={account.platform} className="h-5 w-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium tracking-[-0.3px] truncate">@{account.username}</p>
                            <p className="text-xs text-muted-foreground tracking-[-0.2px] capitalize">{account.platform}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tracking-[-0.3px]">{formatFollowerCount(account.follower_count)}</p>
                            <p className="text-xs text-muted-foreground">followers</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Account - Fallback when no social accounts */}
                {(!selectedApp.social_accounts || selectedApp.social_accounts.length === 0) && getAppUrl(selectedApp) && <a href={getAppUrl(selectedApp)!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group min-w-0 overflow-hidden">
                    {selectedApp.platform && PLATFORM_LOGOS[selectedApp.platform?.toLowerCase?.()] && <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0">
                        <img src={PLATFORM_LOGOS[selectedApp.platform.toLowerCase()]} alt={selectedApp.platform} className="h-5 w-5" />
                      </div>}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-sm font-medium tracking-[-0.3px] truncate">
                        {(() => {
                    const url = getAppUrl(selectedApp);
                    if (!url) return "Unknown";
                    const match = url.match(/(?:instagram\.com|tiktok\.com|youtube\.com)\/(@?[\w.-]+)/i);
                    return match ? match[1].replace(/^@/, '') : url;
                  })()}
                      </p>
                      <p className="text-xs text-muted-foreground tracking-[-0.2px] capitalize">
                        {selectedApp.is_boost ? "Submitted video" : "Connected account"}
                      </p>
                    </div>
                  </a>}

                {/* Application Note */}
                {selectedApp.application_text && <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">Note</p>
                    <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
                      <p className="text-sm text-foreground tracking-[-0.3px] leading-relaxed">{selectedApp.application_text}</p>
                    </div>
                  </div>}

                {/* Application Answers */}
                {selectedApp.application_answers && selectedApp.application_answers.length > 0 && <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">Responses</p>
                    <div className="space-y-2">
                      {selectedApp.application_answers.map((qa, index) => <div key={index} className="p-3 rounded-xl border border-border/50 bg-muted/20">
                          <p className="text-xs text-muted-foreground tracking-[-0.2px] mb-1.5">{qa.question}</p>
                          <p className="text-sm text-foreground tracking-[-0.3px] leading-relaxed">{qa.answer || "No answer provided"}</p>
                        </div>)}
                    </div>
                  </div>}

                {/* Rate Proposal Section - Only for flat-rate boosts */}
                {isFlatRateBoost && selectedApp.is_boost && selectedApp.proposed_rate != null && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">Rate Proposal</p>
                    <div className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
                      {/* Rate Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium tracking-[-0.3px]">
                              {selectedApp.approved_rate != null && selectedApp.rate_status === 'countered'
                                ? `Counter: $${selectedApp.approved_rate.toFixed(2)}/post`
                                : `Proposed: $${selectedApp.proposed_rate.toFixed(2)}/post`
                              }
                            </p>
                            {boostPaymentInfo?.flat_rate_min != null && boostPaymentInfo?.flat_rate_max != null && (
                              <p className="text-xs text-muted-foreground tracking-[-0.2px]">
                                Your range: ${boostPaymentInfo.flat_rate_min.toFixed(2)} - ${boostPaymentInfo.flat_rate_max.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        {selectedApp.rate_status === 'approved' && (
                          <Badge variant="outline" className="text-xs text-emerald-500 border-0 bg-emerald-500/10">
                            Approved
                          </Badge>
                        )}
                        {selectedApp.rate_status === 'countered' && (
                          <Badge variant="outline" className="text-xs text-amber-500 border-0 bg-amber-500/10">
                            Countered
                          </Badge>
                        )}
                      </div>

                      {/* Counter offer input - Only show if pending and user wants to counter */}
                      {selectedApp.status === 'pending' && (!selectedApp.rate_status || selectedApp.rate_status === 'pending' || selectedApp.rate_status === 'proposed' || selectedApp.rate_status === 'countered') && (
                        showCounterInput ? (
                          <div className="pt-2 border-t border-border/50 space-y-2">
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Your counter rate"
                                  value={counterOfferRate}
                                  onChange={(e) => setCounterOfferRate(e.target.value)}
                                  className="pl-9 h-9"
                                />
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleCounterOffer(selectedApp.id)}
                                disabled={counterProcessing || !counterOfferRate}
                                className="h-9"
                              >
                                Set
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowCounterInput(false);
                                  setCounterOfferRate("");
                                }}
                                disabled={counterProcessing}
                                className="h-9 px-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Set a different rate, then click Accept below
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowCounterInput(true)}
                            className="text-xs text-primary hover:underline pt-1"
                          >
                            Counter with different rate
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border/50">
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Message Button - Always visible */}
                  <button
                    onClick={() => selectedApp.profile?.id && handleMessage(selectedApp.profile.id)}
                    disabled={!selectedApp.profile?.id}
                    className="flex-1 h-11 font-medium tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1"
                  >
                    <span className="material-symbols-rounded text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
                    Message
                  </button>
                  {selectedApp.status === 'pending' ? (
                    <>
                      <button onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')} disabled={processing === selectedApp.id} className="flex-1 h-11 font-medium tracking-[-0.5px] rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed order-2">
                        <span className="material-symbols-rounded text-[18px]">close</span>
                        Reject
                      </button>
                      <Button onClick={() => handleUpdateStatus(selectedApp.id, selectedApp.is_boost ? 'accepted' : 'approved')} disabled={processing === selectedApp.id || !canHireCreator} className="flex-1 h-11 font-medium tracking-[-0.5px] bg-primary hover:bg-primary/90 text-primary-foreground order-3">
                        <Check className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                    </>
                  ) : selectedApp.status === 'waitlisted' ? (
                    <>
                      <button onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')} disabled={processing === selectedApp.id} className="flex-1 h-11 font-medium tracking-[-0.5px] rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed order-2">
                        <span className="material-symbols-rounded text-[18px]">close</span>
                        Reject
                      </button>
                      <Button onClick={() => handleUpdateStatus(selectedApp.id, 'accepted')} disabled={processing === selectedApp.id || !canHireCreator} className="flex-1 h-11 font-medium tracking-[-0.5px] bg-primary hover:bg-primary/90 text-primary-foreground order-3">
                        <Check className="h-4 w-4 mr-2" />
                        Promote to Accepted
                      </Button>
                    </>
                  ) : selectedApp.status === 'rejected' ? (
                    <Button onClick={() => handleUpdateStatus(selectedApp.id, 'pending')} variant="outline" disabled={processing === selectedApp.id} className="flex-1 h-11 font-medium tracking-[-0.5px] order-2">
                      Undo Rejection
                    </Button>
                  ) : null}
                </div>
              </div>
          </> : <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an application to review
          </div>}
      </div>
    </div>

    {/* Bulk Action Bar */}
    {selectedApps.size > 0 && (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm font-medium tracking-[-0.3px] text-foreground px-1">
          {selectedApps.size} selected
        </span>
        <div className="w-px h-5 bg-border" />
        <button
          onClick={() => setSelectedApps(new Set())}
          className="h-9 px-3 text-sm font-medium tracking-[-0.3px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          Clear
        </button>
        <button
          onClick={() => setBulkActionDialog({ type: 'reject', open: true })}
          disabled={bulkProcessing}
          className="h-9 px-4 text-sm font-medium tracking-[-0.3px] rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-4 w-4" />
          Reject All
        </button>
        <Button
          onClick={() => setBulkActionDialog({ type: 'accept', open: true })}
          disabled={bulkProcessing}
          className="h-9 px-4 text-sm font-medium tracking-[-0.3px] bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Check className="h-4 w-4 mr-2" />
          Accept All
        </Button>
        {isBoost && (
          <Button
            variant="outline"
            onClick={() => setBulkActionDialog({ type: 'waitlist', open: true })}
            disabled={bulkProcessing}
            className="h-9 px-4 text-sm font-medium tracking-[-0.3px]"
          >
            Waitlist
          </Button>
        )}
      </div>
    )}

    {/* Bulk Accept Dialog */}
    <AlertDialog open={bulkActionDialog.type === 'accept' && bulkActionDialog.open} onOpenChange={(open) => setBulkActionDialog({ type: open ? 'accept' : null, open })}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Accept {selectedApps.size} applications?</AlertDialogTitle>
          <AlertDialogDescription>
            This will accept all selected applications. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBulkAccept} disabled={bulkProcessing} className="bg-emerald-600 hover:bg-emerald-700">
            {bulkProcessing ? "Processing..." : "Accept All"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Bulk Reject Dialog */}
    <AlertDialog open={bulkActionDialog.type === 'reject' && bulkActionDialog.open} onOpenChange={(open) => setBulkActionDialog({ type: open ? 'reject' : null, open })}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject {selectedApps.size} applications?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reject all selected applications. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBulkReject} disabled={bulkProcessing} className="bg-red-600 hover:bg-red-700">
            {bulkProcessing ? "Processing..." : "Reject All"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Bulk Waitlist Dialog */}
    <AlertDialog open={bulkActionDialog.type === 'waitlist' && bulkActionDialog.open} onOpenChange={(open) => setBulkActionDialog({ type: open ? 'waitlist' : null, open })}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Add {selectedApps.size} applications to waitlist?</AlertDialogTitle>
          <AlertDialogDescription>
            These creators will be added to the waitlist. You can promote them later when spots become available.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleBulkWaitlist} disabled={bulkProcessing}>
            {bulkProcessing ? "Processing..." : "Add to Waitlist"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Creator Notes Dialog */}
    {currentBrandId && notesCreator && (
      <CreatorNotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        brandId={currentBrandId}
        creatorId={notesCreator.id}
        creatorName={notesCreator.name}
        creatorUsername={notesCreator.username}
        creatorAvatarUrl={notesCreator.avatarUrl}
      />
    )}

    {/* Request Audience Insights Dialog */}
    {currentBrandId && insightsCreator && (
      <RequestAudienceInsightsDialog
        open={insightsDialogOpen}
        onOpenChange={setInsightsDialogOpen}
        brandId={currentBrandId}
        creator={insightsCreator}
        campaignId={campaignId}
      />
    )}
  </>;
}