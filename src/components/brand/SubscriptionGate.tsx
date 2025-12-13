import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubscriptionGateProps {
  brandId: string;
  subscriptionStatus?: string | null;
  children: React.ReactNode;
  onSubscriptionRequired?: () => void;
}

const PLAN_PRICE = 99;

export function SubscriptionGate({ 
  brandId, 
  subscriptionStatus, 
  children,
  onSubscriptionRequired 
}: SubscriptionGateProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSubscribed = subscriptionStatus === "active";

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to subscribe");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-whop-checkout", {
        body: { brandId },
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, "_blank");
        setOpen(false);
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast.error("Failed to create checkout session");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterprise = () => {
    window.open("https://app.iclosed.io/e/Virality/discovery", "_blank");
  };

  // If subscribed, render children directly
  if (isSubscribed) {
    return <>{children}</>;
  }

  // If not subscribed, wrap in dialog trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => {
        e.preventDefault();
        setOpen(true);
        onSubscriptionRequired?.();
      }}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-[#f5f5f5] dark:bg-[#050505] border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Upgrade to Launch Campaigns
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Subscribe to start creating and managing campaigns on Virality.
          </p>

          {/* Plan Card */}
          <div className="rounded-xl bg-muted dark:bg-[#141414] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg tracking-[-0.5px]">Growth Plan</h3>
                <p className="text-sm text-muted-foreground">Everything you need to scale</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">${PLAN_PRICE}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
            </div>

            <div className="space-y-2">
              {[
                "Unlimited campaigns",
                "Creator analytics & insights",
                "Automated payouts",
                "Priority support",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSubscribe} 
              disabled={loading}
              className="w-full gap-2 font-geist tracking-[-0.5px] transition-shadow duration-300 ease-in-out hover:shadow-[0_0_0_3px_rgba(0,85,255,0.55)] border-t border-[#d0d0d0] dark:border-[#4b85f7]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating checkout...
                </>
              ) : (
                <>
                  Subscribe Now
                  <ExternalLink className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {/* Enterprise Option */}
          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground mb-2">
              Need custom solutions or higher volume?
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleEnterprise}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              Talk to Sales
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
