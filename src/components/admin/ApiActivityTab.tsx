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

      // Fetch recent database logs
      const { data: dbLogs } = await supabase.rpc('supabase_analytics_query', {
        query: `
          select id, postgres_logs.timestamp, event_message, parsed.error_severity 
          from postgres_logs
          cross join unnest(metadata) as m
          cross join unnest(m.parsed) as parsed
          where postgres_logs.timestamp > extract(epoch from now() - interval '1 hour') * 1000000
          order by timestamp desc
          limit 50
        `
      });

      // Fetch recent auth logs
      const { data: authLogs } = await supabase.rpc('supabase_analytics_query', {
        query: `
          select id, auth_logs.timestamp, event_message, metadata.level, metadata.status, metadata.path
          from auth_logs
          cross join unnest(metadata) as metadata
          where auth_logs.timestamp > extract(epoch from now() - interval '1 hour') * 1000000
          order by timestamp desc
          limit 50
        `
      });

      // Fetch recent edge function logs
      const { data: edgeLogs } = await supabase.rpc('supabase_analytics_query', {
        query: `
          select id, function_edge_logs.timestamp, event_message, response.status_code, request.method, m.function_id, m.execution_time_ms
          from function_edge_logs
          cross join unnest(metadata) as m
          cross join unnest(m.response) as response
          cross join unnest(m.request) as request
          where function_edge_logs.timestamp > extract(epoch from now() - interval '1 hour') * 1000000
          order by timestamp desc
          limit 50
        `
      });

      // Combine and format logs
      const combinedLogs: ApiLog[] = [
        ...(dbLogs || []).map((log: any) => ({
          timestamp: log.timestamp,
          type: 'Database',
          status: log.error_severity || 'info',
          path: 'Query',
        })),
        ...(authLogs || []).map((log: any) => ({
          timestamp: log.timestamp,
          type: 'Auth',
          status: log.status || log.level,
          path: log.path,
        })),
        ...(edgeLogs || []).map((log: any) => ({
          timestamp: log.timestamp,
          type: 'Edge Function',
          method: log.method,
          status: log.status_code?.toString(),
          duration: log.execution_time_ms,
          function_name: log.function_id,
        })),
      ];

      combinedLogs.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(combinedLogs.slice(0, 100));
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
