import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, X, ExternalLink, User } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";

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
  application_answers?: { question: string; answer: string }[] | null;
  application_text?: string | null;
  profile?: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

interface CampaignApplicationsViewProps {
  campaignId?: string;
  boostId?: string;
  onApplicationReviewed?: () => void;
}

const PLATFORM_LOGOS: Record<string, string> = {
  tiktok: tiktokLogoWhite,
  instagram: instagramLogoWhite,
  youtube: youtubeLogoWhite,
};

export function CampaignApplicationsView({ campaignId, boostId, onApplicationReviewed }: CampaignApplicationsViewProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const isBoost = !!boostId;

  useEffect(() => {
    fetchApplications();
  }, [campaignId, boostId]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      let data: any[] = [];
      
      if (isBoost) {
        // Fetch boost applications
        const { data: boostData, error } = await supabase
          .from("bounty_applications")
          .select("*")
          .eq("bounty_campaign_id", boostId)
          .in("status", ["pending"])
          .order("applied_at", { ascending: false });

        if (error) throw error;
        data = boostData || [];
      } else if (campaignId) {
        // Fetch campaign applications
        const { data: campaignData, error } = await supabase
          .from("campaign_submissions")
          .select("*")
          .eq("campaign_id", campaignId)
          .in("status", ["pending"])
          .order("submitted_at", { ascending: false });

        if (error) throw error;
        data = campaignData || [];
      }

      // Fetch profiles for all creators
      const userIdField = isBoost ? "user_id" : "creator_id";
      const creatorIds = [...new Set(data?.map(a => a[userIdField]) || [])];
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url, email")
          .in("id", creatorIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const applicationsWithProfiles: Application[] = data?.map(app => ({
          ...app,
          application_answers: app.application_answers as { question: string; answer: string }[] | null,
          profile: profileMap.get(app[userIdField]),
        })) || [];

        setApplications(applicationsWithProfiles);
        
        // Auto-select first pending application
        if (applicationsWithProfiles.length > 0 && !selectedAppId) {
          setSelectedAppId(applicationsWithProfiles[0].id);
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
      const tableName = isBoost ? "bounty_applications" : "campaign_submissions";
      const finalStatus = isBoost && newStatus === 'approved' ? 'accepted' : newStatus;
      
      const { error } = await supabase
        .from(tableName)
        .update({
          status: finalStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (error) throw error;

      // If approved (campaign), need to track the account in Shortimize
      if (!isBoost && newStatus === 'approved') {
        const application = applications.find(a => a.id === applicationId);
        if (application && campaignId) {
          try {
            await supabase.functions.invoke('track-campaign-user', {
              body: {
                campaignId,
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
      
      // Select next application
      const currentIndex = applications.findIndex(a => a.id === applicationId);
      const remaining = applications.filter(a => a.id !== applicationId);
      if (remaining.length > 0) {
        const nextIndex = Math.min(currentIndex, remaining.length - 1);
        setSelectedAppId(remaining[nextIndex].id);
      } else {
        setSelectedAppId(null);
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

  const pendingCount = applications.length;
  const selectedApp = applications.find(a => a.id === selectedAppId);
  
  // Get the URL for the application (either content_url for campaigns or video_url for boosts)
  const getAppUrl = (app: Application) => app.content_url || app.video_url;
  const getSubmittedAt = (app: Application) => app.submitted_at || app.applied_at;

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
        <h3 className="text-lg font-semibold mb-2">No pending applications</h3>
        <p className="text-muted-foreground text-sm">
          When creators apply to this {isBoost ? "boost" : "campaign"}, they'll appear here for review.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Applications List - Left Column */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Applications</h3>
          <p className="text-sm text-muted-foreground">{pendingCount} pending</p>
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
                    <p className="font-medium truncate">
                      {app.profile?.full_name || app.profile?.username || "Unknown"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {app.platform && PLATFORM_LOGOS[app.platform] && (
                        <img 
                          src={PLATFORM_LOGOS[app.platform]} 
                          alt={app.platform}
                          className="h-3 w-3"
                        />
                      )}
                      <span>{formatDistanceToNow(new Date(getSubmittedAt(app) || new Date()), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Application Details - Right Column */}
      <div className="flex-1 p-6">
        {selectedApp ? (
          <div className="space-y-6">
            {/* Creator Info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedApp.profile?.avatar_url || ""} />
                  <AvatarFallback className="text-xl">
                    {selectedApp.profile?.username?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">
                    {selectedApp.profile?.full_name || selectedApp.profile?.username || "Unknown Creator"}
                  </h2>
                  <p className="text-muted-foreground">@{selectedApp.profile?.username}</p>
                  {selectedApp.profile?.email && (
                    <p className="text-sm text-muted-foreground">{selectedApp.profile.email}</p>
                  )}
                </div>
              </div>
              <Badge variant="outline">Pending</Badge>
            </div>

            {/* Platform & Account / Video URL */}
            {getAppUrl(selectedApp) && (
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  {selectedApp.platform && PLATFORM_LOGOS[selectedApp.platform] && (
                    <img 
                      src={PLATFORM_LOGOS[selectedApp.platform]} 
                      alt={selectedApp.platform}
                      className="h-6 w-6"
                    />
                  )}
                  <div className="flex-1">
                    {selectedApp.platform && (
                      <p className="font-medium capitalize">{selectedApp.platform}</p>
                    )}
                    <a 
                      href={getAppUrl(selectedApp)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {isBoost ? "View submitted video" : getAppUrl(selectedApp)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Application Text (for boosts) */}
            {selectedApp.application_text && (
              <div className="space-y-4">
                <h3 className="font-semibold">Application Note</h3>
                <div className="p-4 rounded-lg bg-muted/30">
                  <p className="text-foreground">{selectedApp.application_text}</p>
                </div>
              </div>
            )}

            {/* Application Answers (for campaigns) */}
            {selectedApp.application_answers && selectedApp.application_answers.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Application Answers</h3>
                {selectedApp.application_answers.map((qa, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground mb-2">{qa.question}</p>
                    <p className="text-foreground">{qa.answer || "No answer provided"}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                variant="outline"
                disabled={processing === selectedApp.id}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleUpdateStatus(selectedApp.id, isBoost ? 'accepted' : 'approved')}
                disabled={processing === selectedApp.id}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an application to review
          </div>
        )}
      </div>
    </div>
  );
}
