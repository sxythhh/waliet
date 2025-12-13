import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Video, Users, FileText, Pencil, DollarSign, Lock, Check, X, ExternalLink, Play } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<DetailTab>("management");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

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

    const { data: applicationsData, error: applicationsError } = await supabase
      .from("bounty_applications")
      .select("*")
      .eq("bounty_campaign_id", boostId)
      .order("applied_at", { ascending: false });

    if (applicationsError) {
      console.error("Error fetching applications:", applicationsError);
    } else {
      setApplications(applicationsData || []);
    }

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
    setDetailPanelOpen(false);
    setSelectedAppId(null);
  };

  const handleApplicationClick = (appId: string) => {
    setSelectedAppId(appId);
    setDetailPanelOpen(true);
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

  const pendingCount = applications.filter(app => app.status === 'pending').length;
  const selectedApp = applications.find(app => app.id === selectedAppId);
  const selectedProfile = selectedApp ? profiles[selectedApp.user_id] : null;
  const selectedUserAccounts = selectedApp 
    ? socialAccounts.filter(acc => acc.user_id === selectedApp.user_id) 
    : [];

  const tabs = [
    { id: "videos" as DetailTab, label: "Videos", icon: Video },
    { id: "management" as DetailTab, label: "Management", icon: FileText },
    { id: "applications" as DetailTab, label: "Applications", icon: Users, count: pendingCount },
  ];

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex flex-col h-full border rounded-[20px] overflow-hidden border-[#141414] m-[10px]">
          <div className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!boost) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex flex-col h-full border rounded-[20px] overflow-hidden border-[#141414] m-[10px] items-center justify-center">
          <p className="text-muted-foreground">Boost not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col h-full border rounded-[20px] overflow-hidden border-[#141414] m-[10px]">
        {/* Header with back button and boost title - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 border-b border-border sm:px-[5px] py-[10px] bg-background">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 hover:bg-transparent">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <button onClick={onBack} className="text-lg font-semibold tracking-[-0.5px] hover:underline flex items-center gap-2">
              {boost.title}
              {boost.is_private && (
                <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/20">
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              )}
            </button>
          </div>
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

        {/* Tab Navigation - Horizontal bottom style */}
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
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area - Videos & Management tabs */}
        {(activeTab === "videos" || activeTab === "management") && (
          <div className="flex-1 overflow-auto p-4">
          {activeTab === "videos" && (
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              <div className="text-center">
                <Video className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>Videos tracking coming soon</p>
              </div>
            </div>
          )}

          {activeTab === "management" && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-muted/30 rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-sm font-medium">Monthly Retainer</span>
                  </div>
                  <p className="text-3xl font-semibold">${boost.monthly_retainer.toLocaleString()}</p>
                </div>
                <div className="bg-muted/30 rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Video className="h-5 w-5" />
                    <span className="text-sm font-medium">Videos per Month</span>
                  </div>
                  <p className="text-3xl font-semibold">{boost.videos_per_month}</p>
                </div>
                <div className="bg-muted/30 rounded-2xl p-6">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-medium">Positions Filled</span>
                  </div>
                  <p className="text-3xl font-semibold">
                    {boost.accepted_creators_count} <span className="text-lg text-muted-foreground">/ {boost.max_accepted_creators}</span>
                  </p>
                </div>
              </div>

              {/* Description & Requirements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {boost.description && (
                  <div className="bg-muted/20 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Description</h3>
                    <p className="text-sm leading-relaxed">{boost.description}</p>
                  </div>
                )}
                {boost.content_style_requirements && (
                  <div className="bg-muted/20 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">Content Requirements</h3>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{boost.content_style_requirements}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        )}
        {/* Applications Tab - Two Column Layout */}
        {activeTab === "applications" && (
          <div className="flex-1 flex overflow-hidden">
            {applications.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>No applications yet</p>
                </div>
              </div>
            ) : (
              <>
                {/* Left Column - Applications List (Fixed/Scrollable) */}
                <div className="w-[320px] flex-shrink-0 border-r border-border overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {applications.map((app) => {
                        const profile = profiles[app.user_id];
                        const isSelected = selectedAppId === app.id;
                        
                        return (
                          <button
                            key={app.id}
                            onClick={() => setSelectedAppId(app.id)}
                            className={`w-full rounded-xl p-3 text-left transition-all ${
                              isSelected 
                                ? "bg-primary/10 border border-primary/30" 
                                : "bg-muted/20 hover:bg-muted/40 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-sm">
                                  {profile?.username?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {profile?.full_name || profile?.username || 'Unknown'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">@{profile?.username}</p>
                              </div>
                              {getStatusBadge(app.status)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right Column - Application Details (Wider) */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {selectedApp && selectedProfile ? (
                    <ScrollArea className="flex-1">
                      <div className="p-6 space-y-6">
                        {/* Profile Header Card */}
                        <div className="bg-muted/20 rounded-2xl p-6">
                          <div className="flex items-start gap-5">
                            <Avatar className="h-20 w-20">
                              <AvatarImage src={selectedProfile.avatar_url || undefined} />
                              <AvatarFallback className="text-2xl">
                                {selectedProfile.username?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h2 className="text-xl font-semibold tracking-[-0.5px]">
                                {selectedProfile.full_name || selectedProfile.username}
                              </h2>
                              <p className="text-muted-foreground">@{selectedProfile.username}</p>
                              <div className="mt-3 flex items-center gap-3">
                                {getStatusBadge(selectedApp.status)}
                                <span className="text-xs text-muted-foreground">
                                  Applied {new Date(selectedApp.applied_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          {selectedApp.status === 'pending' && (
                            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-border/50">
                              <Button
                                variant="outline"
                                className="flex-1 text-red-500 border-red-500/20 hover:bg-red-500/10"
                                onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Decline
                              </Button>
                              <Button
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleUpdateStatus(selectedApp.id, 'accepted')}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-muted/20 rounded-xl p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Trust Score</p>
                            <p className="text-2xl font-semibold">{selectedProfile.trust_score ?? '—'}</p>
                          </div>
                          <div className="bg-muted/20 rounded-xl p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Demographics</p>
                            <p className="text-2xl font-semibold">{selectedProfile.demographics_score ?? '—'}</p>
                          </div>
                          <div className="bg-muted/20 rounded-xl p-4 text-center">
                            <p className="text-xs text-muted-foreground mb-1">Views Score</p>
                            <p className="text-2xl font-semibold">{selectedProfile.views_score ?? '—'}</p>
                          </div>
                        </div>

                        {/* Two Column Info */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Contact Info */}
                          <div className="bg-muted/20 rounded-xl p-5 space-y-3">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Info</h3>
                            <div className="space-y-2 text-sm">
                              {selectedProfile.email && (
                                <p className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Email:</span>
                                  <span>{selectedProfile.email}</span>
                                </p>
                              )}
                              {selectedProfile.phone_number && (
                                <p className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Phone:</span>
                                  <span>{selectedProfile.phone_number}</span>
                                </p>
                              )}
                              {selectedProfile.discord_username && (
                                <p className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Discord:</span>
                                  <span>{selectedProfile.discord_username}</span>
                                </p>
                              )}
                              {selectedProfile.twitter_username && (
                                <p className="flex items-center gap-2">
                                  <span className="text-muted-foreground">X:</span>
                                  <span>@{selectedProfile.twitter_username}</span>
                                </p>
                              )}
                              {!selectedProfile.email && !selectedProfile.phone_number && !selectedProfile.discord_username && !selectedProfile.twitter_username && (
                                <p className="text-muted-foreground">No contact info available</p>
                              )}
                            </div>
                          </div>

                          {/* Linked Accounts */}
                          <div className="bg-muted/20 rounded-xl p-5 space-y-3">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked Accounts</h3>
                            {selectedUserAccounts.length > 0 ? (
                              <div className="space-y-2">
                                {selectedUserAccounts.map(account => {
                                  const logo = getPlatformLogo(account.platform);
                                  return (
                                    <div key={account.id} className="flex items-center gap-3 bg-background/50 rounded-lg p-3">
                                      {logo && <img src={logo} alt={account.platform} className="h-5 w-5" />}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">@{account.username}</p>
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
                            ) : (
                              <p className="text-sm text-muted-foreground">No linked accounts</p>
                            )}
                          </div>
                        </div>

                        {/* Application Submission */}
                        <div className="bg-muted/20 rounded-xl p-5 space-y-4">
                          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Application Submission</h3>
                          
                          {selectedApp.application_text && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">Message</p>
                              <p className="text-sm bg-background/50 rounded-lg p-4">
                                {selectedApp.application_text}
                              </p>
                            </div>
                          )}
                          
                          {selectedApp.video_url && (
                            <a
                              href={selectedApp.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-primary hover:underline bg-primary/10 rounded-lg p-3 w-fit"
                            >
                              <Play className="h-4 w-4" />
                              View Submission Video
                            </a>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                        <p className="text-sm">Select an application to view details</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
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
