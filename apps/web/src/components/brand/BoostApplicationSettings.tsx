import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Phone, Globe, Info } from "lucide-react";
import { toast } from "sonner";
import discordIcon from "@/assets/discord-icon.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import { PublicFormSettings, parsePublicFormSettings } from "@/types/publicFormSettings";

interface BoostApplicationSettingsProps {
  boostId: string;
  boostSlug?: string | null;
}

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: tiktokLogo },
  { id: 'instagram', label: 'Instagram', icon: instagramLogo },
  { id: 'youtube', label: 'YouTube', icon: youtubeLogo },
] as const;

export function BoostApplicationSettings({ boostId, boostSlug }: BoostApplicationSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PublicFormSettings>({});
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: boost, error } = await supabase
        .from("bounty_campaigns")
        .select("public_form_settings")
        .eq("id", boostId)
        .single();

      if (error) throw error;

      const parsed = parsePublicFormSettings(boost?.public_form_settings);
      setSettings(parsed);
    } catch (error) {
      console.error("Error fetching application settings:", error);
      toast.error("Failed to load application settings");
    } finally {
      setIsLoading(false);
    }
  }, [boostId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = (updates: Partial<PublicFormSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const togglePlatform = (platform: 'tiktok' | 'instagram' | 'youtube') => {
    const currentPlatforms = settings.social_platforms || [];
    const newPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter(p => p !== platform)
      : [...currentPlatforms, platform];
    updateSettings({ social_platforms: newPlatforms });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("bounty_campaigns")
        .update({ public_form_settings: settings as any })
        .eq("id", boostId);

      if (error) throw error;

      setHasChanges(false);
      toast.success("Application requirements saved");
    } catch (error) {
      console.error("Error saving application settings:", error);
      toast.error("Failed to save application settings");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const hasRequirements = settings.require_discord || settings.require_phone || settings.require_social_account;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.5px]">Application Requirements</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure what information creators must provide when applying to this boost.
        </p>
      </div>

      {/* Info Box */}
      {!hasRequirements && (
        <div className="flex items-center gap-2 p-3 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/50">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
            No additional requirements configured. Creators only need to answer application questions (if any) to apply.
          </p>
        </div>
      )}

      {/* Requirements Card */}
      <div className="rounded-lg border border-border/50 dark:border-white/[0.06] overflow-hidden">
        <div className="px-4 py-3 bg-muted/20 border-b border-border/50 dark:border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium tracking-[-0.3px]">Required Information</p>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose what creators must provide to apply
          </p>
        </div>

        <div className="divide-y divide-border/50 dark:divide-white/[0.06]">
          {/* Discord */}
          <div
            onClick={() => updateSettings({ require_discord: !settings.require_discord })}
            className="flex items-center gap-3 cursor-pointer p-4 hover:bg-muted/30 transition-colors"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              settings.require_discord ? "border-primary bg-primary" : "border-muted-foreground/30"
            }`}>
              {settings.require_discord && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <img src={discordIcon} alt="Discord" className="w-5 h-5" />
            <div className="flex-1">
              <p className="text-sm font-medium font-inter tracking-[-0.5px]">Discord Account</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Require applicants to have Discord connected to their profile
              </p>
            </div>
          </div>

          {/* Phone */}
          <div
            onClick={() => updateSettings({ require_phone: !settings.require_phone })}
            className="flex items-center gap-3 cursor-pointer p-4 hover:bg-muted/30 transition-colors"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              settings.require_phone ? "border-primary bg-primary" : "border-muted-foreground/30"
            }`}>
              {settings.require_phone && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <Phone className="w-5 h-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium font-inter tracking-[-0.5px]">Phone Number</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Require applicants to have a phone number on their profile
              </p>
            </div>
          </div>

          {/* Social Accounts */}
          <div
            onClick={() => updateSettings({ require_social_account: !settings.require_social_account })}
            className="flex items-center gap-3 cursor-pointer p-4 hover:bg-muted/30 transition-colors"
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              settings.require_social_account ? "border-primary bg-primary" : "border-muted-foreground/30"
            }`}>
              {settings.require_social_account && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <div className="flex -space-x-1">
              <img src={tiktokLogo} alt="" className="w-4 h-4" />
              <img src={instagramLogo} alt="" className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium font-inter tracking-[-0.5px]">Social Media Account</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                Require at least one connected social account
              </p>
            </div>
          </div>

          {/* Platform selection when social is required */}
          {settings.require_social_account && (
            <div className="px-4 py-3 bg-muted/20">
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mb-2">
                Accepted platforms:
              </p>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map(platform => {
                  const isSelected = settings.social_platforms?.includes(platform.id as 'tiktok' | 'instagram' | 'youtube');
                  return (
                    <Badge
                      key={platform.id}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer gap-1.5 ${isSelected ? "" : "opacity-60"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlatform(platform.id as 'tiktok' | 'instagram' | 'youtube');
                      }}
                    >
                      <img src={platform.icon} alt="" className="w-3 h-3" />
                      {platform.label}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 bg-muted/20 border-t border-border/50 dark:border-white/[0.06] flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {hasRequirements
              ? `${[
                  settings.require_discord && "Discord",
                  settings.require_phone && "Phone",
                  settings.require_social_account && "Social"
                ].filter(Boolean).join(", ")} required`
              : "No requirements set"}
          </p>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="font-inter tracking-[-0.5px]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="p-4 bg-muted/30 dark:bg-muted/20 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
          <strong className="font-medium text-foreground">How it works:</strong>{" "}
          When a creator applies, they'll be prompted to add the required information if not already on their profile.
          This helps ensure you can communicate with accepted creators through your preferred channels.
        </p>
      </div>
    </div>
  );
}
