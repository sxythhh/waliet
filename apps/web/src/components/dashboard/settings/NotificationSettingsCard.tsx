import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotificationPreferences {
  // Email preferences
  notify_email_new_campaigns: boolean;
  notify_email_transactions: boolean;
  notify_email_weekly_roundup: boolean;
  notify_email_campaign_updates: boolean;
  notify_email_payout_status: boolean;
  // Discord preferences
  notify_discord_new_campaigns: boolean;
  notify_discord_transactions: boolean;
  notify_discord_campaign_updates: boolean;
  notify_discord_payout_status: boolean;
}

const defaultPreferences: NotificationPreferences = {
  notify_email_new_campaigns: true,
  notify_email_transactions: true,
  notify_email_weekly_roundup: true,
  notify_email_campaign_updates: true,
  notify_email_payout_status: true,
  notify_discord_new_campaigns: true,
  notify_discord_transactions: true,
  notify_discord_campaign_updates: true,
  notify_discord_payout_status: true,
};

export function NotificationSettingsCard() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasDiscord, setHasDiscord] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          notify_email_new_campaigns,
          notify_email_transactions,
          notify_email_weekly_roundup,
          notify_email_campaign_updates,
          notify_email_payout_status,
          notify_discord_new_campaigns,
          notify_discord_transactions,
          notify_discord_campaign_updates,
          notify_discord_payout_status,
          discord_id
        `)
        .eq("id", user.id)
        .single();

      if (error) {
        // If columns don't exist yet, use defaults
        console.log("Using default notification preferences");
        return;
      }

      if (data) {
        const prefs: NotificationPreferences = {
          notify_email_new_campaigns: data.notify_email_new_campaigns ?? true,
          notify_email_transactions: data.notify_email_transactions ?? true,
          notify_email_weekly_roundup: data.notify_email_weekly_roundup ?? true,
          notify_email_campaign_updates: data.notify_email_campaign_updates ?? true,
          notify_email_payout_status: data.notify_email_payout_status ?? true,
          notify_discord_new_campaigns: data.notify_discord_new_campaigns ?? true,
          notify_discord_transactions: data.notify_discord_transactions ?? true,
          notify_discord_campaign_updates: data.notify_discord_campaign_updates ?? true,
          notify_discord_payout_status: data.notify_discord_payout_status ?? true,
        };
        setPreferences(prefs);
        setOriginalPreferences(prefs);
        setHasDiscord(!!data.discord_id);
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update(preferences as any)
        .eq("id", user.id);

      if (error) throw error;

      setOriginalPreferences(preferences);
      toast.success("Notification preferences saved");
    } catch (error: any) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(preferences) !== JSON.stringify(originalPreferences);

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-6">
          <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const NotificationRow = ({
    label,
    description,
    emailKey,
    discordKey,
  }: {
    label: string;
    description: string;
    emailKey: keyof NotificationPreferences;
    discordKey?: keyof NotificationPreferences;
  }) => (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
          {description}
        </p>
      </div>
      <div className="flex items-center gap-6">
        <div className="w-14 flex justify-center">
          <Switch
            checked={preferences[emailKey]}
            onCheckedChange={(checked) => updatePreference(emailKey, checked)}
          />
        </div>
        {discordKey && (
          <div className="w-14 flex justify-center">
            <Switch
              checked={preferences[discordKey]}
              onCheckedChange={(checked) => updatePreference(discordKey, checked)}
              disabled={!hasDiscord}
            />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-6">
        <h3
          className="text-base font-semibold text-foreground mb-1"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        >
          Notifications
        </h3>
        <p
          className="text-sm text-muted-foreground mb-6"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        >
          Choose how you want to be notified about activity
        </p>

        {/* Header row */}
        <div className="flex items-center justify-end gap-6 mb-2 pr-2">
          <span className="text-xs text-muted-foreground w-14 text-center">Email</span>
          <span className="text-xs text-muted-foreground w-14 text-center">Discord</span>
        </div>

        <div className="space-y-0">
          <NotificationRow
            label="New Campaigns"
            description="When new campaign opportunities match your profile"
            emailKey="notify_email_new_campaigns"
            discordKey="notify_discord_new_campaigns"
          />
          <NotificationRow
            label="Transactions"
            description="When you receive payments or earnings"
            emailKey="notify_email_transactions"
            discordKey="notify_discord_transactions"
          />
          <NotificationRow
            label="Campaign Updates"
            description="Status changes for campaigns you've joined"
            emailKey="notify_email_campaign_updates"
            discordKey="notify_discord_campaign_updates"
          />
          <NotificationRow
            label="Payout Status"
            description="Updates about your payout requests"
            emailKey="notify_email_payout_status"
            discordKey="notify_discord_payout_status"
          />
          <NotificationRow
            label="Weekly Roundup"
            description="Summary of your weekly activity and earnings"
            emailKey="notify_email_weekly_roundup"
          />
        </div>

        {!hasDiscord && (
          <p className="text-xs text-muted-foreground mt-4" style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}>
            Connect your Discord account to receive Discord notifications.
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-white dark:bg-muted/30 flex items-center justify-between">
        <p
          className="text-sm text-muted-foreground"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        >
          {hasChanges ? "You have unsaved changes" : "Your notification preferences are saved"}
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasChanges || saving}
          onClick={handleSave}
          className="text-muted-foreground dark:border-transparent"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
