import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Check, Zap, Rocket, ArrowLeft } from "lucide-react";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface SubscriptionGateDialogProps {
  brandId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLANS = [
  {
    key: 'starter',
    whopPlanId: 'plan_DU4ba3ik2UHVZ',
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
    whopPlanId: 'plan_JSWLvDSLsSde4',
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
  const [selectedPlan, setSelectedPlan] = useState<typeof PLANS[0] | null>(null);

  const returnUrl = `${window.location.origin}${window.location.pathname}?subscription=success`;

  const handleComplete = (planId: string, receiptId: string) => {
    console.log("Checkout complete:", { planId, receiptId });
    toast.success("Subscription activated!");
    onOpenChange(false);
    // Reload to refresh subscription status
    window.location.reload();
  };

  const handleBack = () => {
    setSelectedPlan(null);
  };

  // Show embedded checkout if a plan is selected
  if (selectedPlan) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedPlan(null);
        }
        onOpenChange(isOpen);
      }}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-xl font-semibold tracking-tight">
                Subscribe to {selectedPlan.name}
              </DialogTitle>
            </div>
            <p className="text-muted-foreground text-sm mt-1 ml-11">
              ${selectedPlan.price}/month
            </p>
          </DialogHeader>
          
          <div className="p-6 min-h-[400px] overflow-y-auto">
            <WhopCheckoutEmbed
              planId={selectedPlan.whopPlanId}
              returnUrl={returnUrl}
              theme="system"
              onComplete={handleComplete}
              fallback={
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              }
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show plan selection
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
                    onClick={() => setSelectedPlan(plan)}
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    Get {plan.name}
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
