import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ApiLog {
  timestamp: number;
  type: string;
  method?: string;
  path?: string;
  status?: string;
  duration?: number;
  function_name?: string;
}

export function ApiActivityTab() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApiActivity();
  }, []);

  const fetchApiActivity = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel with only required fields - much more efficient
      const [transactionsResult, submissionsResult, applicationsResult, payoutsResult] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("created_at, description, type, status")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("campaign_submissions")
          .select("submitted_at, reviewed_at, status")
          .order("submitted_at", { ascending: false })
          .limit(20),
        supabase
          .from("bounty_applications")
          .select("applied_at, status")
          .order("applied_at", { ascending: false })
          .limit(20),
        supabase
          .from("payout_requests")
          .select("requested_at, payout_method, status")
          .order("requested_at", { ascending: false })
          .limit(20)
      ]);

      const allLogs: ApiLog[] = [];

      // Process transactions
      if (transactionsResult.data) {
        allLogs.push(...transactionsResult.data.map(t => ({
          timestamp: new Date(t.created_at).getTime(),
          type: "Transaction",
          path: t.description || t.type,
          status: t.status,
        })));
      }

      // Process submissions
      if (submissionsResult.data) {
        allLogs.push(...submissionsResult.data.map(s => ({
          timestamp: new Date(s.submitted_at || s.reviewed_at || new Date()).getTime(),
          type: "Submission",
          path: "Content submission",
          status: s.status || "pending",
        })));
      }

      // Process applications
      if (applicationsResult.data) {
        allLogs.push(...applicationsResult.data.map(a => ({
          timestamp: new Date(a.applied_at).getTime(),
          type: "Bounty App",
          path: "Bounty application",
          status: a.status,
        })));
      }

      // Process payouts
      if (payoutsResult.data) {
        allLogs.push(...payoutsResult.data.map(p => ({
          timestamp: new Date(p.requested_at).getTime(),
          type: "Payout",
          path: `${p.payout_method} request`,
          status: p.status,
        })));
      }

      // Sort by timestamp
      allLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(allLogs.slice(0, 100));
    } catch (error) {
      console.error("Error fetching API activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "secondary";
    if (status.includes("200") || status === "info") return "default";
    if (status.includes("400") || status.includes("error")) return "destructive";
    if (status.includes("500")) return "destructive";
    return "secondary";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Requests (1h)</CardDescription>
            <CardTitle className="text-3xl">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Edge Functions</CardDescription>
            <CardTitle className="text-3xl">
              {logs.filter(l => l.type === 'Edge Function').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Database Queries</CardDescription>
            <CardTitle className="text-3xl">
              {logs.filter(l => l.type === 'Database').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent API Activity</CardTitle>
          <CardDescription>Last 100 requests from the past hour</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Method/Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No recent activity
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.timestamp / 1000), "HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {log.method && `${log.method} `}
                      {log.function_name || log.path || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(log.status)}>
                        {log.status || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.duration ? `${log.duration}ms` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
