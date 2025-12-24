import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, User, ChevronUp, ChevronDown, Shield, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
type StatusFilter = "all" | "pending" | "approved" | "rejected";
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
  const isBoost = !!boostId && !brandId;
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
        const [campaignsResult, boostCampaignsResult] = await Promise.all([supabase.from("campaigns").select("id, title").eq("brand_id", brandId), supabase.from("bounty_campaigns").select("id, title").eq("brand_id", brandId)]);
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
          application_answers: null,
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
  const handleUpdateStatus = async (applicationId: string, newStatus: 'approved' | 'rejected' | 'accepted') => {
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

      // Update status in list instead of removing
      setApplications(prev => prev.map(a => a.id === applicationId ? {
        ...a,
        status: finalStatus
      } : a));

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
        return <Badge variant="outline" className="text-xs font-medium tracking-[-0.3px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-xs font-medium tracking-[-0.3px] text-red-500 border-red-500/30 bg-red-500/10">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="text-xs font-inter font-medium tracking-[-0.5px] text-amber-500 border-0 bg-amber-500/10">Pending</Badge>;
    }
  };
  const getAppUrl = (app: Application) => app.content_url || app.video_url;
  const getSubmittedAt = (app: Application) => app.submitted_at || app.applied_at;
  if (loading) {
    return <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-muted/50 dark:bg-muted-foreground/20" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64 bg-muted/50 dark:bg-muted-foreground/20" />
          <Skeleton className="h-64 col-span-2 bg-muted/50 dark:bg-muted-foreground/20" />
        </div>
      </div>;
  }
  if (applications.length === 0) {
    return <div className="flex flex-col items-center justify-center h-64 text-center">
        <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No applications</h3>
        <p className="text-muted-foreground text-sm">
          When creators apply to {isAllMode ? "your campaigns" : isBoost ? "this boost" : "this campaign"}, they'll appear here for review.
        </p>
      </div>;
  }
  return <div className="flex h-full">
      {/* Applications List - Left Column */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Applications</h3>
            <Select value={statusFilter} onValueChange={value => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-7 w-auto min-w-[100px] text-xs border-0 bg-muted/50 hover:bg-muted focus:ring-0 focus:ring-offset-0 gap-1 px-2.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                <SelectItem value="all">All ({totalCount})</SelectItem>
                <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
                <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
                <SelectItem value="rejected">Rejected ({rejectedCount})</SelectItem>
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
            return <button key={app.id} onClick={() => setSelectedAppId(app.id)} className={`w-full p-3 rounded-lg text-left transition-all border ${selectedAppId === app.id ? "border-[#5966f3]" : "border-transparent"}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={app.profile?.avatar_url || ""} />
                        <AvatarFallback>
                          {app.profile?.username?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium tracking-[-0.5px] truncate">
                            {app.profile?.full_name || app.profile?.username || "Unknown"}
                          </p>
                          {app.status !== 'pending'}
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

      {/* Application Details - Right Column */}
      <div className="flex-1 flex flex-col relative">
        {selectedApp ? <>
            <div className="flex-1 overflow-auto p-6 pb-24">
              <div className="space-y-5">
                {/* Creator Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Navigation Arrows */}
                    <div className="items-center gap-1 flex flex-col">
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
                    <div className="space-y-0.5">
                      <h2 className="text-base font-semibold tracking-[-0.5px]">
                        {selectedApp.profile?.full_name || selectedApp.profile?.username || "Unknown Creator"}
                      </h2>
                      <p className="text-sm text-muted-foreground tracking-[-0.3px]">
                        @{selectedApp.profile?.username}
                        {isAllMode && selectedApp.campaign_title && ` · ${selectedApp.campaign_title}`}
                      </p>
                      {/* Trust & Audience Scores */}
                      {(selectedApp.profile?.trust_score !== null || selectedApp.profile?.audience_quality_score !== null) && <div className="flex items-center gap-2 pt-1">
                          {selectedApp.profile?.trust_score !== null && <div className="flex items-center gap-1 text-xs text-emerald-500">
                              <Shield className="h-3 w-3" />
                              <span>{selectedApp.profile.trust_score}%</span>
                            </div>}
                          {selectedApp.profile?.audience_quality_score !== null && <div className="flex items-center gap-1 text-xs text-blue-500">
                              <Users className="h-3 w-3" />
                              <span>{selectedApp.profile.audience_quality_score}%</span>
                            </div>}
                        </div>}
                    </div>
                  </div>
                  {getStatusBadge(selectedApp.status)}
                </div>

                {/* Connected Account */}
                {getAppUrl(selectedApp) && <a href={getAppUrl(selectedApp)!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group">
                    {selectedApp.platform && PLATFORM_LOGOS[selectedApp.platform?.toLowerCase?.()] && <div className="h-9 w-9 rounded-lg flex items-center justify-center">
                        <img src={PLATFORM_LOGOS[selectedApp.platform.toLowerCase()]} alt={selectedApp.platform} className="h-5 w-5" />
                      </div>}
                    <div className="flex-1 min-w-0">
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

            {/* Action Buttons - Fixed at bottom (only show for pending applications) */}
            {selectedApp.status === 'pending' && <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border/50">
                <div className="flex gap-2">
                  <Button onClick={() => {
              const creatorId = selectedApp.creator_id || selectedApp.user_id;
              if (creatorId && workspace) {
                navigate(`/dashboard?workspace=${workspace}&tab=creators&subtab=messages&creator=${creatorId}`);
              }
            }} className="flex-1 h-11 font-medium tracking-[-0.5px] bg-white text-black hover:bg-gray-100">
                    Message
                  </Button>
                  <Button onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')} variant="outline" disabled={processing === selectedApp.id} className="flex-1 h-11 font-medium tracking-[-0.5px] border-transparent text-red-400 hover:bg-red-500/10 hover:text-red-400">
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button onClick={() => handleUpdateStatus(selectedApp.id, selectedApp.is_boost ? 'accepted' : 'approved')} disabled={processing === selectedApp.id} className="flex-1 h-11 font-medium tracking-[-0.5px] bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                </div>
              </div>}
          </> : <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an application to review
          </div>}
      </div>
    </div>;
}