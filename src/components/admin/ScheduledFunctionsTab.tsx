import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, Play, Pause, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
  jobname: string;
}

export function ScheduledFunctionsTab() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCronJobs = async () => {
    try {
      setRefreshing(true);
      // Use raw SQL query via rpc with type assertion since types aren't generated yet
      const { data, error } = await supabase.rpc('get_cron_jobs' as any);
      
      if (error) {
        // If RPC doesn't exist, show empty state
        if (error.code === 'PGRST202') {
          setJobs([]);
          setError(null);
        } else {
          throw error;
        }
      } else {
        setJobs((data as CronJob[]) || []);
        setError(null);
      }
    } catch (err: any) {
      console.error('Error fetching cron jobs:', err);
      setError(err.message);
      setJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCronJobs();
  }, []);

  const extractFunctionName = (command: string): string => {
    const match = command.match(/functions\/v1\/([^'"]+)/);
    return match ? match[1] : 'Unknown Function';
  };

  const formatSchedule = (schedule: string): string => {
    const parts = schedule.split(' ');
    if (parts.length !== 5) return schedule;
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Every minute';
    }
    if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `Every ${minute.slice(2)} minutes`;
    }
    if (minute === '0' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Every hour';
    }
    if (minute === '0' && hour === '0' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return 'Daily at midnight';
    }
    if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `Daily at ${hour}:00`;
    }
    
    return schedule;
  };

  const getScheduleFrequency = (schedule: string): 'high' | 'medium' | 'low' => {
    if (schedule.includes('* * * * *') || schedule.startsWith('*/1 ')) return 'high';
    if (schedule.startsWith('*/5 ') || schedule.startsWith('*/10 ') || schedule.startsWith('*/15 ')) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <Card className="border-[#1a1a1a] bg-[#0a0a0a]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#1a1a1a] bg-[#0a0a0a]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#1a1a1a]">
              <Clock className="h-5 w-5 text-[#2061de]" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold font-inter tracking-[-0.5px]">
                Scheduled Edge Functions
              </CardTitle>
              <p className="text-sm text-[#6f6f6f] mt-0.5">
                Cron jobs running on your backend
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCronJobs}
            disabled={refreshing}
            className="gap-2 border-[#1a1a1a] bg-[#0e0e0e] hover:bg-[#1a1a1a]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-red-500/10 mb-4">
              <Zap className="h-6 w-6 text-red-500" />
            </div>
            <p className="text-[#6f6f6f] text-sm max-w-md">
              Unable to fetch scheduled functions. The cron extension may not be enabled or the RPC function needs to be created.
            </p>
            <code className="mt-3 text-xs text-[#6f6f6f] bg-[#1a1a1a] px-3 py-1.5 rounded">
              {error}
            </code>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-[#1a1a1a] mb-4">
              <Calendar className="h-6 w-6 text-[#6f6f6f]" />
            </div>
            <p className="text-white font-medium mb-1">No scheduled functions</p>
            <p className="text-[#6f6f6f] text-sm max-w-md">
              You haven't set up any cron jobs yet. Use pg_cron to schedule edge function invocations.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-[#1a1a1a] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1a1a1a] hover:bg-transparent">
                  <TableHead className="text-[#6f6f6f] font-medium">Function</TableHead>
                  <TableHead className="text-[#6f6f6f] font-medium">Schedule</TableHead>
                  <TableHead className="text-[#6f6f6f] font-medium">Frequency</TableHead>
                  <TableHead className="text-[#6f6f6f] font-medium">Status</TableHead>
                  <TableHead className="text-[#6f6f6f] font-medium text-right">Job ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const functionName = extractFunctionName(job.command);
                  const frequency = getScheduleFrequency(job.schedule);
                  
                  return (
                    <TableRow key={job.jobid} className="border-[#1a1a1a] hover:bg-[#0e0e0e]">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-md bg-[#1a1a1a]">
                            <Zap className="h-4 w-4 text-[#2061de]" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{functionName}</p>
                            {job.jobname && (
                              <p className="text-xs text-[#6f6f6f]">{job.jobname}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-[#6f6f6f]" />
                          <span className="text-sm text-[#a0a0a0]">
                            {formatSchedule(job.schedule)}
                          </span>
                        </div>
                        <code className="text-xs text-[#6f6f6f] mt-0.5 block">
                          {job.schedule}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border-0 ${
                            frequency === 'high'
                              ? 'bg-amber-500/10 text-amber-500'
                              : frequency === 'medium'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-emerald-500/10 text-emerald-500'
                          }`}
                        >
                          {frequency === 'high' ? 'High' : frequency === 'medium' ? 'Medium' : 'Low'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.active ? (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-sm text-emerald-500">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-[#6f6f6f]" />
                            <span className="text-sm text-[#6f6f6f]">Paused</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <code className="text-xs text-[#6f6f6f] bg-[#1a1a1a] px-2 py-1 rounded">
                          #{job.jobid}
                        </code>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
