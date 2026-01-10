import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, AdminStatCard } from "@/components/admin/design-system/AdminCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminButton } from "@/components/admin/design-system/AdminButton";
import { AdminBadge } from "@/components/admin/design-system/AdminBadge";
import { AdminInput, AdminTextarea, AdminSelect } from "@/components/admin/design-system/AdminInput";
import {
  AdminDialog,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogBody,
  AdminDialogFooter,
  AdminDialogTitle,
} from "@/components/admin/design-system/AdminDialog";
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Visibility,
  Close,
  Add,
  Refresh,
  CreditCard,
  Notifications,
  Shield,
  Bolt,
  Storage,
  AccessTime,
} from "@mui/icons-material";
import { LoadingState } from "@/components/ui/loading-bar";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  title: string;
  description: string | null;
  severity: "info" | "warning" | "error" | "critical";
  status: "active" | "acknowledged" | "resolved";
  source: string | null;
  created_at: string;
}

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: "minor" | "major" | "critical";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  created_at: string;
  updates: { message: string; timestamp: string; user_id: string }[];
}

interface PayoutItem {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles?: { username: string; avatar_url: string | null };
}

interface TransactionItem {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
  profiles?: { username: string };
}

// System Health Panel
function SystemHealthPanel() {
  const [metrics] = useState({
    database: { status: "healthy", latency: 45 },
    api: { status: "healthy", latency: 120 },
    storage: { status: "healthy", usage: 68 },
    realtime: { status: "healthy", connections: 234 },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle sx={{ fontSize: 16 }} className="text-emerald-500" />;
      case "degraded":
        return <Warning sx={{ fontSize: 16 }} className="text-amber-500" />;
      case "down":
        return <Error sx={{ fontSize: 16 }} className="text-red-500" />;
      default:
        return <Info sx={{ fontSize: 16 }} className="text-muted-foreground" />;
    }
  };

  return (
    <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold font-inter tracking-[-0.5px]"><Storage sx={{ fontSize: 16 }} />System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { label: "Database", status: metrics.database.status, value: `${metrics.database.latency}ms` },
          { label: "API", status: metrics.api.status, value: `${metrics.api.latency}ms` },
          { label: "Storage", status: metrics.storage.status, value: `${metrics.storage.usage}% used` },
          { label: "Realtime", status: metrics.realtime.status, value: `${metrics.realtime.connections} connections` },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 dark:bg-muted/20"
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(item.status)}
              <span className="text-sm font-inter tracking-[-0.3px]">{item.label}</span>
            </div>
            <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              {item.value}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Payout Queue Panel
function PayoutQueuePanel() {
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayouts();
    const subscription = supabase
      .channel("payout_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payout_requests" },
        () => fetchPayouts()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPayouts = async () => {
    const { data } = await supabase
      .from("payout_requests")
      .select("id, user_id, amount, status, created_at, profiles(username, avatar_url)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);

    setPayouts((data as any) || []);
    setLoading(false);
  };

  return (
    <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold font-inter tracking-[-0.5px]"><CreditCard sx={{ fontSize: 16 }} />Payout Queue</CardTitle>
        {payouts.length > 0 && (
          <AdminBadge variant="warning">{payouts.length} pending</AdminBadge>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8">
            <LoadingState size="sm" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm font-inter tracking-[-0.3px]">
            No pending payouts
          </div>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 dark:bg-muted/20"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <AccessTime sx={{ fontSize: 12 }} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium font-inter tracking-[-0.3px]">
                      {(payout.profiles as any)?.username || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      {formatDistanceToNow(new Date(payout.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-sm font-inter tracking-[-0.3px] tabular-nums">
                  ${payout.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Transaction Stream Panel
function TransactionStreamPanel() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
    const subscription = supabase
      .channel("transaction_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "wallet_transactions" },
        (payload) => {
          setTransactions((prev) => [payload.new as TransactionItem, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from("wallet_transactions")
      .select("id, user_id, amount, type, description, created_at, profiles(username)")
      .order("created_at", { ascending: false })
      .limit(10);

    setTransactions((data as any) || []);
    setLoading(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "earning":
        return "text-emerald-500";
      case "payout":
        return "text-blue-500";
      case "withdrawal":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold font-inter tracking-[-0.5px]"><Bolt sx={{ fontSize: 16 }} />Live Transactions</CardTitle>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Live</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8">
            <LoadingState size="sm" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm font-inter tracking-[-0.3px]">
            No recent transactions
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 dark:bg-muted/20 animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-medium capitalize font-inter tracking-[-0.3px]", getTypeColor(tx.type))}>
                    {tx.type}
                  </span>
                  <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    {(tx.profiles as any)?.username || "Unknown"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium font-inter tracking-[-0.3px] tabular-nums">
                    ${Math.abs(tx.amount).toFixed(2)}
                  </span>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                    {format(new Date(tx.created_at), "HH:mm:ss")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Alerts Console Panel
function AlertsConsolePanel() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    const subscription = supabase
      .channel("alert_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_alerts" },
        () => fetchAlerts()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from("admin_alerts")
      .select("*")
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(10);

    setAlerts((data as any) || []);
    setLoading(false);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "error":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "info":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Error sx={{ fontSize: 16 }} />;
      case "error":
        return <Warning sx={{ fontSize: 16 }} />;
      case "warning":
        return <Warning sx={{ fontSize: 16 }} />;
      default:
        return <Notifications sx={{ fontSize: 16 }} />;
    }
  };

  const acknowledgeAlert = async (id: string) => {
    const { error } = await supabase
      .from("admin_alerts")
      .update({
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      toast.success("Alert acknowledged");
      fetchAlerts();
    }
  };

  const resolveAlert = async (id: string) => {
    const { error } = await supabase
      .from("admin_alerts")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (!error) {
      toast.success("Alert resolved");
      fetchAlerts();
    }
  };

  return (
    <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold font-inter tracking-[-0.5px]"><Notifications sx={{ fontSize: 16 }} />Active Alerts</CardTitle>
        {alerts.length > 0 && <AdminBadge variant="error">{alerts.length}</AdminBadge>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8">
            <LoadingState size="sm" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle sx={{ fontSize: 32 }} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">All clear!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn("p-3 rounded-lg border", getSeverityColor(alert.severity))}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <p className="text-sm font-medium font-inter tracking-[-0.3px]">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs opacity-80 mt-0.5 font-inter tracking-[-0.3px]">
                          {alert.description}
                        </p>
                      )}
                      <p className="text-xs opacity-60 mt-1 font-inter tracking-[-0.3px]">
                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {alert.status === "active" && (
                      <AdminButton
                        size="sm"
                        variant="ghost"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <Visibility sx={{ fontSize: 14 }} />
                      </AdminButton>
                    )}
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      <Close sx={{ fontSize: 14 }} />
                    </AdminButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Incident Board Panel
function IncidentBoardPanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "minor" as "minor" | "major" | "critical",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from("admin_incidents")
      .select("*")
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(5);

    setIncidents((data as any) || []);
    setLoading(false);
  };

  const createIncident = async () => {
    if (!newIncident.title.trim()) return;

    setCreating(true);
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from("admin_incidents").insert({
      title: newIncident.title,
      description: newIncident.description || null,
      severity: newIncident.severity,
      created_by: user.user?.id,
    });

    if (!error) {
      toast.success("Incident created");
      setShowCreateDialog(false);
      setNewIncident({ title: "", description: "", severity: "minor" });
      fetchIncidents();
    } else {
      toast.error("Failed to create incident");
    }
    setCreating(false);
  };

  const updateIncidentStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("admin_incidents")
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === "resolved" ? { resolved_at: new Date().toISOString() } : {}),
      })
      .eq("id", id);

    if (!error) {
      toast.success("Incident updated");
      fetchIncidents();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "investigating":
        return "bg-red-500/10 text-red-500";
      case "identified":
        return "bg-amber-500/10 text-amber-500";
      case "monitoring":
        return "bg-blue-500/10 text-blue-500";
      case "resolved":
        return "bg-emerald-500/10 text-emerald-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AdminBadge variant="error">Critical</AdminBadge>;
      case "major":
        return <AdminBadge variant="warning">Major</AdminBadge>;
      default:
        return <AdminBadge variant="info">Minor</AdminBadge>;
    }
  };

  return (
    <>
      <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold font-inter tracking-[-0.5px]"><Shield sx={{ fontSize: 16 }} />Incidents</CardTitle>
          <AdminButton size="sm" variant="outline" onClick={() => setShowCreateDialog(true)}>
            <Add sx={{ fontSize: 14 }} className="mr-1" />
            New
          </AdminButton>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8">
              <LoadingState size="sm" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle sx={{ fontSize: 32 }} className="text-emerald-500 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm font-inter tracking-[-0.3px]">
                No active incidents
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-3 rounded-lg bg-muted/30 dark:bg-muted/20">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-medium font-inter tracking-[-0.3px]">
                        {incident.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {getSeverityBadge(incident.severity)}
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium font-inter tracking-[-0.3px]",
                            getStatusColor(incident.status)
                          )}
                        >
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  {incident.description && (
                    <p className="text-xs text-muted-foreground mb-2 font-inter tracking-[-0.3px]">
                      {incident.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <AdminSelect
                      value={incident.status}
                      onChange={(e) => updateIncidentStatus(incident.id, e.target.value)}
                      className="h-7 text-xs w-[120px]"
                    >
                      <option value="investigating">Investigating</option>
                      <option value="identified">Identified</option>
                      <option value="monitoring">Monitoring</option>
                      <option value="resolved">Resolved</option>
                    </AdminSelect>
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdminDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AdminDialogContent size="sm">
          <AdminDialogHeader>
            <AdminDialogTitle>Create Incident</AdminDialogTitle>
          </AdminDialogHeader>
          <AdminDialogBody className="space-y-4">
            <AdminInput
              placeholder="Incident title"
              value={newIncident.title}
              onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
            />
            <AdminTextarea
              placeholder="Description (optional)"
              value={newIncident.description}
              onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
            />
            <AdminSelect
              value={newIncident.severity}
              onChange={(e) =>
                setNewIncident({
                  ...newIncident,
                  severity: e.target.value as "minor" | "major" | "critical",
                })
              }
            >
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </AdminSelect>
          </AdminDialogBody>
          <AdminDialogFooter>
            <AdminButton variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </AdminButton>
            <AdminButton onClick={createIncident} disabled={creating || !newIncident.title}>
              {creating ? "Creating..." : "Create"}
            </AdminButton>
          </AdminDialogFooter>
        </AdminDialogContent>
      </AdminDialog>
    </>
  );
}

// Main Operations Content Component
export function OperationsContent() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold font-inter tracking-[-0.5px]">
              Operations Center
            </h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
              Live monitoring and incident management
            </p>
          </div>
          <AdminButton variant="outline" onClick={handleRefresh} disabled={refreshing}>
            <Refresh
              sx={{ fontSize: 16 }}
              className={cn("mr-2", refreshing && "animate-spin")}
            />
            Refresh
          </AdminButton>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <SystemHealthPanel />
            <PayoutQueuePanel />
          </div>

          {/* Middle Column */}
          <div className="space-y-6">
            <TransactionStreamPanel />
            <IncidentBoardPanel />
          </div>

          {/* Right Column */}
          <div>
            <AlertsConsolePanel />
          </div>
        </div>
      </div>
    </div>
  );
}
