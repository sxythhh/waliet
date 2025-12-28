import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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
const CONTENT_STYLE_OPTIONS = ["Educational", "Entertainment", "Lifestyle", "Comedy", "Tutorial", "Review", "Vlog", "Gaming", "Music", "Dance", "Fashion", "Beauty", "Fitness", "Food", "Travel", "Tech", "Business", "Motivation", "Other"];
const LANGUAGE_OPTIONS = ["English", "Spanish", "Portuguese", "French", "German", "Italian", "Dutch", "Russian", "Japanese", "Korean", "Chinese", "Arabic", "Hindi", "Indonesian", "Turkish", "Polish", "Vietnamese", "Thai", "Other"];
const COUNTRY_OPTIONS = ["United States", "United Kingdom", "Canada", "Australia", "Germany", "France", "Spain", "Italy", "Netherlands", "Brazil", "Mexico", "India", "Japan", "South Korea", "China", "Indonesia", "Philippines", "Vietnam", "Thailand", "Turkey", "Poland", "Russia", "South Africa", "Nigeria", "Egypt", "United Arab Emirates", "Saudi Arabia", "Argentina", "Colombia", "Chile", "Other"];
export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSuccess
}: EditProfileDialogProps) {
  const {
    toast
  } = useToast();
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
      const {
        error
      } = await supabase.from("profiles").update({
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
  const labelStyle = {
    fontFamily: "Inter",
    letterSpacing: "-0.5px"
  };
  const inputStyle = {
    fontFamily: "Inter",
    letterSpacing: "-0.3px"
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 overflow-hidden">
        {/* Form Content */}
        <div className="space-y-5 py-[4px] px-[13px]">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-sm font-medium text-foreground" style={labelStyle}>
              Display Name
            </Label>
            <Input id="full_name" value={formData.full_name} onChange={e => setFormData({
            ...formData,
            full_name: e.target.value
          })} placeholder="Your display name" className="h-11 bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-primary" style={inputStyle} />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-medium text-foreground" style={labelStyle}>
              Bio
            </Label>
            <Textarea id="bio" value={formData.bio} onChange={e => setFormData({
            ...formData,
            bio: e.target.value
          })} placeholder="Tell us about yourself..." className="min-h-[100px] resize-none bg-muted/30 border-border focus-visible:ring-1 focus-visible:ring-primary" style={inputStyle} maxLength={160} />
            <p className="text-xs text-muted-foreground text-right" style={inputStyle}>
              {formData.bio.length}/160
            </p>
          </div>

          {/* Visibility Toggles */}
          <div className="pt-2 space-y-2">
            <Label className="text-sm font-medium text-foreground" style={labelStyle}>
              Profile Visibility
            </Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground" style={inputStyle}>
                  Total Earned
                </span>
                <Switch checked={formData.show_total_earned} onCheckedChange={checked => setFormData({
                ...formData,
                show_total_earned: checked
              })} />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground" style={inputStyle}>
                  Location
                </span>
                <Switch checked={formData.show_location} onCheckedChange={checked => setFormData({
                ...formData,
                show_location: checked
              })} />
              </div>
              
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-foreground" style={inputStyle}>
                  Joined Campaigns
                </span>
                <Switch checked={formData.show_joined_campaigns} onCheckedChange={checked => setFormData({
                ...formData,
                show_joined_campaigns: checked
              })} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="h-10 px-4" style={labelStyle}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-10 px-5 min-w-[100px]" style={labelStyle}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
}