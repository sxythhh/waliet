import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Bug, Lightbulb, MessageSquare, CheckCircle, Clock, XCircle } from "lucide-react";

interface FeedbackSubmission {
  id: string;
  user_id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    email: string;
  };
}

export default function Feedback() {
  const [submissions, setSubmissions] = useState<FeedbackSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('feedback_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== "all") {
        if (filter === "bug" || filter === "feature") {
          query = query.eq('type', filter);
        } else {
          query = query.eq('status', filter);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user details for each submission
      if (data) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedData = data.map(submission => ({
          ...submission,
          user: profileMap.get(submission.user_id)
        }));

        setSubmissions(enrichedData);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch feedback"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('feedback_submissions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setSubmissions(prev => 
        prev.map(s => s.id === id ? { ...s, status: newStatus } : s)
      );

      toast({
        title: "Updated",
        description: `Status changed to ${newStatus}`
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update status"
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4 text-red-500" />;
      case 'feature':
        return <Lightbulb className="h-4 w-4 text-amber-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'resolved':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-0">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/10 text-red-500 border-0">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-0">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const stats = {
    total: submissions.length,
    bugs: submissions.filter(s => s.type === 'bug').length,
    features: submissions.filter(s => s.type === 'feature').length,
    pending: submissions.filter(s => s.status === 'pending').length,
  };

  return (
    <div className="p-6 md:p-8 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold font-inter tracking-[-0.5px]">Feedback</h1>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                Bug reports and feature requests from users
              </p>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Submissions</SelectItem>
                <SelectItem value="bug">Bugs Only</SelectItem>
                <SelectItem value="feature">Features Only</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Total</p>
                <p className="text-2xl font-semibold font-inter tracking-[-0.5px]">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Bugs</p>
                <p className="text-2xl font-semibold font-inter tracking-[-0.5px] text-red-500">{stats.bugs}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Features</p>
                <p className="text-2xl font-semibold font-inter tracking-[-0.5px] text-amber-500">{stats.features}</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">Pending</p>
                <p className="text-2xl font-semibold font-inter tracking-[-0.5px] text-blue-500">{stats.pending}</p>
              </CardContent>
            </Card>
          </div>

          {/* Submissions List */}
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))
            ) : submissions.length === 0 ? (
              <Card className="bg-card/50">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-inter tracking-[-0.3px]">No feedback submissions found</p>
                </CardContent>
              </Card>
            ) : (
              submissions.map((submission) => (
                <Card key={submission.id} className="bg-card/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5">{getTypeIcon(submission.type)}</div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="capitalize text-xs">
                              {submission.type}
                            </Badge>
                            {getStatusBadge(submission.status)}
                            <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                              {format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </span>
                          </div>
                          <p className="text-sm font-inter tracking-[-0.3px] whitespace-pre-wrap">
                            {submission.message}
                          </p>
                          {submission.user && (
                            <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                              From: {submission.user.username || submission.user.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <Select 
                        value={submission.status} 
                        onValueChange={(value) => updateStatus(submission.id, value)}
                      >
                        <SelectTrigger className="w-[130px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
        </div>
      </div>
    </div>
  );
}
