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
import { AlertCircle, Unlink } from "lucide-react";
import discordIcon from "@/assets/discord-icon.png";

interface DiscordLinkDialogProps {
  userId: string;
  discordUsername?: string;
  discordAvatar?: string;
  onSuccess?: () => void;
}

export function DiscordLinkDialog({ userId, discordUsername, discordAvatar, onSuccess }: DiscordLinkDialogProps) {
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
          variant="ghost"
          size="sm" 
          className={`gap-2 font-geist tracking-tight font-semibold bg-muted/50 hover:bg-muted border-0 ${!isLinked ? 'text-[#5765F2]' : ''}`}
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
            <div className="p-4 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-3">
                <img 
                  src={discordAvatar || discordIcon} 
                  alt="Discord" 
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1">
                  <div className="font-medium">{discordUsername}</div>
                  <div className="text-xs text-muted-foreground">Connected</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUnlinkDiscord}
                  disabled={loading}
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {!isLinked && (
            <>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  By linking your Discord account, you'll be able to access exclusive features and connect with other creators in the Virality community.
                </p>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleLinkDiscord}
                disabled={loading}
              >
                <img src={discordIcon} alt="Discord" className="w-4 h-4" />
                Connect Discord
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}