import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Loader2 } from "lucide-react";

const MINIMUM_TRANSFER = 1;
const TRANSFER_FEE_RATE = 0.03;

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  currentBalance: number;
}

export function TransferDialog({ open, onOpenChange, onSuccess, currentBalance }: TransferDialogProps) {
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"input" | "confirm">("input");

  const parsedAmount = parseFloat(amount) || 0;
  const fee = Math.round(parsedAmount * TRANSFER_FEE_RATE * 100) / 100;
  const netAmount = Math.round((parsedAmount - fee) * 100) / 100;

  const isValidAmount = parsedAmount >= MINIMUM_TRANSFER && parsedAmount <= currentBalance;
  const isValidUsername = username.trim().length > 0;

  const handleContinue = () => {
    if (!isValidAmount) {
      toast.error(`Amount must be at least $${MINIMUM_TRANSFER} and not exceed your balance`);
      return;
    }
    if (!isValidUsername) {
      toast.error("Please enter a username");
      return;
    }
    setStep("confirm");
  };

  const handleTransfer = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("p2p-transfer", {
        body: {
          recipientUsername: username.trim(),
          amount: parsedAmount
        }
      });

      if (error) {
        console.error("Transfer error:", error);
        // Parse error message from FunctionsHttpError
        let errorMessage = "Transfer failed";
        if (error.message) {
          try {
            // Try to extract JSON error from the message
            const match = error.message.match(/\{.*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              errorMessage = parsed.error || errorMessage;
            }
          } catch {
            errorMessage = error.message;
          }
        }
        toast.error(errorMessage);
        setStep("input"); // Go back to input step so user can fix
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setStep("input");
        return;
      }

      toast.success(data?.message || "Transfer completed successfully!");
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Transfer error:", err);
      toast.error("An unexpected error occurred");
      setStep("input");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUsername("");
    setAmount("");
    setStep("input");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            {step === "input" ? "Transfer Funds" : "Confirm Transfer"}
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px]">
            {step === "input" 
              ? "Send money to another user. A 3% fee applies to all transfers."
              : "Please review the transfer details before confirming."
            }
          </DialogDescription>
        </DialogHeader>

        {step === "input" ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-inter tracking-[-0.5px]">Recipient Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="font-inter tracking-[-0.5px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="font-inter tracking-[-0.5px]">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  type="number"
                  min={MINIMUM_TRANSFER}
                  max={currentBalance}
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 font-inter tracking-[-0.5px]"
                />
              </div>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Available balance: ${currentBalance.toFixed(2)} • Minimum: ${MINIMUM_TRANSFER}
              </p>
            </div>

            {parsedAmount >= MINIMUM_TRANSFER && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-inter tracking-[-0.5px]">Transfer amount</span>
                  <span className="font-inter tracking-[-0.5px]">${parsedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-inter tracking-[-0.5px]">Fee (3%)</span>
                  <span className="text-muted-foreground font-inter tracking-[-0.5px]">-${fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium border-t border-border pt-1">
                  <span className="font-inter tracking-[-0.5px]">Recipient receives</span>
                  <span className="font-inter tracking-[-0.5px]">${netAmount.toFixed(2)}</span>
                </div>
              </div>
            )}

            <Button 
              onClick={handleContinue} 
              disabled={!isValidAmount || !isValidUsername}
              className="w-full font-inter tracking-[-0.5px]"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">To</span>
                <span className="text-sm font-medium font-inter tracking-[-0.5px]">@{username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Amount</span>
                <span className="text-sm font-inter tracking-[-0.5px]">${parsedAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">Fee (3%)</span>
                <span className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">-${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-sm font-medium font-inter tracking-[-0.5px]">They receive</span>
                <span className="text-sm font-semibold font-inter tracking-[-0.5px]">${netAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep("input")}
                className="flex-1 font-inter tracking-[-0.5px]"
                disabled={isLoading}
              >
                Back
              </Button>
              <Button 
                onClick={handleTransfer}
                disabled={isLoading}
                className="flex-1 font-inter tracking-[-0.5px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Confirm Transfer"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
