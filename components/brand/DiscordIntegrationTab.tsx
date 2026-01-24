import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageLoading } from "@/components/ui/loading-bar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, Send, UserPlus, DollarSign, Video, ExternalLink, Webhook } from "lucide-react";
import { toast } from "sonner";
import discordLogo from "@/assets/discord-logo.png";
import { CustomWebhooksTab } from "./CustomWebhooksTab";

interface DiscordIntegrationTabProps {
  brandId: string;
}

interface BrandSettings {
  discord_webhook_url: string | null;
  notify_new_application: boolean;
  notify_new_sale: boolean;
  notify_new_message: boolean;
}

export function DiscordIntegrationTab({ brandId }: DiscordIntegrationTabProps) {
  const [activeTab, setActiveTab] = useState("webhooks");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [notifyApplication, setNotifyApplication] = useState(true);
  const [notifySale, setNotifySale] = useState(true);
  const [notifyMessage, setNotifyMessage] = useState(true);
  const [brandName, setBrandName] = useState("");

  useEffect(() => {
    fetchSettings();
  }, [brandId]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("name, discord_webhook_url, notify_new_application, notify_new_sale, notify_new_message")
        .eq("id", brandId)
        .single();

      if (error) throw error;

      setBrandName(data.name || "");
      setWebhookUrl(data.discord_webhook_url || "");
      setNotifyApplication(data.notify_new_application ?? true);
      setNotifySale(data.notify_new_sale ?? true);
      setNotifyMessage(data.notify_new_message ?? true);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({
          discord_webhook_url: webhookUrl || null,
          notify_new_application: notifyApplication,
          notify_new_sale: notifySale,
          notify_new_message: notifyMessage
        })
        .eq("id", brandId);

      if (error) throw error;

      toast.success("Discord settings saved");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL first");
      return;
    }

    setIsTesting(true);
    try {
      const testEmbed = {
        content: "",
        embeds: [
          {
            title: "Test Notification",
            description: `This is a test notification from **${brandName}** on Virality.`,
            color: 5793266,
            fields: [
              {
                name: "Status",
                value: "Your Discord webhook is configured correctly!",
                inline: false
              }
            ],
            footer: {
              text: "Virality Notifications"
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(testEmbed)
      });

      if (!response.ok) {
        throw new Error("Webhook request failed");
      }

      toast.success("Test notification sent! Check your Discord channel.");
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast.error("Failed to send test notification. Please check your webhook URL.");
    } finally {
      setIsTesting(false);
    }
  };

  const isWebhookConfigured = !!webhookUrl && webhookUrl.startsWith("https://discord.com/api/webhooks/");

  if (isLoading) {
    return <PageLoading />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <img src={discordLogo} alt="Discord" className="w-12 h-12 rounded-lg" />
        <div>
          <h2 className="text-lg font-semibold">Discord Integration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Discord server for notifications, role sync, and analytics
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
          <TabsTrigger value="webhooks">Discord</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhook Configuration
              </CardTitle>
              <CardDescription>
                Set up a Discord webhook to receive notifications about your brand's activity
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhook"
                    placeholder="https://discord.com/api/webhooks/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleTestWebhook}
                    disabled={!isWebhookConfigured || isTesting}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Test
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create a webhook in your Discord server settings under Integrations &gt; Webhooks.{" "}
                  <a
                    href="https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Learn how
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                {isWebhookConfigured ? (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Not configured
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Types</CardTitle>
              <CardDescription>
                Choose which events trigger Discord notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <UserPlus className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">New Applications</p>
                      <p className="text-xs text-muted-foreground">
                        When creators apply to your campaigns
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifyApplication}
                    onCheckedChange={setNotifyApplication}
                    disabled={!isWebhookConfigured}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Video className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Video Submissions</p>
                      <p className="text-xs text-muted-foreground">
                        When creators submit new videos
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifySale}
                    onCheckedChange={setNotifySale}
                    disabled={!isWebhookConfigured}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Payout Completions</p>
                      <p className="text-xs text-muted-foreground">
                        When payouts are processed
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={notifyMessage}
                    onCheckedChange={setNotifyMessage}
                    disabled={!isWebhookConfigured}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="mt-4 -mx-6 -mb-6">
          <CustomWebhooksTab brandId={brandId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
