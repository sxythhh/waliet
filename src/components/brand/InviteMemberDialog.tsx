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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Mail, Link2 } from "lucide-react";

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
  const [role, setRole] = useState<"admin" | "member">("member");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState("email");

  // Link invite state
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const generateInviteLink = async () => {
    try {
      setGeneratingLink(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate a unique token
      const token = crypto.randomUUID();

      // Create link-based invitation (no email required)
      const { data: invitationData, error } = await supabase
        .from("brand_invitations")
        .insert({
          brand_id: brandId,
          role,
          invited_by: user.id,
          invite_token: token,
          is_link_invite: true,
          email: `invite-${token}@placeholder.local`, // Required field placeholder for link invites
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Generate the invite link
      const link = `${window.location.origin}/brand/${brandSlug}/join/${token}`;
      setInviteLink(link);

      toast.success("Invite link generated!");
      onInviteSent();
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast.error("Failed to generate invite link");
    } finally {
      setGeneratingLink(false);
    }
  };

  const copyToClipboard = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const resetLinkState = () => {
    setInviteLink(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        resetLinkState();
        setEmail("");
        setRole("member");
      }
    }}>
      <DialogContent className="bg-background border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="tracking-[-0.5px]">Invite Team Member</DialogTitle>
          <DialogDescription className="text-muted-foreground tracking-[-0.5px]">
            Send an email or share an invite link
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          resetLinkState();
        }} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="email" className="text-xs flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email Invite
            </TabsTrigger>
            <TabsTrigger value="link" className="text-xs flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Copy Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
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
              <Label htmlFor="role-email" className="text-xs text-muted-foreground tracking-[-0.5px]">
                Role
              </Label>
              <Select value={role} onValueChange={(value: "admin" | "member") => setRole(value)}>
                <SelectTrigger className="bg-muted/30 border-0 h-10 font-['Inter'] tracking-[-0.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-['Inter'] tracking-[-0.5px]">
                  <SelectItem value="member">
                    <span className="font-medium">Member</span>
                    <span className="text-muted-foreground ml-1">- Can view and contribute</span>
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
                className="py-1.5 px-4 rounded-[8px] font-['Inter'] text-[13px] font-medium tracking-[-0.5px] text-muted-foreground bg-transparent hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={sending}
                className="py-1.5 px-4 bg-[#1f60dd] border-t border-[#4b85f7] rounded-[8px] font-['Inter'] text-[13px] font-medium tracking-[-0.5px] text-white hover:bg-[#1a50c8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="role-link" className="text-xs text-muted-foreground tracking-[-0.5px]">
                Role for anyone who joins via this link
              </Label>
              <Select
                value={role}
                onValueChange={(value: "admin" | "member") => {
                  setRole(value);
                  resetLinkState();
                }}
                disabled={!!inviteLink}
              >
                <SelectTrigger className="bg-muted/30 border-0 h-10 font-['Inter'] tracking-[-0.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-['Inter'] tracking-[-0.5px]">
                  <SelectItem value="member">
                    <span className="font-medium">Member</span>
                    <span className="text-muted-foreground ml-1">- Can view and contribute</span>
                  </SelectItem>
                  <SelectItem value="admin">
                    <span className="font-medium">Admin</span>
                    <span className="text-muted-foreground ml-1">- Can manage team and settings</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {inviteLink ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground tracking-[-0.5px]">
                    Invite Link
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="bg-muted/30 border-0 h-10 text-sm font-mono"
                    />
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can join your workspace as a <span className="font-medium">{role}</span>.
                  The link expires in 7 days.
                </p>
                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    onClick={() => {
                      resetLinkState();
                    }}
                    className="py-1.5 px-4 rounded-[8px] font-['Inter'] text-[13px] font-medium tracking-[-0.5px] text-muted-foreground bg-transparent hover:bg-muted/50 transition-colors"
                  >
                    Generate New
                  </button>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="py-1.5 px-4 bg-[#1f60dd] border-t border-[#4b85f7] rounded-[8px] font-['Inter'] text-[13px] font-medium tracking-[-0.5px] text-white hover:bg-[#1a50c8] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Generate a link that anyone can use to join your workspace.
                    They'll need to sign in or create an account to accept.
                  </p>
                </div>
                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    onClick={() => onOpenChange(false)}
                    className="py-1.5 px-4 rounded-[8px] font-['Inter'] text-[13px] font-medium tracking-[-0.5px] text-muted-foreground bg-transparent hover:bg-muted/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateInviteLink}
                    disabled={generatingLink}
                    className="py-1.5 px-4 bg-[#1f60dd] border-t border-[#4b85f7] rounded-[8px] font-['Inter'] text-[13px] font-medium tracking-[-0.5px] text-white hover:bg-[#1a50c8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {generatingLink ? (
                      "Generating..."
                    ) : (
                      <>
                        <Link2 className="h-4 w-4" />
                        Generate Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
