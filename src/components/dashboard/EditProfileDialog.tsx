import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MapPin, Globe, Palette, Languages } from "lucide-react";

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
  } | null;
  onSuccess: () => void;
}

const CONTENT_STYLE_OPTIONS = [
  "Educational",
  "Entertainment",
  "Lifestyle",
  "Comedy",
  "Tutorial",
  "Review",
  "Vlog",
  "Gaming",
  "Music",
  "Dance",
  "Fashion",
  "Beauty",
  "Fitness",
  "Food",
  "Travel",
  "Tech",
  "Business",
  "Motivation",
  "Other"
];

const LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Portuguese",
  "French",
  "German",
  "Italian",
  "Dutch",
  "Russian",
  "Japanese",
  "Korean",
  "Chinese",
  "Arabic",
  "Hindi",
  "Indonesian",
  "Turkish",
  "Polish",
  "Vietnamese",
  "Thai",
  "Other"
];

const COUNTRY_OPTIONS = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "France",
  "Spain",
  "Italy",
  "Netherlands",
  "Brazil",
  "Mexico",
  "India",
  "Japan",
  "South Korea",
  "China",
  "Indonesia",
  "Philippines",
  "Vietnam",
  "Thailand",
  "Turkey",
  "Poland",
  "Russia",
  "South Africa",
  "Nigeria",
  "Egypt",
  "United Arab Emirates",
  "Saudi Arabia",
  "Argentina",
  "Colombia",
  "Chile",
  "Other"
];

export function EditProfileDialog({ open, onOpenChange, profile, onSuccess }: EditProfileDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    city: "",
    country: "",
    content_style: "",
    content_language: ""
  });

  useEffect(() => {
    if (profile && open) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        city: profile.city || "",
        country: profile.country || "",
        content_style: profile.content_styles?.[0] || "",
        content_language: profile.content_languages?.[0] || ""
      });
    }
  }, [profile, open]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name || null,
          bio: formData.bio || null,
          city: formData.city || null,
          country: formData.country || null,
          content_styles: formData.content_style ? [formData.content_style] : null,
          content_languages: formData.content_language ? [formData.content_language] : null
        })
        .eq("id", profile.id);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-geist tracking-[-0.5px]">Edit Profile</DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.3px]">
            Update your profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-sm font-medium">
              Display Name
            </Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Your display name"
              className="h-10"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-medium">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              className="min-h-[80px] resize-none"
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.bio.length}/160
            </p>
          </div>

          {/* Content Style */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              Preferred Content Style
            </Label>
            <Select
              value={formData.content_style}
              onValueChange={(value) => setFormData({ ...formData, content_style: value })}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                {CONTENT_STYLE_OPTIONS.map((style) => (
                  <SelectItem key={style} value={style}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Languages className="h-3.5 w-3.5 text-muted-foreground" />
              Language
            </Label>
            <Select
              value={formData.content_language}
              onValueChange={(value) => setFormData({ ...formData, content_language: value })}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Location
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="h-10"
              />
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent className="bg-popover border z-50 max-h-[200px]">
                  {COUNTRY_OPTIONS.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
