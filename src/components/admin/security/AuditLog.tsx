"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard } from "../design-system/AdminCard";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, ChevronDown } from "lucide-react";

interface AuditLogEntry {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  actor_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  actor_profile?: {
    username: string;
    display_name: string | null;
  } | null;
}

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "payout_request", label: "Payout Request" },
  { value: "payout_approved", label: "Payout Approved" },
  { value: "payout_rejected", label: "Payout Rejected" },
  { value: "fraud_flag_created", label: "Fraud Flag Created" },
  { value: "fraud_flag_resolved", label: "Fraud Flag Resolved" },
  { value: "user_banned", label: "User Banned" },
  { value: "user_unbanned", label: "User Unbanned" },
  { value: "campaign_created", label: "Campaign Created" },
  { value: "campaign_updated", label: "Campaign Updated" },
  { value: "submission_reviewed", label: "Submission Reviewed" },
  { value: "admin_action", label: "Admin Action" },
];

const ACTOR_TYPES = [
  { value: "all", label: "All Actors" },
  { value: "user", label: "Users" },
  { value: "admin", label: "Admins" },
  { value: "system", label: "System" },
];

const actionIcons: Record<string, { icon: string; color: string; bg: string }> = {
  login: { icon: "M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3", color: "text-green-400", bg: "bg-green-500/10" },
  logout: { icon: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9", color: "text-gray-400", bg: "bg-gray-500/10" },
  payout_request: { icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", color: "text-blue-400", bg: "bg-blue-500/10" },
  payout_approved: { icon: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3", color: "text-green-400", bg: "bg-green-500/10" },
  payout_rejected: { icon: "M18 6L6 18M6 6l12 12", color: "text-red-400", bg: "bg-red-500/10" },
  fraud_flag_created: { icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: "text-orange-400", bg: "bg-orange-500/10" },
  fraud_flag_resolved: { icon: "M9 12l2 2l4-4M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: "text-green-400", bg: "bg-green-500/10" },
  user_banned: { icon: "M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636", color: "text-red-400", bg: "bg-red-500/10" },
  user_unbanned: { icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0a4 4 0 0 0-8 0", color: "text-green-400", bg: "bg-green-500/10" },
  campaign_created: { icon: "M12 5v14M5 12h14", color: "text-purple-400", bg: "bg-purple-500/10" },
  campaign_updated: { icon: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1l1-4l9.5-9.5z", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  submission_reviewed: { icon: "M9 12l2 2l4-4m6 2a9 9 0 1 1-18 0a9 9 0 0 1 18 0z", color: "text-blue-400", bg: "bg-blue-500/10" },
  admin_action: { icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0a3 3 0 0 1 6 0z", color: "text-white", bg: "bg-white/10" },
  default: { icon: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0a9 9 0 0 1 18 0z", color: "text-gray-400", bg: "bg-gray-500/10" },
};

export function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState("all");
  const [actorType, setActorType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLog();
  }, [actionType, actorType, limit]);

  const fetchAuditLog = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("security_audit_log")
        .select(`
          *,
          actor_profile:profiles!security_audit_log_actor_id_fkey(username, display_name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (actionType !== "all") {
        query = query.eq("action_type", actionType);
      }
      if (actorType !== "all") {
        query = query.eq("actor_type", actorType);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching audit log:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      entry.action_type.toLowerCase().includes(search) ||
      entry.entity_type.toLowerCase().includes(search) ||
      entry.entity_id.toLowerCase().includes(search) ||
      entry.actor_profile?.username?.toLowerCase().includes(search) ||
      entry.ip_address?.toLowerCase().includes(search)
    );
  });

  const getActionDisplay = (actionType: string) => {
    const config = actionIcons[actionType] || actionIcons.default;
    return config;
  };

  const formatActionType = (type: string) => {
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <AdminCard
      title="Audit Log"
      subtitle="Complete history of security-relevant actions"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchAuditLog}
          className="gap-1.5 text-xs text-white/50 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      }
      noPadding
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search by user, IP, or action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/[0.03] border-white/[0.06] text-sm"
          />
        </div>

        <Select value={actionType} onValueChange={setActionType}>
          <SelectTrigger className="w-[180px] bg-white/[0.03] border-white/[0.06] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actorType} onValueChange={setActorType}>
          <SelectTrigger className="w-[140px] bg-white/[0.03] border-white/[0.06] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTOR_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log entries */}
      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-lg bg-white/5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-white/5" />
                  <Skeleton className="h-3 w-48 bg-white/5" />
                </div>
                <Skeleton className="h-3 w-20 bg-white/5" />
              </div>
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-white/30 text-sm font-inter">No audit log entries found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredEntries.map((entry) => {
              const actionDisplay = getActionDisplay(entry.action_type);
              const isExpanded = expandedId === entry.id;

              return (
                <div key={entry.id}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors text-left"
                  >
                    {/* Icon */}
                    <div className={cn("p-2 rounded-lg", actionDisplay.bg)}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={actionDisplay.color}
                      >
                        <path d={actionDisplay.icon} />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-inter tracking-[-0.5px]">
                        {formatActionType(entry.action_type)}
                      </p>
                      <p className="text-xs text-white/40 font-inter tracking-[-0.5px] truncate">
                        {entry.actor_profile?.username || entry.actor_type}{" "}
                        <span className="text-white/20">on</span>{" "}
                        {entry.entity_type} #{entry.entity_id.slice(0, 8)}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div className="text-[10px] text-white/30 font-inter tracking-[-0.5px] whitespace-nowrap">
                      {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                    </div>

                    {/* Expand arrow */}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-white/20 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-5 py-4 bg-white/[0.01] border-t border-white/[0.04]">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-white/30">Actor</span>
                          <p className="text-white font-mono mt-1">
                            {entry.actor_profile?.username || entry.actor_id || entry.actor_type}
                          </p>
                        </div>
                        <div>
                          <span className="text-white/30">Entity ID</span>
                          <p className="text-white font-mono mt-1 truncate">{entry.entity_id}</p>
                        </div>
                        <div>
                          <span className="text-white/30">IP Address</span>
                          <p className="text-white font-mono mt-1">{entry.ip_address || "N/A"}</p>
                        </div>
                        <div>
                          <span className="text-white/30">Timestamp</span>
                          <p className="text-white mt-1">
                            {format(new Date(entry.created_at), "PPpp")}
                          </p>
                        </div>
                        {entry.user_agent && (
                          <div className="col-span-2">
                            <span className="text-white/30">User Agent</span>
                            <p className="text-white/60 font-mono mt-1 text-[10px] truncate">
                              {entry.user_agent}
                            </p>
                          </div>
                        )}
                        {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <div className="col-span-2">
                            <span className="text-white/30">Metadata</span>
                            <pre className="text-white/60 font-mono mt-1 text-[10px] bg-black/20 rounded-lg p-3 overflow-x-auto">
                              {JSON.stringify(entry.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Load more */}
      {filteredEntries.length >= limit && (
        <div className="px-5 py-3 border-t border-white/[0.04]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLimit(limit + 50)}
            className="w-full text-xs text-white/50 hover:text-white"
          >
            Load more entries
          </Button>
        </div>
      )}
    </AdminCard>
  );
}
