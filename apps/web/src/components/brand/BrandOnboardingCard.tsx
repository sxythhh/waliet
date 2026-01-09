import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, ExternalLink, CheckCircle2 } from "lucide-react";

interface BrandOnboardingCardProps {
  brandId: string;
  brandSlug: string;
  onComplete?: () => void;
}

export function BrandOnboardingCard({ brandId, brandSlug, onComplete }: BrandOnboardingCardProps) {
  const [loading, setLoading] = useState(false);

  const handleStartOnboarding = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-brand-onboarding-link', {
        body: {
          brand_id: brandId,
          return_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=account&onboarding=complete`,
          refresh_url: `${window.location.origin}/dashboard?workspace=${brandSlug}&tab=account&onboarding=refresh`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        toast.success('Onboarding opened in a new tab');
      }
    } catch (error) {
      console.error('Error getting onboarding link:', error);
      toast.error('Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-yellow-500/5 border-yellow-500/20">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              Complete Wallet Verification
            </h3>
            <p className="text-neutral-400 text-sm mb-4">
              To enable withdrawals and full wallet functionality, you need to complete identity 
              verification. This ensures compliance and protects your funds.
            </p>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleStartOnboarding}
                disabled={loading}
                className="bg-yellow-500 hover:bg-yellow-600 text-black"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {loading ? 'Loading...' : 'Complete Verification'}
              </Button>
              <div className="flex items-center gap-2 text-neutral-500 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Takes about 5 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
