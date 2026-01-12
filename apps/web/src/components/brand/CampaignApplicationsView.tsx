import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, User, ChevronUp, ChevronDown, Users, Database, ArrowLeft, MessageSquare, StickyNote, CheckSquare, Square, BarChart3 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  profile?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
    trust_score: number | null;
    audience_quality_score: number | null;
  };
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

  const isBoost = !!boostId && !brandId;

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
      if (isAllMode && brandId) {
        // Fetch all applications across all campaigns and boosts for this brand
        const [campaignsResult, boostCampaignsResult] = await Promise.all([supabase.from("campaigns").select("id, title, slug").eq("brand_id", brandId), supabase.from("bounty_campaigns").select("id, title").eq("brand_id", brandId)]);

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
          is_boost: true
        }));
        const allSubmissions = [...(campaignSubmissionsResult.data || []).map(app => ({
          ...app,
          is_boost: false
        })), ...normalizedBountyApps];

        // Sort by submitted_at descending
        allSubmissions.sort((a, b) => new Date(b.submitted_at || b.applied_at).getTime() - new Date(a.submitted_at || a.applied_at).getTime());
        data = allSubmissions.map(app => ({
          ...app,
          campaign_title: app.is_boost ? boostCampaignMap.get(app.bounty_campaign_id || app.campaign_id) : campaignMap.get(app.campaign_id)
        }));
      } else if (boostId) {
        // Fetch all boost applications
        const {
          data: boostData,
          error
        } = await supabase.from("bounty_applications").select("*").eq("bounty_campaign_id", boostId).order("applied_at", {
          ascending: false
        });
        if (error) throw error;
        data = (boostData || []).map(app => ({
          ...app,
          is_boost: true
        }));
      } else if (campaignId) {
        // Fetch campaign slug for sharing
        const { data: campaignInfo } = await supabase
          .from("campaigns")
          .select("slug")
          .eq("id", campaignId)
          .single();
        if (campaignInfo?.slug) {
          setShareableCampaignSlug(campaignInfo.slug);
        }

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
          is_boost: false
        }));
      }

      // Fetch profiles for all creators
      const creatorIds = [...new Set(data?.map(a => a.creator_id || a.user_id).filter(Boolean) || [])];
      if (creatorIds.length > 0) {
        const {
          data: profiles
        } = await supabase.from("profiles").select("id, username, full_name, avatar_url, email, trust_score, audience_quality_score").in("id", creatorIds);
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const applicationsWithProfiles: Application[] = data?.map(app => ({
          ...app,
          application_answers: app.application_answers as {
            question: string;
            answer: string;
          }[] | null,
          profile: profileMap.get(app.creator_id || app.user_id)
        })) || [];
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
      const {
        error
      } = await supabase.from(tableName).update({
        status: finalStatus,
        reviewed_at: new Date().toISOString()
      }).eq("id", applicationId);
      if (error) throw error;

      // If approved (campaign), need to track the account in Shortimize
      if (!appIsBoost && newStatus === 'approved') {
        const appCampaignId = application.campaign_id || campaignId;
        if (appCampaignId) {
          try {
            await supabase.functions.invoke('track-campaign-user', {
              body: {
                campaignId: appCampaignId,
                userId: application.creator_id || application.user_id
              }
            });
          } catch (trackError) {
            console.error('Error tracking account:', trackError);
          }
        }
      }

      // Find next application before updating the list
      const currentIndex = filteredApplications.findIndex(a => a.id === applicationId);
      const nextPendingApp = applications.find((a, i) => a.id !== applicationId && a.status === 'pending');
      const nextApp = nextPendingApp || filteredApplications[currentIndex + 1] || filteredApplications[currentIndex - 1];

      // Update status in list instead of removing
      setApplications(prev => prev.map(a => a.id === applicationId ? {
        ...a,
        status: finalStatus
      } : a));

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
                navigator.clipboard.writeText(`${baseUrl}/c/${shareableCampaignSlug}`);
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
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {pendingAppsInFilter.length > 0 && (
                <Checkbox
                  checked={selectedApps.size === pendingAppsInFilter.length && pendingAppsInFilter.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              )}
              <h3 className="font-semibold">Applications</h3>
            </div>
            <Select value={statusFilter} onValueChange={value => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-0 bg-muted/50 hover:bg-muted focus:ring-0 focus:ring-offset-0 gap-1 px-2.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                <SelectItem value="all">All ({totalCount})</SelectItem>
                <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
                <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
                <SelectItem value="rejected">Rejected ({rejectedCount})</SelectItem>
                {waitlistedCount > 0 && (
                  <SelectItem value="waitlisted">Waitlisted ({waitlistedCount})</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredApplications.length === 0 ? <div className="p-4 text-center text-sm text-muted-foreground">
                No {statusFilter} applications
              </div> : filteredApplications.map(app => {
            const timeAgo = formatDistanceToNow(new Date(getSubmittedAt(app) || new Date()), {
              addSuffix: true
            });
            const capitalizedTime = timeAgo.charAt(0).toUpperCase() + timeAgo.slice(1);
            return <button key={app.id} onClick={() => handleSelectApp(app.id)} className={`group w-full p-3 rounded-lg text-left transition-all ${selectedAppId === app.id ? "bg-muted/50" : "md:hover:bg-muted/30"}`}>
                    <div className="flex items-center gap-3">
                      {/* Avatar with checkbox overlay for pending applications */}
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={app.profile?.avatar_url || ""} />
                          <AvatarFallback>
                            {app.profile?.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {app.status === 'pending' && (
                          <div
                            className={`absolute -top-1 -left-1 transition-opacity ${
                              selectedApps.has(app.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              checked={selectedApps.has(app.id)}
                              onCheckedChange={() => toggleAppSelection(app.id)}
                              className="h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary bg-background"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="font-medium tracking-[-0.5px] truncate flex-1 min-w-0">
                            {app.profile?.full_name || app.profile?.username || "Unknown"}
                          </p>
                          {app.status !== 'pending' && <div className="flex-shrink-0">{getStatusBadge(app.status)}</div>}
                        </div>
                        <p className="text-xs text-muted-foreground tracking-[-0.5px]">
                          {capitalizedTime}
                        </p>
                      </div>
                    </div>
                  </button>;
          })}
          </div>
        </ScrollArea>
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
                    </div>
                  </div>
                </div>

                {/* Connected Account */}
                {getAppUrl(selectedApp) && <a href={getAppUrl(selectedApp)!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group min-w-0 overflow-hidden">
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