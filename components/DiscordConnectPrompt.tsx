import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiscordConnectPromptProps {
  userId: string;
  hasDiscordConnected: boolean;
  campaignHasDiscord: boolean;
  className?: string;
  variant?: 'inline' | 'banner';
  onDismiss?: () => void;
  onConnected?: () => void;
}

export function DiscordConnectPrompt({
  userId,
  hasDiscordConnected,
  campaignHasDiscord,
  className = "",
  variant = 'inline',
  onDismiss,
  onConnected,
}: DiscordConnectPromptProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  // Don't show if user already has Discord connected or campaign doesn't require it
  if (hasDiscordConnected || !campaignHasDiscord) {
    return null;
  }

  const handleConnectDiscord = () => {
    const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
    if (!DISCORD_CLIENT_ID) {
      toast.error("Discord integration is not configured");
      return;
    }

    setIsConnecting(true);
    const REDIRECT_URI = `${window.location.origin}/discord/callback`;
    const STATE = btoa(JSON.stringify({ userId }));
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?` +
      `client_id=${DISCORD_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=identify%20email%20guilds.join&` +
      `state=${STATE}`;

    const popup = window.open(discordAuthUrl, 'Discord OAuth', 'width=500,height=700');

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === 'discord-oauth-success') {
        window.removeEventListener('message', handleMessage);
        popup?.close();
        toast.success("Discord account connected!");
        setIsConnecting(false);
        onConnected?.();
      } else if (event.data.type === 'discord-oauth-error') {
        window.removeEventListener('message', handleMessage);
        popup?.close();
        toast.error(event.data.error || "Failed to connect Discord");
        setIsConnecting(false);
      }
    };

    window.addEventListener('message', handleMessage);

    // Fallback timeout
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      setIsConnecting(false);
    }, 120000);
  };

  if (variant === 'banner') {
    return (
      <div className={`bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-lg p-3 ${className}`}>
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 text-[#5865F2] shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground font-inter tracking-[-0.5px]">
              Connect Discord to join the server
            </p>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-0.5">
              This campaign includes access to a Discord server. Connect your account to be automatically added.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleConnectDiscord}
              disabled={isConnecting}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-inter tracking-[-0.5px] text-xs h-8"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Alert className={`border-[#5865F2]/30 bg-[#5865F2]/5 ${className}`}>
      <svg className="h-4 w-4 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
      <AlertDescription className="flex items-center justify-between gap-2">
        <span className="text-xs font-inter tracking-[-0.5px]">
          Connect Discord to be added to the campaign's server
        </span>
        <Button
          size="sm"
          onClick={handleConnectDiscord}
          disabled={isConnecting}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-inter tracking-[-0.5px] text-xs h-7"
        >
          {isConnecting ? "..." : "Connect"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
