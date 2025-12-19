import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SubscriptionGateDialogProps {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Feature {
  text: string;
  tooltip?: string;
}

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    price: 99,
    description: 'For teams just getting started',
    features: [
      { text: 'Up to 3 active campaigns', tooltip: 'Run up to 3 creator campaigns simultaneously' },
      { text: 'Basic analytics', tooltip: 'View essential metrics like views, engagement, and earnings' },
      { text: 'Email support', tooltip: 'Get help via email within 24 hours' },
      { text: 'Creator discovery', tooltip: 'Browse and recruit creators from our network' },
    ] as Feature[],
  },
  {
    key: 'growth',
    name: 'Growth',
    price: 249,
    description: 'For scaling creator programs',
    features: [
      { text: 'Unlimited campaigns' },
      { text: 'Advanced analytics', tooltip: 'Deep insights with custom reports, cohort analysis, and ROI tracking' },
      { text: 'Priority support', tooltip: 'Get responses within 4 hours with dedicated support' },
      { text: 'Creator recruitment', tooltip: 'AI-powered creator matching and outreach tools' },
      { text: 'Custom blueprints', tooltip: 'Create branded content guidelines and templates' },
      { text: 'Team collaboration', tooltip: 'Invite unlimited team members with role-based permissions' },
    ] as Feature[],
    popular: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: null,
    description: 'For large-scale operations',
    features: [
      { text: 'Everything in Growth' },
      { text: 'Dedicated account manager', tooltip: 'Your personal point of contact for strategy and support' },
      { text: 'Custom integrations', tooltip: 'Connect with your existing tools and workflows via API' },
      { text: 'SLA guarantees', tooltip: '99.9% uptime with contractual service level agreements' },
      { text: 'White-label options', tooltip: 'Remove Virality branding for a seamless experience' },
      { text: 'Volume discounts', tooltip: 'Special pricing based on your campaign volume' },
    ] as Feature[],
  },
];

function FeatureItem({ feature }: { feature: Feature }) {
  if (feature.tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <li className="flex items-center gap-2 text-sm tracking-[-0.5px] cursor-help">
            <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="border-b border-dotted border-muted-foreground/40">
              {feature.text}
            </span>
          </li>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          {feature.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <li className="flex items-center gap-2 text-sm tracking-[-0.5px]">
      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
      <span>{feature.text}</span>
    </li>
  );
}

export function SubscriptionGateDialog({ 
  brandId, 
  open,
  onOpenChange
}: SubscriptionGateDialogProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: string) => {
    if (planKey === 'enterprise') {
      window.location.href = 'mailto:sales@virality.gg?subject=Enterprise Plan Inquiry';
      return;
    }

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
        window.location.href = data.checkout_url;
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
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-8 pb-2">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.5px]">
              Choose your plan
            </DialogTitle>
            <p className="text-muted-foreground text-sm tracking-[-0.5px] mt-1">
              Start growing your creator program today
            </p>
          </DialogHeader>
          
          <div className="p-[5px]">
            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan) => {
                const isLoading = loading === plan.key;
                const isEnterprise = plan.key === 'enterprise';
                
                return (
                  <div
                    key={plan.key}
                    className={`relative rounded-2xl p-6 transition-all ${
                      plan.popular 
                        ? 'bg-primary/[0.03] ring-1 ring-primary/20' 
                        : 'bg-muted/30'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground text-xs font-medium tracking-[-0.5px] px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <h3 className="font-semibold text-lg tracking-[-0.5px]">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm tracking-[-0.5px] mt-0.5">
                        {plan.description}
                      </p>
                    </div>
                    
                    <div className="mb-5">
                      {plan.price !== null ? (
                        <>
                          <span className="text-3xl font-semibold tracking-[-0.5px]">${plan.price}</span>
                          <span className="text-muted-foreground text-sm tracking-[-0.5px]">/month</span>
                        </>
                      ) : (
                        <span className="text-3xl font-semibold tracking-[-0.5px]">Custom</span>
                      )}
                    </div>
                    
                    <ul className="space-y-2.5 mb-6">
                      {plan.features.map((feature, i) => (
                        <FeatureItem key={i} feature={feature} />
                      ))}
                    </ul>
                    
                    <button
                      onClick={() => handleSelectPlan(plan.key)}
                      disabled={!!loading}
                      className={`w-full py-2.5 px-4 rounded-lg font-['Inter'] text-sm font-medium tracking-[-0.5px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none ${
                        plan.popular 
                          ? 'bg-[#1f60dd] border-t border-[#4b85f7] text-white hover:bg-[#1a50c8]' 
                          : 'bg-muted/50 text-foreground hover:bg-muted'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : isEnterprise ? (
                        'Contact Sales'
                      ) : (
                        `Get ${plan.name}`
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
