import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Star } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo.svg";
import instagramLogo from "@/assets/instagram-logo.svg";
import youtubeLogo from "@/assets/youtube-logo.svg";
import wordmarkLogo from "@/assets/wordmark-logo.png";

interface Profile {
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  total_earnings: number;
  trust_score: number;
  demographics_score: number;
  views_score: number;
}

interface SocialAccount {
  platform: string;
  username: string;
  follower_count: number;
  is_verified: boolean;
  account_link: string | null;
}

export default function PublicProfile() {
  const { username } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    if (!username) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);

      const { data: socialData } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", profileData.id);

      if (socialData) {
        setSocialAccounts(socialData);
      }
    }

    setLoading(false);
  };

  const getPlatformIcon = (platform: string) => {
    const iconClass = "h-5 w-5";
    switch (platform) {
      case "instagram":
        return <img src={instagramLogo} alt="Instagram" className={iconClass} />;
      case "youtube":
        return <img src={youtubeLogo} alt="YouTube" className={iconClass} />;
      case "tiktok":
        return <img src={tiktokLogo} alt="TikTok" className={iconClass} />;
      default:
        return null;
    }
  };

  const trustScore = profile?.trust_score || 0;
  const demographicsScore = profile?.demographics_score || 0;
  const viewsScore = profile?.views_score || 0;
  const overallRating = Math.round((trustScore + demographicsScore + viewsScore) / 3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Profile Not Found</h1>
          <p className="text-muted-foreground">This Virality profile doesn&apos;t exist</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Avatar with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <Avatar className="relative h-32 w-32 sm:h-40 sm:w-40 border-4 border-background shadow-2xl">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="text-4xl sm:text-5xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                  {profile.full_name?.[0] || profile.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name and Username */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {profile.full_name || profile.username}
              </h1>
              <p className="text-lg text-muted-foreground">@{profile.username}</p>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-foreground/80 max-w-2xl text-base sm:text-lg leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Overall Rating Badge */}
            <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full border border-primary/20">
              <Star className="h-5 w-5 text-primary fill-primary" />
              <span className="text-xl font-bold text-primary">{overallRating}</span>
              <span className="text-sm text-muted-foreground">/100 Overall Rating</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="md:col-span-1 space-y-6">
            {/* Earnings Card */}
            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Earnings</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                  ${profile.total_earnings?.toFixed(2) || "0.00"}
                </p>
              </div>
            </div>

            {/* Scores Card */}
            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Performance Scores</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">Trust Score</span>
                    <span className="font-bold text-foreground">{trustScore}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                      style={{ width: `${trustScore}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">Demographics</span>
                    <span className="font-bold text-foreground">{demographicsScore}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                      style={{ width: `${demographicsScore}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground/80">Views Performance</span>
                    <span className="font-bold text-foreground">{viewsScore}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
                      style={{ width: `${viewsScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Social Accounts */}
          <div className="md:col-span-2">
            <div className="bg-card/50 backdrop-blur-sm border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
                Connected Accounts
              </h3>

              {socialAccounts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No social accounts connected yet</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {socialAccounts.map((account) => (
                    <a
                      key={account.platform}
                      href={account.account_link || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-5 hover:from-primary/10 hover:to-primary/5 border border-border/50 hover:border-primary/30 transition-all hover:shadow-lg"
                    >
                      {/* Platform Icon */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-12 w-12 rounded-xl bg-background flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          {getPlatformIcon(account.platform)}
                        </div>
                        {account.account_link && (
                          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>

                      {/* Account Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold capitalize text-foreground">
                            {account.platform}
                          </p>
                          {account.is_verified && (
                            <Badge variant="secondary" className="text-xs px-2 py-0 bg-primary/20 text-primary border-primary/30">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">@{account.username}</p>
                        <p className="text-2xl font-bold text-foreground mt-2">
                          {account.follower_count.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground ml-1">followers</span>
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-16 pb-8 space-y-3">
          <p className="text-sm text-muted-foreground">Powered by</p>
          <img src={wordmarkLogo} alt="Virality" className="h-8 mx-auto opacity-70 hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
