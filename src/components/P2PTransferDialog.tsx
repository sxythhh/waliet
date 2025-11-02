import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, User, DollarSign } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
interface P2PTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  onTransferComplete: () => void;
}
export function P2PTransferDialog({
  open,
  onOpenChange,
  currentBalance,
  onTransferComplete
}: P2PTransferDialogProps) {
  const [recipientIdentifier, setRecipientIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState<{
    id: string;
    username: string;
    email: string;
  } | null>(null);
  const {
    toast
  } = useToast();
  const handleValidateRecipient = async () => {
    if (!recipientIdentifier.trim()) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter a username or email"
      });
      return;
    }
    setIsValidating(true);
    try {
      // Get current user
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;

      // Search for recipient by username or email
      const {
        data: profiles,
        error
      } = await supabase.from("profiles").select("id, username, email").or(`username.eq.${recipientIdentifier},email.eq.${recipientIdentifier}`).limit(1);
      if (error) throw error;
      if (!profiles || profiles.length === 0) {
        toast({
          variant: "destructive",
          title: "User Not Found",
          description: "No user found with that username or email"
        });
        setRecipientInfo(null);
        return;
      }
      const recipient = profiles[0];

      // Check if trying to send to self
      if (recipient.id === session.user.id) {
        toast({
          variant: "destructive",
          title: "Invalid Transfer",
          description: "You cannot transfer money to yourself"
        });
        setRecipientInfo(null);
        return;
      }
      setRecipientInfo(recipient);
      toast({
        title: "User Found",
        description: `Ready to transfer to ${recipient.username}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to validate recipient"
      });
      setRecipientInfo(null);
    } finally {
      setIsValidating(false);
    }
  };
  const handleTransfer = async () => {
    if (!recipientInfo) {
      toast({
        variant: "destructive",
        title: "Invalid Recipient",
        description: "Please validate the recipient first"
      });
      return;
    }
    const transferAmount = Number(amount);
    if (!transferAmount || transferAmount <= 0) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid amount"
      });
      return;
    }
    if (transferAmount < 1) {
      toast({
        variant: "destructive",
        title: "Minimum Amount",
        description: "Minimum transfer amount is $1"
      });
      return;
    }
    if (transferAmount > currentBalance) {
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: "Amount exceeds your available balance"
      });
      return;
    }
    setIsTransferring(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;

      // Get sender's wallet
      const {
        data: senderWallet,
        error: senderWalletError
      } = await supabase.from("wallets").select("*").eq("user_id", session.user.id).single();
      if (senderWalletError) throw senderWalletError;

      // Get recipient's wallet
      const {
        data: recipientWallet,
        error: recipientWalletError
      } = await supabase.from("wallets").select("*").eq("user_id", recipientInfo.id).single();
      if (recipientWalletError) throw recipientWalletError;

      // Double check balance
      if (senderWallet.balance < transferAmount) {
        toast({
          variant: "destructive",
          title: "Insufficient Balance",
          description: "Your balance has changed. Please try again."
        });
        setIsTransferring(false);
        return;
      }

      // Create transaction for sender (debit)
      const {
        error: senderTxnError
      } = await supabase.from("wallet_transactions").insert({
        user_id: session.user.id,
        amount: -transferAmount,
        type: "transfer_sent",
        status: "completed",
        description: `Transfer to ${recipientInfo.username}`,
        metadata: {
          recipient_id: recipientInfo.id,
          recipient_username: recipientInfo.username,
          note: note || null,
          transfer_type: "p2p"
        }
      });
      if (senderTxnError) throw senderTxnError;

      // Create transaction for recipient (credit)
      const {
        error: recipientTxnError
      } = await supabase.from("wallet_transactions").insert({
        user_id: recipientInfo.id,
        amount: transferAmount,
        type: "transfer_received",
        status: "completed",
        description: `Transfer from ${session.user.user_metadata?.username || 'Unknown'}`,
        metadata: {
          sender_id: session.user.id,
          sender_username: session.user.user_metadata?.username || 'Unknown',
          note: note || null,
          transfer_type: "p2p"
        }
      });
      if (recipientTxnError) throw recipientTxnError;

      // Update sender's wallet balance
      const {
        error: senderUpdateError
      } = await supabase.from("wallets").update({
        balance: senderWallet.balance - transferAmount
      }).eq("user_id", session.user.id);
      if (senderUpdateError) throw senderUpdateError;

      // Update recipient's wallet balance
      const {
        error: recipientUpdateError
      } = await supabase.from("wallets").update({
        balance: recipientWallet.balance + transferAmount,
        total_earned: recipientWallet.total_earned + transferAmount
      }).eq("user_id", recipientInfo.id);
      if (recipientUpdateError) throw recipientUpdateError;
      toast({
        title: "Transfer Successful",
        description: `Successfully transferred $${transferAmount.toFixed(2)} to ${recipientInfo.username}`
      });

      // Reset form and close
      setRecipientIdentifier("");
      setAmount("");
      setNote("");
      setRecipientInfo(null);
      onOpenChange(false);
      onTransferComplete();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Transfer Failed",
        description: error.message || "Failed to complete transfer. Please try again."
      });
    } finally {
      setIsTransferring(false);
    }
  };
  const handleClose = () => {
    if (!isTransferring && !isValidating) {
      setRecipientIdentifier("");
      setAmount("");
      setNote("");
      setRecipientInfo(null);
      onOpenChange(false);
    }
  };
  return <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-black border-0 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Transfer Money</DialogTitle>
          <DialogDescription className="text-white/60">
            Send money directly to another user's wallet
          </DialogDescription>
        </DialogHeader>

        <Alert className="bg-yellow-500/5 border-0">
          <AlertDescription className="text-yellow-500/90 text-sm">
            <strong>Warning:</strong> Transfers are irreversible. Please verify the recipient before sending.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Recipient Field */}
          <div className="space-y-2">
            <Label htmlFor="recipient" className="text-white/90">
              
              Recipient Username or Email
            </Label>
            <div className="flex gap-2">
              <Input id="recipient" value={recipientIdentifier} onChange={e => {
              setRecipientIdentifier(e.target.value);
              setRecipientInfo(null);
            }} placeholder="username or email@example.com" className="bg-black border-0 text-white flex-1" disabled={isTransferring} />
              <Button onClick={handleValidateRecipient} disabled={isValidating || isTransferring || !recipientIdentifier.trim()} className="bg-primary hover:bg-primary/90">
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
            {recipientInfo && <div className="text-sm text-green-500 flex items-center gap-2">
                <User className="h-4 w-4" />
                Verified: {recipientInfo.username}
              </div>}
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white/90">
              <DollarSign className="inline h-4 w-4 mr-2" />
              Amount
            </Label>
            <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="bg-black border-0 text-white" min="1" step="0.01" disabled={isTransferring || !recipientInfo} />
            <div className="flex justify-between text-xs text-white/50">
              <span>Minimum: $1.00</span>
              <span>Available: ${currentBalance.toFixed(2)}</span>
            </div>
          </div>

          {/* Note Field */}
          <div className="space-y-2">
            <Label htmlFor="note" className="text-white/90">
              Note (Optional)
            </Label>
            <Input id="note" value={note} onChange={e => setNote(e.target.value)} placeholder="What's this for?" className="bg-black border-0 text-white" maxLength={100} disabled={isTransferring || !recipientInfo} />
          </div>

          {/* Transfer Summary */}
          {recipientInfo && amount && Number(amount) > 0 && <div className="bg-black border-0 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Transfer to</span>
                <span className="font-semibold">{recipientInfo.username}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Amount</span>
                <span className="font-semibold">${Number(amount).toFixed(2)}</span>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex justify-between">
                <span className="text-white/60">New Balance</span>
                <span className="font-bold text-lg">${(currentBalance - Number(amount)).toFixed(2)}</span>
              </div>
            </div>}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isTransferring || isValidating} className="bg-transparent border-0 text-white hover:bg-white/10">
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={!recipientInfo || !amount || Number(amount) <= 0 || isTransferring || isValidating} className="bg-primary hover:bg-primary/90">
            {isTransferring ? <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Transferring...
              </> : `Transfer $${Number(amount || 0).toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}