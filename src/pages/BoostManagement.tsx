import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Check, 
  X, 
  Clock, 
  ExternalLink, 
  User, 
  Shield, 
  Star,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Calendar
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

// Platform icons
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import xLogoBlack from "@/assets/x-logo.png";
import tiktokLogoWhite from "@/assets/tiktok-logo-white.png";
import instagramLogoWhite from "@/assets/instagram-logo-white.png";
import youtubeLogoWhite from "@/assets/youtube-logo-white.png";
import xLogoWhite from "@/assets/x-logo-light.png";
import discordIcon from "@/assets/discord-icon-new.png";
import { useTheme } from "next-themes";

interface Application {
  id: string;
  user_id: string;
  video_url: string;
  application_text: string;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  country: string | null;
  city: string | null;
  trust_score: number | null;
  demographics_score: number | null;
  views_score: number | null;
  total_earnings: number | null;
  discord_username: string | null;
  discord_avatar: string | null;
  twitter_username: string | null;
  created_at: string | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  account_link: string | null;
  avatar_url: string | null;
  follower_count: number | null;
  bio: string | null;
  is_verified: boolean | null;
}

interface BoostData {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  max_accepted_creators: number;
  accepted_creators_count: number;
  status: string;
  brand_id: string;
}

export default function BoostManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  
  const [boost, setBoost] = useState<BoostData | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [socialAccounts, setSocialAccounts] = useState<Record<string, SocialAccount[]>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const platformIcons: Record<string, { light: string; dark: string }> = {
    tiktok: { light: tiktokLogoBlack, dark: tiktokLogoWhite },
    instagram: { light: instagramLogoBlack, dark: instagramLogoWhite },
    youtube: { light: youtubeLogoBlack, dark: youtubeLogoWhite },
    x: { light: xLogoBlack, dark: xLogoWhite },
    twitter: { light: xLogoBlack, dark: xLogoWhite },
  };

  useEffect(() => {
    if (id) {
      fetchBoostData();
    }
  }, [id]);

  const fetchBoostData = async () => {
    if (!id) return;
    setLoading(true);
    
    try {
      // Fetch boost details
      const { data: boostData, error: boostError } = await supabase
        .from('bounty_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (boostError) throw boostError;
      setBoost(boostData);

      // Fetch applications
      const { data: appsData, error: appsError } = await supabase
        .from('bounty_applications')
        .select('*')
        .eq('bounty_campaign_id', id)
        .order('applied_at', { ascending: false });

      if (appsError) throw appsError;
      setApplications(appsData || []);

      // Select first pending application by default
      const firstPending = appsData?.find(app => app.status === 'pending');
      if (firstPending) {
        setSelectedAppId(firstPending.id);
      } else if (appsData && appsData.length > 0) {
        setSelectedAppId(appsData[0].id);
      }

      // Fetch all profiles for applications
      const userIds = [...new Set(appsData?.map(app => app.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          const profilesMap: Record<string, Profile> = {};
          profilesData.forEach(p => {
            profilesMap[p.id] = p;
          });
          setProfiles(profilesMap);
        }

        // Fetch social accounts for all users
        const { data: socialData, error: socialError } = await supabase
          .from('social_accounts')
          .select('*')
          .in('user_id', userIds);

        if (!socialError && socialData) {
          const socialMap: Record<string, SocialAccount[]> = {};
          socialData.forEach(sa => {
            if (!socialMap[sa.user_id]) {
              socialMap[sa.user_id] = [];
            }
            socialMap[sa.user_id].push(sa);
          });
          setSocialAccounts(socialMap);
        }
      }
    } catch (error: any) {
      console.error("Error fetching boost data:", error);
      toast.error("Failed to load boost data");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    if (!boost) return;
    
    if (newStatus === 'accepted' && boost.accepted_creators_count >= boost.max_accepted_creators) {
      toast.error(`You've reached the maximum of ${boost.max_accepted_creators} accepted creators`);
      return;
    }

    setProcessing(applicationId);
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase
        .from('bounty_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      // If accepted, try to add user to Discord server
      if (newStatus === 'accepted') {
        try {
          const { data: bountyData } = await supabase
            .from('bounty_campaigns')
            .select('discord_guild_id')
            .eq('id', id)
            .single();

          if (bountyData?.discord_guild_id) {
            const { data, error: discordError } = await supabase.functions.invoke('add-to-discord-server', {
              body: {
                userId: application.user_id,
                guildId: bountyData.discord_guild_id
              }
            });

            if (discordError) {
              toast.error('Application accepted, but failed to add user to Discord server.');
            } else if (data?.success) {
              toast.success(`Application accepted! ${data.alreadyMember ? 'User was already in Discord.' : 'User added to Discord.'}`);
            }
          } else {
            toast.success('Application accepted');
          }
        } catch (discordError) {
          toast.success('Application accepted (Discord unavailable)');
        }
      } else {
        toast.success(`Application ${newStatus}`);
      }

      // Move to next pending application
      const currentIndex = applications.findIndex(app => app.id === applicationId);
      const nextPending = applications.find((app, idx) => idx > currentIndex && app.status === 'pending');
      if (nextPending) {
        setSelectedAppId(nextPending.id);
      }

      fetchBoostData();
    } catch (error: any) {
      toast.error(error.message || "Failed to update application");
    } finally {
      setProcessing(null);
    }
  };

  const navigateApplication = (direction: 'prev' | 'next') => {
    const currentIndex = applications.findIndex(app => app.id === selectedAppId);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedAppId(applications[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < applications.length - 1) {
      setSelectedAppId(applications[currentIndex + 1].id);
    }
  };

  const selectedApp = applications.find(app => app.id === selectedAppId);
  const selectedProfile = selectedApp ? profiles[selectedApp.user_id] : null;
  const selectedSocials = selectedApp ? socialAccounts[selectedApp.user_id] || [] : [];
  const currentIndex = applications.findIndex(app => app.id === selectedAppId);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <Check className="h-3 w-3 mr-1" /> Accepted
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          <X className="h-3 w-3 mr-1" /> Rejected
        </Badge>;
      default:
        return null;
    }
  };

  const pendingCount = applications.filter(app => app.status === 'pending').length;
  const acceptedCount = applications.filter(app => app.status === 'accepted').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex gap-6">
          <Skeleton className="w-80 h-[calc(100vh-3rem)]" />
          <Skeleton className="flex-1 h-[calc(100vh-3rem)]" />
        </div>
      </div>
    );
  }

  if (!boost) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Boost not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold font-inter tracking-[-0.5px]">{boost.title}</h1>
              <p className="text-sm text-muted-foreground">Manage applications</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              {pendingCount} Pending
            </Badge>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
              {acceptedCount} / {boost.max_accepted_creators} Accepted
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Applications List */}
        <div className="w-80 border-r border-border/50 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Applications ({applications.length})
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {applications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p>No applications yet</p>
                </div>
              ) : (
                applications.map((app) => {
                  const profile = profiles[app.user_id];
                  const isSelected = app.id === selectedAppId;
                  
                  return (
                    <button
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border border-primary/30' 
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback className="bg-muted text-xs">
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
                        <div className="flex-shrink-0">
                          {getStatusBadge(app.status)}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Creator Details */}
        <div className="flex-1 flex flex-col">
          {selectedApp && selectedProfile ? (
            <>
              {/* Navigation Bar */}
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateApplication('prev')}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentIndex + 1} of {applications.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigateApplication('next')}
                    disabled={currentIndex === applications.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                {selectedApp.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                      disabled={processing === selectedApp.id}
                      className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4 mr-2" /> Decline
                    </Button>
                    <Button
                      onClick={() => handleUpdateStatus(selectedApp.id, 'accepted')}
                      disabled={processing === selectedApp.id || acceptedCount >= boost.max_accepted_creators}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-6 space-y-6">
                  {/* Creator Header */}
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedProfile.avatar_url || ""} />
                      <AvatarFallback className="bg-muted text-lg">
                        {selectedProfile.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">
                          {selectedProfile.full_name || selectedProfile.username}
                        </h2>
                        {getStatusBadge(selectedApp.status)}
                      </div>
                      <p className="text-muted-foreground">@{selectedProfile.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Applied {formatDistanceToNow(new Date(selectedApp.applied_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Score Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span className="text-xs text-muted-foreground">Trust Score</span>
                        </div>
                        <p className="text-2xl font-bold">{selectedProfile.trust_score ?? 'N/A'}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Star className="h-4 w-4 text-purple-500" />
                          <span className="text-xs text-muted-foreground">Demographics</span>
                        </div>
                        <p className="text-2xl font-bold">{selectedProfile.demographics_score ?? 'N/A'}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">Views Score</span>
                        </div>
                        <p className="text-2xl font-bold">{selectedProfile.views_score ?? 'N/A'}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-amber-500 font-bold text-sm">$</span>
                          <span className="text-xs text-muted-foreground">Total Earned</span>
                        </div>
                        <p className="text-2xl font-bold">
                          ${(selectedProfile.total_earnings ?? 0).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Contact Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      {selectedProfile.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedProfile.email}</span>
                        </div>
                      )}
                      {selectedProfile.phone_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedProfile.phone_number}</span>
                        </div>
                      )}
                      {(selectedProfile.city || selectedProfile.country) && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {[selectedProfile.city, selectedProfile.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                      {selectedProfile.created_at && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Joined {format(new Date(selectedProfile.created_at), 'MMM yyyy')}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Linked Accounts */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Linked Accounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedSocials.length === 0 && !selectedProfile.discord_username && !selectedProfile.twitter_username ? (
                        <p className="text-sm text-muted-foreground">No linked accounts</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedSocials.map((account) => {
                            const icons = platformIcons[account.platform.toLowerCase()];
                            const icon = icons ? (resolvedTheme === 'dark' ? icons.dark : icons.light) : null;
                            
                            return (
                              <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                  {icon && <img src={icon} alt={account.platform} className="h-5 w-5" />}
                                  <div>
                                    <p className="font-medium text-sm">@{account.username}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{account.platform}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {account.follower_count && account.follower_count > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                      {account.follower_count.toLocaleString()} followers
                                    </span>
                                  )}
                                  {account.is_verified && (
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                      Verified
                                    </Badge>
                                  )}
                                  {account.account_link && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => window.open(account.account_link!, '_blank')}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Discord */}
                          {selectedProfile.discord_username && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-3">
                                <img src={discordIcon} alt="Discord" className="h-5 w-5" />
                                <div>
                                  <p className="font-medium text-sm">{selectedProfile.discord_username}</p>
                                  <p className="text-xs text-muted-foreground">Discord</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Twitter/X */}
                          {selectedProfile.twitter_username && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                              <div className="flex items-center gap-3">
                                <img 
                                  src={resolvedTheme === 'dark' ? xLogoWhite : xLogoBlack} 
                                  alt="X" 
                                  className="h-5 w-5" 
                                />
                                <div>
                                  <p className="font-medium text-sm">@{selectedProfile.twitter_username}</p>
                                  <p className="text-xs text-muted-foreground">X (Twitter)</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(`https://x.com/${selectedProfile.twitter_username}`, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Application Details */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Application</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedApp.application_text && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Application Text</p>
                          <p className="text-sm bg-muted/30 p-3 rounded-lg">{selectedApp.application_text}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Application Video</p>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(selectedApp.video_url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Application Video
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <User className="h-16 w-16 mx-auto mb-4 opacity-40" />
                <p>Select an application to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
