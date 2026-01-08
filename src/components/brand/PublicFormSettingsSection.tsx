import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, Copy, Check, Phone, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import discordIcon from "@/assets/discord-icon.png";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import { PublicFormSettings, parsePublicFormSettings, DEFAULT_PUBLIC_FORM_SETTINGS } from "@/types/publicFormSettings";

interface PublicFormSettingsSectionProps {
  enabled: boolean;
  settings: PublicFormSettings;
  onEnabledChange: (enabled: boolean) => void;
  onSettingsChange: (settings: PublicFormSettings) => void;
  boostSlug: string | null;
}

const labelStyle = { fontFamily: 'Inter', letterSpacing: '-0.5px' } as const;
const inputStyle = { fontFamily: 'Inter', letterSpacing: '-0.5px' } as const;

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', icon: tiktokLogo },
  { id: 'instagram', label: 'Instagram', icon: instagramLogo },
  { id: 'youtube', label: 'YouTube', icon: youtubeLogo },
] as const;

export function PublicFormSettingsSection({
  enabled,
  settings,
  onEnabledChange,
  onSettingsChange,
  boostSlug,
}: PublicFormSettingsSectionProps) {
  const [copied, setCopied] = useState(false);
  const formSettings = parsePublicFormSettings(settings);

  const publicFormUrl = boostSlug
    ? `${window.location.origin}/apply/${boostSlug}`
    : null;

  const handleCopyUrl = () => {
    if (publicFormUrl) {
      navigator.clipboard.writeText(publicFormUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateSettings = (updates: Partial<PublicFormSettings>) => {
    onSettingsChange({ ...formSettings, ...updates });
  };

  const togglePlatform = (platform: 'tiktok' | 'instagram' | 'youtube') => {
    const currentPlatforms = formSettings.social_platforms || [];
    const newPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter(p => p !== platform)
      : [...currentPlatforms, platform];
    updateSettings({ social_platforms: newPlatforms });
  };

  return (
    <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border/50">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium" style={labelStyle}>Public Application Form</p>
            <p className="text-xs text-muted-foreground" style={labelStyle}>
              Share a link for anyone to apply
            </p>
          </div>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onEnabledChange}
        />
      </div>

      {enabled && (
        <>
          {/* Public URL */}
          {publicFormUrl && (
            <div className="space-y-2">
              <Label style={labelStyle} className="text-xs text-muted-foreground">
                Application Link
              </Label>
              <div className="flex gap-2">
                <Input
                  value={publicFormUrl}
                  readOnly
                  className="border-0 bg-muted/50 h-10 text-sm"
                  style={inputStyle}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 bg-muted/50 hover:bg-muted"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 px-3 bg-muted/50 hover:bg-muted"
                  onClick={() => window.open(publicFormUrl, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Requirements Section */}
          <div className="space-y-3 pt-2">
            <Label style={labelStyle} className="text-xs text-muted-foreground">
              Required Fields
            </Label>
            <p className="text-xs text-muted-foreground" style={labelStyle}>
              Email is always required. Choose additional requirements:
            </p>

            {/* Discord */}
            <div
              onClick={() => updateSettings({ require_discord: !formSettings.require_discord })}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                formSettings.require_discord ? "border-primary bg-primary" : "border-muted-foreground/30"
              }`}>
                {formSettings.require_discord && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <img src={discordIcon} alt="Discord" className="w-5 h-5" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={labelStyle}>Discord Username</p>
                <p className="text-xs text-muted-foreground" style={labelStyle}>
                  Require applicants to provide their Discord
                </p>
              </div>
            </div>

            {/* Phone */}
            <div
              onClick={() => updateSettings({ require_phone: !formSettings.require_phone })}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                formSettings.require_phone ? "border-primary bg-primary" : "border-muted-foreground/30"
              }`}>
                {formSettings.require_phone && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <Phone className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={labelStyle}>Phone Number</p>
                <p className="text-xs text-muted-foreground" style={labelStyle}>
                  Require applicants to provide a phone number
                </p>
              </div>
            </div>

            {/* Social Accounts */}
            <div
              onClick={() => updateSettings({ require_social_account: !formSettings.require_social_account })}
              className="flex items-center gap-3 cursor-pointer p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors"
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                formSettings.require_social_account ? "border-primary bg-primary" : "border-muted-foreground/30"
              }`}>
                {formSettings.require_social_account && <Check className="w-3 h-3 text-primary-foreground" />}
              </div>
              <div className="flex -space-x-1">
                <img src={tiktokLogo} alt="" className="w-4 h-4" />
                <img src={instagramLogo} alt="" className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={labelStyle}>Social Media Account</p>
                <p className="text-xs text-muted-foreground" style={labelStyle}>
                  Require at least one social media username
                </p>
              </div>
            </div>

            {/* Platform selection when social is required */}
            {formSettings.require_social_account && (
              <div className="pl-8 space-y-2">
                <p className="text-xs text-muted-foreground" style={labelStyle}>
                  Which platforms to accept:
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map(platform => {
                    const isSelected = formSettings.social_platforms?.includes(platform.id as 'tiktok' | 'instagram' | 'youtube');
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

          {/* Custom Intro Text */}
          <div className="space-y-2 pt-2">
            <Label style={labelStyle} className="text-xs text-muted-foreground">
              Intro Text (Optional)
            </Label>
            <Textarea
              value={formSettings.custom_intro_text || ""}
              onChange={(e) => updateSettings({ custom_intro_text: e.target.value })}
              placeholder="Add a brief intro that appears at the top of the form..."
              className="border-0 bg-muted/50 min-h-[60px] resize-none text-sm"
              style={inputStyle}
            />
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <Label style={labelStyle} className="text-xs text-muted-foreground">
              Success Message (Optional)
            </Label>
            <Textarea
              value={formSettings.success_message || ""}
              onChange={(e) => updateSettings({ success_message: e.target.value })}
              placeholder="Thank you for applying! We'll review your application soon..."
              className="border-0 bg-muted/50 min-h-[60px] resize-none text-sm"
              style={inputStyle}
            />
          </div>
        </>
      )}
    </div>
  );
}
