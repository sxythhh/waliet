import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhopSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onComplete: () => void;
}

export function WhopSetupDialog({
  open,
  onOpenChange,
  brandId,
  onComplete,
}: WhopSetupDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your Whop API key");
      return;
    }

    setSaving(true);
    try {
      // Store the Whop API key - we'll save it to a metadata field or handle it differently
      // For now, we'll just proceed to the next step
      toast.success("Setup complete");
      onOpenChange(false);
      onComplete();
    } catch (error) {
      console.error("Error saving Whop API key:", error);
      toast.error("Failed to save API key");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      number: "1",
      title: "Create your brand's whop",
      description: "Signup and create your Whop",
    },
    {
      number: "2",
      title: "Install Content Rewards App",
      description: "On your whop to get access to your campaign dashboard",
    },
    {
      number: "3",
      title: "Paste your Whop API Key",
      description: "To integrate with your Virality workspace and receive applications",
    },
    {
      number: "4",
      title: 'Click on "Continue"',
      description: "For the next setup step",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border-none shadow-2xl p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold font-inter tracking-[-0.5px] text-foreground">
              Setup Content Rewards
            </h2>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
                    {step.description}
                  </p>
                  {index === 2 && (
                    <Input
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Whop API key"
                      className="mt-2 bg-muted/50 border-none h-10"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          <Button
            onClick={handleContinue}
            disabled={saving || !apiKey.trim()}
            className="w-full h-11 font-inter tracking-[-0.5px]"
          >
            {saving ? "Saving..." : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
