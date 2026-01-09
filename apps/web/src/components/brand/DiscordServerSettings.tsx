import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Unlink, Server, RefreshCw } from "lucide-react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DiscordServerSettingsProps {
  brandId: string;
  subscriptionStatus?: string | null;
  subscriptionPlan?: string | null;
  onServerChange?: () => void;
}

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
}

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  canAssign: boolean;
}

export function DiscordServerSettings({
  brandId,
  subscriptionStatus,
  subscriptionPlan,
  onServerChange,
}: DiscordServerSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [guild, setGuild] = useState<GuildInfo | null>(null);
  const [connectedAt, setConnectedAt] = useState<string | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  console.log('[DiscordServerSettings] Component rendered with brandId:', brandId);

  useEffect(() => {
    console.log('[DiscordServerSettings] useEffect triggered, calling fetchGuildInfo');
    fetchGuildInfo();
  }, [brandId]);

  const fetchGuildInfo = async () => {
    setIsLoading(true);
    try {
      // Fetch brand info
      const brandResult = await supabase
        .from('brands')
        .select('discord_guild_id, discord_guild_name, discord_guild_icon, discord_bot_added_at, subscription_status, subscription_plan')
        .eq('id', brandId)
        .single();

      if (brandResult.error) throw brandResult.error;
      const brand = brandResult.data;

      // Try to check for custom plan (may fail due to RLS, that's ok)
      let hasCustom = false;
      try {
        const customPlanResult = await supabase
          .from('custom_brand_plans')
          .select('id')
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .maybeSingle();
        hasCustom = !!customPlanResult.data;
      } catch {
        // Custom plan check failed (likely RLS), continue without it
        console.log('[DiscordServerSettings] Custom plan check failed, continuing...');
      }

      // Determine if brand has an active plan
      const hasActiveStatus = brand?.subscription_status === 'active';
      const hasPlan = Boolean(brand?.subscription_plan);

      console.log('[DiscordServerSettings] Brand data:', {
        brandId,
        subscription_status: brand?.subscription_status,
        subscription_plan: brand?.subscription_plan,
        hasCustom,
        hasActiveStatus,
        hasPlan,
        result: hasActiveStatus || hasPlan || hasCustom
      });

      // Allow Discord if any plan indicator is present
      const activePlanResult = hasActiveStatus || hasPlan || hasCustom;
      console.log('[DiscordServerSettings] Setting hasActivePlan to:', activePlanResult);
      setHasActivePlan(activePlanResult);

      if (brand?.discord_guild_id) {
        setGuild({
          id: brand.discord_guild_id,
          name: brand.discord_guild_name || 'Unknown Server',
          icon: brand.discord_guild_icon,
        });
        setConnectedAt(brand.discord_bot_added_at);
      } else {
        setGuild(null);
        setConnectedAt(null);
      }
    } catch (error) {
      console.error('Error fetching guild info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async (guildId: string) => {
    setIsLoadingRoles(true);
    setRolesError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-discord-guild-roles', {
        body: { guildId, brandId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setRoles(data?.roles || []);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      setRolesError(err.message || 'Failed to fetch roles');
      setRoles([]);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  // Fetch roles when guild changes
  useEffect(() => {
    if (guild?.id) {
      fetchRoles(guild.id);
    } else {
      setRoles([]);
      setRolesError(null);
    }
  }, [guild?.id]);

  // Convert Discord color int to hex
  const colorToHex = (color: number): string => {
    if (color === 0) return '#99AAB5'; // Default Discord gray
    return `#${color.toString(16).padStart(6, '0')}`;
  };

  const handleConnectServer = async () => {
    if (!hasActivePlan) {
      toast.error('Upgrade to a paid plan to connect your Discord server');
      return;
    }

    setIsConnecting(true);
    try {
      const DISCORD_CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID;
      if (!DISCORD_CLIENT_ID) {
        throw new Error('Discord integration is not configured');
      }

      // Bot permissions: Administrator (8)
      const permissions = '8';
      const scopes = 'bot applications.commands';
      const redirectUri = `${window.location.origin}/discord/bot-callback`;
      const state = btoa(JSON.stringify({ brandId }));

      // Note: response_type=code requires "Requires OAuth2 Code Grant" to be ENABLED in Discord Developer Portal
      const oauthUrl = `https://discord.com/api/oauth2/authorize?` +
        `client_id=${DISCORD_CLIENT_ID}` +
        `&permissions=${permissions}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}`;

      // Open in popup
      const popup = window.open(oauthUrl, 'Discord Bot OAuth', 'width=500,height=800');

      // Listen for OAuth completion
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'discord-bot-oauth-success') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          toast.success('Discord server connected successfully!');
          await fetchGuildInfo();
          onServerChange?.();
          setIsConnecting(false);
        } else if (event.data.type === 'discord-bot-oauth-error') {
          window.removeEventListener('message', handleMessage);
          popup?.close();
          toast.error(event.data.error || 'Failed to connect Discord server');
          setIsConnecting(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback timeout
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        setIsConnecting(false);
      }, 120000); // 2 minute timeout
    } catch (error: any) {
      console.error('Error connecting Discord server:', error);
      toast.error(error.message || 'Failed to connect Discord server');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const { error } = await supabase.functions.invoke('discord-bot-oauth', {
        body: {
          action: 'disconnect',
          brandId,
        },
      });

      if (error) throw error;

      setGuild(null);
      setConnectedAt(null);
      setDisconnectDialogOpen(false);
      toast.success('Discord server disconnected');
      onServerChange?.();
    } catch (error: any) {
      console.error('Error disconnecting Discord server:', error);
      toast.error(error.message || 'Failed to disconnect Discord server');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-sm font-medium tracking-[-0.3px]">Discord Server</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Connect your Discord server to enable creator auto-join</p>
      </div>

      {!hasActivePlan && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-border/50 dark:border-white/[0.06] bg-card/50">
          <p className="text-sm text-muted-foreground tracking-[-0.3px]">
            Discord integration requires an active subscription. Upgrade your plan to connect your server.
          </p>
        </div>
      )}

      {guild ? (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {guild.icon ? (
                <img
                  src={guild.icon}
                  alt={guild.name}
                  className="w-12 h-12 rounded-lg"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[#5865F2]/20 flex items-center justify-center">
                  <Server className="w-6 h-6 text-[#5865F2]" />
                </div>
              )}
              <div>
                <span className="font-medium font-inter tracking-[-0.5px]">{guild.name}</span>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                  Server ID: {guild.id}
                </p>
                {connectedAt && (
                  <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
                    Connected {new Date(connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchGuildInfo}
                className="text-neutral-500 hover:text-neutral-600 hover:bg-transparent"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDisconnectDialogOpen(true)}
                className="text-neutral-500 hover:text-neutral-600 hover:bg-transparent"
              >
                <Unlink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="px-4 py-3 bg-muted/30 border-t border-border/50">
            <div className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
              <p className="font-medium text-foreground mb-1">Role Assignment Setup</p>
              <p>
                To assign roles to creators, make sure the bot's role is positioned <strong>above</strong> the roles
                you want to assign in your Discord server's role settings. Roles at a higher position can manage roles below them.
              </p>
            </div>
          </div>

          {/* Server Roles Section */}
          <div className="px-4 py-3 border-t border-border/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-foreground font-inter tracking-[-0.5px]">Server Roles</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-neutral-500 hover:text-neutral-600 hover:bg-transparent"
                onClick={() => guild && fetchRoles(guild.id)}
                disabled={isLoadingRoles}
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRoles ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {isLoadingRoles ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            ) : rolesError ? (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-xs text-destructive font-inter tracking-[-0.5px]">{rolesError}</p>
              </div>
            ) : roles.length === 0 ? (
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] text-center">
                  No assignable roles found in this server.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: colorToHex(role.color) }}
                      />
                      <span className="text-xs font-inter tracking-[-0.5px]">{role.name}</span>
                    </div>
                    {role.canAssign ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-inter tracking-[-0.5px] bg-green-600 text-white">
                        <CheckCircleIcon style={{ fontSize: 12 }} />
                        Assignable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium font-inter tracking-[-0.5px] bg-amber-600 text-white">
                        <WarningIcon style={{ fontSize: 12 }} />
                        Bot role too low
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-2 font-inter tracking-[-0.5px]">
              {roles.filter(r => r.canAssign).length} of {roles.length} roles can be assigned by the bot.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-6 border-dashed">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
            </div>
            <h3 className="text-sm font-medium font-inter tracking-[-0.5px] mb-1">No Discord Server Connected</h3>
            <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mb-4 max-w-sm mx-auto">
              Connect your Discord server to automatically add creators when they join your campaigns or boosts.
            </p>
            <Button
              onClick={handleConnectServer}
              disabled={isConnecting || !hasActivePlan}
              className="bg-[#5865F2] hover:bg-[#4752C4] text-white font-inter tracking-[-0.5px]"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Add Bot to Server'
              )}
            </Button>
          </div>
        </Card>
      )}

      <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Discord Server?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your Discord server and remove Discord role settings from all your campaigns and boosts.
              Creators who have already joined will remain in your server, but new creators won't be automatically added.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
