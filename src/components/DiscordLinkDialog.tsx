import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import discordIcon from "@/assets/discord-icon.png";

interface DiscordLinkDialogProps {
  userId: string;
  discordUsername?: string;
  onSuccess?: () => void;
}

export function DiscordLinkDialog({ userId, discordUsername, onSuccess }: DiscordLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isLinked = !!discordUsername;

  const handleLinkDiscord = () => {
    const DISCORD_CLIENT_ID = '1358316231341375518';
    
    const REDIRECT_URI = `${window.location.origin}/discord/callback`;
    const STATE = btoa(JSON.stringify({ userId }));
    
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?` +
      `client_id=${DISCORD_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=identify%20email&` +
      `state=${STATE}`;

    // Open Discord OAuth in a popup
    const popup = window.open(
      discordAuthUrl,
      'Discord OAuth',
      'width=500,height=700'
    );

    // Listen for OAuth completion
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'discord-oauth-success') {
        popup?.close();
        toast({
          title: "Success!",
          description: "Discord account linked successfully."
        });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        setOpen(false);
        onSuccess?.();
      } else if (event.data.type === 'discord-oauth-error') {
        popup?.close();
        toast({
          variant: "destructive",
          title: "Error",
          description: event.data.error || "Failed to link Discord account."
        });
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const handleUnlinkDiscord = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('discord-oauth', {
        body: { action: 'disconnect', userId }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Discord account unlinked successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to unlink Discord account."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={isLinked ? "outline" : "default"} 
          size="sm" 
          className={`gap-2 font-geist tracking-tight ${!isLinked ? 'bg-[#5765F2] hover:bg-[#5765F2]' : ''}`}
        >
          {!isLinked && <img src={discordIcon} alt="Discord" className="w-4 h-4" />}
          {isLinked ? "Manage Discord" : "Connect Discord"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0b0b0b] border">
        <DialogHeader>
          <DialogTitle>
            {isLinked ? "Discord Account Linked" : "Link Discord Account"}
          </DialogTitle>
          <DialogDescription>
            {isLinked 
              ? "Your Discord account is currently linked to your Virality profile."
              : "Link your Discord account to enable additional features and connect with the community."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLinked && discordUsername && (
            <div className="p-4 rounded-lg bg-muted/20 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                <div>
                  <div className="font-medium">{discordUsername}</div>
                  <div className="text-xs text-muted-foreground">Connected</div>
                </div>
              </div>
            </div>
          )}

          {!isLinked && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                By linking your Discord account, you'll be able to access exclusive features and connect with other creators in the Virality community.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {isLinked ? (
              <>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleUnlinkDiscord}
                  disabled={loading}
                >
                  {loading ? "Unlinking..." : "Unlink Discord"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="flex-1 gap-2"
                  onClick={handleLinkDiscord}
                  disabled={loading}
                >
                  <img src={discordIcon} alt="Discord" className="w-4 h-4" />
                  Connect Discord
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}