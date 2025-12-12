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
      <div className="absolute inset-0 bg-background z-40">
        <div className="max-w-6xl mx-auto p-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!boost) {
    return (
      <div className="absolute inset-0 bg-background z-40 flex items-center justify-center">
        <p className="text-muted-foreground">Boost not found</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-background z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-background flex-shrink-0">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold tracking-[-0.5px]">{boost.title}</h1>
                {boost.is_private && (
                  <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/20">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto px-8">
          <nav className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium tracking-[-0.5px] transition-colors border-b-2 ${
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
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">
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

          {activeTab === "applications" && (
            <div className="space-y-4">
              {applications.length === 0 ? (
                <div className="flex items-center justify-center py-24 text-muted-foreground">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    <p>No applications yet</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {applications.map((app) => {
                    const profile = profiles[app.user_id];
                    const userAccounts = socialAccounts.filter(acc => acc.user_id === app.user_id);
                    
                    return (
                      <button
                        key={app.id}
                        onClick={() => handleApplicationClick(app.id)}
                        className="bg-muted/20 hover:bg-muted/40 rounded-2xl p-5 text-left transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-sm">
                              {profile?.username?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {profile?.full_name || profile?.username || 'Unknown'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">@{profile?.username}</p>
                            <div className="mt-2">{getStatusBadge(app.status)}</div>
                          </div>
                        </div>
                        
                        {userAccounts.length > 0 && (
                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                            {userAccounts.slice(0, 3).map(account => {
                              const logo = getPlatformLogo(account.platform);
                              return logo ? (
                                <img key={account.id} src={logo} alt={account.platform} className="h-4 w-4 opacity-60" />
                              ) : null;
                            })}
                            {userAccounts.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{userAccounts.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Application Detail Side Panel */}
      <Sheet open={detailPanelOpen} onOpenChange={setDetailPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="p-6 border-b border-border">
            <SheetTitle>Application Details</SheetTitle>
          </SheetHeader>
          
          {selectedApp && selectedProfile ? (
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
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">
                      {selectedProfile.full_name || selectedProfile.username}
                    </h2>
                    <p className="text-sm text-muted-foreground">@{selectedProfile.username}</p>
                    <div className="mt-2">{getStatusBadge(selectedApp.status)}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedApp.status === 'pending' && (
                  <div className="flex items-center gap-3">
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

                {/* Scores */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Trust</p>
                    <p className="text-xl font-semibold">{selectedProfile.trust_score ?? '—'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Demographics</p>
                    <p className="text-xl font-semibold">{selectedProfile.demographics_score ?? '—'}</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Views</p>
                    <p className="text-xl font-semibold">{selectedProfile.views_score ?? '—'}</p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-muted/20 rounded-xl p-4 space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</h3>
                  <div className="space-y-1 text-sm">
                    {selectedProfile.email && <p>{selectedProfile.email}</p>}
                    {selectedProfile.phone_number && <p>{selectedProfile.phone_number}</p>}
                    {selectedProfile.discord_username && <p>Discord: {selectedProfile.discord_username}</p>}
                    {selectedProfile.twitter_username && <p>X: @{selectedProfile.twitter_username}</p>}
                  </div>
                </div>

                {/* Social Accounts */}
                {selectedUserAccounts.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked Accounts</h3>
                    <div className="space-y-2">
                      {selectedUserAccounts.map(account => {
                        const logo = getPlatformLogo(account.platform);
                        return (
                          <div key={account.id} className="flex items-center gap-3 bg-muted/20 rounded-xl p-4">
                            {logo && <img src={logo} alt={account.platform} className="h-5 w-5" />}
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
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Application</h3>
                  {selectedApp.application_text && (
                    <p className="text-sm bg-muted/20 rounded-xl p-4">
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
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select an application</p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
