import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare } from "lucide-react";
import { Check, X, ExternalLink, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";

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

      // Fetch pending applications from both tables in parallel
      const [campaignSubmissionsResult, bountyApplicationsResult] = await Promise.all([
        campaignIds.length > 0
          ? supabase
              .from("campaign_submissions")
              .select("*")
              .in("campaign_id", campaignIds)
              .eq("status", "pending")
              .order("submitted_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        boostCampaignIds.length > 0
          ? supabase
              .from("bounty_applications")
              .select("*")
              .in("bounty_campaign_id", boostCampaignIds)
              .eq("status", "pending")
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
        application_answers: app.application_text ? [{ question: "Application", answer: app.application_text }] : null,
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
      
      if (applicationsWithProfiles.length > 0 && !selectedAppId) {
        setSelectedAppId(applicationsWithProfiles[0].id);
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

      // Remove from list
      setApplications(prev => prev.filter(a => a.id !== applicationId));
      
      const currentIndex = applications.findIndex(a => a.id === applicationId);
      const remaining = applications.filter(a => a.id !== applicationId);
      if (remaining.length > 0) {
        const nextIndex = Math.min(currentIndex, remaining.length - 1);
        setSelectedAppId(remaining[nextIndex].id);
      } else {
        setSelectedAppId(null);
      }

      onApplicationReviewed?.();
      toast.success(`Application ${newStatus}`);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    } finally {
      setProcessing(null);
    }
  };

  const selectedApp = applications.find(a => a.id === selectedAppId);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 col-span-2" />
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No pending applications</h3>
        <p className="text-muted-foreground text-sm">
          When creators apply to your campaigns, they'll appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Applications List - Left Column */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">All Applications</h3>
          <p className="text-sm text-muted-foreground">{applications.length} pending</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {applications.map(app => (
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
                    <p className="font-medium text-sm truncate">
                      {app.profile?.full_name || app.profile?.username || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {app.campaign_title || "Campaign"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })}
                    </p>
                  </div>
                  {PLATFORM_LOGOS[app.platform?.toLowerCase()] && (
                    <img 
                      src={PLATFORM_LOGOS[app.platform.toLowerCase()]} 
                      alt={app.platform} 
                      className="h-4 w-4 opacity-60"
                    />
                  )}
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Selected Application Details - Right Column */}
      <div className="flex-1 flex flex-col">
        {selectedApp ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedApp.profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {selectedApp.profile?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">
                    {selectedApp.profile?.full_name || selectedApp.profile?.username}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    @{selectedApp.profile?.username} · {selectedApp.campaign_title}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {/* Submitted Content */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Submitted Content</h3>
                  <a
                    href={selectedApp.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {selectedApp.content_url}
                  </a>
                </div>

                {/* Application Answers */}
                {selectedApp.application_answers && selectedApp.application_answers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3">Application Answers</h3>
                    <div className="space-y-4">
                      {selectedApp.application_answers.map((qa, index) => (
                        <div key={index} className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {qa.question}
                          </p>
                          <p className="text-sm">{qa.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                {selectedApp.profile?.email && (
                  <div>
                    <h3 className="text-sm font-medium mb-2">Contact</h3>
                    <p className="text-sm text-muted-foreground">{selectedApp.profile.email}</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Fixed Footer Actions */}
            <div className="p-4 border-t border-border bg-background flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <MessageSquare className="h-4 w-4" />
                Message
              </Button>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUpdateStatus(selectedApp.id, "rejected")}
                disabled={processing === selectedApp.id}
                className="gap-1"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => handleUpdateStatus(selectedApp.id, "approved")}
                disabled={processing === selectedApp.id}
                className="gap-1"
              >
                <Check className="h-4 w-4" />
                Accept
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select an application to view details
          </div>
        )}
      </div>
    </div>
  );
}
