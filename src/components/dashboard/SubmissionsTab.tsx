import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal, ChevronDown, ChevronLeft, Check, Clock, X, ExternalLink, Video } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addDays } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { usePaymentLedger } from "@/hooks/usePaymentLedger";
import { PayoutStatusBadge, type PayoutStatus } from "./PayoutStatusBadge";
import { RequestVideoPayoutDialog } from "./RequestVideoPayoutDialog";
import { SubmitAnalyticsDialog } from "./SubmitAnalyticsDialog";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import dualScreenIconWhite from "@/assets/dual-screen-icon-white.svg";
import dualScreenIconBlack from "@/assets/dual-screen-icon-black.svg";
interface Submission {
  id: string;
  video_url: string;
  platform: string;
  status: string;
  created_at: string;
  updated_at: string;
  submission_text?: string | null;
  estimated_payout?: number | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  type: 'campaign' | 'boost';
  payout_status?: 'available' | 'locked' | 'paid';
  is_flagged?: boolean | null;
  analytics_recording_url?: string | null;
  // Video details
  video_title?: string | null;
  video_cover_url?: string | null;
  views?: number | null;
  paid_views?: number | null;
  unpaid_views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  video_upload_date?: string | null;
  video_author_username?: string | null;
  program: {
    id: string;
    title: string;
    brand_name?: string;
    brand_logo_url?: string | null;
    rpm_rate?: number;
    payment_model?: string | null;
    post_rate?: number | null;
    monthly_retainer?: number;
    videos_per_month?: number;
  };
}
export function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSubmenu, setFilterSubmenu] = useState<'main' | 'status' | 'type' | 'program'>('main');
  const [filterSearch, setFilterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Per-video payout dialog state
  const [videoPayoutDialog, setVideoPayoutDialog] = useState<{
    open: boolean;
    submission: Submission | null;
  }>({
    open: false,
    submission: null
  });
  const [requestingVideoPayout, setRequestingVideoPayout] = useState(false);

  // Analytics submission dialog state
  const [analyticsDialog, setAnalyticsDialog] = useState<{
    open: boolean;
    submission: Submission | null;
  }>({
    open: false,
    submission: null
  });

  // Use unified payment ledger
  const {
    summary: ledgerSummary,
    requestPayout: ledgerRequestPayout,
    requestPayoutForVideo,
    requestPayoutForBoost,
    getEntryByVideoId,
    refetch: refetchLedger
  } = usePaymentLedger();
  const {
    resolvedTheme
  } = useTheme();
  const getPlatformIcon = (platform: string) => {
    const isLight = resolvedTheme === 'light';
    switch (platform?.toLowerCase()) {
      case 'tiktok':
        return isLight ? tiktokLogoBlack : tiktokLogo;
      case 'instagram':
        return isLight ? instagramLogoBlack : instagramLogo;
      case 'youtube':
        return isLight ? youtubeLogoBlack : youtubeLogo;
      default:
        return null;
    }
  };
  useEffect(() => {
    fetchSubmissions();
  }, []);
  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all video submissions from unified table
      const {
        data: videoSubmissions,
        error
      } = await supabase.from('video_submissions').select('*').eq('creator_id', user.id).order('submitted_at', {
        ascending: false
      });
      if (error) {
        console.error('Error fetching submissions:', error);
        setLoading(false);
        return;
      }

      // Get unique source IDs for campaigns and boosts
      const campaignIds = [...new Set(videoSubmissions?.filter(v => v.source_type === 'campaign').map(v => v.source_id) || [])];
      const boostIds = [...new Set(videoSubmissions?.filter(v => v.source_type === 'boost').map(v => v.source_id) || [])];

      // Fetch campaign details
      let campaignMap: Record<string, {
        id: string;
        title: string;
        brand_name: string;
        brand_logo_url: string | null;
        rpm_rate: number;
        payment_model: string | null;
        post_rate: number | null;
      }> = {};
      if (campaignIds.length > 0) {
        const {
          data: campaigns
        } = await supabase.from('campaigns').select('id, title, brand_name, brand_logo_url, rpm_rate, payment_model, post_rate').in('id', campaignIds);
        if (campaigns) {
          campaigns.forEach(c => {
            campaignMap[c.id] = c;
          });
        }
      }

      // Fetch boost details with brand info
      let boostMap: Record<string, {
        id: string;
        title: string;
        brand_name: string;
        brand_logo_url: string | null;
        monthly_retainer: number;
        videos_per_month: number;
      }> = {};
      if (boostIds.length > 0) {
        const {
          data: boosts
        } = await supabase.from('bounty_campaigns').select('id, title, monthly_retainer, videos_per_month, brands(name, logo_url)').in('id', boostIds);
        if (boosts) {
          boosts.forEach((b: any) => {
            boostMap[b.id] = {
              id: b.id,
              title: b.title,
              brand_name: b.brands?.name || '',
              brand_logo_url: b.brands?.logo_url || null,
              monthly_retainer: b.monthly_retainer || 0,
              videos_per_month: b.videos_per_month || 1
            };
          });
        }
      }

      // Map to Submission type
      const allSubmissions: Submission[] = (videoSubmissions || []).map(video => {
        const isBoost = video.source_type === 'boost';
        const program = isBoost ? boostMap[video.source_id] : campaignMap[video.source_id];

        // Calculate unpaid views (current views minus already paid views)
        const currentViews = video.views || 0;
        const paidViews = video.paid_views || 0;
        const unpaidViews = Math.max(0, currentViews - paidViews);

        // Calculate estimated payout based on UNPAID views only for RPM campaigns
        let estimatedPayout = video.payout_amount;
        if (estimatedPayout === null || estimatedPayout === undefined) {
          if (isBoost && program) {
            const boost = program as typeof boostMap[string];
            estimatedPayout = boost.monthly_retainer / boost.videos_per_month;
          } else if (!isBoost && program) {
            const campaign = program as typeof campaignMap[string];
            if (campaign.payment_model === 'pay_per_post') {
              estimatedPayout = campaign.post_rate || 0;
            } else if (campaign.rpm_rate) {
              // Use unpaid views for RPM calculation
              estimatedPayout = unpaidViews / 1000 * campaign.rpm_rate;
            }
          }
        }
        return {
          id: video.id,
          video_url: video.video_url,
          platform: video.platform || 'unknown',
          status: video.status || 'pending',
          created_at: video.submitted_at || video.created_at,
          updated_at: video.updated_at,
          submission_text: video.submission_notes,
          estimated_payout: estimatedPayout,
          rejection_reason: video.rejection_reason,
          reviewed_at: video.reviewed_at,
          type: (isBoost ? 'boost' : 'campaign') as 'boost' | 'campaign',
          payout_status: (video.payout_status || 'available') as 'available' | 'locked' | 'paid',
          is_flagged: video.is_flagged,
          analytics_recording_url: (video as any).analytics_recording_url,
          // Video details
          video_title: video.video_description || video.video_title,
          video_cover_url: video.video_thumbnail_url,
          views: video.views,
          paid_views: paidViews,
          unpaid_views: unpaidViews,
          likes: video.likes,
          comments: video.comments,
          shares: video.shares,
          video_upload_date: video.video_upload_date,
          video_author_username: video.video_author_username,
          program: program || {
            id: video.source_id,
            title: 'Unknown',
            brand_name: '',
            brand_logo_url: null
          }
        };
      }).filter(s => s.program);
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get payout status for a submission
  const getSubmissionPayoutStatus = (submission: Submission): PayoutStatus => {
    // Check ledger first
    const ledgerEntry = getEntryByVideoId(submission.id);
    if (ledgerEntry) {
      return ledgerEntry.status;
    }

    // Fallback to submission's own payout_status
    if (submission.status !== 'approved') {
      return 'pending_approval';
    }
    if (submission.payout_status === 'locked') {
      return 'locked';
    }
    if (submission.payout_status === 'paid') {
      return 'paid';
    }
    return 'accruing';
  };

  // Calculate payout amounts for cards
  const calculatePayoutSummary = () => {
    let accruing = {
      amount: 0,
      videoCount: 0
    };
    let clearing = {
      amount: 0,
      videoCount: 0,
      clearingEndsAt: undefined as string | undefined,
      canBeFlagged: false
    };
    let paid = {
      amount: 0,
      videoCount: 0
    };

    // First, use ledger data if available
    if (ledgerSummary) {
      accruing.amount += ledgerSummary.totalPending;
      accruing.videoCount += ledgerSummary.accruingCount;
      clearing.amount += ledgerSummary.totalClearing + ledgerSummary.totalLocked;
      clearing.videoCount += ledgerSummary.clearingCount;
      clearing.clearingEndsAt = ledgerSummary.earliestClearingEndsAt;
      clearing.canBeFlagged = ledgerSummary.hasActiveFlaggableItems;
      paid.amount += ledgerSummary.totalPaid;
      paid.videoCount += ledgerSummary.paidCount;
    }

    // Then add legacy submissions not in ledger
    submissions.forEach(s => {
      const ledgerEntry = getEntryByVideoId(s.id);
      if (ledgerEntry) return; // Already counted in ledger

      if (s.status === 'approved' && s.estimated_payout) {
        if (s.payout_status === 'available') {
          accruing.amount += s.estimated_payout;
          accruing.videoCount++;
        } else if (s.payout_status === 'locked') {
          clearing.amount += s.estimated_payout;
          clearing.videoCount++;
        } else if (s.payout_status === 'paid') {
          paid.amount += s.estimated_payout;
          paid.videoCount++;
        }
      }
    });
    return {
      accruing,
      clearing,
      paid
    };
  };
  const payoutSummary = calculatePayoutSummary();

  // Handle request all payouts
  const handleRequestAllPayouts = async () => {
    if (payoutSummary.accruing.amount < 1) {
      toast.error('Minimum payout is $1.00');
      return;
    }
    setRequestingPayout(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Request payout via ledger
      if (ledgerSummary && ledgerSummary.totalPending > 0) {
        await ledgerRequestPayout();
        toast.success(`Payout of $${ledgerSummary.totalPending.toFixed(2)} requested! 7-day clearing period started.`);
        refetchLedger();
      }

      // Also handle legacy submissions
      const legacySubmissions = submissions.filter(s => {
        const ledgerEntry = getEntryByVideoId(s.id);
        return !ledgerEntry && s.status === 'approved' && s.payout_status === 'available' && (s.estimated_payout || 0) > 0;
      });
      if (legacySubmissions.length > 0) {
        const legacyTotal = legacySubmissions.reduce((sum, s) => sum + (s.estimated_payout || 0), 0);
        const clearingEndsAt = addDays(new Date(), 7);
        const {
          data: request,
          error: requestError
        } = await supabase.from('submission_payout_requests').insert({
          user_id: user.id,
          total_amount: legacyTotal,
          clearing_ends_at: clearingEndsAt.toISOString(),
          status: 'clearing'
        }).select().single();
        if (requestError) throw requestError;
        const payoutItems = legacySubmissions.map(s => ({
          payout_request_id: request.id,
          submission_id: s.id,
          amount: s.estimated_payout || 0,
          source_type: s.type,
          source_id: s.program.id,
          views_at_request: s.unpaid_views || 0
        }));
        await supabase.from('submission_payout_items').insert(payoutItems);
        const submissionIds = legacySubmissions.map(s => s.id);
        await supabase.from('video_submissions').update({
          payout_status: 'locked'
        }).in('id', submissionIds);
        if (!ledgerSummary || ledgerSummary.totalPending === 0) {
          toast.success(`Payout of $${legacyTotal.toFixed(2)} requested! 7-day clearing period started.`);
        }
      }
      fetchSubmissions();
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  // Handle per-video payout request
  const handleRequestVideoPayout = async () => {
    if (!videoPayoutDialog.submission) return;
    setRequestingVideoPayout(true);
    try {
      const submission = videoPayoutDialog.submission;

      // Check if it's in the ledger
      const ledgerEntry = getEntryByVideoId(submission.id);
      if (ledgerEntry) {
        // Use ledger-based payout
        if (submission.type === 'boost') {
          await requestPayoutForBoost(submission.id);
        } else {
          await requestPayoutForVideo(submission.id);
        }
      } else {
        // Legacy submission - create payout request
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const clearingEndsAt = addDays(new Date(), 7);
        const {
          data: request,
          error: requestError
        } = await supabase.from('submission_payout_requests').insert({
          user_id: user.id,
          total_amount: submission.estimated_payout || 0,
          clearing_ends_at: clearingEndsAt.toISOString(),
          status: 'clearing'
        }).select().single();
        if (requestError) throw requestError;
        await supabase.from('submission_payout_items').insert({
          payout_request_id: request.id,
          submission_id: submission.id,
          amount: submission.estimated_payout || 0,
          source_type: submission.type,
          source_id: submission.program.id,
          views_at_request: submission.unpaid_views || 0
        });
        await supabase.from('video_submissions').update({
          payout_status: 'locked'
        }).eq('id', submission.id);
      }
      toast.success(`Payout of $${(submission.estimated_payout || 0).toFixed(2)} requested!`);
      setVideoPayoutDialog({
        open: false,
        submission: null
      });
      fetchSubmissions();
      refetchLedger();
    } catch (error) {
      console.error('Error requesting video payout:', error);
      toast.error('Failed to request payout');
    } finally {
      setRequestingVideoPayout(false);
    }
  };
  const filteredSubmissions = submissions.filter(submission => {
    if (statusFilter !== 'all' && submission.status !== statusFilter) return false;
    if (typeFilter !== 'all' && submission.type !== typeFilter) return false;
    if (programFilter !== 'all' && submission.program.id !== programFilter) return false;
    return true;
  });
  const uniquePrograms = Array.from(new Map(submissions.map(s => [s.program.id, s.program])).values());
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || programFilter !== 'all';
  if (loading) {
    return null;
  }
  return <Card className="border rounded-xl overflow-hidden border-[#141414]/0 bg-neutral-100/0">
      {/* Filter */}
      <div className="pt-5 pb-4 px-0 flex items-center gap-3 py-[5px]">
        <DropdownMenu open={filterOpen} onOpenChange={open => {
        setFilterOpen(open);
        if (!open) {
          setFilterSubmenu('main');
          setFilterSearch('');
        }
      }}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-[9px] border-border bg-background hover:bg-background hover:text-foreground px-4 py-2 h-auto">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="font-medium" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.5px'
            }}>Filter</span>
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-[#2060df]" />}
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px] p-2.5 overflow-hidden bg-white dark:bg-[#0a0a0a] border-[#dce1eb] dark:border-[#141414]" style={{
          fontFamily: 'Inter',
          letterSpacing: 'normal'
        }}>
            <div className="relative">
              {/* Main Menu */}
              <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'main' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full absolute inset-0'}`}>
                <div className="relative mb-3">
                  <Input placeholder="Filter..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="bg-background/50 border-border h-10 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border" />
                  
                </div>
                
                <div className="space-y-1">
                  {/* Status Filter */}
                  <button onClick={() => setFilterSubmenu('status')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {statusFilter !== 'all' && <span className="text-xs text-muted-foreground capitalize">{statusFilter}</span>}
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </div>
                  </button>

                  {/* Type Filter */}
                  <button onClick={() => setFilterSubmenu('type')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm">Type</span>
                    <div className="flex items-center gap-2">
                      {typeFilter !== 'all' && <span className="text-xs text-muted-foreground capitalize">{typeFilter}</span>}
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </div>
                  </button>

                  {/* Program Filter */}
                  <button onClick={() => setFilterSubmenu('program')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm">Program</span>
                    <div className="flex items-center gap-2">
                      {programFilter !== 'all' && <span className="text-xs text-muted-foreground truncate max-w-[80px]">{uniquePrograms.find(p => p.id === programFilter)?.title}</span>}
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </div>
                  </button>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && <button onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setProgramFilter('all');
              }} className="w-full mt-3 pt-3 border-t border-border text-sm text-muted-foreground hover:text-foreground transition-colors text-center">
                    Clear all filters
                  </button>}
              </div>

              {/* Status Submenu */}
              <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'status' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0'}`}>
                <button onClick={() => setFilterSubmenu('main')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Status</span>
                </button>
                <div className="space-y-1">
                  {[{
                  value: 'all',
                  label: 'All Statuses'
                }, {
                  value: 'pending',
                  label: 'Pending'
                }, {
                  value: 'approved',
                  label: 'Approved'
                }, {
                  value: 'rejected',
                  label: 'Rejected'
                }].map(option => <button key={option.value} onClick={() => {
                  setStatusFilter(option.value);
                  setFilterSubmenu('main');
                }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${statusFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                      <span className="text-sm">{option.label}</span>
                      {statusFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                    </button>)}
                </div>
              </div>

              {/* Type Submenu */}
              <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'type' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0'}`}>
                <button onClick={() => setFilterSubmenu('main')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Type</span>
                </button>
                <div className="space-y-1">
                  {[{
                  value: 'all',
                  label: 'All Types'
                }, {
                  value: 'campaign',
                  label: 'Campaign'
                }, {
                  value: 'boost',
                  label: 'Boost'
                }].map(option => <button key={option.value} onClick={() => {
                  setTypeFilter(option.value);
                  setFilterSubmenu('main');
                }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${typeFilter === option.value ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                      <span className="text-sm">{option.label}</span>
                      {typeFilter === option.value && <Check className="h-4 w-4 ml-auto" />}
                    </button>)}
                </div>
              </div>

              {/* Program Submenu */}
              <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'program' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full absolute inset-0'}`}>
                <button onClick={() => setFilterSubmenu('main')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
                  <ChevronLeft className="h-4 w-4" />
                  <span>Program</span>
                </button>
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  <button onClick={() => {
                  setProgramFilter('all');
                  setFilterSubmenu('main');
                }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${programFilter === 'all' ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                    <span className="text-sm">All Programs</span>
                    {programFilter === 'all' && <Check className="h-4 w-4 ml-auto" />}
                  </button>
                  {uniquePrograms.map(program => <button key={program.id} onClick={() => {
                  setProgramFilter(program.id);
                  setFilterSubmenu('main');
                }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${programFilter === program.id ? 'bg-muted' : 'hover:bg-muted/50'}`}>
                      {program.brand_logo_url ? <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
                          <img src={program.brand_logo_url} alt={program.brand_name || 'Brand'} className="w-full h-full object-cover" />
                        </div> : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0" />}
                      <span className="text-sm truncate flex-1">{program.title}</span>
                      {programFilter === program.id && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
                    </button>)}
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Per-Video Payout Dialog */}
      <RequestVideoPayoutDialog open={videoPayoutDialog.open} onOpenChange={open => setVideoPayoutDialog({
      open,
      submission: open ? videoPayoutDialog.submission : null
    })} videoTitle={videoPayoutDialog.submission?.video_title || 'Untitled Video'} programName={videoPayoutDialog.submission?.program.title || ''} amount={videoPayoutDialog.submission?.estimated_payout || 0} onConfirm={handleRequestVideoPayout} isLoading={requestingVideoPayout} />

      {/* Submissions Table */}
      <div className="pb-6 px-0">
        {submissions.length === 0 ? <div className="text-center py-12">
            
            <p className="text-sm text-muted-foreground" style={{
          fontFamily: 'Inter',
          letterSpacing: '-0.3px'
        }}>
              No submissions yet
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1" style={{
          fontFamily: 'Inter',
          letterSpacing: '-0.3px'
        }}>
              Submit videos to campaigns to see them here
            </p>
          </div> : <>
            <div className="overflow-x-auto border border-border rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#dce1eb] dark:border-[#141414] hover:bg-transparent dark:bg-[#0e0e0e]">
                    <TableHead className="text-foreground font-medium text-sm h-12">Video</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12">Program</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12">Status</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12 text-right">Views</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12">Submitted</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12 text-right">Payout</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubmissions.map(submission => {
                const formatNumber = (num: number | null | undefined) => {
                  if (!num) return '—';
                  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                  return num.toString();
                };
                const payoutStatus = getSubmissionPayoutStatus(submission);
                const ledgerEntry = getEntryByVideoId(submission.id);
                const clearingEndsAt = ledgerEntry?.clearingEndsAt;
                const isRpm = submission.program.payment_model !== 'pay_per_post' && submission.type === 'campaign';
                const canRequestPayout = payoutStatus === 'accruing' && (submission.estimated_payout || 0) >= 1;
                return <TableRow key={submission.id} className="hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors border-[#dce1eb] dark:border-[#141414]">
                        {/* Video Thumbnail & Title */}
                        <TableCell className="py-3">
                          <a href={submission.video_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group">
                            
                            <div className="min-w-0 max-w-[200px]">
                              <p style={{
                          fontFamily: 'Inter',
                          letterSpacing: '-0.3px'
                        }} className="text-sm truncate group-hover:underline transition-colors font-normal">
                                {submission.video_title || 'Untitled Video'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {submission.video_upload_date ? format(new Date(submission.video_upload_date), 'MMM d, yyyy') : format(new Date(submission.created_at), 'MMM d, yyyy')}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                {getPlatformIcon(submission.platform) && <img src={getPlatformIcon(submission.platform)!} alt={submission.platform} className="w-3.5 h-3.5" />}
                                <span className="text-xs text-muted-foreground truncate">
                                  {submission.video_author_username || '—'}
                                </span>
                              </div>
                            </div>
                          </a>
                        </TableCell>
                        
                        {/* Program */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            {submission.program.brand_logo_url ? <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                <img src={submission.program.brand_logo_url} alt={submission.program.brand_name || 'Brand'} className="w-full h-full object-cover" />
                              </div> : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-foreground font-medium">
                                  {submission.program.title.charAt(0).toUpperCase()}
                                </span>
                              </div>}
                            <span style={{
                        fontFamily: 'Inter',
                        letterSpacing: '-0.3px'
                      }} className="text-sm truncate max-w-[120px] font-normal">
                              {submission.program.title}
                            </span>
                          </div>
                        </TableCell>
                        
                        
                        {/* Status */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${submission.status === 'approved' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : submission.status === 'pending' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : submission.status === 'rejected' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                              {submission.status === 'approved' && <Check className="h-3 w-3" />}
                              {submission.status === 'pending' && <Clock className="h-3 w-3" />}
                              {submission.status === 'rejected' && <X className="h-3 w-3" />}
                              <span style={{
                          fontFamily: 'Inter',
                          letterSpacing: '-0.3px'
                        }}>
                                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                              </span>
                            </span>
                            {submission.is_flagged && <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button onClick={e => {
                              e.preventDefault();
                              e.stopPropagation();
                              setAnalyticsDialog({
                                open: true,
                                submission
                              });
                            }} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors">
                                      ⚠️ Flagged
                                      {!submission.analytics_recording_url && <span className="ml-1 underline">Submit Proof</span>}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <p className="text-sm font-medium mb-1">Video Flagged for Review</p>
                                    <p className="text-xs text-muted-foreground">
                                      {submission.analytics_recording_url ? "You've submitted analytics proof. The brand is reviewing it." : "Submit a screen recording of your analytics dashboard to verify your views."}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>}
                          </div>
                        </TableCell>
                        
                        {/* Views */}
                        <TableCell className="py-3 text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm font-medium tabular-nums cursor-default" style={{
                            fontFamily: 'Inter',
                            letterSpacing: '-0.3px'
                          }}>
                                  {formatNumber(submission.views)}
                                </span>
                              </TooltipTrigger>
                              {(submission.likes || submission.comments || submission.shares) && <TooltipContent side="top" className="bg-popover border border-border rounded-xl shadow-xl p-3">
                                  <div className="space-y-1.5 text-sm">
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Views</span>
                                      <span className="font-medium tabular-nums">{submission.views?.toLocaleString() || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Likes</span>
                                      <span className="font-medium tabular-nums">{submission.likes?.toLocaleString() || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Comments</span>
                                      <span className="font-medium tabular-nums">{submission.comments?.toLocaleString() || '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                      <span className="text-muted-foreground">Shares</span>
                                      <span className="font-medium tabular-nums">{submission.shares?.toLocaleString() || '—'}</span>
                                    </div>
                                  </div>
                                </TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        
                        {/* Submitted */}
                        <TableCell className="py-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-muted-foreground underline decoration-dotted cursor-pointer hover:text-foreground" style={{
                            fontFamily: 'Inter',
                            letterSpacing: '-0.3px'
                          }}>
                                  {format(new Date(submission.created_at), 'MMM d')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-popover border border-border rounded-xl shadow-xl p-3">
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Submitted</p>
                                  <p className="text-sm font-medium">{format(new Date(submission.created_at), 'MMMM d, yyyy')}</p>
                                  <p className="text-xs text-muted-foreground">{format(new Date(submission.created_at), 'h:mm a')}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        
                        {/* Payout Status */}
                        <TableCell className="py-3">
                          <PayoutStatusBadge status={payoutStatus} amount={submission.estimated_payout || 0} clearingEndsAt={clearingEndsAt} onRequestPayout={() => setVideoPayoutDialog({
                      open: true,
                      submission
                    })} canRequest={canRequestPayout} isRpm={isRpm} />
                        </TableCell>
                        
                      </TableRow>;
              })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && <div className="flex items-center justify-between mt-4 px-1">
                <p className="text-sm text-muted-foreground" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredSubmissions.length)} of {filteredSubmissions.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8">
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">
                    Next
                  </Button>
                </div>
              </div>}
          </>}
      </div>

      {/* Analytics Submission Dialog */}
      {analyticsDialog.submission && <SubmitAnalyticsDialog open={analyticsDialog.open} onOpenChange={open => setAnalyticsDialog({
      ...analyticsDialog,
      open
    })} submissionId={analyticsDialog.submission.id} videoTitle={analyticsDialog.submission.video_title || undefined} onSuccess={() => {
      fetchSubmissions();
      setAnalyticsDialog({
        open: false,
        submission: null
      });
    }} />}
    </Card>;
}