"use client";

import { X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { DepositFlowState, PaymentMethod } from "./types";

// Step metadata for headers
const stepMeta: Record<string, { title: string; description: string }> = {
  network: {
    title: "Select Network",
    description: "Choose which blockchain to receive USDC on",
  },
  amount: {
    title: "Enter Amount",
    description: "How much would you like to deposit?",
  },
  confirm: {
    title: "Review Deposit",
    description: "Confirm your deposit details",
  },
  address: {
    title: "Deposit Address",
    description: "Send funds to this address",
  },
  processing: {
    title: "Processing",
    description: "Your deposit is being processed",
  },
  success: {
    title: "Deposit Complete",
    description: "Your funds have been added",
  },
};

// Method-specific titles for the address step
const addressStepTitles: Record<PaymentMethod, { title: string; description: string }> = {
  crypto: {
    title: "Deposit Address",
    description: "Send USDC to this address",
  },
  wire: {
    title: "Wire Details",
    description: "Send funds to this bank account",
  },
  card: {
    title: "Card Payment",
    description: "Complete your payment",
  },
  personal: {
    title: "Transfer",
    description: "Confirm your transfer",
  },
};

interface DepositDrawerProps {
  state: DepositFlowState;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

export function DepositDrawer({
  state,
  isOpen,
  onClose,
  children,
  actionLabel,
  onAction,
  actionDisabled,
}: DepositDrawerProps) {
  const { step, method } = state;

  // Get appropriate meta for current step
  const getMeta = () => {
    if (step === "address" && method) {
      return addressStepTitles[method];
    }
    return stepMeta[step] || { title: "Deposit", description: "" };
  };

  const meta = getMeta();

  // Handle drawer open change
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        {/* Header */}
        <DrawerHeader className="relative border-b border-border/50 pb-4">
          {/* Title & Description */}
          <div className="pr-24">
            <DrawerTitle className="text-lg font-semibold tracking-[-0.5px]">
              {meta.title}
            </DrawerTitle>
            {meta.description && (
              <DrawerDescription className="text-sm text-muted-foreground tracking-[-0.3px] mt-1">
                {meta.description}
              </DrawerDescription>
            )}
          </div>

          {/* Action buttons */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {actionLabel && onAction && (
              <Button
                size="sm"
                className="h-8 px-4 tracking-[-0.3px]"
                disabled={actionDisabled}
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
