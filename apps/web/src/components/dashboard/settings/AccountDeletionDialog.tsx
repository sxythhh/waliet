import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Loader2, AlertTriangle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function AccountDeletionDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"warning" | "confirm">("warning");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [exportFirst, setExportFirst] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!user?.email) return;

    if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
      toast.error("Email address does not match");
      return;
    }

    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to delete your account");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            confirmEmail,
            exportData: exportFirst,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (data.pendingPayouts) {
          toast.error(`You have ${data.pendingPayouts} pending payout(s). Please wait for them to complete.`);
        } else if (data.balance) {
          toast.error(`Please withdraw your remaining balance of $${data.balance} first.`);
        } else {
          throw new Error(data.error || "Failed to delete account");
        }
        return;
      }

      // If data was exported, download it
      if (data.exportedData) {
        const blob = new Blob([JSON.stringify(data.exportedData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `virality-final-export-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      toast.success("Your account has been deleted. We're sorry to see you go.");
      setOpen(false);
      navigate("/");
    } catch (error: any) {
      console.error("Deletion error:", error);
      toast.error(error.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep("warning");
      setConfirmEmail("");
      setExportFirst(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Delete Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {step === "warning" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-inter tracking-[-0.5px] flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Your Account
              </DialogTitle>
              <DialogDescription className="font-inter tracking-[-0.5px]">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm font-medium text-destructive font-inter tracking-[-0.5px]">
                  Warning: This will permanently delete:
                </p>
                <ul className="mt-2 text-xs text-destructive/80 font-inter tracking-[-0.5px] list-disc list-inside space-y-1">
                  <li>Your profile and all personal information</li>
                  <li>All wallet transactions and history</li>
                  <li>All campaign applications and submissions</li>
                  <li>Connected social accounts</li>
                  <li>Your entire payment history</li>
                </ul>
              </div>

              <div className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                <p className="font-medium text-foreground mb-2">Before you go:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Withdraw any remaining balance from your wallet</li>
                  <li>Wait for any pending payouts to complete</li>
                  <li>Download your data for your records</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => setStep("confirm")}>
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-inter tracking-[-0.5px]">
                Confirm Account Deletion
              </DialogTitle>
              <DialogDescription className="font-inter tracking-[-0.5px]">
                Please confirm your email address to proceed.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="confirm-email" className="font-inter tracking-[-0.5px]">
                  Type your email to confirm
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={user?.email || "your@email.com"}
                  className="font-inter tracking-[-0.5px]"
                />
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Enter: <span className="font-medium text-foreground">{user?.email}</span>
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <Checkbox
                  id="export-first"
                  checked={exportFirst}
                  onCheckedChange={(checked) => setExportFirst(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="export-first"
                    className="text-sm font-medium leading-none cursor-pointer font-inter tracking-[-0.5px]"
                  >
                    <Download className="h-3.5 w-3.5 inline mr-1.5" />
                    Export my data before deletion
                  </label>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    Download a copy of your data before it's permanently deleted.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("warning")}>
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || confirmEmail.toLowerCase() !== user?.email?.toLowerCase()}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  "Delete My Account"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
