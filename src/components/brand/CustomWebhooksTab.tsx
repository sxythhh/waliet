import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Plus, Webhook, MoreVertical, Trash2, Copy, ExternalLink, CheckCircle2, XCircle, Eye, EyeOff, RefreshCw, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface CustomWebhooksTabProps {
  brandId: string;
}

interface Webhook {
  id: string;
  name: string;
  endpoint_url: string;
  secret_key: string;
  api_version: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_status_code: number | null;
  failure_count: number;
  created_at: string;
}

interface WebhookLog {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  success: boolean;
  duration_ms: number | null;
  created_at: string;
}

const WEBHOOK_EVENTS = [
  { id: "application_received", label: "Application Received", description: "When a creator applies to a boost" },
  { id: "application_accepted", label: "Application Accepted", description: "When you accept a creator's application" },
  { id: "application_rejected", label: "Application Rejected", description: "When you reject a creator's application" },
  { id: "creator_waitlisted", label: "Creator Waitlisted", description: "When a creator is added to waitlist" },
  { id: "video_submitted", label: "Video Submitted", description: "When a creator submits a video" },
  { id: "video_approved", label: "Video Approved", description: "When you approve a submitted video" },
  { id: "video_rejected", label: "Video Rejected", description: "When you reject a submitted video" },
  { id: "payment_initiated", label: "Payment Initiated", description: "When a payment is started" },
  { id: "payment_completed", label: "Payment Completed", description: "When a payment is processed" },
  { id: "boost_created", label: "Boost Created", description: "When a new boost is created" },
  { id: "boost_paused", label: "Boost Paused", description: "When a boost is paused" },
  { id: "boost_resumed", label: "Boost Resumed", description: "When a boost is resumed" },
  { id: "boost_ended", label: "Boost Ended", description: "When a boost ends" },
  { id: "message_received", label: "Message Received", description: "When you receive a new message" },
];

export function CustomWebhooksTab({ brandId }: CustomWebhooksTabProps) {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Create form state
  const [newWebhook, setNewWebhook] = useState({
    name: "",
    endpoint_url: "",
    api_version: "v1",
    events: [] as string[],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const fetchWebhooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        // @ts-expect-error - brand_webhooks table exists but not in generated types
        .from("brand_webhooks")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false }) as unknown as { data: Webhook[] | null; error: Error | null });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      toast.error("Failed to load webhooks");
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreateWebhook = async () => {
    if (!newWebhook.name.trim()) {
      toast.error("Please enter a webhook name");
      return;
    }
    if (!newWebhook.endpoint_url.trim()) {
      toast.error("Please enter an endpoint URL");
      return;
    }
    try {
      new URL(newWebhook.endpoint_url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    if (newWebhook.events.length === 0) {
      toast.error("Please select at least one event");
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase
        // @ts-expect-error - brand_webhooks table exists but not in generated types
        .from("brand_webhooks")
        .insert({
          brand_id: brandId,
          name: newWebhook.name.trim(),
          endpoint_url: newWebhook.endpoint_url.trim(),
          api_version: newWebhook.api_version,
          events: newWebhook.events,
          created_by: user?.id,
        }) as unknown as { error: Error | null });

      if (error) throw error;

      toast.success("Webhook created successfully");
      setShowCreateDialog(false);
      setNewWebhook({ name: "", endpoint_url: "", api_version: "v1", events: [] });
      fetchWebhooks();
    } catch (error) {
      console.error("Error creating webhook:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create webhook";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleWebhook = async (webhook: Webhook) => {
    try {
      const { error } = await (supabase
        // @ts-expect-error - brand_webhooks table exists but not in generated types
        .from("brand_webhooks")
        .update({ is_active: !webhook.is_active })
        .eq("id", webhook.id) as unknown as { error: Error | null });

      if (error) throw error;

      setWebhooks(webhooks.map(w =>
        w.id === webhook.id ? { ...w, is_active: !w.is_active } : w
      ));
      toast.success(webhook.is_active ? "Webhook disabled" : "Webhook enabled");
    } catch (error) {
      console.error("Error toggling webhook:", error);
      toast.error("Failed to update webhook");
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    try {
      const { error } = await (supabase
        // @ts-expect-error - brand_webhooks table exists but not in generated types
        .from("brand_webhooks")
        .delete()
        .eq("id", webhookId) as unknown as { error: Error | null });

      if (error) throw error;

      setWebhooks(webhooks.filter(w => w.id !== webhookId));
      toast.success("Webhook deleted");
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast.error("Failed to delete webhook");
    }
  };

  const handleViewLogs = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setShowLogsDialog(true);
    setLogsLoading(true);

    try {
      const { data, error } = await (supabase
        // @ts-expect-error - webhook_logs table exists but not in generated types
        .from("webhook_logs")
        .select("*")
        .eq("webhook_id", webhook.id)
        .order("created_at", { ascending: false })
        .limit(50) as unknown as { data: WebhookLog[] | null; error: Error | null });

      if (error) throw error;
      setWebhookLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast.error("Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  };

  const handleTestWebhook = async (webhook: Webhook) => {
    try {
      const testPayload = {
        event: "test",
        timestamp: new Date().toISOString(),
        data: {
          message: "This is a test webhook from Virality",
          webhook_id: webhook.id,
        },
      };

      const response = await fetch(webhook.endpoint_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": webhook.secret_key,
          "X-Webhook-Event": "test",
        },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        toast.success("Test webhook sent successfully");
      } else {
        toast.error(`Test failed with status ${response.status}`);
      }
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast.error("Failed to send test webhook");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleEventSelection = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const toggleAllEvents = () => {
    if (newWebhook.events.length === WEBHOOK_EVENTS.length) {
      setNewWebhook(prev => ({ ...prev, events: [] }));
    } else {
      setNewWebhook(prev => ({ ...prev, events: WEBHOOK_EVENTS.map(e => e.id) }));
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/50 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Webhook className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium tracking-[-0.5px]">Custom Webhooks</h3>
            <p className="text-xs text-muted-foreground tracking-[-0.5px]">
              Send real-time notifications to your own endpoints
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} size="sm" variant="outline" className="gap-1.5 h-8 font-inter tracking-[-0.5px]">
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>

      {webhooks.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-border/50 rounded-lg">
          <p className="text-sm text-muted-foreground tracking-[-0.5px]">
            No webhooks configured yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((webhook) => (
            <div key={webhook.id} className={`p-3 rounded-lg bg-muted/30 ${!webhook.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium tracking-[-0.5px] truncate">{webhook.name}</span>
                    {webhook.is_active ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] h-5">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5">Off</Badge>
                    )}
                    {webhook.failure_count > 0 && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[10px] h-5 gap-1">
                        <AlertCircle className="h-2.5 w-2.5" />
                        {webhook.failure_count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono truncate">{webhook.endpoint_url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {webhook.events.slice(0, 3).map((event) => (
                      <Badge key={event} variant="secondary" className="text-[10px] h-5 tracking-[-0.3px]">
                        {event.replace(/_/g, " ")}
                      </Badge>
                    ))}
                    {webhook.events.length > 3 && (
                      <Badge variant="secondary" className="text-[10px] h-5 tracking-[-0.3px]">
                        +{webhook.events.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Switch
                    checked={webhook.is_active}
                    onCheckedChange={() => handleToggleWebhook(webhook)}
                    className="scale-90"
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleTestWebhook(webhook)} className="gap-2 text-xs">
                        <Send className="h-3.5 w-3.5" />
                        Send Test
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleViewLogs(webhook)} className="gap-2 text-xs">
                        <RefreshCw className="h-3.5 w-3.5" />
                        View Logs
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => copyToClipboard(webhook.secret_key, "Secret key")} className="gap-2 text-xs">
                        <Copy className="h-3.5 w-3.5" />
                        Copy Secret
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteWebhook(webhook.id)}
                        className="gap-2 text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">Create Webhook</DialogTitle>
            <DialogDescription className="font-inter tracking-[-0.5px]">
              Configure a webhook endpoint to receive event notifications
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-xs font-inter tracking-[-0.3px]">Name</Label>
              <Input
                value={newWebhook.name}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My webhook"
                className="font-inter tracking-[-0.3px]"
              />
            </div>

            {/* Endpoint URL */}
            <div className="space-y-2">
              <Label className="text-xs font-inter tracking-[-0.3px]">Endpoint URL</Label>
              <Input
                value={newWebhook.endpoint_url}
                onChange={(e) => setNewWebhook(prev => ({ ...prev, endpoint_url: e.target.value }))}
                placeholder="https://your-api.com/webhook"
                className="font-mono text-sm"
              />
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400 font-inter tracking-[-0.3px]">
                  This URL should accept a raw JSON payload. Discord or Slack URLs will not work.
                </p>
              </div>
            </div>

            {/* API Version */}
            <div className="space-y-2">
              <Label className="text-xs font-inter tracking-[-0.3px]">API Version</Label>
              <Select
                value={newWebhook.api_version}
                onValueChange={(value) => setNewWebhook(prev => ({ ...prev, api_version: value }))}
              >
                <SelectTrigger className="font-inter tracking-[-0.3px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v1" className="font-inter tracking-[-0.3px]">V1</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Events */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-inter tracking-[-0.3px]">Events</Label>
                <button
                  onClick={toggleAllEvents}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-inter tracking-[-0.3px]"
                >
                  <Checkbox
                    checked={newWebhook.events.length === WEBHOOK_EVENTS.length}
                    className="h-3.5 w-3.5 rounded-[3px]"
                  />
                  All
                </button>
              </div>
              <ScrollArea className="h-[240px] rounded-lg border border-border p-3">
                <div className="space-y-1">
                  {WEBHOOK_EVENTS.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => toggleEventSelection(event.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                        newWebhook.events.includes(event.id)
                          ? "bg-primary/10"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        checked={newWebhook.events.includes(event.id)}
                        className="h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium font-inter tracking-[-0.3px]">{event.label}</p>
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">{event.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                {newWebhook.events.length} event{newWebhook.events.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="font-inter tracking-[-0.5px]">
                Cancel
              </Button>
              <Button onClick={handleCreateWebhook} disabled={isCreating} className="font-inter tracking-[-0.5px]">
                {isCreating ? "Creating..." : "Create Webhook"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-inter tracking-[-0.5px]">Webhook Logs</DialogTitle>
            <DialogDescription className="font-inter tracking-[-0.5px]">
              {selectedWebhook?.name} - Recent delivery attempts
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px]">
            {logsLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : webhookLogs.length === 0 ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">No logs yet</p>
              </div>
            ) : (
              <div className="space-y-2 p-1">
                {webhookLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-border bg-card/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {log.success ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <Badge variant="secondary" className="text-xs font-inter tracking-[-0.3px]">
                          {log.event_type}
                        </Badge>
                        {log.response_status && (
                          <span className={`text-xs font-mono ${
                            log.response_status >= 200 && log.response_status < 300
                              ? "text-emerald-500"
                              : "text-red-500"
                          }`}>
                            {log.response_status}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                        {format(new Date(log.created_at), "MMM d, HH:mm:ss")}
                      </span>
                    </div>
                    {log.duration_ms && (
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                        Duration: {log.duration_ms}ms
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
