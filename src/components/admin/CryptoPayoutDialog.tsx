import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CryptoPayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payoutRequest: {
    id: string;
    amount: number;
    payout_method: string;
    payout_details: {
      wallet_address?: string;
      address?: string;
      network?: string;
    };
    profiles?: {
      username?: string;
      full_name?: string;
    };
  } | null;
  onSuccess?: () => void;
}

type ProcessingStatus = "idle" | "confirming" | "processing" | "success" | "error";

export function CryptoPayoutDialog({
  open,
  onOpenChange,
  payoutRequest,
  onSuccess,
}: CryptoPayoutDialogProps) {
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const walletAddress =
    payoutRequest?.payout_details?.wallet_address ||
    payoutRequest?.payout_details?.address ||
    "";

  const handleProcess = async () => {
    if (!payoutRequest) return;

    setStatus("processing");
    setError(null);
    setTxSignature(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("process-crypto-payout", {
        body: { payoutRequestId: payoutRequest.id },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to process payout");
      }

      const result = response.data;

      if (!result.success) {
        throw new Error(result.error || result.details || "Transaction failed");
      }

      setTxSignature(result.signature);
      setStatus("success");
      toast.success("Crypto payout processed successfully!");
      onSuccess?.();
    } catch (err) {
      console.error("Crypto payout error:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setStatus("error");
      toast.error("Failed to process crypto payout");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleClose = () => {
    if (status !== "processing") {
      setStatus("idle");
      setError(null);
      setTxSignature(null);
      onOpenChange(false);
    }
  };

  if (!payoutRequest) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Process Crypto Payout
          </DialogTitle>
          <DialogDescription>
            Send USDC on Solana to the creator's wallet
          </DialogDescription>
        </DialogHeader>

        {/* Amount Display */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl p-5 border border-amber-500/20">
          <p className="text-xs text-muted-foreground mb-1">Amount to Send</p>
          <p className="text-3xl font-bold tracking-tight">
            ${payoutRequest.amount.toFixed(2)}
            <span className="text-lg font-normal text-muted-foreground ml-2">USDC</span>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            to @{payoutRequest.profiles?.username || "Unknown"}
          </p>
        </div>

        {/* Wallet Address */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Recipient Wallet</span>
            <Badge variant="secondary" className="text-xs">
              Solana
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background p-2 rounded font-mono truncate">
              {walletAddress}
            </code>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 shrink-0"
              onClick={() => copyToClipboard(walletAddress, "Wallet address")}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Status Display */}
        {status === "processing" && (
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-500">Processing Transaction</p>
                <p className="text-xs text-blue-400">
                  Sending USDC to the creator's wallet...
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "success" && txSignature && (
          <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-500">
                  Transaction Confirmed
                </p>
                <p className="text-xs text-emerald-400">
                  USDC has been sent successfully
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded font-mono truncate">
                {txSignature}
              </code>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => copyToClipboard(txSignature, "Transaction signature")}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0"
                asChild
              >
                <a
                  href={`https://solscan.io/tx/${txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {status === "error" && error && (
          <div className="bg-rose-500/10 rounded-xl p-4 border border-rose-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-500">Transaction Failed</p>
                <p className="text-xs text-rose-400 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Warning */}
        {status === "idle" && (
          <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-500">Confirm Details</p>
                <p className="text-xs text-amber-400 mt-1">
                  This action will send real USDC from the treasury wallet.
                  Please verify the wallet address before proceeding.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {status === "success" ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={status === "processing"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcess}
                disabled={status === "processing" || !walletAddress}
                className={cn(
                  "gap-2",
                  status === "error" && "bg-rose-600 hover:bg-rose-700"
                )}
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : status === "error" ? (
                  "Retry"
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Send USDC
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
