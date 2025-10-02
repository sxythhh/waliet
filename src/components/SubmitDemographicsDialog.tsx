import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import { z } from "zod";

const demographicsSchema = z.object({
  tier1_percentage: z.number()
    .min(0, "Percentage must be at least 0")
    .max(100, "Percentage cannot exceed 100"),
});

interface SubmitDemographicsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  socialAccountId: string;
  platform: string;
  username: string;
}

export function SubmitDemographicsDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  socialAccountId,
  platform,
  username 
}: SubmitDemographicsDialogProps) {
  const [tier1Percentage, setTier1Percentage] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validation = demographicsSchema.safeParse({
      tier1_percentage: parseFloat(tier1Percentage),
    });

    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: validation.error.errors[0].message,
      });
      return;
    }

    if (!screenshot) {
      toast({
        variant: "destructive",
        title: "Screenshot Required",
        description: "Please upload a screenshot showing your audience demographics",
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to submit demographics",
        });
        return;
      }

      // Check if user can submit (7 days since last submission)
      const { data: lastSubmission } = await supabase
        .from('demographic_submissions')
        .select('submitted_at')
        .eq('social_account_id', socialAccountId)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSubmission) {
        const daysSinceLastSubmission = Math.floor(
          (Date.now() - new Date(lastSubmission.submitted_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastSubmission < 7) {
          toast({
            variant: "destructive",
            title: "Too Soon",
            description: `You can submit again in ${7 - daysSinceLastSubmission} day(s)`,
          });
          setUploading(false);
          return;
        }
      }

      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${session.user.id}/demographics_${socialAccountId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('verification-screenshots')
        .upload(fileName, screenshot);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('verification-screenshots')
        .getPublicUrl(fileName);

      // Insert demographic submission
      const { error: insertError } = await supabase
        .from('demographic_submissions')
        .insert({
          social_account_id: socialAccountId,
          tier1_percentage: validation.data.tier1_percentage,
          screenshot_url: publicUrl,
          status: 'pending',
        });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: "Demographics submitted successfully. Admin will review your submission.",
      });

      // Reset form
      setTier1Percentage("");
      setScreenshot(null);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit demographics",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload an image file",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Image must be less than 10MB",
      });
      return;
    }

    setScreenshot(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card">
        <DialogHeader>
          <DialogTitle>Submit Account Demographics</DialogTitle>
          <DialogDescription>
            Submit demographics data for @{username} ({platform})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tier 1 Percentage */}
          <div className="space-y-2">
            <Label htmlFor="tier1_percentage">
              Tier 1 Audience Percentage (%)
            </Label>
            <Input
              id="tier1_percentage"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g., 75.5"
              value={tier1Percentage}
              onChange={(e) => setTier1Percentage(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter the percentage of your audience from Tier 1 countries (USA, Canada, UK, Australia, etc.)
            </p>
          </div>

          {/* Screenshot Upload */}
          <div className="space-y-2">
            <Label>Analytics Screenshot</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload a screenshot showing your audience demographics from your platform's analytics
            </p>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {screenshot ? (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{screenshot.name}</p>
                  <p className="text-xs text-muted-foreground">Click to change</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Upload Screenshot</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              required
            />
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              📊 You can submit new demographics every 7 days. Your submission will be reviewed by an admin who will assign a score (0-100).
            </p>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? "Submitting..." : "Submit Demographics"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}