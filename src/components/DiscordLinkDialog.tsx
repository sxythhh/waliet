import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Unlink } from "lucide-react";
import discordIcon from "@/assets/discord-icon.png";

// Type for Supabase Functions error with context
interface FunctionsError extends Error {
  context?: {
    response?: Response;
  };
}

interface DiscordLinkDialogProps {
  userId: string;
  discordUsername?: string;
  discordAvatar?: string;
  onSuccess?: () => void;
}
export function DiscordLinkDialog({
  userId,
  discordUsername,
  discordAvatar,
  onSuccess
}: DiscordLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const isLinked = !!discordUsername;
  const handleLinkDiscord = () => {
    const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
    if (!DISCORD_CLIENT_ID) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Discord integration is not configured. Please contact support."
      });
      return;
    }
    const REDIRECT_URI = `${window.location.origin}/discord/callback`;

    // Generate cryptographic nonce for CSRF protection
    const nonce = crypto.randomUUID();
    sessionStorage.setItem('discord_oauth_nonce', nonce);

    const STATE = btoa(JSON.stringify({
      userId,
      nonce
    }));
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?` + `client_id=${DISCORD_CLIENT_ID}&` + `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` + `response_type=code&` + `scope=identify%20email%20guilds.join&` + `state=${STATE}`;

    // Open Discord OAuth in a popup
    const popup = window.open(discordAuthUrl, 'Discord OAuth', 'width=500,height=700');

    // Listen for OAuth completion
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'discord-oauth-success') {
        window.removeEventListener('message', handleMessage);
        popup?.close();
        toast({
          title: "Success!",
          description: "Discord account linked successfully."
        });
        queryClient.invalidateQueries({
          queryKey: ['profile']
        });
        setOpen(false);
        onSuccess?.();
      } else if (event.data.type === 'discord-oauth-error') {
        window.removeEventListener('message', handleMessage);
        popup?.close();
        const errorMessage = event.data.error || "Failed to link Discord account.";
        const isAlreadyLinked = errorMessage.toLowerCase().includes('already linked');
        toast({
          variant: "destructive",
          title: isAlreadyLinked ? "Discord Already Linked" : "Error",
          description: errorMessage
        });
      }
    };
    window.addEventListener('message', handleMessage);
  };
  const handleUnlinkDiscord = async () => {
    setLoading(true);
    try {
      const {
        error
      } = await supabase.functions.invoke('discord-oauth', {
        body: {
          action: 'disconnect',
          userId
        }
      });
      if (error) {
        let msg = error.message || 'Failed to unlink Discord account.';
        const functionsError = error as FunctionsError;
        const resp = functionsError.context?.response;
        if (resp) {
          try {
            const json = await resp.clone().json();
            if (json?.error) msg = json.error;
          } catch {
            try {
              const text = await resp.clone().text();
              if (text) msg = text;
            } catch {
              // ignore
            }
          }
        }
        throw new Error(msg);
      }
      toast({
        title: "Success!",
        description: "Discord account unlinked successfully."
      });
      queryClient.invalidateQueries({
        queryKey: ['profile']
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to unlink Discord account.";
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };
  if (!isLinked) {
    return <Button variant="ghost" size="sm" onClick={handleLinkDiscord} className="gap-2 font-geist tracking-tight font-medium bg-[#5765F2] hover:bg-[#5765F2]/90 text-white border-0 rounded-md">
        <img alt="Discord" className="w-4 h-4" src="/lovable-uploads/174e0985-7b27-4c11-ba67-ffb21fb24b3c.webp" />
        Connect Discord
      </Button>;
  }
  return <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 font-geist tracking-tight text-destructive hover:text-destructive hover:bg-destructive/10">
          <Unlink className="h-4 w-4" />
          Unlink Discord
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0b0b0b] border">
        <DialogHeader>
          <DialogTitle>Discord Account Linked</DialogTitle>
          <DialogDescription>
            Your Discord account is currently linked to your Virality profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {discordUsername && <div className="p-4 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-3">
                <img src={discordAvatar || discordIcon} alt="Discord" className="w-12 h-12 rounded-full object-cover" />
                <div className="flex-1">
                  <div className="font-medium">{discordUsername}</div>
                  <div className="text-xs text-muted-foreground">Connected</div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleUnlinkDiscord} disabled={loading} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Unlink Discord account">
                  <Unlink className="h-4 w-4" />
                </Button>
              </div>
            </div>}
        </div>
      </DialogContent>
    </Dialog>;
}