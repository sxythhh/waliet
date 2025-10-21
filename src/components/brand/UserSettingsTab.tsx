import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
export function UserSettingsTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
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
    return <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-[#1a1a1a]" />
        <Card className="bg-[#121212] border-none shadow-none">
          <CardHeader>
            <Skeleton className="h-6 w-40 bg-[#1a1a1a]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-20 rounded-full bg-[#1a1a1a]" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32 bg-[#1a1a1a]" />
                <Skeleton className="h-4 w-24 bg-[#1a1a1a]" />
              </div>
            </div>
            <Skeleton className="h-10 w-full bg-[#1a1a1a]" />
            <Skeleton className="h-10 w-full bg-[#1a1a1a]" />
            <Skeleton className="h-10 w-full bg-[#1a1a1a]" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full bg-[#1a1a1a]" />
              <Skeleton className="h-10 w-full bg-[#1a1a1a]" />
            </div>
            <Skeleton className="h-10 w-full bg-[#1a1a1a]" />
            <div className="flex gap-3 pt-4">
              <Skeleton className="h-10 flex-1 bg-[#1a1a1a]" />
              <Skeleton className="h-10 w-32 bg-[#1a1a1a]" />
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">User Settings</h2>

      <Card className="bg-[#121212] border-none shadow-none">
        <CardHeader>
          <CardTitle className="text-white">Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover" /> : <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-white text-2xl">
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </div>}
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90">
                <Upload className="h-3 w-3 text-white" />
              </label>
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
            <div>
              <p className="text-white font-medium">{profile.full_name || "Not set"}</p>
              <p className="text-sm text-white/60">@{profile.username}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email Address</Label>
            <Input id="email" type="email" value={userEmail} disabled className="bg-[#191919] border-none text-white/60" />
            <p className="text-xs text-white/40">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-white">Username</Label>
            <Input id="username" value={profile.username} onChange={e => setProfile({
            ...profile,
            username: e.target.value
          })} className="bg-[#191919] border-none text-white" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-white">Full Name</Label>
            <Input id="full_name" value={profile.full_name} onChange={e => setProfile({
            ...profile,
            full_name: e.target.value
          })} className="bg-[#191919] border-none text-white" />
          </div>

          

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country" className="text-white">Country</Label>
              <Input id="country" value={profile.country} onChange={e => setProfile({
              ...profile,
              country: e.target.value
            })} className="bg-[#191919] border-none text-white" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city" className="text-white">City</Label>
              <Input id="city" value={profile.city} onChange={e => setProfile({
              ...profile,
              city: e.target.value
            })} className="bg-[#191919] border-none text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white">Phone Number</Label>
            <Input id="phone" value={profile.phone_number} onChange={e => setProfile({
            ...profile,
            phone_number: e.target.value
          })} className="bg-[#191919] border-none text-white" placeholder="+1234567890" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button onClick={handleSignOut} variant="outline" className="border-none text-white hover:bg-white/10">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>;
}