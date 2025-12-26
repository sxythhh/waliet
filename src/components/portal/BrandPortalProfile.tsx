import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Globe, Instagram, ExternalLink, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
}

interface BrandPortalProfileProps {
  brand: Brand;
  userId: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  email?: string;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number;
  is_verified: boolean;
}

export function BrandPortalProfile({ brand, userId }: BrandPortalProfileProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  const accentColor = brand.brand_color || "#2061de";

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .eq("id", userId)
        .maybeSingle();

      // Fetch email from auth
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email || null);

      // Fetch social accounts
      const { data: accounts } = await supabase
        .from("social_accounts")
        .select("id, platform, username, follower_count, is_verified")
        .eq("user_id", userId);

      setProfile(profileData);
      setSocialAccounts(accounts || []);
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "instagram":
        return <Instagram className="h-5 w-5" />;
      case "tiktok":
        return <Globe className="h-5 w-5" />;
      case "youtube":
        return <Globe className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
          <p className="text-gray-500 mt-1">Manage your creator profile</p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard?tab=profile")}
          className="border-gray-200"
        >
          <Settings className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      {/* Profile Card */}
      <Card className="bg-white border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback 
                className="text-2xl font-semibold text-white"
                style={{ backgroundColor: accentColor }}
              >
                {profile?.username?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">
                {profile?.username || "Creator"}
              </h2>
              {profile?.bio && (
                <p className="text-gray-500 mt-1">{profile.bio}</p>
              )}
              
              <div className="flex items-center gap-4 mt-4">
                {email && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card className="bg-white border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {socialAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <User className="h-6 w-6" style={{ color: accentColor }} />
              </div>
              <p className="text-gray-500">No connected accounts</p>
              <p className="text-sm text-gray-400 mt-1">
                Connect your social accounts in the main dashboard
              </p>
              <Button
                className="mt-4 text-white"
                style={{ backgroundColor: accentColor }}
                onClick={() => navigate("/dashboard?tab=profile")}
              >
                Connect Accounts
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {socialAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${accentColor}15` }}
                    >
                      {getPlatformIcon(account.platform)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">@{account.username}</p>
                        {account.is_verified && (
                          <Badge 
                            className="text-xs border-0"
                            style={{ 
                              backgroundColor: `${accentColor}15`,
                              color: accentColor 
                            }}
                          >
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 capitalize">{account.platform}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {account.follower_count?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500">followers</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand Relationship */}
      <Card className="bg-white border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">Brand Partnership</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={brand.logo_url || ""} className="object-cover" />
              <AvatarFallback 
                className="rounded-lg text-white font-semibold"
                style={{ backgroundColor: accentColor }}
              >
                {brand.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{brand.name}</h3>
              <p className="text-sm text-gray-500">
                {brand.description || "Creator Partnership"}
              </p>
            </div>
            <Badge 
              className="border-0"
              style={{ 
                backgroundColor: `${accentColor}15`,
                color: accentColor 
              }}
            >
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
