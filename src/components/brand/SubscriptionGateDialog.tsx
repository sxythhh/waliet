import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import checkCircleIcon from "@/assets/check-circle-filled.svg";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubscriptionGateDialogProps {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Feature {
  text: string;
  tooltip?: string;
}

export const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 99,
    annualPrice: 82,
    description: 'For teams just getting started',
    limits: { boosts: 1, hires: 10 },
    features: [
      { text: '1 boost (post)', tooltip: 'Create 1 active boost campaign' },
      { text: '1-10 Hires', tooltip: 'Hire up to 10 creators' },
      { text: 'Creator Payments', tooltip: 'Pay creators directly through the platform' },
      { text: 'Creator management tool', tooltip: 'Manage all your creators in one place' },
      { text: 'Performance analytics dashboard', tooltip: 'Track campaign performance and ROI' },
    ] as Feature[],
  },
  {
    key: 'growth',
    name: 'Growth',
    monthlyPrice: 249,
    annualPrice: 207,
    description: 'For scaling creator programs',
    limits: { boosts: 3, hires: 30 },
    features: [
      { text: '3 boosts', tooltip: 'Create up to 3 active boost campaigns' },
      { text: 'Up to 30 Hires', tooltip: 'Hire up to 30 creators' },
      { text: 'Creator Payments', tooltip: 'Pay creators directly through the platform' },
      { text: 'Creator management tool', tooltip: 'Manage all your creators in one place' },
      { text: 'Performance analytics dashboard', tooltip: 'Track campaign performance and ROI' },
    ] as Feature[],
    popular: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: null,
    annualPrice: null,
    description: 'For large-scale operations',
    limits: { boosts: Infinity, hires: Infinity },
    features: [
      { text: 'Unlimited Boosts', tooltip: 'Create unlimited boost campaigns' },
      { text: 'Unlimited Hires', tooltip: 'Hire unlimited creators' },
      { text: 'Content Campaigns', tooltip: 'Run full-scale content campaigns' },
      { text: 'Creator Payments', tooltip: 'Pay creators directly through the platform' },
      { text: 'Creator management tool', tooltip: 'Manage all your creators in one place' },
      { text: 'Performance analytics dashboard', tooltip: 'Track campaign performance and ROI' },
      { text: 'White-glove campaign execution', tooltip: 'From start to scale with dedicated support' },
    ] as Feature[],
  },
];

function FeatureItem({ feature }: { feature: Feature }) {
  const [open, setOpen] = useState(false);

  if (feature.tooltip) {
    return (
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <li>
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left text-sm tracking-[-0.5px]"
              onPointerDown={(e) => {
                if (e.pointerType === "touch") {
                  e.preventDefault();
                  setOpen((v) => !v);
                }
              }}
              onClick={() => {
                if (window.matchMedia?.("(hover: none)").matches) setOpen((v) => !v);
              }}
            >
              <img src={checkCircleIcon} alt="" className="h-4 w-4 flex-shrink-0" />
              <span className="border-b border-dotted border-muted-foreground/40">
                {feature.text}
              </span>
            </button>
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
      <img src={checkCircleIcon} alt="" className="h-4 w-4 flex-shrink-0" />
      <span>{feature.text}</span>
    </li>
  );
}

export function SubscriptionGateDialog({ 
  brandId, 
  open,
  onOpenChange
}: SubscriptionGateDialogProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: string) => {
    if (planKey === 'enterprise') {
      window.location.href = 'mailto:sales@virality.gg?subject=Enterprise Plan Inquiry';
      return;
    }

    setLoadingPlan(planKey);

    try {
      const { data, error } = await supabase.functions.invoke(
        "create-subscription-checkout",
        {
          body: {
            plan_key: planKey,
            is_annual: isAnnual,
            brand_id: brandId,
          },
        }
      );

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("No checkout URL returned");

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      console.error("Error creating checkout session:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create checkout");
      setLoadingPlan(null);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] p-0 gap-0 max-h-[calc(100vh-2rem)] overflow-y-auto overscroll-contain">
          <DialogHeader className="p-8 pb-2">
            <DialogTitle className="text-2xl font-semibold tracking-[-0.5px]">
              Choose your plan
            </DialogTitle>
            <p className="text-muted-foreground text-sm tracking-[-0.5px] mt-1">
              Start growing your creator program today
            </p>
          </DialogHeader>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 px-8 pb-2">
            <span className={`text-sm font-medium tracking-[-0.5px] transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAnnual ? 'bg-primary' : 'bg-muted'}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAnnual ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
            <span className={`text-sm font-medium tracking-[-0.5px] transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
            </span>
            {isAnnual && (
              <span className="text-xs font-medium tracking-[-0.5px] text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full">
                Save ~17%
              </span>
            )}
          </div>

          <div className="p-[10px]">
            <div className="grid md:grid-cols-3 gap-6">
              {PLANS.map((plan) => {
                const isEnterprise = plan.key === 'enterprise';
                const isLoading = loadingPlan === plan.key;
                
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
                      {plan.monthlyPrice !== null ? (
                        <>
                          <span className="text-3xl font-semibold tracking-[-0.5px]">
                            ${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                          </span>
                          <span className="text-muted-foreground text-sm tracking-[-0.5px]">/month</span>
                          {isAnnual && (
                            <p className="text-xs text-muted-foreground tracking-[-0.5px] mt-1">
                              Billed annually
                            </p>
                          )}
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
                      disabled={!!loadingPlan}
                      className={`w-full py-2.5 px-4 rounded-lg font-['Inter'] text-sm font-medium tracking-[-0.5px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                        plan.popular 
                          ? 'bg-[#1f60dd] border-t border-[#4b85f7] text-white hover:bg-[#1a50c8]' 
                          : 'bg-muted/50 text-foreground hover:bg-muted'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
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
