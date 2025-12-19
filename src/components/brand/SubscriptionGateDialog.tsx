import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Check, Zap, Rocket, ArrowLeft, Loader2 } from "lucide-react";
import { WhopCheckoutEmbed, useCheckoutEmbedControls } from "@whop/checkout/react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkoutRef = useCheckoutEmbedControls();

  const returnUrl = `${window.location.origin}${window.location.pathname}?subscription=success`;

  // Fetch user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        
        // Fetch profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserName(profile.full_name || profile.username || null);
        }
      }
    };
    
    if (open) {
      fetchUserData();
    }
  }, [open]);

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

  const handleCustomSubmit = async () => {
    if (!checkoutRef.current) return;
    
    setIsSubmitting(true);
    try {
      await checkoutRef.current.submit();
    } catch (error) {
      console.error("Submit error:", error);
      setIsSubmitting(false);
    }
  };

  // Show embedded checkout if a plan is selected
  if (selectedPlan) {
    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSelectedPlan(null);
          setIsSubmitting(false);
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
          
          <div className="px-6 pb-6 pt-0 min-h-[400px] overflow-y-auto">
            <WhopCheckoutEmbed
              ref={checkoutRef}
              planId={selectedPlan.whopPlanId}
              returnUrl={returnUrl}
              theme="system"
              onComplete={handleComplete}
              hideAddressForm
              prefill={{
                email: userEmail || undefined,
                address: userName ? { name: userName } : undefined,
              }}
              fallback={
                <div className="space-y-4 pt-6">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              }
            />
            
            {/* Custom Submit Button */}
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                onClick={handleCustomSubmit}
                disabled={isSubmitting}
                className="w-full h-11"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Subscribe for $${selectedPlan.price}/month`
                )}
              </Button>
            </div>
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
