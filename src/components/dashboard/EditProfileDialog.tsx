import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, FileText, Eye, MapPin, Trophy, Users } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    id: string;
    full_name: string | null;
    bio: string | null;
    city: string | null;
    country: string | null;
    content_styles: string[] | null;
    content_languages: string[] | null;
    show_total_earned: boolean | null;
    show_location: boolean | null;
    show_joined_campaigns: boolean | null;
  } | null;
  onSuccess: () => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSuccess
}: EditProfileDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    city: "",
    country: "",
    content_style: "",
    content_language: "",
    show_total_earned: false,
    show_location: false,
    show_joined_campaigns: false
  });

  useEffect(() => {
    if (profile && open) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        city: profile.city || "",
        country: profile.country || "",
        content_style: profile.content_styles?.[0] || "",
        content_language: profile.content_languages?.[0] || "",
        show_total_earned: profile.show_total_earned ?? false,
        show_location: profile.show_location ?? false,
        show_joined_campaigns: profile.show_joined_campaigns ?? false
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: formData.full_name || null,
        bio: formData.bio || null,
        city: formData.city || null,
        country: formData.country || null,
        content_styles: formData.content_style ? [formData.content_style] : null,
        content_languages: formData.content_language ? [formData.content_language] : null,
        show_total_earned: formData.show_total_earned,
        show_location: formData.show_location,
        show_joined_campaigns: formData.show_joined_campaigns
      }).eq("id", profile.id);

      if (error) throw error;
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully."
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error saving profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden bg-background">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border">
          <h2 className="text-lg font-semibold tracking-[-0.5px]">Edit Profile</h2>
          <p className="text-sm text-muted-foreground mt-0.5 tracking-[-0.3px]">Update your public profile information</p>
        </div>

        {/* Form Content */}
        <div className="px-6 py-5 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="tracking-[-0.3px]">Basic Info</span>
            </div>

            <div className="space-y-4 pl-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium tracking-[-0.3px]">
                  Display Name
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your display name"
                  className="h-10 bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50 tracking-[-0.3px]"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio" className="text-sm font-medium tracking-[-0.3px]">
                    Bio
                  </Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formData.bio.length}/160
                  </span>
                </div>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  className="min-h-[80px] resize-none bg-muted/30 border-border/50 focus-visible:ring-1 focus-visible:ring-primary/50 tracking-[-0.3px]"
                  maxLength={160}
                />
              </div>
            </div>
          </div>

          {/* Visibility Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="tracking-[-0.3px]">Profile Visibility</span>
            </div>

            <div className="space-y-1 pl-6">
              {/* Total Earned Toggle */}
              <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium tracking-[-0.3px]">Total Earned</p>
                    <p className="text-xs text-muted-foreground tracking-[-0.2px]">Show earnings on your profile</p>
                  </div>
                </div>
                <Switch
                  checked={formData.show_total_earned}
                  onCheckedChange={checked => setFormData({ ...formData, show_total_earned: checked })}
                />
              </div>

              {/* Location Toggle */}
              <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium tracking-[-0.3px]">Location</p>
                    <p className="text-xs text-muted-foreground tracking-[-0.2px]">Display your city and country</p>
                  </div>
                </div>
                <Switch
                  checked={formData.show_location}
                  onCheckedChange={checked => setFormData({ ...formData, show_location: checked })}
                />
              </div>

              {/* Joined Campaigns Toggle */}
              <div className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium tracking-[-0.3px]">Joined Campaigns</p>
                    <p className="text-xs text-muted-foreground tracking-[-0.2px]">Show campaigns you've joined</p>
                  </div>
                </div>
                <Switch
                  checked={formData.show_joined_campaigns}
                  onCheckedChange={checked => setFormData({ ...formData, show_joined_campaigns: checked })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="h-9 px-4 tracking-[-0.3px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-5 min-w-[90px] tracking-[-0.3px]"
            style={{ backgroundColor: '#2061de', borderTop: '1px solid #4b85f7' }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
