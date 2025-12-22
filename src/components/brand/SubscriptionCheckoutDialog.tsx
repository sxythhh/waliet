import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: string;
  planName: string;
  brandId: string;
  isAnnual?: boolean;
  onComplete?: () => void;
}

// Initialize Stripe with dark mode appearance
const stripePromise = loadStripe("pk_live_51ShzH6DfOdvNUmh7CMsPGMZMGphWS5yTkqMc2PpmfAY63Y6f9CXKzJFAh0JZ3gMopuYWZOaBR0aE4VkAJFNHMqZd00I7C66Fvz");

export function SubscriptionCheckoutDialog({
  open,
  onOpenChange,
  planId,
  planName,
  brandId,
  isAnnual = false,
  onComplete,
}: SubscriptionCheckoutDialogProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-subscription-checkout",
        {
          body: {
            plan_key: planId,
            is_annual: isAnnual,
            brand_id: brandId,
          },
        }
      );

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.clientSecret) throw new Error("No client secret returned");

      setClientSecret(data.clientSecret);
    } catch (err) {
      console.error("Error creating checkout session:", err);
      setError(err instanceof Error ? err.message : "Failed to create checkout");
    } finally {
      setLoading(false);
    }
  }, [planId, isAnnual, brandId]);

  useEffect(() => {
    if (open && !clientSecret) {
      fetchClientSecret();
    }
  }, [open, clientSecret, fetchClientSecret]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      const timer = setTimeout(() => {
        setClientSecret(null);
        setError(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleComplete = useCallback(() => {
    onComplete?.();
    onOpenChange(false);
  }, [onComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#0a0a0a] border-white/10">
        <DialogHeader>
          <DialogTitle className="tracking-[-0.5px] text-white">
            Subscribe to {planName} {isAnnual ? "(Annual)" : "(Monthly)"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="min-h-[400px]">
          {loading && (
            <div className="space-y-4 p-4">
              <Skeleton className="h-12 w-full bg-white/10" />
              <Skeleton className="h-12 w-full bg-white/10" />
              <Skeleton className="h-12 w-full bg-white/10" />
              <Skeleton className="h-10 w-full bg-white/10" />
            </div>
          )}
          
          {error && (
            <div className="p-4 text-red-400 text-center">
              <p>{error}</p>
              <button 
                onClick={fetchClientSecret}
                className="mt-2 text-sm underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}
          
          {clientSecret && (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                clientSecret,
                onComplete: handleComplete,
              }}
            >
              <EmbeddedCheckout className="stripe-dark-checkout" />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
