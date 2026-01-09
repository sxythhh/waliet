import { Button } from "@/components/ui/button";
import { Rocket, ArrowRight, Sparkles, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FirstCampaignStepProps {
  brandSlug: string;
  onComplete: () => Promise<void>;
}

export function FirstCampaignStep({ brandSlug, onComplete }: FirstCampaignStepProps) {
  const navigate = useNavigate();

  const handleCreateCampaign = async () => {
    await onComplete();
    navigate(`/dashboard?workspace=${brandSlug}&createCampaign=true`);
  };

  const handleGoToDashboard = async () => {
    await onComplete();
    navigate(`/dashboard?workspace=${brandSlug}`);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">You're All Set!</h2>
        <p className="text-muted-foreground">
          Your brand is ready. What would you like to do next?
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-3">
        <button
          onClick={handleCreateCampaign}
          className="w-full p-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary-foreground/20 rounded-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Create Your First Campaign</p>
              <p className="text-sm text-primary-foreground/80">
                Launch a campaign and start working with creators
              </p>
            </div>
            <ArrowRight className="h-5 w-5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>

        <button
          onClick={handleGoToDashboard}
          className="w-full p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors text-left group"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 bg-background rounded-lg">
              <CheckCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Go to Dashboard</p>
              <p className="text-sm text-muted-foreground">
                Explore your brand dashboard first
              </p>
            </div>
            <ArrowRight className="h-5 w-5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
          </div>
        </button>
      </div>

      <div className="text-center pt-4">
        <p className="text-xs text-muted-foreground">
          You can always create campaigns from your dashboard
        </p>
      </div>
    </div>
  );
}
