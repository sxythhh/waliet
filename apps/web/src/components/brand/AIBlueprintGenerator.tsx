import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Globe, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface BlueprintGeneratedFields {
  title?: string;
  content?: string;
  brand_voice?: string;
  hooks?: string[];
  talking_points?: string[];
  dos_and_donts?: {
    dos: string[];
    donts: string[];
  };
  call_to_action?: string;
  platforms?: string[];
}

interface AIBlueprintGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (fields: BlueprintGeneratedFields) => void;
  brandId: string;
}

export function AIBlueprintGenerator({
  open,
  onOpenChange,
  onGenerated,
  brandId,
}: AIBlueprintGeneratorProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!websiteUrl.trim()) {
      setError("Please enter a website URL");
      return;
    }

    // Basic URL validation
    let url = websiteUrl.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setError(null);
    setGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-blueprint-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            websiteUrl: url,
            brandId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate blueprint");
      }

      const generatedFields = await response.json();

      toast.success("Blueprint generated successfully!");
      onGenerated(generatedFields);
      onOpenChange(false);
      setWebsiteUrl("");
    } catch (err: any) {
      console.error("Error generating blueprint:", err);
      setError(err.message || "Failed to generate blueprint. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-inter tracking-[-0.5px]">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Blueprint with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
            Enter your brand's website URL and we'll analyze it to generate content guidelines, brand voice, hooks, and more.
          </p>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl" className="font-inter tracking-[-0.5px]">
              Website URL
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="websiteUrl"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  setError(null);
                }}
                placeholder="example.com"
                className="pl-9 font-inter"
                disabled={generating}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-1 font-inter tracking-[-0.3px]">
                <AlertCircle className="h-3.5 w-3.5" />
                {error}
              </p>
            )}
          </div>

          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">
              What we'll generate:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 font-inter tracking-[-0.3px]">
              <li className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-primary" />
                Brand voice and tone
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-primary" />
                Content hooks and talking points
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-primary" />
                Do's and don'ts for creators
              </li>
              <li className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3 text-primary" />
                Recommended platforms
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={generating}
            className="font-inter tracking-[-0.5px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || !websiteUrl.trim()}
            className="gap-2 font-inter tracking-[-0.5px]"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
