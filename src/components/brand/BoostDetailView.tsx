import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Video, Users, FileText, Pencil, DollarSign, Lock, ChevronLeft, ChevronRight, Check, X, ExternalLink, Play } from "lucide-react";
import { EditBountyDialog } from "./EditBountyDialog";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";

import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";
import xLogoLight from "@/assets/x-logo-light.png";
import xLogoDark from "@/assets/x-logo.png";

interface BoostData {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  banner_url: string | null;
  status: string;
  is_private: boolean;
  brand_id: string;
  discord_guild_id: string | null;
}

interface Application {
  id: string;
  user_id: string;
  status: string;
  application_text: string | null;
  video_url: string;
  applied_at: string;
}

interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  trust_score: number | null;
  demographics_score: number | null;
  views_score: number | null;
  discord_username: string | null;
  twitter_username: string | null;
}

interface SocialAccount {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  account_link: string | null;
  follower_count: number | null;
  avatar_url: string | null;
}

type DetailTab = "videos" | "management" | "applications";

interface BoostDetailViewProps {
  boostId: string;
  onBack: () => void;
}

export function BoostDetailView({ boostId, onBack }: BoostDetailViewProps) {
  const { resolvedTheme } = useTheme();
  const [boost, setBoost] = useState<BoostData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>("applications");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  const getPlatformLogo = (platform: string) => {
    const isDark = resolvedTheme === "dark";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isDark ? tiktokLogoWhite : tiktokLogoBlack;
      case "instagram":
        return isDark ? instagramLogoWhite : instagramLogoBlack;
      case "youtube":
        return isDark ? youtubeLogoWhite : youtubeLogoBlack;
      case "x":
      case "twitter":
        return isDark ? xLogoLight : xLogoDark;
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchBoostData();
  }, [boostId]);

  const fetchBoostData = async () => {
    setLoading(true);
    
    // Fetch boost details
    const { data: boostData, error: boostError } = await supabase
      .from("bounty_campaigns")
      .select("*")
      .eq("id", boostId)
      .single();

    if (boostError || !boostData) {
      console.error("Error fetching boost:", boostError);
      setLoading(false);
      return;
    }

    setBoost(boostData);

    // Fetch applications
    const { data: applicationsData, error: applicationsError } = await supabase
      .from("bounty_applications")
      .select("*")
      .eq("bounty_campaign_id", boostId)
      .order("applied_at", { ascending: false });

    if (applicationsError) {
      console.error("Error fetching applications:", applicationsError);
    } else {
      setApplications(applicationsData || []);
      
      // Set first pending application as selected, or first application if no pending
      const pendingApp = (applicationsData || []).find(app => app.status === 'pending');
      if (pendingApp) {
        setSelectedAppId(pendingApp.id);
      } else if (applicationsData && applicationsData.length > 0) {
        setSelectedAppId(applicationsData[0].id);
      }
    }

    // Fetch profiles for all applicants
    if (applicationsData && applicationsData.length > 0) {
      const userIds = applicationsData.map(app => app.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      } else {
        const profilesMap: Record<string, Profile> = {};
        (profilesData || []).forEach(profile => {
          profilesMap[profile.id] = profile;
        });
        setProfiles(profilesMap);
      }

      // Fetch social accounts
      const { data: socialData, error: socialError } = await supabase
        .from("social_accounts")
        .select("*")
        .in("user_id", userIds);

      if (socialError) {
        console.error("Error fetching social accounts:", socialError);
      } else {
        setSocialAccounts(socialData || []);
      }
    }

    setLoading(false);
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from("bounty_applications")
      .update({ status: newStatus })
      .eq("id", applicationId);

    if (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update application status");
      return;
    }

    toast.success(`Application ${newStatus}`);
    
    // Handle Discord integration for accepted applications
    if (newStatus === 'accepted' && boost?.discord_guild_id) {
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        try {
          await supabase.functions.invoke('add-to-discord-server', {
            body: {
              userId: application.user_id,
              guildId: boost.discord_guild_id
            }
          });
        } catch (discordError) {
          console.error("Discord integration error:", discordError);
        }
      }
    }

    fetchBoostData();
  };

  const navigateApplication = (direction: 'prev' | 'next') => {
    if (!selectedAppId) return;
    const currentIndex = applications.findIndex(app => app.id === selectedAppId);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedAppId(applications[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < applications.length - 1) {
      setSelectedAppId(applications[currentIndex + 1].id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
    }
  };

  const tabs = [
    { id: "videos" as DetailTab, label: "Videos", icon: Video },
    { id: "management" as DetailTab, label: "Management", icon: FileText },
    { id: "applications" as DetailTab, label: "Applications", icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-full p-[10px]">
        <div className="flex-1 border rounded-[20px] border-[#141414] p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!boost) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Boost not found</p>
      </div>
    );
  }

  const selectedApp = applications.find(app => app.id === selectedAppId);
  const selectedProfile = selectedApp ? profiles[selectedApp.user_id] : null;
  const selectedUserAccounts = selectedApp 
    ? socialAccounts.filter(acc => acc.user_id === selectedApp.user_id) 
    : [];
  const currentIndex = selectedAppId ? applications.findIndex(app => app.id === selectedAppId) : -1;
  const pendingCount = applications.filter(app => app.status === 'pending').length;

  return (
    <div className="p-[10px] h-full flex flex-col">
      <div className="flex flex-col h-full border rounded-[20px] overflow-hidden border-[#141414]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 border-b border-border py-[10px] bg-background">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 hover:bg-transparent">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <button onClick={onBack} className="text-lg font-semibold tracking-[-0.5px] hover:underline">
              {boost.title}
            </button>
            {boost.is_private && (
              <Badge variant="outline" className="ml-2 bg-muted/10 text-muted-foreground border-muted/20">
                <Lock className="h-3 w-3 mr-1" />
                Private
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Boost
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-shrink-0 border-b border-border bg-background">
          <nav className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium tracking-[-0.5px] transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.id === "applications" && pendingCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "videos" && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>Videos tracking coming soon</p>
              </div>
            </div>
          )}

          {activeTab === "management" && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Monthly Retainer</span>
                  </div>
                  <p className="text-2xl font-semibold">${boost.monthly_retainer.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Video className="h-4 w-4" />
                    <span className="text-sm">Videos/Month</span>
                  </div>
                  <p className="text-2xl font-semibold">{boost.videos_per_month}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Positions Filled</span>
                  </div>
                  <p className="text-2xl font-semibold">
                    {boost.accepted_creators_count} / {boost.max_accepted_creators}
                  </p>
                </div>
              </div>

              {boost.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
                  <p className="text-sm">{boost.description}</p>
                </div>
              )}

              {boost.content_style_requirements && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Content Requirements</h3>
                  <p className="text-sm whitespace-pre-wrap">{boost.content_style_requirements}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="flex h-full">
              {/* Left Panel - Application List */}
              <div className="w-80 border-r border-border flex flex-col">
                <div className="p-4 border-b border-border">
                  <p className="text-sm text-muted-foreground">
                    {applications.length} application{applications.length !== 1 ? 's' : ''}
                    {pendingCount > 0 && ` • ${pendingCount} pending`}
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    {applications.map((app) => {
                      const profile = profiles[app.user_id];
                      return (
                        <button
                          key={app.id}
                          onClick={() => setSelectedAppId(app.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                            selectedAppId === app.id 
                              ? 'bg-muted' 
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback>
                              {profile?.username?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {profile?.full_name || profile?.username || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{profile?.username || 'unknown'}
                            </p>
                          </div>
                          {getStatusBadge(app.status)}
                        </button>
                      );
                    })}
                    {applications.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No applications yet</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Panel - Application Details */}
              <div className="flex-1 flex flex-col">
                {selectedApp && selectedProfile ? (
                  <>
                    {/* Navigation & Actions */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigateApplication('prev')}
                          disabled={currentIndex <= 0}
                          className="h-8 w-8"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {currentIndex + 1} of {applications.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigateApplication('next')}
                          disabled={currentIndex >= applications.length - 1}
                          className="h-8 w-8"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {selectedApp.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedApp.id, 'accepted')}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Creator Details */}
                    <ScrollArea className="flex-1">
                      <div className="p-6 space-y-6">
                        {/* Profile Header */}
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={selectedProfile.avatar_url || undefined} />
                            <AvatarFallback className="text-xl">
                              {selectedProfile.username?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h2 className="text-xl font-semibold">
                              {selectedProfile.full_name || selectedProfile.username}
                            </h2>
                            <p className="text-muted-foreground">@{selectedProfile.username}</p>
                          </div>
                        </div>

                        {/* Scores */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Trust Score</p>
                            <p className="text-lg font-semibold">{selectedProfile.trust_score ?? 'N/A'}</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Demographics</p>
                            <p className="text-lg font-semibold">{selectedProfile.demographics_score ?? 'N/A'}</p>
                          </div>
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Views Score</p>
                            <p className="text-lg font-semibold">{selectedProfile.views_score ?? 'N/A'}</p>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
                          <div className="space-y-1 text-sm">
                            {selectedProfile.email && (
                              <p>{selectedProfile.email}</p>
                            )}
                            {selectedProfile.phone_number && (
                              <p>{selectedProfile.phone_number}</p>
                            )}
                            {selectedProfile.discord_username && (
                              <p>Discord: {selectedProfile.discord_username}</p>
                            )}
                            {selectedProfile.twitter_username && (
                              <p>X: @{selectedProfile.twitter_username}</p>
                            )}
                          </div>
                        </div>

                        {/* Social Accounts */}
                        {selectedUserAccounts.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium text-muted-foreground">Linked Accounts</h3>
                            <div className="space-y-2">
                              {selectedUserAccounts.map(account => {
                                const logo = getPlatformLogo(account.platform);
                                return (
                                  <div key={account.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                                    {logo && (
                                      <img src={logo} alt={account.platform} className="h-5 w-5" />
                                    )}
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">@{account.username}</p>
                                      {account.follower_count && (
                                        <p className="text-xs text-muted-foreground">
                                          {account.follower_count.toLocaleString()} followers
                                        </p>
                                      )}
                                    </div>
                                    {account.account_link && (
                                      <a
                                        href={account.account_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        <ExternalLink className="h-4 w-4" />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Application Details */}
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium text-muted-foreground">Application</h3>
                          {selectedApp.application_text && (
                            <p className="text-sm bg-muted/30 rounded-lg p-3">
                              {selectedApp.application_text}
                            </p>
                          )}
                          {selectedApp.video_url && (
                            <a
                              href={selectedApp.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <Play className="h-4 w-4" />
                              View Submission Video
                            </a>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p>Select an application to view details</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <EditBountyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        bountyId={boostId}
        onSuccess={() => {
          setEditDialogOpen(false);
          fetchBoostData();
        }}
      />
    </div>
  );
}
