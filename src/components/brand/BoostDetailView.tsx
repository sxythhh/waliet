import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ArrowLeft, Video, Users, FileText, Pencil, DollarSign, Lock, Check, X, ExternalLink, Play, ChevronUp, ChevronDown } from "lucide-react";
import mailIcon from "@/assets/mail-icon.svg";
import { EditBountyDialog } from "./EditBountyDialog";
import { BoostVideosTab } from "./BoostVideosTab";
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
export function BoostDetailView({
  boostId,
  onBack
}: BoostDetailViewProps) {
  const {
    resolvedTheme
  } = useTheme();
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
    const {
      data: boostData,
      error: boostError
    } = await supabase.from("bounty_campaigns").select("*").eq("id", boostId).single();
    if (boostError || !boostData) {
      console.error("Error fetching boost:", boostError);
      setLoading(false);
      return;
    }
    setBoost(boostData);
    const {
      data: applicationsData,
      error: applicationsError
    } = await supabase.from("bounty_applications").select("*").eq("bounty_campaign_id", boostId).order("applied_at", {
      ascending: false
    });
    if (applicationsError) {
      console.error("Error fetching applications:", applicationsError);
    } else {
      setApplications(applicationsData || []);
    }
    if (applicationsData && applicationsData.length > 0) {
      const userIds = applicationsData.map(app => app.user_id);
      const {
        data: profilesData,
        error: profilesError
      } = await supabase.from("profiles").select("*").in("id", userIds);
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      } else {
        const profilesMap: Record<string, Profile> = {};
        (profilesData || []).forEach(profile => {
          profilesMap[profile.id] = profile;
        });
        setProfiles(profilesMap);
      }
      const {
        data: socialData,
        error: socialError
      } = await supabase.from("social_accounts").select("*").in("user_id", userIds);
      if (socialError) {
        console.error("Error fetching social accounts:", socialError);
      } else {
        setSocialAccounts(socialData || []);
      }
    }
    setLoading(false);
  };
  const handleUpdateStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    const {
      error
    } = await supabase.from("bounty_applications").update({
      status: newStatus
    }).eq("id", applicationId);
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
        return;
    }
  };
  const pendingCount = applications.filter(app => app.status === 'pending').length;
  const selectedApp = applications.find(app => app.id === selectedAppId);
  const selectedProfile = selectedApp ? profiles[selectedApp.user_id] : null;
  const selectedUserAccounts = selectedApp ? socialAccounts.filter(acc => acc.user_id === selectedApp.user_id) : [];
  const tabs = [{
    id: "videos" as DetailTab,
    label: "Videos",
    icon: Video
  }, {
    id: "management" as DetailTab,
    label: "Management",
    icon: FileText
  }, {
    id: "applications" as DetailTab,
    label: "Applications",
    icon: Users,
    count: pendingCount
  }];
  if (loading) {
    return <div className="h-full flex flex-col">
        <div className="flex flex-col h-full border-l border-border overflow-hidden">
          <div className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>;
  }
  if (!boost) {
    return <div className="h-full flex flex-col">
        <div className="flex flex-col h-full border-l border-border overflow-hidden items-center justify-center">
          <p className="text-muted-foreground">Boost not found</p>
        </div>
      </div>;
  }
  return <>
      <div className="h-full p-[5px]">
        <div className="h-full flex flex-col border border-[#141414] rounded-[20px] overflow-hidden bg-background">
          {/* Header with back button and boost title - Fixed */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 border-b border-border sm:px-[5px] py-[10px] bg-background">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 hover:bg-transparent">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <button onClick={onBack} className="text-lg font-semibold tracking-[-0.5px] hover:underline flex items-center gap-2">
              {boost.title}
              {boost.is_private && <Badge variant="outline" className="bg-muted/10 text-muted-foreground border-muted/20">
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </Badge>}
            </button>
          </div>
          <Button variant="ghost" size="sm" className="gap-2 font-sans tracking-[-0.5px] bg-muted/50 hover:bg-muted" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit Boost
          </Button>
        </div>

        {/* Tab Navigation - Horizontal bottom style */}
        <div className="flex-shrink-0 border-b border-border bg-background">
          <nav className="flex gap-0">
            {tabs.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium tracking-[-0.5px] transition-colors border-b-2 ${activeTab === tab.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>}
              </button>)}
          </nav>
        </div>

        {/* Content Area - Videos Tab */}
        {activeTab === "videos" && (
          <BoostVideosTab 
            boostId={boostId} 
            monthlyRetainer={boost.monthly_retainer} 
            videosPerMonth={boost.videos_per_month}
          />
        )}

        {/* Content Area - Management tab */}
        {activeTab === "management" && (
          <div className="flex-1 overflow-auto p-6">
            <div className="space-y-6">
              {/* About Section */}
              {boost.description && (
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.5px] mb-3">About</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed tracking-[-0.3px]">
                    {boost.description}
                  </p>
                </div>
              )}

              {/* Stats Grid Card */}
              <div className="rounded-xl border border-muted-foreground/10 p-5">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground tracking-[-0.3px] mb-1">Monthly Retainer</p>
                    <p className="text-sm font-medium tracking-[-0.5px]">${boost.monthly_retainer.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground tracking-[-0.3px] mb-1">Videos per Month</p>
                    <p className="text-sm font-medium tracking-[-0.5px]">{boost.videos_per_month}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground tracking-[-0.3px] mb-1">Max Creators</p>
                    <p className="text-sm font-medium tracking-[-0.5px]">{boost.max_accepted_creators}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground tracking-[-0.3px] mb-1">Accepted</p>
                    <p className="text-sm font-medium tracking-[-0.5px]">{boost.accepted_creators_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground tracking-[-0.3px] mb-1">Positions Open</p>
                    <p className="text-sm font-medium tracking-[-0.5px]">{boost.max_accepted_creators - boost.accepted_creators_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground tracking-[-0.3px] mb-1">Status</p>
                    <p className="text-sm font-medium tracking-[-0.5px] capitalize">{boost.status}</p>
                  </div>
                </div>
              </div>

              {/* Applicants Details Card */}
              <div className="rounded-xl border border-muted-foreground/10 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold tracking-[-0.5px]">Applicants details</h3>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-semibold tracking-[-1px]">{applications.length}</span>
                  <span className="text-sm text-muted-foreground tracking-[-0.3px]">Total applicants</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs text-muted-foreground tracking-[-0.3px]">Pending</span>
                    <span className="text-xs font-medium ml-auto">{applications.filter(a => a.status === 'pending').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground tracking-[-0.3px]">Accepted</span>
                    <span className="text-xs font-medium ml-auto">{applications.filter(a => a.status === 'accepted').length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs text-muted-foreground tracking-[-0.3px]">Rejected</span>
                    <span className="text-xs font-medium ml-auto">{applications.filter(a => a.status === 'rejected').length}</span>
                  </div>
                </div>
              </div>

              {/* Content Requirements */}
              {boost.content_style_requirements && (
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.5px] mb-3">Content Requirements</h2>
                  <ul className="space-y-2">
                    {boost.content_style_requirements.split('\n').filter(line => line.trim()).map((line, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground tracking-[-0.3px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5 flex-shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Applications Tab - Two Column Layout */}
        {activeTab === "applications" && <div className="flex-1 flex overflow-hidden">
            {applications.length === 0 ? <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>No applications yet</p>
                </div>
              </div> : <>
                {/* Left Column - Applications List (Fixed/Scrollable) */}
                <div className="w-[320px] flex-shrink-0 border-r border-border overflow-hidden flex flex-col">
                  <ScrollArea className="flex-1">
                    <div className="p-3 space-y-2">
                      {applications.map(app => {
                    const profile = profiles[app.user_id];
                    const isSelected = selectedAppId === app.id;
                    const appliedDate = new Date(app.applied_at);
                    return <button key={app.id} onClick={() => setSelectedAppId(app.id)} className={`w-full rounded-lg p-3 text-left transition-all font-inter tracking-[-0.5px] ${isSelected ? "bg-primary/10 border border-[#5966f3]" : "bg-card/30 hover:bg-card/50 border border-border/30"}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-border/40">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-muted/40">
                                  {profile?.username?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">
                                    {profile?.full_name || profile?.username || 'Unknown'}
                                  </p>
                                  {getStatusBadge(app.status)}
                                </div>
                                <p className="text-xs text-muted-foreground/70 truncate">@{profile?.username}</p>
                                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                  {appliedDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })} at {appliedDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                                </p>
                              </div>
                            </div>
                          </button>;
                  })}
                    </div>
                  </ScrollArea>
                </div>

                {/* Right Column - Application Details (Wider) */}
                <div className="flex-1 overflow-hidden flex flex-col relative">
                  {selectedApp && selectedProfile ? <>
                      {/* Navigation Arrows */}
                      <div className="absolute top-3 right-3 flex flex-col gap-1 z-10">
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-muted/30 hover:bg-muted/50" onClick={() => {
                    const currentIndex = applications.findIndex(a => a.id === selectedAppId);
                    if (currentIndex > 0) {
                      setSelectedAppId(applications[currentIndex - 1].id);
                    }
                  }} disabled={applications.findIndex(a => a.id === selectedAppId) === 0}>
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-muted/30 hover:bg-muted/50" onClick={() => {
                    const currentIndex = applications.findIndex(a => a.id === selectedAppId);
                    if (currentIndex < applications.length - 1) {
                      setSelectedAppId(applications[currentIndex + 1].id);
                    }
                  }} disabled={applications.findIndex(a => a.id === selectedAppId) === applications.length - 1}>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>

                      <ScrollArea className="flex-1 pb-20">
                        <div className="p-6 space-y-5 font-inter tracking-[-0.5px]">
                          {/* Profile Header */}
                          <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={selectedProfile.avatar_url || undefined} />
                              <AvatarFallback className="text-xl bg-muted/30">
                                {selectedProfile.username?.[0]?.toUpperCase() || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h2 className="text-lg font-semibold">
                                {selectedProfile.full_name || selectedProfile.username}
                              </h2>
                              <p className="text-sm text-muted-foreground">@{selectedProfile.username}</p>
                              <div className="mt-2 flex items-center gap-2">
                                {getStatusBadge(selectedApp.status)}
                                <span className="text-xs text-muted-foreground">
                                  Applied {new Date(selectedApp.applied_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Stats Row */}
                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-xs text-muted-foreground">Trust Score</p>
                              <p className="text-xl font-semibold">{selectedProfile.trust_score ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Demographics</p>
                              <p className="text-xl font-semibold">{selectedProfile.demographics_score ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Views Score</p>
                              <p className="text-xl font-semibold">{selectedProfile.views_score ?? '—'}</p>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Info</h3>
                            <div className={`space-y-1 text-sm relative ${selectedApp.status !== 'accepted' ? 'select-none' : ''}`}>
                              {selectedApp.status !== 'accepted' && <div className="absolute inset-0 flex items-center justify-center z-10">
                                  <span className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                                    Visible after approval
                                  </span>
                                </div>}
                              <div className={selectedApp.status !== 'accepted' ? 'blur-sm' : ''}>
                                {selectedProfile.email && <p><span className="text-muted-foreground">Email:</span> {selectedProfile.email}</p>}
                                {selectedProfile.phone_number && <p><span className="text-muted-foreground">Phone:</span> {selectedProfile.phone_number}</p>}
                                {selectedProfile.discord_username && <p><span className="text-muted-foreground">Discord:</span> {selectedProfile.discord_username}</p>}
                                {selectedProfile.twitter_username && <p><span className="text-muted-foreground">X:</span> @{selectedProfile.twitter_username}</p>}
                                {!selectedProfile.email && !selectedProfile.phone_number && !selectedProfile.discord_username && !selectedProfile.twitter_username && <p className="text-muted-foreground">No contact info available</p>}
                              </div>
                            </div>
                          </div>

                          {/* Linked Accounts */}
                          <div className="space-y-2">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Linked Accounts</h3>
                            {selectedUserAccounts.length > 0 ? <div className="flex flex-wrap gap-2">
                                {selectedUserAccounts.map(account => {
                          const logo = getPlatformLogo(account.platform);
                          return <a key={account.id} href={account.account_link || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-muted/30 hover:bg-muted/50 rounded-full px-3 py-1.5 transition-colors">
                                      {account.avatar_url ? <img src={account.avatar_url} alt={account.username} className="h-5 w-5 rounded-full" /> : logo ? <img src={logo} alt={account.platform} className="h-4 w-4" /> : null}
                                      <span className="text-sm">@{account.username}</span>
                                      {account.follower_count ? <span className="text-xs text-muted-foreground">{account.follower_count.toLocaleString()}</span> : null}
                                    </a>;
                        })}
                              </div> : <p className="text-sm text-muted-foreground">No linked accounts</p>}
                          </div>

                          {/* Application Submission */}
                          <div className="space-y-3">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Application Submission</h3>
                            
                            {selectedApp.application_text && <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Message</p>
                                <p className="text-sm bg-muted/20 rounded-lg p-3">
                                  {selectedApp.application_text}
                                </p>
                              </div>}
                            
                            {selectedApp.video_url && <a href={selectedApp.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                                <Play className="h-4 w-4" />
                                View Submission Video
                              </a>}
                          </div>
                        </div>
                      </ScrollArea>

                      {/* Fixed Bottom Action Bar */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border/30">
                        <div className="flex items-center gap-2 font-inter tracking-[-0.5px]">
                          <Button className="flex-1 gap-2 bg-[#2060de] hover:bg-[#1a50c8] text-white border-t border-[#4b85f7]" onClick={() => {
                      toast.info("Messaging feature coming soon");
                    }}>
                            <img src={mailIcon} alt="Message" className="h-4 w-4" />
                            Message
                          </Button>
                          {selectedApp.status === 'pending' && <>
                              <Button variant="ghost" className="flex-1 bg-red-500/10 text-red-500 hover:text-red-400 hover:bg-red-500/20 border border-red-500/20" onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}>
                                Decline
                              </Button>
                              <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleUpdateStatus(selectedApp.id, 'accepted')}>
                                Approve
                              </Button>
                            </>}
                        </div>
                      </div>
                    </> : <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                        <p className="text-sm">Select an application to view details</p>
                      </div>
                    </div>}
                </div>
              </>}
          </div>}
        </div>
      </div>

      <EditBountyDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} bountyId={boostId} onSuccess={() => {
      setEditDialogOpen(false);
      fetchBoostData();
    }} />
    </>;
}