import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandId: string;
  onInviteSent: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  brandId,
  onInviteSent,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setSending(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if there's already a pending invitation
      const { data: existingInvitation } = await supabase
        .from("brand_invitations")
        .select("id")
        .eq("brand_id", brandId)
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvitation) {
        toast.error("An invitation has already been sent to this email");
        return;
      }

      // Get brand and inviter details
      const [brandResult, profileResult] = await Promise.all([
        supabase.from("brands").select("name, slug").eq("id", brandId).single(),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      ]);

      if (brandResult.error) throw brandResult.error;
      if (!brandResult.data) throw new Error("Brand not found");

      // Create invitation
      const { error } = await supabase
        .from("brand_invitations")
        .insert({
          brand_id: brandId,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        });

      if (error) throw error;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-brand-invitation', {
        body: {
          email: email.toLowerCase(),
          brandName: brandResult.data.name,
          brandSlug: brandResult.data.slug,
          role,
          inviterName: profileResult.data?.full_name || "A team member",
          appUrl: window.location.origin,
        },
      });

      if (emailError) {
        console.error("Error sending invitation email:", emailError);
        toast.warning("Invitation created but email failed to send");
      } else {
        toast.success("Invitation sent successfully");
      }

      setEmail("");
      setRole("member");
      onOpenChange(false);
      onInviteSent();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#202020] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Invite Team Member</DialogTitle>
          <DialogDescription className="text-white/60">
            Send an invitation to join this brand workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#191919] border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-white">
              Role
            </Label>
            <Select value={role} onValueChange={(value: "admin" | "member") => setRole(value)}>
              <SelectTrigger className="bg-[#191919] border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#202020] border-white/10">
                <SelectItem value="member" className="text-white">
                  Member - Can view and contribute
                </SelectItem>
                <SelectItem value="admin" className="text-white">
                  Admin - Can manage team and settings
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={sending}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {sending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}