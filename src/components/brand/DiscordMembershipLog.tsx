import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, UserMinus, Shield, RefreshCw, Users, Filter } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface DiscordMembershipLogProps {
  brandId: string;
}

interface MembershipEvent {
  id: string;
  discord_user_id: string;
  discord_username: string | null;
  user_id: string | null;
  event_type: string;
  role_id: string | null;
  role_name: string | null;
  old_value: string | null;
  new_value: string | null;
  event_timestamp: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

const EVENT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "member_join", label: "Member Joins" },
  { value: "member_leave", label: "Member Leaves" },
  { value: "role_add", label: "Role Added" },
  { value: "role_remove", label: "Role Removed" },
];

export function DiscordMembershipLog({ brandId }: DiscordMembershipLogProps) {
  const [events, setEvents] = useState<MembershipEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [stats, setStats] = useState({
    totalJoins: 0,
    totalLeaves: 0,
    roleChanges: 0,
    netGrowth: 0,
  });

  useEffect(() => {
    fetchData();
  }, [brandId, filterType]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("discord_membership_log")
        .select(`
          *,
          profiles:user_id(username, avatar_url)
        `)
        .eq("brand_id", brandId)
        .order("event_timestamp", { ascending: false })
        .limit(50);

      if (filterType !== "all") {
        query = query.eq("event_type", filterType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEvents((data || []) as MembershipEvent[]);

      // Calculate stats from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: statsData } = await supabase
        .from("discord_membership_log")
        .select("event_type")
        .eq("brand_id", brandId)
        .gte("event_timestamp", thirtyDaysAgo.toISOString());

      if (statsData) {
        const joins = statsData.filter(e => e.event_type === "member_join").length;
        const leaves = statsData.filter(e => e.event_type === "member_leave").length;
        const roleChanges = statsData.filter(e =>
          e.event_type === "role_add" || e.event_type === "role_remove"
        ).length;

        setStats({
          totalJoins: joins,
          totalLeaves: leaves,
          roleChanges,
          netGrowth: joins - leaves,
        });
      }
    } catch (error) {
      console.error("Error fetching membership log:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "member_join":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case "member_leave":
        return <UserMinus className="h-4 w-4 text-red-500" />;
      case "role_add":
        return <Shield className="h-4 w-4 text-blue-500" />;
      case "role_remove":
        return <Shield className="h-4 w-4 text-orange-500" />;
      default:
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case "member_join":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Joined
          </Badge>
        );
      case "member_leave":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Left
          </Badge>
        );
      case "role_add":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Role Added
          </Badge>
        );
      case "role_remove":
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
            Role Removed
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getEventDescription = (event: MembershipEvent): string => {
    switch (event.event_type) {
      case "member_join":
        return "joined the server";
      case "member_leave":
        return "left the server";
      case "role_add":
        return `was given the role @${event.role_name || "Unknown"}`;
      case "role_remove":
        return `lost the role @${event.role_name || "Unknown"}`;
      case "nickname_change":
        return `changed nickname from "${event.old_value}" to "${event.new_value}"`;
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membership Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <UserPlus className="h-3.5 w-3.5 text-green-500" />
            Joins (30d)
          </div>
          <p className="text-xl font-bold text-green-500">+{stats.totalJoins}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <UserMinus className="h-3.5 w-3.5 text-red-500" />
            Leaves (30d)
          </div>
          <p className="text-xl font-bold text-red-500">-{stats.totalLeaves}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Shield className="h-3.5 w-3.5" />
            Role Changes
          </div>
          <p className="text-xl font-bold">{stats.roleChanges}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Users className="h-3.5 w-3.5" />
            Net Growth
          </div>
          <p className={`text-xl font-bold ${stats.netGrowth >= 0 ? "text-green-500" : "text-red-500"}`}>
            {stats.netGrowth >= 0 ? "+" : ""}{stats.netGrowth}
          </p>
        </Card>
      </div>

      {/* Event Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membership Activity
              </CardTitle>
              <CardDescription>
                Track who joins, leaves, and role changes in your Discord server
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No membership events recorded yet. Events will appear here when tracked.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="p-2 rounded-full bg-muted">
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {event.profiles?.username
                          ? `@${event.profiles.username}`
                          : event.discord_username || `Discord#${event.discord_user_id.slice(-4)}`}
                      </span>
                      {getEventBadge(event.event_type)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getEventDescription(event)}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    <p>{formatDistanceToNow(new Date(event.event_timestamp), { addSuffix: true })}</p>
                    <p className="text-[10px]">
                      {format(new Date(event.event_timestamp), "MMM d, h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
