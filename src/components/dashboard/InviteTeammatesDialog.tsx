import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InviteTeammatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  teamName: string;
  onInvitesSent: () => void;
}

export function InviteTeammatesDialog({ open, onOpenChange, teamId, teamName, onInvitesSent }: InviteTeammatesDialogProps) {
  const [emails, setEmails] = useState<string[]>([""]);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const addEmail = () => {
    setEmails([...emails, ""]);
  };

  const removeEmail = (index: number) => {
    if (emails.length === 1) return;
    setEmails(emails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails];
    newEmails[index] = value;
    setEmails(newEmails);
  };

  const handleSendInvites = async () => {
    const validEmails = emails.filter(email => email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
    
    if (validEmails.length === 0) {
      toast({
        variant: "destructive",
        title: "No valid emails",
        description: "Please enter at least one valid email address."
      });
      return;
    }

    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    const invitations = validEmails.map(email => ({
      team_id: teamId,
      email: email.trim().toLowerCase(),
      invited_by: user.id
    }));

    const { error } = await supabase.from("referral_team_invitations").insert(invitations);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error sending invites",
        description: error.message
      });
    } else {
      toast({
        title: "Invitations sent!",
        description: `${validEmails.length} invitation(s) sent successfully.`
      });
      onInvitesSent();
      onOpenChange(false);
      setEmails([""]);
    }

    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Invite Teammates
          </DialogTitle>
          <DialogDescription>
            Invite members to join your <span className="font-semibold text-foreground">{teamName}</span> partner team.
            Invitations will be valid for 14 days.
          </DialogDescription>
        </DialogHeader>

        <div className="border-t border-border my-4" />

        <div className="space-y-4">
          <Label>Email</Label>
          
          {emails.map((email, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                type="email"
                value={email}
                onChange={(e) => updateEmail(index, e.target.value)}
                placeholder="email@example.com"
                className="flex-1 bg-muted/30 border border-border"
              />
              {emails.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmail(index)}
                  className="h-10 w-10 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addEmail}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add email
          </Button>

          <Button 
            onClick={handleSendInvites} 
            disabled={sending} 
            className="w-full bg-foreground text-background hover:bg-foreground/90 mt-4"
          >
            {sending ? "Sending..." : "Send invite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
