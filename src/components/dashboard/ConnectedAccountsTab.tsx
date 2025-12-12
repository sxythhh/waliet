import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";

interface ConnectedAccount {
  id: string;
  social_account_id: string;
  campaign_id: string;
  connected_at: string;
  social_accounts: {
    username: string;
    platform: string;
  };
  campaigns: {
    title: string;
    brand_name: string;
  };
}

export function ConnectedAccountsTab() {
  const [connections, setConnections] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("social_account_campaigns")
      .select(`
        *,
        social_accounts (
          username,
          platform
        ),
        campaigns (
          title,
          brand_name
        )
      `)
      .eq("social_accounts.user_id", user.id)
      .eq("status", "active")
      .order("connected_at", { ascending: false });

    if (!error && data) {
      setConnections(data as any);
    }

    setLoading(false);
  };

  const handleDisconnect = async (connectionId: string, socialAccountId: string, campaignId: string, accountName: string, campaignName: string) => {
    const { error } = await supabase
      .from("social_account_campaigns")
      .update({ 
        status: "disconnected",
        disconnected_at: new Date().toISOString()
      })
      .eq("id", connectionId);

    if (error) {
      toast.error("Failed to disconnect account");
      return;
    }

    // Stop tracking in Shortimize (non-blocking)
    try {
      await supabase.functions.invoke('untrack-shortimize-account', {
        body: {
          campaignId,
          socialAccountId,
        },
      });
    } catch (err) {
      console.error('Failed to untrack from Shortimize:', err);
    }

    toast.success(`Disconnected ${accountName} from ${campaignName}`);
    fetchConnections();
  };

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokLogoBlack : tiktokLogo;
      case "instagram":
        return isLightMode ? instagramLogoBlack : instagramLogo;
      case "youtube":
        return isLightMode ? youtubeLogoBlack : youtubeLogo;
      default:
        return null;
    }
  };

  // Group connections by social account
  const groupedConnections = connections.reduce((acc, conn) => {
    const key = conn.social_account_id;
    if (!acc[key]) {
      acc[key] = {
        account: conn.social_accounts,
        campaigns: [],
      };
    }
    acc[key].campaigns.push({
      id: conn.id,
      campaign_id: conn.campaign_id,
      campaign: conn.campaigns,
      connected_at: conn.connected_at,
    });
    return acc;
  }, {} as Record<string, any>);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading connected accounts...</p>
      </div>
    );
  }

  if (Object.keys(groupedConnections).length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No connected accounts yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          Join campaigns to see your connected accounts here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Connected Accounts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage which social accounts are connected to which campaigns
        </p>
      </div>

      <div className="grid gap-4">
        {Object.entries(groupedConnections).map(([accountId, data]) => {
          const platformIcon = getPlatformIcon(data.account.platform);
          
          return (
            <Card key={accountId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {platformIcon && (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <img src={platformIcon} alt={data.account.platform} className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{data.account.username}</p>
                    <p className="text-sm font-normal text-muted-foreground capitalize">
                      {data.account.platform}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-3">
                    Connected to {data.campaigns.length} campaign{data.campaigns.length !== 1 ? 's' : ''}:
                  </p>
                  {data.campaigns.map((campaign: any) => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{campaign.campaign.title}</p>
                        <p className="text-xs text-muted-foreground">{campaign.campaign.brand_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Connected: {new Date(campaign.connected_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDisconnect(
                            campaign.id,
                            accountId,
                            campaign.campaign_id,
                            data.account.username,
                            campaign.campaign.title
                          )
                        }
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
