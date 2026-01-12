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
  brandSlug: string;
  onInviteSent: () => void;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  brandId,
  brandSlug,
  onInviteSent,
}: InviteMemberDialogProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "poster">("member");
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
      const { data: invitationData, error } = await supabase
        .from("brand_invitations")
        .insert({
          brand_id: brandId,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation email
      const { error: emailError } = await supabase.functions.invoke('send-brand-invitation', {
        body: {
          email: email.toLowerCase(),
          brandName: brandResult.data.name,
          brandSlug: brandResult.data.slug,
          role,
          inviterName: profileResult.data?.full_name || "A team member",
          invitationId: invitationData.id,
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
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setEmail("");
        setRole("member");
      }
    }}>
      <DialogContent className="bg-background border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="tracking-[-0.5px]">Invite Team Member</DialogTitle>
          <DialogDescription className="text-muted-foreground tracking-[-0.5px]">
            Send an email invitation to join your workspace
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-muted-foreground tracking-[-0.5px]">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-muted/30 border-0 h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-xs text-muted-foreground tracking-[-0.5px]">
              Role
            </Label>
            <Select value={role} onValueChange={(value: "admin" | "member" | "poster") => setRole(value)}>
              <SelectTrigger className="bg-muted/30 border-0 h-10 font-inter tracking-[-0.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-inter tracking-[-0.5px]">
                <SelectItem value="member">
                  <span className="font-medium">Member</span>
                  <span className="text-muted-foreground ml-1">- Can view and contribute</span>
                </SelectItem>
                <SelectItem value="poster">
                  <span className="font-medium">Poster</span>
                  <span className="text-muted-foreground ml-1">- Can view videos and mark as posted</span>
                </SelectItem>
                <SelectItem value="admin">
                  <span className="font-medium">Admin</span>
                  <span className="text-muted-foreground ml-1">- Can manage team and settings</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2 justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="py-1.5 px-4 rounded-[8px] font-inter text-[13px] font-medium tracking-[-0.5px] text-muted-foreground bg-transparent hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInvite}
              disabled={sending}
              className="py-1.5 px-4 bg-primary border-t border-primary/70 rounded-[8px] font-inter text-[13px] font-medium tracking-[-0.5px] text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send Invite"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
