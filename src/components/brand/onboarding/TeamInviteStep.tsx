import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, ArrowRight, Plus, X, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface TeamInviteStepProps {
  brandId: string;
  onNext: () => void;
  onSkip: () => void;
}

interface Invite {
  email: string;
  role: string;
}

export function TeamInviteStep({ brandId, onNext, onSkip }: TeamInviteStepProps) {
  const [invites, setInvites] = useState<Invite[]>([{ email: "", role: "member" }]);
  const [sending, setSending] = useState(false);

  const addInvite = () => {
    setInvites([...invites, { email: "", role: "member" }]);
  };

  const removeInvite = (index: number) => {
    setInvites(invites.filter((_, i) => i !== index));
  };

  const updateInvite = (index: number, field: keyof Invite, value: string) => {
    const updated = [...invites];
    updated[index][field] = value;
    setInvites(updated);
  };

  const handleSendInvites = async () => {
    const validInvites = invites.filter((inv) => inv.email.trim());
    if (validInvites.length === 0) {
      onNext();
      return;
    }

    setSending(true);
    try {
      for (const invite of validInvites) {
        const { error } = await supabase.from("brand_invitations").insert({
          brand_id: brandId,
          email: invite.email.toLowerCase().trim(),
          role: invite.role,
        });

        if (error) {
          if (error.code === "23505") {
            toast.error(`${invite.email} has already been invited`);
          } else {
            throw error;
          }
        }
      }

      toast.success(`Sent ${validInvites.length} invitation(s)`);
      onNext();
    } catch (error: any) {
      console.error("Error sending invites:", error);
      toast.error("Failed to send some invitations");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Invite Your Team</h2>
        <p className="text-muted-foreground">
          Add team members to help manage your brand
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {invites.map((invite, index) => (
          <div key={index} className="flex gap-2">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="teammate@company.com"
                value={invite.email}
                onChange={(e) => updateInvite(index, "email", e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={invite.role}
              onValueChange={(value) => updateInvite(index, "role", value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
            {invites.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeInvite(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        <Button
          variant="outline"
          onClick={addInvite}
          className="w-full"
          disabled={invites.length >= 5}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Team members will receive an email invitation to join your brand
        </p>
      </div>

      <div className="flex justify-between pt-4 max-w-md mx-auto">
        <Button variant="ghost" onClick={onSkip}>
          Skip for now
        </Button>
        <Button onClick={handleSendInvites} disabled={sending}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {invites.some((inv) => inv.email.trim()) ? "Send Invites" : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
