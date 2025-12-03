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
  description: string;
  details?: string;
  status?: string;
  amount?: number;
  user?: string;
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
      
      // Fetch all data in parallel with rich context
      const [transactionsResult, submissionsResult, applicationsResult, payoutsResult, socialAccountsResult, demographicsResult] = await Promise.all([
        supabase
          .from("wallet_transactions")
          .select("created_at, description, type, status, amount, metadata, user_id")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("campaign_submissions")
          .select("submitted_at, reviewed_at, status, platform, content_url, campaigns(title), profiles:creator_id(username)")
          .order("submitted_at", { ascending: false })
          .limit(25),
        supabase
          .from("bounty_applications")
          .select("applied_at, status, video_url, bounty_campaigns(title)")
          .order("applied_at", { ascending: false })
          .limit(25),
        supabase
          .from("payout_requests")
          .select("requested_at, payout_method, status, amount, profiles:user_id(username)")
          .order("requested_at", { ascending: false })
          .limit(25),
        supabase
          .from("social_account_campaigns")
          .select("connected_at, disconnected_at, status, social_accounts(username, platform), campaigns(title)")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("demographic_submissions")
          .select("submitted_at, status, tier1_percentage, social_accounts(username, platform)")
          .order("submitted_at", { ascending: false })
          .limit(25)
      ]);

      const allLogs: ApiLog[] = [];

      // Process transactions with rich context
      if (transactionsResult.data) {
        allLogs.push(...transactionsResult.data.map(t => {
          const metadata = t.metadata as Record<string, any> | null;
          const campaignName = metadata?.campaign_title || metadata?.campaign_name || '';
          return {
            timestamp: new Date(t.created_at).getTime(),
            type: "Transaction",
            description: t.type === 'earning' ? `Earning: ${t.description || 'Campaign payment'}` : 
                        t.type === 'withdrawal' ? `Withdrawal: ${t.description || 'Payout'}` :
                        t.description || t.type,
            details: campaignName ? `Campaign: ${campaignName}` : undefined,
            status: t.status,
            amount: t.amount,
          };
        }));
      }

      // Process submissions with campaign and user context
      if (submissionsResult.data) {
        allLogs.push(...submissionsResult.data.map(s => {
          const campaign = s.campaigns as { title: string } | null;
          const profile = s.profiles as { username: string } | null;
          return {
            timestamp: new Date(s.submitted_at || s.reviewed_at || new Date()).getTime(),
            type: "Submission",
            description: `${s.platform || 'Content'} submission${campaign?.title ? ` for ${campaign.title}` : ''}`,
            details: s.content_url ? `URL: ${s.content_url.substring(0, 50)}...` : undefined,
            status: s.status || "pending",
            user: profile?.username,
          };
        }));
      }

      // Process bounty applications with campaign context
      if (applicationsResult.data) {
        allLogs.push(...applicationsResult.data.map(a => {
          const bounty = a.bounty_campaigns as { title: string } | null;
          return {
            timestamp: new Date(a.applied_at).getTime(),
            type: "Bounty App",
            description: `Application${bounty?.title ? ` for ${bounty.title}` : ''}`,
            details: a.video_url ? `Video: ${a.video_url.substring(0, 40)}...` : undefined,
            status: a.status,
          };
        }));
      }

      // Process payouts with amount and user context
      if (payoutsResult.data) {
        allLogs.push(...payoutsResult.data.map(p => {
          const profile = p.profiles as { username: string } | null;
          return {
            timestamp: new Date(p.requested_at).getTime(),
            type: "Payout",
            description: `${p.payout_method} withdrawal request`,
            status: p.status,
            amount: p.amount,
            user: profile?.username,
          };
        }));
      }

      // Process social account connections
      if (socialAccountsResult.data) {
        allLogs.push(...socialAccountsResult.data.map(s => {
          const account = s.social_accounts as { username: string; platform: string } | null;
          const campaign = s.campaigns as { title: string } | null;
          const isDisconnect = s.status === 'disconnected';
          return {
            timestamp: new Date(isDisconnect ? s.disconnected_at! : s.connected_at).getTime(),
            type: "Account Link",
            description: `${isDisconnect ? 'Disconnected' : 'Connected'} ${account?.platform || 'account'} @${account?.username || 'unknown'}`,
            details: campaign?.title ? `Campaign: ${campaign.title}` : undefined,
            status: s.status,
          };
        }));
      }

      // Process demographic submissions
      if (demographicsResult.data) {
        allLogs.push(...demographicsResult.data.map(d => {
          const account = d.social_accounts as { username: string; platform: string } | null;
          return {
            timestamp: new Date(d.submitted_at).getTime(),
            type: "Demographics",
            description: `Demographics submission for ${account?.platform || 'account'} @${account?.username || 'unknown'}`,
            details: `Tier 1: ${d.tier1_percentage}%`,
            status: d.status,
          };
        }));
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
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Activity</CardDescription>
            <CardTitle className="text-3xl">{logs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Transactions</CardDescription>
            <CardTitle className="text-3xl">
              {logs.filter(l => l.type === 'Transaction').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Account Links</CardDescription>
            <CardTitle className="text-3xl">
              {logs.filter(l => l.type === 'Account Link').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Payouts</CardDescription>
            <CardTitle className="text-3xl">
              {logs.filter(l => l.type === 'Payout').length}
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
                <TableHead>Description</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No recent activity
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(log.timestamp), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate" title={log.description}>
                      {log.description}
                      {log.user && <span className="text-muted-foreground ml-1">(@{log.user})</span>}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground text-xs" title={log.details}>
                      {log.details || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(log.status)}>
                        {log.status || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {log.amount ? `$${log.amount.toFixed(2)}` : '-'}
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
