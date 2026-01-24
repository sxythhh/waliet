import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Globe, ArrowRight } from "lucide-react";

interface BrandDetailsStepProps {
  brandName: string;
  brandDescription: string | null;
  brandWebsite: string | null;
  onUpdate: (data: { description: string; website: string }) => Promise<void>;
  onNext: () => void;
  onSkip: () => void;
}

export function BrandDetailsStep({
  brandName,
  brandDescription,
  brandWebsite,
  onUpdate,
  onNext,
  onSkip,
}: BrandDetailsStepProps) {
  const [description, setDescription] = useState(brandDescription || "");
  const [website, setWebsite] = useState(brandWebsite || "");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    setSaving(true);
    try {
      await onUpdate({ description, website });
      onNext();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Tell us about {brandName}</h2>
        <p className="text-muted-foreground">
          Help creators understand your brand better
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="description">Brand Description</Label>
          <Textarea
            id="description"
            placeholder="Tell creators what your brand is about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            This will be visible on your brand profile
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="website"
              placeholder="https://yourbrand.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="pl-10"
            />
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
