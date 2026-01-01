import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Palette, Upload, ArrowRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface BrandingStepProps {
  brandId: string;
  brandSlug: string;
  currentLogo: string | null;
  currentColor: string | null;
  onUpdate: (data: { logo_url?: string; brand_color?: string }) => Promise<void>;
  onNext: () => void;
  onSkip: () => void;
}

const PRESET_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
  "#BB8FCE", "#85C1E9", "#F8B500", "#00CED1",
];

export function BrandingStep({
  brandId,
  brandSlug,
  currentLogo,
  currentColor,
  onUpdate,
  onNext,
  onSkip,
}: BrandingStepProps) {
  const [logo, setLogo] = useState<string | null>(currentLogo);
  const [color, setColor] = useState(currentColor || "#4ECDC4");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${brandId}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(fileName);

      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setLogo(urlWithTimestamp);
      toast.success("Logo uploaded");
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogo(null);
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await onUpdate({ logo_url: logo || undefined, brand_color: color });
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Palette className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Brand Identity</h2>
        <p className="text-muted-foreground">
          Upload your logo and choose your brand color
        </p>
      </div>

      <div className="space-y-6 max-w-md mx-auto">
        <div className="space-y-3">
          <Label>Brand Logo</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          {logo ? (
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={logo}
                alt="Brand logo"
                className="w-full h-full object-contain rounded-lg border bg-white"
              />
              <button
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-32 border-dashed"
            >
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6" />
                  <span>Upload Logo</span>
                  <span className="text-xs text-muted-foreground">PNG, JPG up to 2MB</span>
                </div>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <Label>Brand Color</Label>
          <div className="grid grid-cols-6 gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => setColor(presetColor)}
                className={`w-10 h-10 rounded-lg transition-all ${
                  color === presetColor ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                }`}
                style={{ backgroundColor: presetColor }}
              />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">
              Or pick a custom color
            </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 max-w-md mx-auto">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={handleContinue} disabled={saving}>
          {saving ? "Saving..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
