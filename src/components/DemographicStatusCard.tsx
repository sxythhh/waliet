import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ExternalLink, CheckCircle2, Clock, XCircle, AlertTriangle, History, ChevronDown, ChevronUp } from "lucide-react";
import demographicsIcon from "@/assets/demographics-icon.svg";

interface DemographicSubmission {
  id: string;
  tier1_percentage: number;
  status: string;
  score: number | null;
  submitted_at: string;
  reviewed_at?: string | null;
  screenshot_url?: string | null;
}

interface DemographicStatusCardProps {
  accountId: string;
  platform: string;
  username: string;
  submissions: DemographicSubmission[];
  onSubmitNew: () => void;
  onRefresh: () => void;
  campaignIds?: string[];
}

export function DemographicStatusCard({
  accountId,
  platform,
  username,
  submissions,
  onSubmitNew,
  onRefresh,
  campaignIds = [],
}: DemographicStatusCardProps) {
  const [viewingSubmission, setViewingSubmission] = useState<DemographicSubmission | null>(null);
  const [deletingSubmission, setDeletingSubmission] = useState<DemographicSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  // Sort submissions by submitted_at descending to ensure latest is always first
  const sortedSubmissions = [...submissions].sort((a, b) => 
    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );
  const latestSubmission = sortedSubmissions[0];
  const status = latestSubmission?.status;
  const historicalSubmissions = sortedSubmissions.slice(1);

  // Calculate if user can submit - only blocked if pending
  const getSubmissionAvailability = () => {
    if (!latestSubmission) {
      return { canSubmit: true, reason: null as string | null };
    }

    if (status === 'pending') {
      return { canSubmit: false, reason: 'Review in progress' };
    }

    return { canSubmit: true, reason: null };
  };

  const availability = getSubmissionAvailability();

  const handleDelete = async () => {
    if (!deletingSubmission) return;
    setIsDeleting(true);

    try {
      // Delete from storage if exists
      if (deletingSubmission.screenshot_url) {
        const urlParts = deletingSubmission.screenshot_url.split('/');
        const fileName = urlParts.slice(-2).join('/');
        await supabase.storage.from('verification-screenshots').remove([fileName]);
      }

      // Delete submission record
      const { error } = await supabase
        .from('demographic_submissions')
        .delete()
        .eq('id', deletingSubmission.id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Submission removed successfully"
      });
      
      setDeletingSubmission(null);
      onRefresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete submission"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusConfig = (submissionStatus: string) => {
    switch (submissionStatus) {
      case 'approved':
        return {
          label: 'Verified',
          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
          icon: CheckCircle2,
          dotColor: 'bg-emerald-500'
        };
      case 'pending':
        return {
          label: 'Under Review',
          color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
          icon: Clock,
          dotColor: 'bg-amber-500'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          color: 'bg-red-500/10 text-red-500 border-red-500/20',
          icon: XCircle,
          dotColor: 'bg-red-500'
        };
      default:
        return {
          label: 'Required',
          color: 'bg-red-500/10 text-red-500 border-red-500/20',
          icon: AlertTriangle,
          dotColor: 'bg-red-500'
        };
    }
  };

  const statusConfig = getStatusConfig(status || 'required');

  return (
    <>
      <div className="space-y-1.5">
        {/* Current Status */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className={`text-[10px] font-medium px-1.5 py-0 border-0 ${statusConfig.color}`} style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} mr-1 animate-pulse`} />
            {statusConfig.label}
          </Badge>
          {status === 'approved' && latestSubmission?.score && (
            <span className="text-sm font-bold tracking-tight" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
              Tier 1 {latestSubmission.score}%
            </span>
          )}
        </div>

        {/* Latest Submission Info */}
        {latestSubmission && (
          <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground/60">Last:</span>
              <span>{format(new Date(latestSubmission.submitted_at), "MMM d, yyyy")}</span>
              {latestSubmission.screenshot_url && (
                <button 
                  onClick={() => setViewingSubmission(latestSubmission)}
                  className="text-primary hover:underline ml-1"
                >
                  View
                </button>
              )}
              {latestSubmission.status !== 'approved' && (
                <button 
                  onClick={() => setDeletingSubmission(latestSubmission)}
                  className="text-destructive hover:underline ml-1"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}

        {/* History Toggle */}
        {historicalSubmissions.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
          >
            <History className="h-3 w-3" />
            <span>{historicalSubmissions.length} previous submission{historicalSubmissions.length !== 1 ? 's' : ''}</span>
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        {/* Historical Submissions */}
        {showHistory && historicalSubmissions.length > 0 && (
          <div className="space-y-1 pl-2 border-l border-border/50">
            {historicalSubmissions.map((submission) => {
              const subStatus = getStatusConfig(submission.status);
              return (
                <div 
                  key={submission.id} 
                  className="flex items-center justify-between text-[10px] text-muted-foreground py-0.5"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                >
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className={`text-[9px] px-1 py-0 border-0 ${subStatus.color}`}>
                      {subStatus.label}
                    </Badge>
                    <span>{format(new Date(submission.submitted_at), "MMM d, yyyy")}</span>
                    {submission.score && submission.status === 'approved' && (
                      <span className="font-medium">{submission.score}%</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {submission.screenshot_url && (
                      <button 
                        onClick={() => setViewingSubmission(submission)}
                        className="text-primary hover:underline"
                      >
                        View
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        <Button
          variant={availability.canSubmit ? "default" : "ghost"}
          size="sm"
          className={`w-full h-8 ${!availability.canSubmit ? 'border-0 hover:bg-transparent cursor-default' : ''}`}
          style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
          disabled={!availability.canSubmit}
          onClick={onSubmitNew}
        >
          {availability.canSubmit ? (
            <>
              <img src={demographicsIcon} alt="" className="h-4 w-4 mr-1.5" />
              {submissions.length > 0 ? 'Update' : 'Submit'}
            </>
          ) : (
            <span className="text-muted-foreground">{availability.reason}</span>
          )}
        </Button>

      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="sm:max-w-[600px] bg-background">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
              Demographics Submission
            </DialogTitle>
            <DialogDescription>
              Submitted {viewingSubmission && format(new Date(viewingSubmission.submitted_at), "MMMM d, yyyy 'at' h:mm a")}
            </DialogDescription>
          </DialogHeader>
          
          {viewingSubmission?.screenshot_url && (
            <div className="space-y-4">
              <video
                src={viewingSubmission.screenshot_url}
                controls
                className="w-full rounded-lg bg-black"
                style={{ maxHeight: '400px' }}
              />
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <Badge variant="outline" className={getStatusConfig(viewingSubmission.status).color}>
                    {getStatusConfig(viewingSubmission.status).label}
                  </Badge>
                </div>
                {viewingSubmission.score && (
                  <div className="text-right">
                    <p className="text-sm font-medium">Score</p>
                    <p className="text-2xl font-bold">{viewingSubmission.score}%</p>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(viewingSubmission.screenshot_url!, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSubmission} onOpenChange={() => setDeletingSubmission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this demographics submission. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
