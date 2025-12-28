import { Input } from "@/components/ui/input";
import { SettingsCard } from "./SettingsCard";
import { Copy, Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsernameSettingsCardProps {
  username: string;
  onChange: (username: string) => void;
  onSave: () => void;
  saving?: boolean;
  hasChanges?: boolean;
  originalUsername?: string;
}

export function UsernameSettingsCard({
  username,
  onChange,
  onSave,
  saving,
  hasChanges,
  originalUsername,
}: UsernameSettingsCardProps) {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!username || username === originalUsername) {
      setIsAvailable(null);
      return;
    }

    const checkUsername = async () => {
      setIsChecking(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();

        if (error) {
          console.error("Error checking username:", error);
          setIsAvailable(null);
        } else {
          setIsAvailable(data === null);
        }
      } catch (err) {
        console.error("Error checking username:", err);
        setIsAvailable(null);
      } finally {
        setIsChecking(false);
      }
    };

    const debounce = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounce);
  }, [username, originalUsername]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`virality.gg/@${username}`);
    toast({
      title: "Copied to clipboard",
      description: `virality.gg/@${username}`,
    });
  };

  return (
    <SettingsCard
      title="Your Username"
      description="This is your unique identifier on Virality. It will be used in your profile URL."
      footerHint="Max 32 characters."
      saveButton={{
        disabled: !hasChanges || saving || (isAvailable === false),
        loading: saving,
        onClick: onSave,
      }}
    >
      <div className="space-y-2 max-w-md">
        <div className="relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
          >
            virality.gg/@
          </span>
          <Input
            value={username}
            onChange={(e) =>
              onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            maxLength={32}
            placeholder="username"
            className="h-11 pl-[100px] pr-10 bg-background border border-border focus-visible:ring-1 focus-visible:ring-ring"
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
        {username && username !== originalUsername && (
          <div className="flex items-center gap-1.5 text-sm">
            {isChecking ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Checking availability...</span>
              </>
            ) : isAvailable === true ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-500">Username is available</span>
              </>
            ) : isAvailable === false ? (
              <>
                <X className="h-3.5 w-3.5 text-destructive" />
                <span className="text-destructive">Username is already taken</span>
              </>
            ) : null}
          </div>
        )}
      </div>
    </SettingsCard>
  );
}
