"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MdRemove, MdAdd, MdShoppingCart } from "react-icons/md";
import { useIframeSdk } from "@whop/react/iframe";

interface InAppBuyHoursModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seller: {
    id: string;
    name: string | null;
    avatar: string | null;
    hourlyRate: number;
  };
  experienceId: string;
  companyId?: string;
}

const PLATFORM_FEE_BPS = 800; // 8%
const COMMUNITY_FEE_BPS = 500; // 5% (default)

export function InAppBuyHoursModal({
  open,
  onOpenChange,
  seller,
  experienceId,
  companyId,
}: InAppBuyHoursModalProps) {
  const [units, setUnits] = useState(2); // Default to 1 hour (2 x 30-min units)
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const iframeSdk = useIframeSdk();

  const pricePerUnit = Math.round(seller.hourlyRate / 2);
  const subtotal = pricePerUnit * units;
  const platformFee = Math.round((subtotal * PLATFORM_FEE_BPS) / 10000);
  const communityFee = Math.round((subtotal * COMMUNITY_FEE_BPS) / 10000);
  const total = subtotal + platformFee + communityFee;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  const formatTime = (unitCount: number) => {
    const hours = unitCount / 2;
    if (hours < 1) return `${unitCount * 30} minutes`;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  };

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Create the checkout config and plan on our backend
      const response = await fetch("/api/purchases/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: seller.id,
          units,
          experienceId,
          companyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      if (!data.planId) {
        throw new Error("No plan ID returned");
      }

      // Step 2: Trigger Whop's native in-app purchase flow (no redirect)
      const purchaseResult = await iframeSdk.inAppPurchase({
        planId: data.planId,
        id: data.purchaseId, // Use our purchase ID for tracking
      });

      if (purchaseResult.status === "error") {
        throw new Error(purchaseResult.error || "Payment failed");
      }

      // Payment successful!
      // The webhook will handle updating the purchase status
      onOpenChange(false);

      // Optional: Show success message or refresh data
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  const decrementUnits = () => {
    if (units > 1) setUnits(units - 1);
  };

  const incrementUnits = () => {
    if (units < 20) setUnits(units + 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Buy Hours</DialogTitle>
          <DialogDescription>
            Purchase time with {seller.name || "this seller"}
          </DialogDescription>
        </DialogHeader>

        {/* Seller Info */}
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
          <Avatar className="h-12 w-12">
            <AvatarImage src={seller.avatar || undefined} />
            <AvatarFallback>
              {seller.name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{seller.name || "Seller"}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(seller.hourlyRate)}/hour
            </p>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="py-4">
          <label className="text-sm font-medium text-muted-foreground mb-3 block">
            How much time do you want to buy?
          </label>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={decrementUnits}
              disabled={units <= 1}
            >
              <MdRemove className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[120px]">
              <p className="text-3xl font-bold">{formatTime(units)}</p>
              <p className="text-sm text-muted-foreground">
                {units} x 30-min units
              </p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={incrementUnits}
              disabled={units >= 20}
            >
              <MdAdd className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 p-4 bg-muted/30 rounded-xl text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform fee (8%)</span>
            <span>{formatCurrency(platformFee)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Community fee (5%)</span>
            <span>{formatCurrency(communityFee)}</span>
          </div>
          <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-base">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePurchase} disabled={isLoading} className="gap-2">
            {isLoading ? (
              "Processing..."
            ) : (
              <>
                <MdShoppingCart className="h-4 w-4" />
                Pay {formatCurrency(total)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
