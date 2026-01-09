import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, CheckCircle2, Clock, XCircle, AlertTriangle, Shield } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { isVerificationExpiringSoon, isVerificationExpired } from "@/lib/zktls/types";
import { isPlatformSupported } from "@/lib/zktls/providers";
import demographicsIcon from "@/assets/demographics-icon.svg";

interface DemographicSubmission {
  id: string;
  tier1_percentage: number;
  status: string;
  score: number | null;
  submitted_at: string;
  reviewed_at?: string | null;
  screenshot_url?: string | null;
  admin_notes?: string | null;
}

interface ZkTLSVerificationData {
  zktls_verified: boolean;
  zktls_verified_at?: string | null;
  zktls_expires_at?: string | null;
  zktls_engagement_rate?: number | null;
  zktls_avg_views?: number | null;
  zktls_demographics?: Record<string, any> | null;
}

interface AudienceInsightsStatusCardProps {
  accountId: string;
  platform: string;
  username: string;
  submissions: DemographicSubmission[];
  onSubmitNew: () => void;
  onRefresh: () => void;
  campaignIds?: string[];
  zkTLSData?: ZkTLSVerificationData;
  onVerifyZkTLS?: () => void;
}

export function AudienceInsightsStatusCard({
  accountId,
  platform,
  username,
  submissions,
  onSubmitNew,
  onRefresh,
  campaignIds = [],
  zkTLSData,
  onVerifyZkTLS,
}: AudienceInsightsStatusCardProps) {
  const [viewingSubmission, setViewingSubmission] = useState<DemographicSubmission | null>(null);
  const [deletingSubmission, setDeletingSubmission] = useState<DemographicSubmission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  // zkTLS verification is disabled - TikTok/Instagram block attestor datacenter IPs
  // Keep the old video submission system for now
  const ZKTLS_ENABLED = false;

  // zkTLS verification status (disabled but keeping logic for when it's re-enabled)
  const hasZkTLSVerification = ZKTLS_ENABLED && zkTLSData?.zktls_verified && zkTLSData?.zktls_expires_at;
  const isZkTLSExpired = hasZkTLSVerification && zkTLSData?.zktls_expires_at
    ? isVerificationExpired(zkTLSData.zktls_expires_at)
    : false;
  const isZkTLSExpiringSoon = hasZkTLSVerification && zkTLSData?.zktls_expires_at && !isZkTLSExpired
    ? isVerificationExpiringSoon(zkTLSData.zktls_expires_at)
    : false;
  const isZkTLSValid = hasZkTLSVerification && !isZkTLSExpired;
  const supportsZkTLS = ZKTLS_ENABLED && isPlatformSupported(platform);

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
          label: 'Not Approved',
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
      <div className="space-y-2">
        {/* zkTLS Verification Badge */}
        {isZkTLSValid && zkTLSData?.zktls_verified_at && zkTLSData?.zktls_expires_at && (
          <VerificationBadge
            verifiedAt={zkTLSData.zktls_verified_at}
            expiresAt={zkTLSData.zktls_expires_at}
            size="sm"
          />
        )}

        {/* Rejection reason display */}
        {status === 'rejected' && latestSubmission?.admin_notes && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg max-w-xs">
            <p className="text-[10px] font-medium text-red-400 uppercase tracking-wider mb-0.5">Why it wasn't approved</p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
              {latestSubmission.admin_notes}
            </p>
          </div>
        )}

        {/* zkTLS Expiring Soon Warning */}
        {isZkTLSExpiringSoon && !isZkTLSExpired && onVerifyZkTLS && (
          <button
            onClick={onVerifyZkTLS}
            className="inline-flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-400 font-inter tracking-[-0.3px]"
          >
            <Shield className="h-3 w-3" />
            Re-verify expiring soon
          </button>
        )}

        {/* zkTLS Expired Warning */}
        {isZkTLSExpired && onVerifyZkTLS && (
          <button
            onClick={onVerifyZkTLS}
            className="inline-flex items-center gap-1 text-[11px] text-destructive hover:text-destructive/80 font-inter tracking-[-0.3px]"
          >
            <Shield className="h-3 w-3" />
            Verification expired - Re-verify
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* zkTLS Verify Button - Primary action for TikTok */}
          {supportsZkTLS && onVerifyZkTLS && !isZkTLSValid && (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-full"
              style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
              onClick={onVerifyZkTLS}
            >
              <Shield className="h-3.5 w-3.5 mr-0.5" />
              Verify
            </Button>
          )}

          {/* Video Submit Button - Secondary option or primary for non-zkTLS platforms */}
          <Button
            size="sm"
            variant={supportsZkTLS && !isZkTLSValid ? "outline" : "default"}
            className={`h-7 px-2.5 text-xs rounded-full ${
              supportsZkTLS && !isZkTLSValid
                ? 'border-muted-foreground/30 text-muted-foreground hover:text-foreground'
                : 'bg-blue-500 hover:bg-blue-600 text-white border-0'
            } ${!availability.canSubmit ? 'opacity-50 cursor-default' : ''}`}
            style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
            disabled={!availability.canSubmit}
            onClick={onSubmitNew}
          >
            {availability.canSubmit ? (
              <>
                <img src={demographicsIcon} alt="" className={`h-3.5 w-3.5 mr-0.5 ${supportsZkTLS && !isZkTLSValid ? 'opacity-60' : 'brightness-0 invert'}`} />
                {submissions.length > 0 ? 'Update' : 'Submit'}
              </>
            ) : (
              <span>{availability.reason}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
        <DialogContent className="sm:max-w-[600px] bg-background">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
              Audience Insights Submission
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
              This will permanently delete this audience insights submission. This action cannot be undone.
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
