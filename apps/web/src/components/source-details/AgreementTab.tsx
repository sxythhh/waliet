import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { Loader2, Download, CheckCircle2, Clock, AlertCircle, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatorContract {
  id: string;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled';
  contract_url: string | null;
  custom_terms: string | null;
  signed_at: string | null;
  sent_at: string | null;
  signature_url: string | null;
  title: string | null;
  monthly_rate: number | null;
  videos_per_month: number | null;
}

interface ProgressStats {
  approvedThisMonth: number;
  pendingThisMonth: number;
  videosPerMonth: number;
  earnedThisMonth: number;
  payoutPerVideo: number;
}

interface AgreementTabProps {
  contract: CreatorContract;
  progressStats?: ProgressStats;
  onContractSigned?: () => void;
  boostId: string;
}

// Safe date formatting helper
function formatSafeDate(dateString: string | null, formatStr: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return 'Invalid date';
    return format(date, formatStr);
  } catch {
    return 'Invalid date';
  }
}

// Calculate safe percentage (avoids division by zero and caps at 100%)
function safePercentage(value: number, total: number, maxPercent = 100): number {
  if (total <= 0) return 0;
  return Math.min((value / total) * 100, maxPercent);
}

export function AgreementTab({ contract, progressStats, onContractSigned }: AgreementTabProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const isSigned = contract.status === 'signed';
  const needsSignature = contract.status === 'sent' || contract.status === 'viewed';
  const isDraft = contract.status === 'draft';
  const isCancelled = contract.status === 'cancelled';
  const isExpired = contract.status === 'expired';

  const handleSign = async () => {
    if (!acknowledged) {
      toast.error("Please acknowledge that you have read and agree to the terms");
      return;
    }

    setIsSigning(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw new Error("Authentication error. Please try logging in again.");
      }

      if (!user) {
        throw new Error("Please log in to sign the contract");
      }

      // Update contract status to signed
      const { error } = await supabase
        .from("creator_contracts")
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          // Generate a simple signature URL based on user info
          signature_url: `data:text/plain;base64,${btoa(JSON.stringify({
            signedBy: user.id,
            signedAt: new Date().toISOString(),
            contractId: contract.id,
          }))}`,
        })
        .eq("id", contract.id)
        .eq("creator_id", user.id);

      if (error) throw error;

      toast.success("Contract signed successfully!");
      onContractSigned?.();
    } catch (error: any) {
      console.error("Error signing contract:", error);
      toast.error(error.message || "Failed to sign contract");
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contract.contract_url) {
      toast.error("No contract document available");
      return;
    }

    setLoadingPdf(true);
    try {
      // Open PDF in new tab for download
      window.open(contract.contract_url, '_blank');
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download contract");
    } finally {
      setLoadingPdf(false);
    }
  };

  // Get status badge info
  const getStatusBadge = () => {
    if (isSigned) {
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: "Signed",
        className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      };
    }
    if (needsSignature) {
      return {
        icon: <PenLine className="w-4 h-4" />,
        label: "Signature Required",
        className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      };
    }
    if (isDraft) {
      return {
        icon: <Clock className="w-4 h-4" />,
        label: "Draft",
        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    }
    if (isCancelled) {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        label: "Cancelled",
        className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      };
    }
    if (isExpired) {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        label: "Expired",
        className: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
      };
    }
    return null;
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground font-inter tracking-[-0.5px]">Agreement</h2>
        {statusBadge && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium",
            statusBadge.className
          )}>
            {statusBadge.icon}
            {statusBadge.label}
          </div>
        )}
      </div>

      {/* Progress Metrics Section */}
      {progressStats && progressStats.videosPerMonth > 0 && (
        <div className="p-4 rounded-xl border border-border/50 bg-muted/30 dark:bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground mb-3 font-inter tracking-[-0.3px]">
            Monthly Progress
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground/60 mb-0.5 uppercase tracking-wide font-inter">
                Approved
              </p>
              <p className="text-lg font-bold text-emerald-500 font-inter tracking-[-0.5px]">
                {progressStats.approvedThisMonth}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/60 mb-0.5 uppercase tracking-wide font-inter">
                Pending
              </p>
              <p className="text-lg font-bold text-amber-500 font-inter tracking-[-0.5px]">
                {progressStats.pendingThisMonth}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/60 mb-0.5 uppercase tracking-wide font-inter">
                Target
              </p>
              <p className="text-lg font-bold text-foreground font-inter tracking-[-0.5px]">
                {progressStats.videosPerMonth}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/60 mb-0.5 uppercase tracking-wide font-inter">
                Earned
              </p>
              <p className="text-lg font-bold text-primary font-inter tracking-[-0.5px]">
                ${progressStats.earnedThisMonth.toFixed(2)}
              </p>
            </div>
          </div>
          {/* Progress bar with safe percentage calculation */}
          <div className="mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
              {progressStats.approvedThisMonth > 0 && (
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${safePercentage(progressStats.approvedThisMonth, progressStats.videosPerMonth)}%` }}
                />
              )}
              {progressStats.pendingThisMonth > 0 && (
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${safePercentage(
                      progressStats.pendingThisMonth,
                      progressStats.videosPerMonth,
                      100 - safePercentage(progressStats.approvedThisMonth, progressStats.videosPerMonth)
                    )}%`
                  }}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 font-inter">
              {progressStats.approvedThisMonth + progressStats.pendingThisMonth} / {progressStats.videosPerMonth} videos this month
            </p>
          </div>
        </div>
      )}

      {/* Signature Timeline */}
      <div className="p-4 rounded-xl border border-border/50 bg-card">
        <h3 className="text-sm font-semibold text-foreground mb-4 font-inter tracking-[-0.3px]">
          Contract Timeline
        </h3>
        <div className="relative pl-6 space-y-4">
          {/* Vertical line */}
          <div className="absolute left-2 top-2 bottom-2 w-px bg-border" />

          {/* Contract Sent */}
          {contract.sent_at && (
            <div className="relative">
              <div className="absolute -left-4 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground font-inter">Contract Sent</p>
                <p className="text-xs text-muted-foreground font-inter">
                  {formatSafeDate(contract.sent_at, "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          )}

          {/* Contract Signed */}
          {isSigned && contract.signed_at ? (
            <div className="relative">
              <div className="absolute -left-4 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground font-inter">Contract Signed</p>
                <p className="text-xs text-muted-foreground font-inter">
                  {formatSafeDate(contract.signed_at, "MMM d, yyyy 'at' h:mm a")}
                </p>
                {/* Visual signature representation */}
                <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs text-muted-foreground mb-1 font-inter">Digital Signature</p>
                  <div className="flex items-center gap-2">
                    <Icon icon="material-symbols:verified" className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground font-inter italic">
                      Electronically signed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : needsSignature ? (
            <div className="relative">
              <div className="absolute -left-4 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center animate-pulse">
                <PenLine className="w-2.5 h-2.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 font-inter">
                  Awaiting Your Signature
                </p>
                <p className="text-xs text-muted-foreground font-inter">
                  Please review and sign the contract below
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Contract Content */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground font-inter tracking-[-0.3px]">
            {contract.title || "Creator Agreement"}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={!contract.contract_url || loadingPdf}
            className="text-xs gap-1.5"
          >
            {loadingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Download PDF
          </Button>
        </div>

        {/* Contract Display */}
        <div className="p-4">
          {contract.contract_url ? (
            <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden relative">
              {pdfError ? (
                <div className="h-[500px] flex items-center justify-center flex-col gap-2">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground font-inter">Failed to load contract document</p>
                  <Button variant="outline" size="sm" onClick={() => setPdfError(false)}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <iframe
                  src={`${contract.contract_url}#toolbar=0&navpanes=0`}
                  className="w-full h-[500px]"
                  title="Contract Document"
                  sandbox="allow-same-origin allow-scripts allow-popups"
                  referrerPolicy="no-referrer"
                  onError={() => setPdfError(true)}
                />
              )}
            </div>
          ) : contract.custom_terms ? (
            <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/20 rounded-lg border border-border/50 max-h-[500px] overflow-y-auto">
              <div className="whitespace-pre-wrap text-sm text-foreground/90 font-inter leading-relaxed">
                {contract.custom_terms}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <Icon icon="material-symbols:description-outline" className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground font-inter">
                Contract details will be available soon.
              </p>
            </div>
          )}

          {/* Contract Terms Summary */}
          {(contract.monthly_rate || contract.videos_per_month) && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h4 className="text-sm font-semibold text-foreground mb-2 font-inter tracking-[-0.3px]">
                Key Terms
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {contract.monthly_rate != null && (
                  <div>
                    <span className="text-muted-foreground font-inter">Monthly Rate:</span>
                    <span className="ml-2 font-semibold text-foreground font-inter">
                      ${contract.monthly_rate}
                    </span>
                  </div>
                )}
                {contract.videos_per_month != null && (
                  <div>
                    <span className="text-muted-foreground font-inter">Videos/Month:</span>
                    <span className="ml-2 font-semibold text-foreground font-inter">
                      {contract.videos_per_month}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Signature Section */}
        {needsSignature && (
          <div className="p-4 border-t border-border/50 bg-muted/30">
            {/* Acknowledgment Checkbox */}
            <div className="flex items-start gap-3 mb-4">
              <Checkbox
                id="acknowledge-contract"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                className="mt-0.5 border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor="acknowledge-contract"
                className="text-sm text-muted-foreground leading-relaxed cursor-pointer font-inter tracking-[-0.3px]"
              >
                I have read and agree to the terms and conditions outlined in this agreement. I understand that this is a legally binding contract.
              </label>
            </div>

            {/* Sign Button */}
            <Button
              onClick={handleSign}
              disabled={!acknowledged || isSigning}
              className="w-full h-11 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-white font-inter tracking-[-0.5px]"
            >
              {isSigning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PenLine className="w-4 h-4" />
                  Sign Agreement
                </span>
              )}
            </Button>
          </div>
        )}

        {/* Signed confirmation */}
        {isSigned && contract.signed_at && (
          <div className="p-4 border-t border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium font-inter">
                You signed this agreement on {formatSafeDate(contract.signed_at, "MMMM d, yyyy")}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
