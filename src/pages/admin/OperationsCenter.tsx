import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  FileWarning,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Shield,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { LoadingState } from "@/components/ui/loading-bar";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

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
  const [metrics, setMetrics] = useState({
    database: { status: "healthy", latency: 45 },
    api: { status: "healthy", latency: 120 },
    storage: { status: "healthy", usage: 68 },
    realtime: { status: "healthy", connections: 234 },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "degraded":
        return "text-amber-500";
      case "down":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "down":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Server className="h-4 w-4" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {getStatusIcon(metrics.database.status)}
            <span className="text-sm">Database</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {metrics.database.latency}ms
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {getStatusIcon(metrics.api.status)}
            <span className="text-sm">API</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {metrics.api.latency}ms
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {getStatusIcon(metrics.storage.status)}
            <span className="text-sm">Storage</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {metrics.storage.usage}% used
          </span>
        </div>

        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            {getStatusIcon(metrics.realtime.status)}
            <span className="text-sm">Realtime</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {metrics.realtime.connections} connections
          </span>
        </div>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payout Queue
          </CardTitle>
          {payouts.length > 0 && (
            <Badge variant="secondary">{payouts.length} pending</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8">
            <LoadingState size="sm" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No pending payouts
          </div>
        ) : (
          <div className="space-y-2">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Clock className="h-3 w-3 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {(payout.profiles as any)?.username || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(payout.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
                <span className="font-semibold text-sm">
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
        return "text-green-500";
      case "payout":
        return "text-blue-500";
      case "withdrawal":
        return "text-amber-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Live Transactions
          </CardTitle>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8">
            <LoadingState size="sm" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No recent transactions
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/30 animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium capitalize ${getTypeColor(tx.type)}`}>
                    {tx.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(tx.profiles as any)?.username || "Unknown"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">
                    ${Math.abs(tx.amount).toFixed(2)}
                  </span>
                  <p className="text-xs text-muted-foreground">
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
        return <XCircle className="h-4 w-4" />;
      case "error":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <FileWarning className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Active Alerts
          </CardTitle>
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-8">
            <LoadingState size="sm" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">All clear!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(alert.severity)}
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs opacity-80 mt-0.5">
                          {alert.description}
                        </p>
                      )}
                      <p className="text-xs opacity-60 mt-1">
                        {formatDistanceToNow(new Date(alert.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {alert.status === "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
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
        return "bg-green-500/10 text-green-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-500/10 text-red-500 border-0">Critical</Badge>;
      case "major":
        return <Badge className="bg-amber-500/10 text-amber-500 border-0">Major</Badge>;
      default:
        return <Badge className="bg-blue-500/10 text-blue-500 border-0">Minor</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Incidents
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8">
              <LoadingState size="sm" />
            </div>
          ) : incidents.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No active incidents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-medium">{incident.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getSeverityBadge(incident.severity)}
                        <Badge className={`${getStatusColor(incident.status)} border-0`}>
                          {incident.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {incident.description && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {incident.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Select
                      value={incident.status}
                      onValueChange={(value) => updateIncidentStatus(incident.id, value)}
                    >
                      <SelectTrigger className="h-7 text-xs w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="investigating">Investigating</SelectItem>
                        <SelectItem value="identified">Identified</SelectItem>
                        <SelectItem value="monitoring">Monitoring</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(incident.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Incident title"
                value={newIncident.title}
                onChange={(e) =>
                  setNewIncident({ ...newIncident, title: e.target.value })
                }
              />
            </div>
            <div>
              <Textarea
                placeholder="Description (optional)"
                value={newIncident.description}
                onChange={(e) =>
                  setNewIncident({ ...newIncident, description: e.target.value })
                }
              />
            </div>
            <div>
              <Select
                value={newIncident.severity}
                onValueChange={(value: "minor" | "major" | "critical") =>
                  setNewIncident({ ...newIncident, severity: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createIncident} disabled={creating || !newIncident.title}>
              {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AdminOperationsCenter() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  return (
    <AdminPermissionGuard resource="dashboard">
      <div className="flex flex-col h-full">
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Activity className="h-6 w-6" />
                Operations Center
              </h1>
              <p className="text-muted-foreground">
                Live monitoring and incident management
              </p>
            </div>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
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
    </AdminPermissionGuard>
  );
}
