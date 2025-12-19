import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Zap, Rocket, Loader2 } from "lucide-react";

interface SubscriptionGateDialogProps {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 99,
    description: 'Perfect for getting started with creator campaigns',
    features: [
      'Up to 3 active campaigns',
      'Basic analytics dashboard',
      'Email support',
      'Creator discovery',
    ],
    icon: Zap,
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 249,
    description: 'Scale your creator program with advanced features',
    features: [
      'Unlimited campaigns',
      'Advanced analytics & reporting',
      'Priority support',
      'Creator recruitment tools',
      'Custom blueprints',
      'Team collaboration',
    ],
    icon: Rocket,
    popular: true,
  },
];

export function SubscriptionGateDialog({ 
  brandId, 
  open,
  onOpenChange
}: SubscriptionGateDialogProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: string) => {
    if (!brandId) {
      toast.error("Brand ID is required");
      return;
    }

    setLoading(planKey);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to continue");
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-subscription-checkout', {
        body: {
          brand_id: brandId,
          plan_key: planKey,
          return_url: `${window.location.origin}${window.location.pathname}?subscription=success`,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error("Failed to create checkout");
        return;
      }

      if (data?.checkout_url) {
        window.open(data.checkout_url, '_blank');
        onOpenChange(false);
        toast.success("Checkout opened in new tab");
      } else {
        toast.error("No checkout URL returned");
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      toast.error("Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Upgrade Your Plan
          </DialogTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Choose a plan to unlock all features and grow your creator program
          </p>
        </DialogHeader>
        
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const isLoading = loading === plan.key;
              
              return (
                <div
                  key={plan.key}
                  className={`relative rounded-xl border-2 p-5 transition-all ${
                    plan.popular 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${plan.popular ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm">{plan.description}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  
                  <ul className="space-y-2 mb-5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => handleSelectPlan(plan.key)}
                    disabled={!!loading}
                    className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating checkout...
                      </>
                    ) : (
                      `Get ${plan.name}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
          
          <p className="text-center text-xs text-muted-foreground mt-6">
            Need a custom plan? <a href="mailto:support@virality.gg" className="text-primary hover:underline">Contact us</a> for Enterprise pricing.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
