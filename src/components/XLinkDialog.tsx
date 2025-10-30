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
import xLogo from "@/assets/x-logo.png";

interface XLinkDialogProps {
  userId: string;
  twitterUsername?: string;
  onSuccess?: () => void;
}

export function XLinkDialog({ userId, twitterUsername, onSuccess }: XLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isLinked = !!twitterUsername;

  const handleLinkX = () => {
    const TWITTER_CLIENT_ID = import.meta.env.VITE_SUPABASE_URL?.includes('upiypxzjaagithghxayv') 
      ? 'YOUR_TWITTER_CLIENT_ID' // Will be added from secrets
      : 'YOUR_TWITTER_CLIENT_ID';
    
    const REDIRECT_URI = `${window.location.origin}/x/callback`;
    const STATE = btoa(JSON.stringify({ userId }));
    
    // Twitter OAuth 2.0 with PKCE
    const codeVerifier = 'challenge'; // In production, generate proper PKCE
    const codeChallenge = 'challenge';
    
    const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?` +
      `client_id=${YXNfUndDN1BXZFZCOVhJMjFQaWQ6MTpjaQ}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=tweet.read%20users.read&` +
      `state=${STATE}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=plain`;

    // Open X OAuth in a popup
    const popup = window.open(
      twitterAuthUrl,
      'X OAuth',
      'width=500,height=700'
    );

    // Listen for OAuth completion
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'x-oauth-success') {
        popup?.close();
        toast({
          title: "Success!",
          description: "X account linked successfully."
        });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        setOpen(false);
        onSuccess?.();
      } else if (event.data.type === 'x-oauth-error') {
        popup?.close();
        toast({
          variant: "destructive",
          title: "Error",
          description: event.data.error || "Failed to link X account."
        });
      }
    };

    window.addEventListener('message', handleMessage);
  };

  const handleUnlinkX = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('x-oauth', {
        body: { action: 'disconnect', userId }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "X account unlinked successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to unlink X account."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isLinked ? "outline" : "default"} size="sm">
          {isLinked ? "Manage X" : "Link X"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0b0b0b] border">
        <DialogHeader>
          <DialogTitle>
            {isLinked ? "X Account Linked" : "Link X Account"}
          </DialogTitle>
          <DialogDescription>
            {isLinked 
              ? "Your X account is currently linked to your Virality profile."
              : "Link your X account to enable additional features and connect with the community."
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {isLinked && twitterUsername && (
            <div className="p-4 rounded-lg bg-muted/20 border border-primary/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <img src={xLogo} alt="X" className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-medium">@{twitterUsername}</div>
                  <div className="text-xs text-muted-foreground">Connected</div>
                </div>
              </div>
            </div>
          )}

          {!isLinked && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                By linking your X account, you'll be able to access exclusive features and connect with other creators in the Virality community.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {isLinked ? (
              <>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleUnlinkX}
                  disabled={loading}
                >
                  {loading ? "Unlinking..." : "Unlink X"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="flex-1"
                  onClick={handleLinkX}
                  disabled={loading}
                >
                  Link X Account
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
