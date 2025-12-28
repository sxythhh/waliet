import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
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
  
  const { toast } = useToast();

  // Sort submissions by submitted_at descending to ensure latest is always first
  const sortedSubmissions = [...submissions].sort((a, b) => 
    new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );
  const latestSubmission = sortedSubmissions[0];
  const status = latestSubmission?.status;

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
      <div>
        {/* Action Button */}
        <Button
          size="sm"
          className={`h-7 px-2.5 text-xs bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-full ${!availability.canSubmit ? 'opacity-50 cursor-default' : ''}`}
          style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
          disabled={!availability.canSubmit}
          onClick={onSubmitNew}
        >
          {availability.canSubmit ? (
            <>
              <img src={demographicsIcon} alt="" className="h-3.5 w-3.5 mr-0.5 brightness-0 invert" />
              {submissions.length > 0 ? 'Update' : 'Submit'}
            </>
          ) : (
            <span>{availability.reason}</span>
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
