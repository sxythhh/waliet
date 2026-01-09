import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  canAssign: boolean;
}

interface DiscordRoleSelectorProps {
  brandId: string;
  guildId: string | null;
  selectedRoleId: string;
  onRoleChange: (roleId: string) => void;
  disabled?: boolean;
}

export function DiscordRoleSelector({
  brandId,
  guildId,
  selectedRoleId,
  onRoleChange,
  disabled = false,
}: DiscordRoleSelectorProps) {
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnassignableRoles, setHasUnassignableRoles] = useState(false);

  useEffect(() => {
    if (guildId) {
      fetchRoles();
    } else {
      setRoles([]);
      setError(null);
    }
  }, [guildId, brandId]);

  const fetchRoles = async () => {
    if (!guildId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('get-discord-guild-roles', {
        body: { guildId, brandId },
      });

      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);

      const fetchedRoles = data?.roles || [];
      setRoles(fetchedRoles);

      // Check if any roles can't be assigned
      const unassignable = fetchedRoles.filter((r: DiscordRole) => !r.canAssign);
      setHasUnassignableRoles(unassignable.length > 0);

      // If selected role is not in list, clear it
      if (selectedRoleId && !fetchedRoles.find((r: DiscordRole) => r.id === selectedRoleId)) {
        onRoleChange('');
      }
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      setError(err.message || 'Failed to fetch roles');
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Convert Discord color int to hex
  const colorToHex = (color: number): string => {
    if (color === 0) return '#99AAB5'; // Default Discord gray
    return `#${color.toString(16).padStart(6, '0')}`;
  };

  if (!guildId) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Discord Role</Label>
        <div className="p-3 rounded-lg bg-muted/30 border border-dashed">
          <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] text-center">
            Connect a Discord server in workspace settings to assign roles
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Discord Role</Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Discord Role</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <p className="text-xs text-destructive font-inter tracking-[-0.5px]">{error}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={fetchRoles}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
          Discord Role
        </Label>
        <Button size="sm" variant="ghost" className="h-6 px-2" onClick={fetchRoles} disabled={isLoading}>
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {hasUnassignableRoles && (
        <Alert className="py-2 border-amber-500/50 bg-amber-500/10">
          <AlertCircle className="h-3 w-3 text-amber-500" />
          <AlertDescription className="text-[10px] text-amber-600 dark:text-amber-400 font-inter tracking-[-0.5px]">
            Some roles cannot be assigned because the bot's role is below them in Discord. Move the bot's role higher in server settings.
          </AlertDescription>
        </Alert>
      )}

      <Select
        value={selectedRoleId || "none"}
        onValueChange={(value) => onRoleChange(value === "none" ? "" : value)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className="h-10 bg-muted/30 border-0 focus:ring-1 focus:ring-primary/30 font-inter tracking-[-0.5px] text-sm">
          <SelectValue placeholder="Select a role to assign..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No role</span>
          </SelectItem>
          {roles.map((role) => (
            <SelectItem
              key={role.id}
              value={role.id}
              disabled={!role.canAssign}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: colorToHex(role.color) }}
                />
                <span>{role.name}</span>
                {!role.canAssign && (
                  <AlertTriangle className="w-3 h-3 text-amber-500 ml-1" />
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedRoleId && (
        <p className="text-[10px] text-muted-foreground font-inter tracking-[-0.5px]">
          Creators will automatically receive this role when they join.
        </p>
      )}
    </div>
  );
}
