import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface SubscriptionCheckoutProps {
  planId: string;
  planName: string;
  brandId: string;
  isAnnual?: boolean;
  onComplete?: () => void;
  children: React.ReactNode;
}

export function SubscriptionCheckoutButton({
  planId,
  planName,
  brandId,
  isAnnual = false,
  onComplete,
  children,
}: SubscriptionCheckoutProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-subscription-checkout",
        {
          body: {
            plan_key: planId,
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
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <button disabled className="w-full py-2.5 px-4 rounded-lg font-['Inter'] text-sm font-medium tracking-[-0.5px] bg-muted/50 text-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </button>
    );
  }

  return (
    <div onClick={handleCheckout} className="cursor-pointer">
      {children}
    </div>
  );
}

// Keep the old export for backwards compatibility
export function SubscriptionCheckoutDialog(props: any) {
  return null;
}
