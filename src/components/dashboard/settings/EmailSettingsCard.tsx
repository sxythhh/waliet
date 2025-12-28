import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";

interface EmailSettingsCardProps {
  email: string;
  onChange: (email: string) => void;
  onSave: () => void;
  saving?: boolean;
  hasChanges?: boolean;
  subscribeToUpdates?: boolean;
  onSubscribeChange?: (checked: boolean) => void;
  subscriptionHasChanges?: boolean;
  onSaveSubscription?: () => void;
  savingSubscription?: boolean;
}

export function EmailSettingsCard({
  email,
  onChange,
  onSave,
  saving,
  hasChanges,
  subscribeToUpdates = true,
  onSubscribeChange,
  subscriptionHasChanges,
  onSaveSubscription,
  savingSubscription,
}: EmailSettingsCardProps) {
  const anyChanges = hasChanges || subscriptionHasChanges;
  const isLoading = saving || savingSubscription;

  const handleSave = () => {
    if (hasChanges) {
      onSave();
    }
    if (subscriptionHasChanges && onSaveSubscription) {
      onSaveSubscription();
    }
  };

  return (
    <SettingsCard
      title="Your Email"
      description="This will be the email you use to log in to Virality and receive notifications. A confirmation is required for changes."
      footerContent={
        <div className="flex items-center gap-3">
          <Switch
            checked={subscribeToUpdates}
            onCheckedChange={onSubscribeChange}
          />
          <span
            className="text-sm text-muted-foreground"
            style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
          >
            Subscribed to product updates
          </span>
        </div>
      }
      saveButton={{
        disabled: !anyChanges || isLoading,
        loading: isLoading,
        onClick: handleSave,
      }}
    >
      <Input
        type="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
        className="h-11 max-w-md bg-background border border-border focus-visible:ring-1 focus-visible:ring-ring"
        style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
      />
    </SettingsCard>
  );
}
