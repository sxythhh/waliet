import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated: () => void;
  profileName: string;
}

export function CreateTeamDialog({ open, onOpenChange, onTeamCreated, profileName }: CreateTeamDialogProps) {
  const [teamName, setTeamName] = useState("");
  const [commissionRate, setCommissionRate] = useState(10);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!teamName.trim()) {
      toast({
        variant: "destructive",
        title: "Team name required",
        description: "Please enter a name for your team."
      });
      return;
    }

    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    // Generate unique referral code
    const referralCode = `team-${teamName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Math.random().toString(36).substring(2, 8)}`;

    const { error } = await supabase.from("referral_teams").insert({
      owner_id: user.id,
      name: teamName.trim(),
      commission_rate: commissionRate,
      referral_code: referralCode
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error creating team",
        description: error.message.includes("duplicate") ? "You already have a team" : error.message
      });
    } else {
      toast({
        title: "Team created!",
        description: "Your team has been created successfully."
      });
      onTeamCreated();
      onOpenChange(false);
      setTeamName("");
      setCommissionRate(10);
    }

    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            Create Your Team
          </DialogTitle>
          <DialogDescription>
            Set up your referral team and start earning commissions. You'll get a unique referral link to share.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder={`${profileName}'s Team`}
              className="bg-muted/30 border-0"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Commission Rate</Label>
              <span className="text-sm font-semibold text-[#2060df]">{commissionRate}%</span>
            </div>
            <Slider
              value={[commissionRate]}
              onValueChange={(value) => setCommissionRate(value[0])}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              You'll earn {commissionRate}% of each team member's base payout
            </p>
          </div>

          <Button 
            onClick={handleCreate} 
            disabled={creating} 
            className="w-full bg-foreground text-background hover:bg-foreground/90"
          >
            {creating ? "Creating..." : "Create Team"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
