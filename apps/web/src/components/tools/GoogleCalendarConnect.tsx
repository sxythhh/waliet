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
import { Calendar, RefreshCw, Unlink, Check, Loader2 } from "lucide-react";

interface GoogleCalendarConnectProps {
  workspaceId: string;
  isConnected: boolean;
  calendarName?: string | null;
  connectedAt?: string | null;
  onSuccess?: () => void;
}

export function GoogleCalendarConnect({
  workspaceId,
  isConnected,
  calendarName,
  connectedAt,
  onSuccess,
}: GoogleCalendarConnectProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to connect Google Calendar.",
        });
        return;
      }

      const redirectUri = `${window.location.origin}/google/calendar-callback`;

      // Get the OAuth URL from the Edge Function
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: {
          action: "get_auth_url",
          workspace_id: workspaceId,
          redirect_uri: redirectUri,
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to get authorization URL");
      }

      if (!data?.auth_url) {
        throw new Error("No authorization URL returned");
      }

      // Store state for CSRF protection
      sessionStorage.setItem("google_calendar_oauth_state", data.state);
      sessionStorage.setItem("google_calendar_workspace_id", workspaceId);

      // Open Google OAuth in a popup
      const popup = window.open(
        data.auth_url,
        "Google Calendar OAuth",
        "width=500,height=700"
      );

      // Listen for OAuth completion
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "google-calendar-oauth-success") {
          window.removeEventListener("message", handleMessage);
          popup?.close();
          toast({
            title: "Success!",
            description: `Google Calendar "${event.data.calendarName}" connected successfully.`,
          });
          queryClient.invalidateQueries({ queryKey: ["workspace"] });
          queryClient.invalidateQueries({ queryKey: ["tools-workspace"] });
          setOpen(false);
          onSuccess?.();
        } else if (event.data.type === "google-calendar-oauth-error") {
          window.removeEventListener("message", handleMessage);
          popup?.close();
          toast({
            variant: "destructive",
            title: "Error",
            description: event.data.error || "Failed to connect Google Calendar.",
          });
        }
      };

      window.addEventListener("message", handleMessage);

      // Cleanup on popup close
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          window.removeEventListener("message", handleMessage);
          setLoading(false);
        }
      }, 500);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect Google Calendar.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.functions.invoke("google-calendar-disconnect", {
        body: { workspace_id: workspaceId },
        headers: session?.session?.access_token
          ? { Authorization: `Bearer ${session.session.access_token}` }
          : undefined,
      });

      if (error) {
        throw new Error(error.message || "Failed to disconnect Google Calendar");
      }

      toast({
        title: "Success!",
        description: "Google Calendar disconnected successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["workspace"] });
      queryClient.invalidateQueries({ queryKey: ["tools-workspace"] });
      setOpen(false);
      onSuccess?.();
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect Google Calendar.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const authHeaders = session?.session?.access_token
        ? { Authorization: `Bearer ${session.session.access_token}` }
        : undefined;

      const { data, error } = await supabase.functions.invoke("google-calendar-sync", {
        body: {
          action: "pull_events",
          workspace_id: workspaceId,
        },
        headers: authHeaders,
      });

      if (error) {
        throw new Error(error.message || "Failed to sync events");
      }

      // Handle sync token expired error
      if (data?.retry) {
        // Retry once with fresh sync
        const { data: retryData, error: retryError } = await supabase.functions.invoke("google-calendar-sync", {
          body: {
            action: "pull_events",
            workspace_id: workspaceId,
          },
          headers: authHeaders,
        });

        if (retryError) {
          throw new Error(retryError.message || "Failed to sync events");
        }

        toast({
          title: "Sync Complete",
          description: `Created: ${retryData?.created || 0}, Updated: ${retryData?.updated || 0}, Deleted: ${retryData?.deleted || 0}`,
        });
      } else {
        toast({
          title: "Sync Complete",
          description: `Created: ${data?.created || 0}, Updated: ${data?.updated || 0}, Deleted: ${data?.deleted || 0}`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["tools-events"] });
      onSuccess?.();
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync events.",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (!isConnected) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleConnect}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Calendar className="h-4 w-4" />
        )}
        Connect Google Calendar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={syncing}
        className="gap-2"
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Sync
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground text-xs truncate max-w-[120px]">
              {calendarName || "Connected"}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Google Calendar Connected</DialogTitle>
            <DialogDescription>
              Your workspace calendar is synced with Google Calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="p-4 rounded-lg bg-muted/20 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{calendarName}</div>
                  <div className="text-xs text-muted-foreground">
                    {connectedAt
                      ? `Connected ${new Date(connectedAt).toLocaleDateString()}`
                      : "Connected"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 gap-2"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                Disconnect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
