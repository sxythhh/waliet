import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Brand } from "@/pages/BrandPortal";
import {
  User,
  Upload,
  Check,
  ExternalLink,
  Sun,
  Moon,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface BrandPortalSettingsProps {
  brand: Brand;
  userId: string;
}

interface Profile {
  username: string | null;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  email: string | null;
}

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  avatar_url: string | null;
  follower_count: number | null;
  is_verified: boolean;
}

export function BrandPortalSettings({ brand, userId }: BrandPortalSettingsProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
    fetchSocialAccounts();
  }, [userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, bio, avatar_url")
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setProfile({ ...data, email: user?.email || null });
        setFormData({
          full_name: data.full_name || "",
          bio: data.bio || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSocialAccounts = async () => {
    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, username, avatar_url, follower_count, is_verified")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (data) {
      setSocialAccounts(data);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let avatarUrl = profile?.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const filePath = `${userId}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);
          avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name || null,
          bio: formData.bio || null,
          avatar_url: avatarUrl,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Profile updated successfully");
      await fetchProfile();
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const formatFollowers = (count: number | null) => {
    if (!count) return "0";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "tiktok":
        return "T";
      case "instagram":
        return "I";
      case "youtube":
        return "Y";
      default:
        return platform.charAt(0).toUpperCase();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground font-inter tracking-[-0.5px]">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
          Manage your profile and preferences
        </p>
      </div>

      {/* Profile Card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 font-inter tracking-[-0.5px]">
            Profile
          </h3>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-border">
                <AvatarImage src={avatarPreview || profile?.avatar_url || ""} />
                <AvatarFallback className="text-lg font-medium bg-muted text-muted-foreground">
                  {profile?.username?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-card shadow-md border border-border hover:bg-muted transition-colors"
              >
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium text-foreground font-inter tracking-[-0.3px]">
                @{profile?.username || "username"}
              </p>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                {profile?.email}
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name" className="text-sm text-muted-foreground font-inter">
                Full Name
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Your full name"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="bio" className="text-sm text-muted-foreground font-inter">
                Bio
              </Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Tell brands a little about yourself..."
                className="mt-1.5 resize-none"
                rows={3}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground font-inter tracking-[-0.5px]">
              Connected Accounts
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => window.open("/dashboard?tab=profile", "_blank")}
            >
              Manage
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>

          {socialAccounts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                No social accounts connected
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {socialAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={account.avatar_url || ""} />
                    <AvatarFallback className="text-xs font-medium bg-muted text-muted-foreground">
                      {getPlatformIcon(account.platform)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate font-inter tracking-[-0.3px]">
                        @{account.username}
                      </p>
                      {account.is_verified && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize font-inter tracking-[-0.3px]">
                      {account.platform} · {formatFollowers(account.follower_count)} followers
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brand Partnership */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 font-inter tracking-[-0.5px]">
            Brand Partnership
          </h3>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={brand.logo_url || ""} className="object-cover" />
              <AvatarFallback className="rounded-lg bg-muted text-muted-foreground font-semibold">
                {brand.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground font-inter tracking-[-0.5px]">{brand.name}</h4>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                {brand.description || "Creator Partnership"}
              </p>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4 font-inter tracking-[-0.5px]">
            Appearance
          </h3>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              {resolvedTheme === "dark" ? (
                <Moon className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">
                  Dark Mode
                </p>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                  {resolvedTheme === "dark"
                    ? "Currently using dark theme"
                    : "Currently using light theme"}
                </p>
              </div>
            </div>
            <Switch
              checked={resolvedTheme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Need Help */}
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-2 font-inter tracking-[-0.5px]">
            Need More Options?
          </h3>
          <p className="text-sm text-muted-foreground mb-4 font-inter tracking-[-0.3px]">
            Access full settings including payment methods, security, and more from your main dashboard.
          </p>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.open("/dashboard?tab=profile", "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
            Open Full Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
