import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Instagram, Youtube, Music, DollarSign, TrendingUp, Users, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
}

export default function PublicProfile() {
  const { slug } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [slug]);

  const fetchProfile = async () => {
    if (!slug) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", slug)
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
    switch (platform) {
      case "instagram":
        return <Instagram className="h-5 w-5" />;
      case "youtube":
        return <Youtube className="h-5 w-5" />;
      case "tiktok":
        return <Music className="h-5 w-5" />;
      default:
        return null;
    }
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case "instagram":
        return "from-purple-500 to-pink-500";
      case "youtube":
        return "from-red-500 to-red-600";
      case "tiktok":
        return "from-black to-gray-800";
      default:
        return "from-primary to-primary-glow";
    }
  };

  // Calculate ratings from profile
  const trustScore = profile?.trust_score || 0;
  const demographicsScore = profile?.demographics_score || 0;
  const viewsScore = profile?.views_score || 0;
  const overallRating = Math.round((trustScore + demographicsScore + viewsScore) / 3);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Profile Not Found</h1>
          <p className="text-muted-foreground">This Virality profile doesn't exist</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Avatar className="h-24 w-24 mx-auto border-2 border-primary">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="text-2xl bg-primary/10">
              {profile.full_name?.[0] || profile.username[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-3xl font-bold">{profile.full_name || profile.username}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>

          {profile.bio && (
            <p className="text-foreground/80 max-w-md mx-auto">{profile.bio}</p>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Earned</span>
                <DollarSign className="h-4 w-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-success">
                ${profile.total_earnings?.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-0">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Overall Rating</span>
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">{overallRating}/100</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Breakdown */}
        <Card className="bg-card border-0">
          <CardContent className="pt-6 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground mb-4">Rating Breakdown</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm">Trust Score</span>
              </div>
              <span className="text-sm font-semibold">{trustScore}/100</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm">Demographics</span>
              </div>
              <span className="text-sm font-semibold">{demographicsScore}/100</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm">Views Performance</span>
              </div>
              <span className="text-sm font-semibold">{viewsScore}/100</span>
            </div>
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        {socialAccounts.length > 0 && (
          <Card className="bg-card border-0">
            <CardContent className="pt-6 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground mb-4">Connected Accounts</h3>
              {socialAccounts.map((account) => (
                <div
                  key={account.platform}
                  className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-card to-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${getPlatformColor(account.platform)} flex items-center justify-center text-white`}>
                      {getPlatformIcon(account.platform)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium capitalize">{account.platform}</p>
                        {account.is_verified && (
                          <Badge className="bg-primary/20 text-primary text-xs">Verified</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{account.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{account.follower_count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">followers</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center pt-8">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="text-primary font-semibold">Virality</span>
          </p>
        </div>
      </div>
    </div>
  );
}
