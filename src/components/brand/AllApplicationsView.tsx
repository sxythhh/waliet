import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Check, X, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

interface Application {
  id: string;
  campaign_id: string;
  campaign_title?: string;
  creator_id: string;
  platform: string;
  content_url: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  application_answers: { question: string; answer: string }[] | null;
  application_text?: string | null;
  is_boost?: boolean;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

interface AllApplicationsViewProps {
  brandId: string;
  onApplicationReviewed?: () => void;
}

const PLATFORM_LOGOS: Record<string, string> = {
  tiktok: tiktokLogoWhite,
  instagram: instagramLogoWhite,
  youtube: youtubeLogoWhite,
};

export function AllApplicationsView({ brandId, onApplicationReviewed }: AllApplicationsViewProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    fetchApplications();
  }, [brandId]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // Fetch campaigns and bounty campaigns for this brand in parallel
      const [campaignsResult, boostCampaignsResult] = await Promise.all([
        supabase.from("campaigns").select("id, title").eq("brand_id", brandId),
        supabase.from("bounty_campaigns").select("id, title").eq("brand_id", brandId),
      ]);

      const campaigns = campaignsResult.data || [];
      const boostCampaigns = boostCampaignsResult.data || [];

      const campaignIds = campaigns.map(c => c.id);
      const boostCampaignIds = boostCampaigns.map(c => c.id);
      const campaignMap = new Map(campaigns.map(c => [c.id, c.title]));
      const boostCampaignMap = new Map(boostCampaigns.map(c => [c.id, c.title]));

      // Fetch all applications from both tables (not just pending)
      const [campaignSubmissionsResult, bountyApplicationsResult] = await Promise.all([
        campaignIds.length > 0
          ? supabase
              .from("campaign_submissions")
              .select("*")
              .in("campaign_id", campaignIds)
              .order("submitted_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        boostCampaignIds.length > 0
          ? supabase
              .from("bounty_applications")
              .select("*")
              .in("bounty_campaign_id", boostCampaignIds)
              .order("applied_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (campaignSubmissionsResult.error) throw campaignSubmissionsResult.error;
      if (bountyApplicationsResult.error) throw bountyApplicationsResult.error;

      // Normalize bounty applications to match campaign_submissions structure
      const normalizedBountyApps = (bountyApplicationsResult.data || []).map(app => ({
        id: app.id,
        campaign_id: app.bounty_campaign_id,
        creator_id: app.user_id,
        platform: "boost" as string,
        content_url: app.video_url,
        status: app.status,
        submitted_at: app.applied_at,
        reviewed_at: app.reviewed_at,
        application_answers: null,
        application_text: app.application_text,
        is_boost: true,
      }));

      const allSubmissions = [
        ...(campaignSubmissionsResult.data || []).map(app => ({ ...app, is_boost: false })),
        ...normalizedBountyApps,
      ];

      // Sort by submitted_at descending
      allSubmissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

      // Fetch profiles for all creators
      const creatorIds = [...new Set(allSubmissions.map(a => a.creator_id))];
      let profileMap = new Map();
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, email")
          .in("id", creatorIds);
        profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      }

      const applicationsWithProfiles: Application[] = allSubmissions.map(app => ({
        ...app,
        campaign_title: app.is_boost 
          ? boostCampaignMap.get(app.campaign_id) 
          : campaignMap.get(app.campaign_id),
        application_answers: app.application_answers as { question: string; answer: string }[] | null,
        profile: profileMap.get(app.creator_id),
      }));

      setApplications(applicationsWithProfiles);
      
      // Auto-select first pending application
      if (applicationsWithProfiles.length > 0 && !selectedAppId) {
        const pendingApp = applicationsWithProfiles.find(a => a.status === 'pending');
        setSelectedAppId(pendingApp?.id || applicationsWithProfiles[0].id);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    setProcessing(applicationId);
    try {
      const application = applications.find(a => a.id === applicationId);
      if (!application) throw new Error("Application not found");

      // Use different table based on whether it's a boost application
      if (application.is_boost) {
        // For bounty applications, use 'accepted' instead of 'approved'
        const bountyStatus = newStatus === 'approved' ? 'accepted' : 'rejected';
        const { error } = await supabase
          .from("bounty_applications")
          .update({
            status: bountyStatus,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", applicationId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("campaign_submissions")
          .update({
            status: newStatus,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", applicationId);

        if (error) throw error;

        // If approved, track the account (only for campaigns)
        if (newStatus === 'approved') {
          try {
            await supabase.functions.invoke('track-campaign-user', {
              body: {
                campaignId: application.campaign_id,
                userId: application.creator_id,
              },
            });
          } catch (trackError) {
            console.error('Error tracking account:', trackError);
          }
        }
      }

      // Update application status in list
      setApplications(prev => prev.map(a => 
        a.id === applicationId 
          ? { ...a, status: application.is_boost && newStatus === 'approved' ? 'accepted' : newStatus }
          : a
      ));

      onApplicationReviewed?.();
      toast.success(`Application ${newStatus}`);
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
        return <Badge variant="outline" className="text-xs font-medium tracking-[-0.3px] text-amber-500 border-amber-500/30 bg-amber-500/10">Pending</Badge>;
    }
  };

  const getAppUrl = (app: Application) => app.content_url;

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48 bg-muted/50 dark:bg-muted-foreground/20" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64 bg-muted/50 dark:bg-muted-foreground/20" />
          <Skeleton className="h-64 col-span-2 bg-muted/50 dark:bg-muted-foreground/20" />
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No applications</h3>
        <p className="text-muted-foreground text-sm">
          When creators apply to your campaigns, they'll appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Applications List - Left Column */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold">Applications</h3>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
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
            {filteredApplications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No {statusFilter} applications
              </div>
            ) : filteredApplications.map(app => (
              <button
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedAppId === app.id 
                    ? "bg-primary/10 border border-primary/20" 
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={app.profile?.avatar_url || ""} />
                    <AvatarFallback>
                      {app.profile?.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">
                        {app.profile?.full_name || app.profile?.username || "Unknown"}
                      </p>
                      {app.status !== 'pending' && (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          app.status === 'approved' || app.status === 'accepted' 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {app.status === 'approved' || app.status === 'accepted' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {app.campaign_title || "Campaign"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {app.platform && PLATFORM_LOGOS[app.platform?.toLowerCase()] && (
                        <img src={PLATFORM_LOGOS[app.platform.toLowerCase()]} alt={app.platform} className="h-3 w-3" />
                      )}
                      <span>{formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Application Details - Right Column */}
      <div className="flex-1 flex flex-col relative">
        {selectedApp ? (
          <>
            <div className="flex-1 overflow-auto p-6 pb-24">
              <div className="space-y-5">
                {/* Creator Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
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
                        @{selectedApp.profile?.username} · {selectedApp.campaign_title}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(selectedApp.status)}
                </div>

                {/* Connected Account */}
                {getAppUrl(selectedApp) && (
                  <a
                    href={getAppUrl(selectedApp)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors group"
                  >
                    {selectedApp.platform && PLATFORM_LOGOS[selectedApp.platform?.toLowerCase()] && (
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center">
                        <img src={PLATFORM_LOGOS[selectedApp.platform.toLowerCase()]} alt={selectedApp.platform} className="h-5 w-5" />
                      </div>
                    )}
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
                  </a>
                )}

                {/* Application Note */}
                {selectedApp.application_text && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">Note</p>
                    <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
                      <p className="text-sm text-foreground tracking-[-0.3px] leading-relaxed">{selectedApp.application_text}</p>
                    </div>
                  </div>
                )}

                {/* Application Answers */}
                {selectedApp.application_answers && selectedApp.application_answers.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground tracking-[-0.2px] uppercase">Responses</p>
                    <div className="space-y-2">
                      {selectedApp.application_answers.map((qa, index) => (
                        <div key={index} className="p-3 rounded-xl border border-border/50 bg-muted/20">
                          <p className="text-xs text-muted-foreground tracking-[-0.2px] mb-1.5">{qa.question}</p>
                          <p className="text-sm text-foreground tracking-[-0.3px] leading-relaxed">{qa.answer || "No answer provided"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Fixed at bottom (only show for pending applications) */}
            {selectedApp.status === 'pending' && (
              <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border/50">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                    variant="outline"
                    disabled={processing === selectedApp.id}
                    className="flex-1 h-11 font-medium tracking-[-0.5px] border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 px-4 font-medium tracking-[-0.5px] border-border/50 hover:bg-muted/50"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(selectedApp.id, 'approved')}
                    disabled={processing === selectedApp.id}
                    className="flex-1 h-11 font-medium tracking-[-0.5px] bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an application to review
          </div>
        )}
      </div>
    </div>
  );
}
