import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Settings, Terminal, Hash, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DiscordBotConfigSectionProps {
  brandId: string;
}

interface BotConfig {
  id: string;
  guild_id: string;
  is_active: boolean;
  command_prefix: string;
  stats_channel_id: string | null;
  log_channel_id: string | null;
}

export function DiscordBotConfigSection({ brandId }: DiscordBotConfigSectionProps) {
  const [config, setConfig] = useState<BotConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [guildId, setGuildId] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [commandPrefix, setCommandPrefix] = useState("/");
  const [statsChannelId, setStatsChannelId] = useState("");
  const [logChannelId, setLogChannelId] = useState("");

  useEffect(() => {
    fetchConfig();
  }, [brandId]);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("discord_bot_config" as any)
        .select("*")
        .eq("brand_id", brandId)
        .maybeSingle() as any);

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setConfig(data as BotConfig);
        setGuildId((data as any).guild_id);
        setIsActive((data as any).is_active);
        setCommandPrefix((data as any).command_prefix || "/");
        setStatsChannelId((data as any).stats_channel_id || "");
        setLogChannelId((data as any).log_channel_id || "");
      }
    } catch (error) {
      console.error("Error fetching bot config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!guildId) {
      toast.error("Please enter a Discord Server ID");
      return;
    }

    setIsSaving(true);
    try {
      const configData = {
        brand_id: brandId,
        guild_id: guildId,
        is_active: isActive,
        command_prefix: commandPrefix,
        stats_channel_id: statsChannelId || null,
        log_channel_id: logChannelId || null,
      };

      if (config?.id) {
        const { error } = await (supabase
          .from("discord_bot_config" as any)
          .update(configData)
          .eq("id", config.id) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("discord_bot_config" as any)
          .insert(configData) as any);
        if (error) throw error;
      }

      toast.success("Bot configuration saved");
      fetchConfig();
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast.error(error.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const availableCommands = [
    { name: "stats", description: "View campaign statistics" },
    { name: "creators", description: "List top creators" },
    { name: "campaign", description: "Get campaign details" },
    { name: "earnings", description: "Check earnings summary" },
    { name: "leaderboard", description: "View performance leaderboard" },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Bot Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Bot Configuration
          </CardTitle>
          <CardDescription>
            Configure the Discord bot to enable stats commands in your server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Bot Status</Label>
              <p className="text-xs text-muted-foreground">Enable or disable the bot</p>
            </div>
            <div className="flex items-center gap-2">
              {isActive ? (
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Inactive
                </Badge>
              )}
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guildId">Discord Server ID</Label>
            <Input
              id="guildId"
              placeholder="123456789012345678"
              value={guildId}
              onChange={(e) => setGuildId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Right-click your server name and select "Copy Server ID" (requires Developer Mode)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="statsChannel">Stats Channel ID</Label>
              <Input
                id="statsChannel"
                placeholder="Channel for stats responses"
                value={statsChannelId}
                onChange={(e) => setStatsChannelId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logChannel">Log Channel ID</Label>
              <Input
                id="logChannel"
                placeholder="Channel for audit logs"
                value={logChannelId}
                onChange={(e) => setLogChannelId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Available Commands
          </CardTitle>
          <CardDescription>
            Commands your team can use in Discord
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availableCommands.map((cmd) => (
              <div
                key={cmd.name}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-primary">
                    {commandPrefix}{cmd.name}
                  </code>
                </div>
                <span className="text-sm text-muted-foreground">{cmd.description}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Bot must be added to your server and configured to use these commands.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
