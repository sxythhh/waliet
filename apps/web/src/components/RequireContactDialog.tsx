import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, MessageCircle, Check } from "lucide-react";
import discordIcon from "@/assets/discord-icon.png";

interface RequireContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  hasPhone?: boolean;
  hasDiscord?: boolean;
}

export function RequireContactDialog({
  open,
  onOpenChange,
  onSuccess,
  hasPhone = false,
  hasDiscord = false,
}: RequireContactDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<'phone' | 'discord' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSavePhone = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in first");
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ phone_number: phoneNumber.trim() })
        .eq('id', session.user.id);

      if (error) throw error;

      toast.success("Phone number saved!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving phone:", error);
      toast.error(error.message || "Failed to save phone number");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectDiscord = async () => {
    // Redirect to Discord OAuth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in first");
      return;
    }
    
    // Store return URL in localStorage
    localStorage.setItem('discord_return_url', window.location.href);
    
    // Redirect to Discord connect page
    window.location.href = '/connect-discord';
  };

  const resetSelection = () => {
    setSelectedMethod(null);
    setPhoneNumber("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetSelection();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            Contact Verification Required
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px]">
            To apply, you need to have either a phone number or Discord account linked to your profile. This helps brands communicate with you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!selectedMethod ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                Choose how you'd like to verify:
              </p>
              
              {/* Phone Option */}
              <button
                onClick={() => setSelectedMethod('phone')}
                disabled={hasPhone}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                  hasPhone 
                    ? 'border-emerald-500/50 bg-emerald-500/10 cursor-default'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  hasPhone ? 'bg-emerald-500/20' : 'bg-muted'
                }`}>
                  {hasPhone ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium font-inter tracking-[-0.5px]">
                    Phone Number
                  </p>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    {hasPhone ? 'Already connected' : 'Add your phone number'}
                  </p>
                </div>
              </button>

              {/* Discord Option */}
              <button
                onClick={() => setSelectedMethod('discord')}
                disabled={hasDiscord}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                  hasDiscord 
                    ? 'border-emerald-500/50 bg-emerald-500/10 cursor-default'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  hasDiscord ? 'bg-emerald-500/20' : 'bg-muted'
                }`}>
                  {hasDiscord ? (
                    <Check className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <img src={discordIcon} alt="Discord" className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium font-inter tracking-[-0.5px]">
                    Discord Account
                  </p>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    {hasDiscord ? 'Already connected' : 'Connect your Discord'}
                  </p>
                </div>
              </button>
            </div>
          ) : selectedMethod === 'phone' ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedMethod(null)}
                className="text-sm text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
              >
                ← Back to options
              </button>
              
              <div className="space-y-2">
                <Label className="font-inter tracking-[-0.5px]">Phone Number</Label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  className="font-inter tracking-[-0.5px]"
                />
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Include your country code for international numbers
                </p>
              </div>

              <Button 
                onClick={handleSavePhone} 
                disabled={saving || !phoneNumber.trim()}
                className="w-full font-inter tracking-[-0.5px]"
              >
                {saving ? "Saving..." : "Save Phone Number"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedMethod(null)}
                className="text-sm text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
              >
                ← Back to options
              </button>
              
              <div className="text-center py-4">
                <img src={discordIcon} alt="Discord" className="h-12 w-12 mx-auto mb-4 opacity-80" />
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mb-4">
                  You'll be redirected to Discord to authorize the connection.
                </p>
                <Button 
                  onClick={handleConnectDiscord}
                  className="w-full font-inter tracking-[-0.5px]"
                >
                  Connect Discord
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
