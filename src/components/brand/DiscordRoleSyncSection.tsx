import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Users, Shield, Award, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface DiscordRoleSyncSectionProps {
  brandId: string;
}

interface RoleMapping {
  id: string;
  guild_id: string;
  role_id: string;
  role_name: string;
  mapping_type: string;
  campaign_id: string | null;
  boost_id: string | null;
  tier_id: string | null;
  min_earnings: number | null;
  active_days: number | null;
  is_active: boolean;
}

interface Campaign {
  id: string;
  title: string;
}

interface Boost {
  id: string;
  title: string;
}

interface Tier {
  id: string;
  name: string;
}

interface DiscordBotConfig {
  guild_id: string;
}

interface RoleMappingInsert {
  brand_id: string;
  guild_id: string;
  role_id: string;
  role_name: string;
  mapping_type: string;
  is_active: boolean;
  campaign_id?: string;
  boost_id?: string;
  tier_id?: string;
  min_earnings?: number;
  active_days?: number;
}

const MAPPING_TYPES = [
  { value: "campaign_member", label: "Campaign Member", icon: Users, description: "User joined a campaign" },
  { value: "boost_member", label: "Boost Member", icon: Zap, description: "User in a boost program" },
  { value: "earnings_tier", label: "Earnings Tier", icon: Award, description: "User reached earnings threshold" },
  { value: "creator_tier", label: "Creator Tier", icon: Shield, description: "User in a specific tier" },
  { value: "active_creator", label: "Active Creator", icon: RefreshCw, description: "Recently submitted content" },
];

export function DiscordRoleSyncSection({ brandId }: DiscordRoleSyncSectionProps) {
  const [mappings, setMappings] = useState<RoleMapping[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [guildId, setGuildId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [mappingType, setMappingType] = useState("campaign_member");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedBoost, setSelectedBoost] = useState("");
  const [selectedTier, setSelectedTier] = useState("");
  const [minEarnings, setMinEarnings] = useState("");
  const [activeDays, setActiveDays] = useState("30");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get guild ID from bot config
      const { data: botConfig } = await supabase
        .from("discord_bot_config")
        .select("guild_id")
        .eq("brand_id", brandId)
        .maybeSingle() as { data: DiscordBotConfig | null; error: unknown };

      if (botConfig?.guild_id) {
        setGuildId(botConfig.guild_id);
      }

      const [mappingsResult, campaignsResult, boostsResult, tiersResult] = await Promise.all([
        supabase
          .from("discord_role_mappings")
          .select("*")
          .eq("brand_id", brandId)
          .order("created_at", { ascending: false }) as Promise<{ data: RoleMapping[] | null; error: unknown }>,
        supabase
          .from("campaigns")
          .select("id, title")
          .eq("brand_id", brandId)
          .order("title"),
        supabase
          .from("bounty_campaigns")
          .select("id, title")
          .eq("brand_id", brandId)
          .order("title"),
        supabase
          .from("creator_tiers")
          .select("id, name")
          .eq("brand_id", brandId)
          .order("tier_order") as Promise<{ data: Tier[] | null; error: unknown }>,
      ]);

      if (!mappingsResult.error) setMappings(mappingsResult.data || []);
      if (!campaignsResult.error) setCampaigns(campaignsResult.data || []);
      if (!boostsResult.error) setBoosts(boostsResult.data || []);
      if (!tiersResult.error) setTiers(tiersResult.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setRoleId("");
    setRoleName("");
    setMappingType("campaign_member");
    setSelectedCampaign("");
    setSelectedBoost("");
    setSelectedTier("");
    setMinEarnings("");
    setActiveDays("30");
  };

  const handleSave = async () => {
    if (!guildId) {
      toast.error("Please configure the Discord bot first to set the Guild ID");
      return;
    }
    if (!roleId || !roleName) {
      toast.error("Please enter role ID and name");
      return;
    }

    setIsSaving(true);
    try {
      const mappingData: RoleMappingInsert = {
        brand_id: brandId,
        guild_id: guildId,
        role_id: roleId,
        role_name: roleName,
        mapping_type: mappingType,
        is_active: true,
      };

      // Set the appropriate reference based on mapping type
      switch (mappingType) {
        case "campaign_member":
          if (!selectedCampaign) {
            toast.error("Please select a campaign");
            setIsSaving(false);
            return;
          }
          mappingData.campaign_id = selectedCampaign;
          break;
        case "boost_member":
          if (!selectedBoost) {
            toast.error("Please select a boost");
            setIsSaving(false);
            return;
          }
          mappingData.boost_id = selectedBoost;
          break;
        case "creator_tier":
          if (!selectedTier) {
            toast.error("Please select a tier");
            setIsSaving(false);
            return;
          }
          mappingData.tier_id = selectedTier;
          break;
        case "earnings_tier":
          if (!minEarnings) {
            toast.error("Please enter minimum earnings");
            setIsSaving(false);
            return;
          }
          mappingData.min_earnings = parseFloat(minEarnings);
          break;
        case "active_creator":
          mappingData.active_days = parseInt(activeDays, 10) || 30;
          break;
      }

      const { error } = await supabase
        .from("discord_role_mappings")
        .insert(mappingData as Record<string, unknown>);

      if (error) throw error;

      toast.success("Role mapping created");
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) {
      console.error("Error creating mapping:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create mapping";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleMapping = async (mapping: RoleMapping) => {
    try {
      const { error } = await supabase
        .from("discord_role_mappings")
        .update({ is_active: !mapping.is_active })
        .eq("id", mapping.id);

      if (error) throw error;

      setMappings(mappings.map(m =>
        m.id === mapping.id ? { ...m, is_active: !m.is_active } : m
      ));
      toast.success(`Mapping ${mapping.is_active ? "disabled" : "enabled"}`);
    } catch (error: unknown) {
      console.error("Error toggling mapping:", error);
      toast.error("Failed to update mapping");
    }
  };

  const handleDeleteMapping = async (id: string) => {
    try {
      const { error } = await supabase
        .from("discord_role_mappings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setMappings(mappings.filter(m => m.id !== id));
      toast.success("Mapping deleted");
    } catch (error: unknown) {
      console.error("Error deleting mapping:", error);
      toast.error("Failed to delete mapping");
    }
  };

  const getMappingTypeInfo = (type: string) => {
    return MAPPING_TYPES.find(t => t.value === type);
  };

  const getMappingTarget = (mapping: RoleMapping): string => {
    switch (mapping.mapping_type) {
      case "campaign_member":
        return campaigns.find(c => c.id === mapping.campaign_id)?.title || "Unknown campaign";
      case "boost_member":
        return boosts.find(b => b.id === mapping.boost_id)?.title || "Unknown boost";
      case "creator_tier":
        return tiers.find(t => t.id === mapping.tier_id)?.name || "Unknown tier";
      case "earnings_tier":
        return `$${mapping.min_earnings?.toLocaleString() || 0}+ earnings`;
      case "active_creator":
        return `Active in last ${mapping.active_days || 30} days`;
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-16 bg-muted rounded" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role Sync
            </CardTitle>
            <CardDescription>
              Automatically assign Discord roles based on platform activity
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" disabled={!guildId}>
                <Plus className="h-4 w-4" />
                Add Mapping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Role Mapping</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role ID</Label>
                    <Input
                      placeholder="123456789012345678"
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role Name</Label>
                    <Input
                      placeholder="Campaign Creator"
                      value={roleName}
                      onChange={(e) => setRoleName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mapping Type</Label>
                  <Select value={mappingType} onValueChange={setMappingType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAPPING_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {mappingType === "campaign_member" && (
                  <div className="space-y-2">
                    <Label>Campaign</Label>
                    <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {mappingType === "boost_member" && (
                  <div className="space-y-2">
                    <Label>Boost</Label>
                    <Select value={selectedBoost} onValueChange={setSelectedBoost}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select boost" />
                      </SelectTrigger>
                      <SelectContent>
                        {boosts.map((boost) => (
                          <SelectItem key={boost.id} value={boost.id}>
                            {boost.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {mappingType === "creator_tier" && (
                  <div className="space-y-2">
                    <Label>Creator Tier</Label>
                    <Select value={selectedTier} onValueChange={setSelectedTier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id}>
                            {tier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {mappingType === "earnings_tier" && (
                  <div className="space-y-2">
                    <Label>Minimum Earnings ($)</Label>
                    <Input
                      type="number"
                      placeholder="1000"
                      value={minEarnings}
                      onChange={(e) => setMinEarnings(e.target.value)}
                    />
                  </div>
                )}

                {mappingType === "active_creator" && (
                  <div className="space-y-2">
                    <Label>Active Within (days)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={activeDays}
                      onChange={(e) => setActiveDays(e.target.value)}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Creating..." : "Create Mapping"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {!guildId ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Configure the Discord bot first to enable role sync
          </p>
        ) : mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No role mappings configured. Click "Add Mapping" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {mappings.map((mapping) => {
              const typeInfo = getMappingTypeInfo(mapping.mapping_type);
              const TypeIcon = typeInfo?.icon || Users;

              return (
                <div
                  key={mapping.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <TypeIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">@{mapping.role_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {typeInfo?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getMappingTarget(mapping)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={mapping.is_active}
                      onCheckedChange={() => handleToggleMapping(mapping)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteMapping(mapping.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
