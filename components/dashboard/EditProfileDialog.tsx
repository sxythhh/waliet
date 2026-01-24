import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { FLAGS } from "@/assets/flags";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    id: string;
    username?: string | null;
    full_name: string | null;
    bio: string | null;
    city: string | null;
    country: string | null;
    content_styles: string[] | null;
    content_languages: string[] | null;
    content_niches?: string[] | null;
    show_total_earned: boolean | null;
    show_location: boolean | null;
    show_joined_campaigns: boolean | null;
    is_private?: boolean | null;
  } | null;
  onSuccess: () => void;
}

const CONTENT_STYLES = [
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
  "DIY",
  "ASMR",
];

const CONTENT_LANGUAGES: { name: string; flag?: string }[] = [
  { name: "English", flag: FLAGS.US },
  { name: "Spanish", flag: FLAGS.ES },
  { name: "French", flag: FLAGS.FR },
  { name: "German", flag: FLAGS.DE },
  { name: "Portuguese", flag: FLAGS.PT },
  { name: "Italian", flag: FLAGS.IT },
  { name: "Dutch", flag: FLAGS.NL },
  { name: "Russian", flag: FLAGS.RU },
  { name: "Japanese", flag: FLAGS.JP },
  { name: "Korean", flag: FLAGS.KR },
  { name: "Chinese", flag: FLAGS.CN },
  { name: "Arabic", flag: FLAGS.SA },
  { name: "Hindi", flag: FLAGS.IN },
  { name: "Indonesian", flag: FLAGS.ID },
  { name: "Turkish", flag: FLAGS.TR },
  { name: "Polish", flag: FLAGS.PL },
  { name: "Vietnamese", flag: FLAGS.VN },
  { name: "Thai", flag: FLAGS.TH },
];

const CONTENT_NICHES = [
  "Tech & Gadgets",
  "Fashion & Style",
  "Beauty & Skincare",
  "Health & Fitness",
  "Food & Cooking",
  "Travel & Adventure",
  "Gaming",
  "Music & Dance",
  "Comedy & Memes",
  "Education",
  "Finance & Business",
  "Parenting & Family",
  "Pets & Animals",
  "Sports",
  "Art & Design",
  "Automotive",
];

type TabId = "general" | "content" | "privacy";

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSuccess
}: EditProfileDialogProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    city: "",
    country: "",
    content_styles: [] as string[],
    content_languages: [] as string[],
    content_niches: [] as string[],
    show_total_earned: false,
    show_location: false,
    show_joined_campaigns: false,
    is_private: false,
  });

  useEffect(() => {
    if (profile && open) {
      setFormData({
        full_name: profile.full_name || "",
        bio: profile.bio || "",
        city: profile.city || "",
        country: profile.country || "",
        content_styles: profile.content_styles || [],
        content_languages: profile.content_languages || [],
        content_niches: profile.content_niches || [],
        show_total_earned: profile.show_total_earned ?? false,
        show_location: profile.show_location ?? false,
        show_joined_campaigns: profile.show_joined_campaigns ?? false,
        is_private: profile.is_private ?? false,
      });
      setActiveTab("general");
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
        content_styles: formData.content_styles.length > 0 ? formData.content_styles : null,
        content_languages: formData.content_languages.length > 0 ? formData.content_languages : null,
        content_niches: formData.content_niches.length > 0 ? formData.content_niches : null,
        show_total_earned: formData.show_total_earned,
        show_location: formData.show_location,
        show_joined_campaigns: formData.show_joined_campaigns,
        is_private: formData.is_private,
      }).eq("id", profile.id);

      if (error) throw error;
      toast({
        title: "Profile updated",
        description: "Your changes have been saved."
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

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "general", label: "General" },
    { id: "content", label: "Content" },
    { id: "privacy", label: "Privacy" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden bg-background">
        <VisuallyHidden>
          <DialogTitle>Edit Profile</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="px-6 py-5 border-b border-border/50">
          <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">Edit Profile</h2>
          {profile?.username && (
            <p className="text-sm text-muted-foreground mt-0.5 font-inter tracking-[-0.3px]">@{profile.username}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-2 border-b border-border/50">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium font-inter tracking-[-0.3px] rounded-t-lg transition-colors relative",
                  activeTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="space-y-5">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium font-inter tracking-[-0.3px]">
                  Display Name
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your display name"
                  className="h-10 bg-muted/30 border-border/50 font-inter tracking-[-0.3px]"
                />
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.2px]">
                  This is how your name appears on your profile
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bio" className="text-sm font-medium font-inter tracking-[-0.3px]">
                    Bio
                  </Label>
                  <span className="text-xs text-muted-foreground tabular-nums font-inter">
                    {formData.bio.length}/200
                  </span>
                </div>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell brands about yourself and your content..."
                  className="min-h-[100px] resize-none bg-muted/30 border-border/50 font-inter tracking-[-0.3px]"
                  maxLength={200}
                />
              </div>

              {/* Location */}
              <div className="space-y-3">
                <Label className="text-sm font-medium font-inter tracking-[-0.3px]">
                  Location
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="h-10 bg-muted/30 border-border/50 font-inter tracking-[-0.3px]"
                  />
                  <Input
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Country"
                    className="h-10 bg-muted/30 border-border/50 font-inter tracking-[-0.3px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content Tab */}
          {activeTab === "content" && (
            <div className="space-y-6">
              {/* Content Languages */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium font-inter tracking-[-0.3px]">
                    Languages
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.2px]">
                    Select the languages you create content in
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_LANGUAGES.map(lang => (
                    <button
                      key={lang.name}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        content_languages: toggleArrayItem(formData.content_languages, lang.name)
                      })}
                      className={cn(
                        "px-3 py-1.5 text-sm font-inter tracking-[-0.3px] rounded-full border transition-all inline-flex items-center gap-1.5",
                        formData.content_languages.includes(lang.name)
                          ? "bg-foreground text-background border-foreground"
                          : "bg-transparent text-muted-foreground border-border/50 hover:border-foreground/50 hover:text-foreground"
                      )}
                    >
                      {lang.flag && (
                        <img
                          src={lang.flag}
                          alt=""
                          className="w-4 h-4 rounded-sm object-cover"
                        />
                      )}
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Styles */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium font-inter tracking-[-0.3px]">
                    Content Style
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.2px]">
                    What type of content do you create?
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_STYLES.map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        content_styles: toggleArrayItem(formData.content_styles, style)
                      })}
                      className={cn(
                        "px-3 py-1.5 text-sm font-inter tracking-[-0.3px] rounded-full border transition-all",
                        formData.content_styles.includes(style)
                          ? "bg-foreground text-background border-foreground"
                          : "bg-transparent text-muted-foreground border-border/50 hover:border-foreground/50 hover:text-foreground"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Niches */}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium font-inter tracking-[-0.3px]">
                    Niches
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.2px]">
                    What topics does your content focus on?
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_NICHES.map(niche => (
                    <button
                      key={niche}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        content_niches: toggleArrayItem(formData.content_niches, niche)
                      })}
                      className={cn(
                        "px-3 py-1.5 text-sm font-inter tracking-[-0.3px] rounded-full border transition-all",
                        formData.content_niches.includes(niche)
                          ? "bg-foreground text-background border-foreground"
                          : "bg-transparent text-muted-foreground border-border/50 hover:border-foreground/50 hover:text-foreground"
                      )}
                    >
                      {niche}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-4 font-inter tracking-[-0.2px]">
                Control what information is visible on your public profile
              </p>

              {/* Private Profile Toggle */}
              <div className="flex items-center justify-between py-3.5 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">Private Profile</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.2px]">
                    Hide your profile from public search
                  </p>
                </div>
                <Switch
                  checked={formData.is_private}
                  onCheckedChange={checked => setFormData({ ...formData, is_private: checked })}
                />
              </div>

              {/* Show Total Earned */}
              <div className="flex items-center justify-between py-3.5 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">Show Earnings</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.2px]">
                    Display your total earnings on your profile
                  </p>
                </div>
                <Switch
                  checked={formData.show_total_earned}
                  onCheckedChange={checked => setFormData({ ...formData, show_total_earned: checked })}
                />
              </div>

              {/* Show Location */}
              <div className="flex items-center justify-between py-3.5 border-b border-border/30">
                <div>
                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">Show Location</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.2px]">
                    Display your city and country
                  </p>
                </div>
                <Switch
                  checked={formData.show_location}
                  onCheckedChange={checked => setFormData({ ...formData, show_location: checked })}
                />
              </div>

              {/* Show Joined Campaigns */}
              <div className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">Show Campaigns</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-inter tracking-[-0.2px]">
                    Display campaigns you've participated in
                  </p>
                </div>
                <Switch
                  checked={formData.show_joined_campaigns}
                  onCheckedChange={checked => setFormData({ ...formData, show_joined_campaigns: checked })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {formData.content_styles.length > 0 || formData.content_languages.length > 0 || formData.content_niches.length > 0 ? (
              <span className="text-xs text-muted-foreground font-inter tracking-[-0.2px]">
                {formData.content_languages.length + formData.content_styles.length + formData.content_niches.length} tags selected
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-9 px-4 font-inter tracking-[-0.3px]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-5 min-w-[100px] font-inter tracking-[-0.3px]"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
