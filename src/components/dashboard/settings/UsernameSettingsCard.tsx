import { Input } from "@/components/ui/input";
import { SettingsCard } from "./SettingsCard";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UsernameSettingsCardProps {
  username: string;
  onChange: (username: string) => void;
  onSave: () => void;
  saving?: boolean;
  hasChanges?: boolean;
}

export function UsernameSettingsCard({
  username,
  onChange,
  onSave,
  saving,
  hasChanges,
}: UsernameSettingsCardProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(`virality.gg/${username}`);
    toast({
      title: "Copied to clipboard",
      description: `virality.gg/${username}`,
    });
  };

  return (
    <SettingsCard
      title="Your Username"
      description="This is your unique identifier on Virality. It will be used in your profile URL."
      footerHint="Max 32 characters."
      saveButton={{
        disabled: !hasChanges || saving,
        loading: saving,
        onClick: onSave,
      }}
    >
      <div className="relative max-w-md">
        <span
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        >
          virality.gg/
        </span>
        <Input
          value={username}
          onChange={(e) =>
            onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
          }
          maxLength={32}
          placeholder="username"
          className="h-11 pl-[90px] pr-10 bg-background border border-border focus-visible:ring-1 focus-visible:ring-ring"
          style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </SettingsCard>
  );
}
