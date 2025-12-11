import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LogOut, Camera, ExternalLink, Settings, User, Building2, MapPin, Phone, Mail, Globe, Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { EditBrandDialog } from "@/components/EditBrandDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_type: string | null;
  assets_url: string | null;
  home_url: string | null;
  account_url: string | null;
  show_account_tab: boolean;
}
export function UserSettingsTab() {
  const navigate = useNavigate();
  const {
    currentBrand,
    isBrandMode
  } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [brand, setBrand] = useState<Brand | null>(null);
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
    country: "",
    city: "",
    phone_number: "",
    avatar_url: ""
  });
  useEffect(() => {
    fetchProfile();
  }, []);
  useEffect(() => {
    if (isBrandMode && currentBrand?.id) {
      fetchBrand();
    }
  }, [isBrandMode, currentBrand?.id]);
  const fetchBrand = async () => {
    if (!currentBrand?.id) return;
    try {
      const {
        data,
        error
      } = await supabase.from("brands").select("*").eq("id", currentBrand.id).single();
      if (error) throw error;
      setBrand(data);
    } catch (error) {
      console.error("Error fetching brand:", error);
    }
  };
  const fetchProfile = async () => {
    try {
      setLoading(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserEmail(user.email || "");
      const {
        data: profileData,
        error
      } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error) throw error;
      if (profileData) {
        setProfile({
          username: profileData.username || "",
          full_name: profileData.full_name || "",
          bio: profileData.bio || "",
          country: profileData.country || "",
          city: profileData.city || "",
          phone_number: profileData.phone_number || "",
          avatar_url: profileData.avatar_url || ""
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        error
      } = await supabase.from("profiles").update({
        username: profile.username,
        full_name: profile.full_name,
        bio: profile.bio,
        country: profile.country,
        city: profile.city,
        phone_number: profile.phone_number
      }).eq("id", user.id);
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true
      });
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const {
        error: updateError
      } = await supabase.from('profiles').update({
        avatar_url: publicUrl
      }).eq('id', user.id);
      if (updateError) throw updateError;
      setProfile({
        ...profile,
        avatar_url: publicUrl
      });
      toast.success("Avatar updated successfully");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar");
    }
  };
  if (loading) {
    return <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 dark:bg-muted-foreground/20" />
          <Skeleton className="h-4 w-48 dark:bg-muted-foreground/20" />
        </div>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full dark:bg-muted-foreground/20" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 dark:bg-muted-foreground/20" />
              <Skeleton className="h-4 w-24 dark:bg-muted-foreground/20" />
            </div>
          </div>
          <div className="grid gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full dark:bg-muted-foreground/20" />)}
          </div>
        </div>
      </div>;
  }

  return <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.5px]">Settings</h1>
          <p className="text-sm text-muted-foreground tracking-[-0.5px]">Manage your account and preferences</p>
        </div>
        
      </div>

      {/* Brand Settings Section */}
      {isBrandMode && brand && <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium tracking-[-0.5px]">Brand</h2>
              <p className="text-xs text-muted-foreground tracking-[-0.5px]">Workspace settings</p>
            </div>
            <EditBrandDialog brand={brand} onSuccess={fetchBrand} trigger={<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit
                </Button>} />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="w-14 h-14 rounded-xl object-cover" /> : <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg font-semibold">
                  {brand.name?.[0]?.toUpperCase() || "B"}
                </div>}
              <div className="flex-1 min-w-0">
                <p className="font-medium tracking-[-0.5px] truncate">{brand.name}</p>
                <p className="text-sm text-muted-foreground tracking-[-0.5px]">@{brand.slug}</p>
              </div>
            </div>

            {(brand.home_url || brand.assets_url) && <div className="grid grid-cols-2 gap-3">
                {brand.home_url && <a href={brand.home_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                    <Globe className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm truncate tracking-[-0.5px]">Website</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 ml-auto" />
                  </a>}
                {brand.assets_url && <a href={brand.assets_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                    <Folder className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-sm truncate tracking-[-0.5px]">Assets</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 ml-auto" />
                  </a>}
              </div>}
          </div>
        </div>}

      {/* Profile Section */}
      <div className="space-y-4">
        <div>
          <h2 className="font-medium tracking-[-0.5px]">Profile</h2>
          <p className="text-xs text-muted-foreground tracking-[-0.5px]">Your personal information</p>
        </div>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile.avatar_url} alt={profile.username} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </label>
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium tracking-[-0.5px] truncate">{profile.full_name || profile.username}</p>
              <p className="text-sm text-muted-foreground tracking-[-0.5px]">@{profile.username}</p>
              <p className="text-xs text-muted-foreground/70 mt-1 tracking-[-0.5px]">Click avatar to change</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-2 tracking-[-0.5px]">
                <Mail className="h-3.5 w-3.5" />
                Email
              </Label>
              <Input value={userEmail} disabled className="bg-muted/30 border-0 text-muted-foreground h-11" />
            </div>

            {/* Username & Full Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Username</Label>
                <Input value={profile.username} onChange={e => setProfile({
                ...profile,
                username: e.target.value
              })} className="bg-muted/30 border-0 h-11" placeholder="username" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground tracking-[-0.5px]">Full Name</Label>
                <Input value={profile.full_name} onChange={e => setProfile({
                ...profile,
                full_name: e.target.value
              })} className="bg-muted/30 border-0 h-11" placeholder="John Doe" />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-2 tracking-[-0.5px]">
                <MapPin className="h-3.5 w-3.5" />
                Location
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Input value={profile.country} onChange={e => setProfile({
                ...profile,
                country: e.target.value
              })} className="bg-muted/30 border-0 h-11" placeholder="Country" />
                <Input value={profile.city} onChange={e => setProfile({
                ...profile,
                city: e.target.value
              })} className="bg-muted/30 border-0 h-11" placeholder="City" />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-2 tracking-[-0.5px]">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
              </Label>
              <Input value={profile.phone_number} onChange={e => setProfile({
              ...profile,
              phone_number: e.target.value
            })} className="bg-muted/30 border-0 h-11" placeholder="+1 (555) 000-0000" />
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full h-11">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>;
}