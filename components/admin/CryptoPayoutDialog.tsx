import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import solanaLogo from "@/assets/solana-logo.png";

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
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

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

  const copyToClipboard = async (text: string, type: "wallet" | "tx") => {
    await navigator.clipboard.writeText(text);
    if (type === "wallet") {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    } else {
      setCopiedTx(true);
      setTimeout(() => setCopiedTx(false), 2000);
    }
    toast.success("Copied to clipboard");
  };

  const handleClose = () => {
    if (status !== "processing") {
      setStatus("idle");
      setError(null);
      setTxSignature(null);
      onOpenChange(false);
    }
  };

  const truncateAddress = (address: string, chars = 8) => {
    if (address.length <= chars * 2 + 3) return address;
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  if (!payoutRequest) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4">
          <DialogTitle className="text-[15px] font-semibold tracking-[-0.3px]">
            Send USDC
          </DialogTitle>
          <DialogDescription className="text-[13px] text-muted-foreground mt-0.5">
            Process crypto payout via Solana
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {/* Amount Card */}
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                Amount
              </span>
              <div className="flex items-center gap-1.5">
                <img src={solanaLogo} alt="Solana" className="w-3.5 h-3.5" />
                <span className="text-[11px] text-muted-foreground font-medium">USDC</span>
              </div>
            </div>
            <p className="text-2xl font-semibold tracking-[-0.5px]">
              ${payoutRequest.amount.toFixed(2)}
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              to @{payoutRequest.profiles?.username || "Unknown"}
            </p>
          </div>

          {/* Recipient Wallet */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
              Recipient Wallet
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5">
              <code className="flex-1 text-[12px] font-mono text-foreground truncate min-w-0">
                {truncateAddress(walletAddress, 12)}
              </code>
              <button
                onClick={() => copyToClipboard(walletAddress, "wallet")}
                className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                {copiedWallet ? (
                  <Check className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Status States */}
          {status === "processing" && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium">Processing...</p>
                <p className="text-[11px] text-muted-foreground">
                  Sending USDC on Solana
                </p>
              </div>
            </div>
          )}

          {status === "success" && txSignature && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-primary">Sent Successfully</p>
                  <p className="text-[11px] text-muted-foreground">
                    Transaction confirmed
                  </p>
                </div>
              </div>

              {/* Transaction Signature */}
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                  Transaction
                </span>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5">
                  <code className="flex-1 text-[12px] font-mono text-foreground truncate min-w-0">
                    {truncateAddress(txSignature, 12)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(txSignature, "tx")}
                    className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    {copiedTx ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <a
                    href={`https://solscan.io/tx/${txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {status === "error" && error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-destructive">Failed</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Warning for idle state */}
          {status === "idle" && (
            <p className="text-[11px] text-muted-foreground text-center">
              This will send real USDC from the treasury wallet
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {status === "success" ? (
              <Button
                onClick={handleClose}
                className="flex-1 h-10 text-[13px] font-medium"
              >
                Done
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={status === "processing"}
                  className="flex-1 h-10 text-[13px] font-medium hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProcess}
                  disabled={status === "processing" || !walletAddress}
                  className="flex-1 h-10 text-[13px] font-medium gap-2"
                >
                  {status === "processing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : status === "error" ? (
                    "Retry"
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4" />
                      Send USDC
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
