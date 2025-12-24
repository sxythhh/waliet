import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { SlidersHorizontal, ChevronDown, ChevronLeft, Check, Clock, X, ExternalLink, Video, DollarSign, Lock, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, addDays, formatDistanceToNow } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
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
  // Video details
  video_title?: string | null;
  video_cover_url?: string | null;
  views?: number | null;
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

interface PayoutRequest {
  id: string;
  total_amount: number;
  status: 'clearing' | 'completed' | 'cancelled';
  clearing_ends_at: string;
  created_at: string;
}

export function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterSubmenu, setFilterSubmenu] = useState<'main' | 'status' | 'type' | 'program'>('main');
  const [filterSearch, setFilterSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
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
      const { data: videoSubmissions, error } = await supabase
        .from('video_submissions')
        .select('*')
        .eq('creator_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('Error fetching submissions:', error);
        setLoading(false);
        return;
      }

      // Get unique source IDs for campaigns and boosts
      const campaignIds = [...new Set(videoSubmissions?.filter(v => v.source_type === 'campaign').map(v => v.source_id) || [])];
      const boostIds = [...new Set(videoSubmissions?.filter(v => v.source_type === 'boost').map(v => v.source_id) || [])];

      // Fetch campaign details
      let campaignMap: Record<string, { id: string; title: string; brand_name: string; brand_logo_url: string | null; rpm_rate: number; payment_model: string | null; post_rate: number | null }> = {};
      if (campaignIds.length > 0) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('id, title, brand_name, brand_logo_url, rpm_rate, payment_model, post_rate')
          .in('id', campaignIds);
        if (campaigns) {
          campaigns.forEach(c => {
            campaignMap[c.id] = c;
          });
        }
      }

      // Fetch boost details with brand info
      let boostMap: Record<string, { id: string; title: string; brand_name: string; brand_logo_url: string | null; monthly_retainer: number; videos_per_month: number }> = {};
      if (boostIds.length > 0) {
        const { data: boosts } = await supabase
          .from('bounty_campaigns')
          .select('id, title, monthly_retainer, videos_per_month, brands(name, logo_url)')
          .in('id', boostIds);
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
        
        // Calculate estimated payout
        let estimatedPayout = video.payout_amount;
        if (estimatedPayout === null || estimatedPayout === undefined) {
          if (isBoost && program) {
            const boost = program as typeof boostMap[string];
            estimatedPayout = boost.monthly_retainer / boost.videos_per_month;
          } else if (!isBoost && program) {
            const campaign = program as typeof campaignMap[string];
            if (campaign.payment_model === 'pay_per_post') {
              estimatedPayout = campaign.post_rate || 0;
            } else if (campaign.rpm_rate && video.views) {
              estimatedPayout = (video.views / 1000) * campaign.rpm_rate;
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
          // Video details - use video_description as caption, fallback to video_title
          video_title: video.video_description || video.video_title,
          video_cover_url: video.video_thumbnail_url,
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          shares: video.shares,
          video_upload_date: video.video_upload_date,
          video_author_username: video.video_author_username,
          program: program || { id: video.source_id, title: 'Unknown', brand_name: '', brand_logo_url: null }
        };
      }).filter(s => s.program);

      setSubmissions(allSubmissions);

      // Fetch active payout requests
      const { data: requests } = await supabase
        .from('submission_payout_requests')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['clearing'])
        .order('created_at', { ascending: false });
      
      setPayoutRequests((requests || []) as PayoutRequest[]);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate available payout amount (approved submissions that aren't locked or paid)
  const availableForPayout = submissions
    .filter(s => s.status === 'approved' && s.payout_status === 'available' && (s.estimated_payout || 0) > 0)
    .reduce((sum, s) => sum + (s.estimated_payout || 0), 0);

  const availableSubmissions = submissions.filter(
    s => s.status === 'approved' && s.payout_status === 'available' && (s.estimated_payout || 0) > 0
  );

  const handleRequestPayout = async () => {
    if (availableForPayout < 1) {
      toast.error('Minimum payout is $1.00');
      return;
    }

    setRequestingPayout(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create payout request with 7-day clearing period
      const clearingEndsAt = addDays(new Date(), 7);
      
      const { data: request, error: requestError } = await supabase
        .from('submission_payout_requests')
        .insert({
          user_id: user.id,
          total_amount: availableForPayout,
          clearing_ends_at: clearingEndsAt.toISOString(),
          status: 'clearing'
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create payout items for each submission
      const payoutItems = availableSubmissions.map(s => ({
        payout_request_id: request.id,
        submission_id: s.id,
        amount: s.estimated_payout || 0,
        source_type: s.type,
        source_id: s.program.id
      }));

      const { error: itemsError } = await supabase
        .from('submission_payout_items')
        .insert(payoutItems);

      if (itemsError) throw itemsError;

      // Update submission payout_status to 'locked'
      const submissionIds = availableSubmissions.map(s => s.id);
      const { error: updateError } = await supabase
        .from('video_submissions')
        .update({ payout_status: 'locked' })
        .in('id', submissionIds);

      if (updateError) throw updateError;

      toast.success(`Payout of $${availableForPayout.toFixed(2)} requested! 7-day clearing period started.`);
      setPayoutDialogOpen(false);
      fetchSubmissions();
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast.error('Failed to request payout');
    } finally {
      setRequestingPayout(false);
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
    return <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>;
  }
  return <Card className="bg-card border rounded-xl overflow-hidden border-[#141414]/0">
      {/* Filter and Payout Buttons */}
      <div className="pt-5 pb-4 px-0 flex items-center gap-3">
        <DropdownMenu open={filterOpen} onOpenChange={open => {
        setFilterOpen(open);
        if (!open) {
          setFilterSubmenu('main');
          setFilterSearch('');
        }
      }}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-[9px] border-border bg-background hover:bg-background px-4 py-2 h-auto">
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
          letterSpacing: '-0.5px'
        }}>
            <div className="relative">
              {/* Main Menu */}
              <div className={`transition-all duration-200 ease-out ${filterSubmenu === 'main' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full absolute inset-0'}`}>
                <div className="relative mb-3">
                  <Input placeholder="Filter..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} className="bg-background/50 border-border h-10 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border" />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">F</kbd>
                </div>
                
                <div className="space-y-1">
                  {/* Status Filter */}
                  <button onClick={() => setFilterSubmenu('status')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 border-dashed border-current" />
                      <span className="text-sm">Status</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusFilter !== 'all' && <span className="text-xs text-muted-foreground capitalize">{statusFilter}</span>}
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </div>
                  </button>

                  {/* Type Filter */}
                  <button onClick={() => setFilterSubmenu('type')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Video className="h-4 w-4" />
                      <span className="text-sm">Type</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeFilter !== 'all' && <span className="text-xs text-muted-foreground capitalize">{typeFilter}</span>}
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </div>
                  </button>

                  {/* Program Filter */}
                  <button onClick={() => setFilterSubmenu('program')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                        <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                        <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                        <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                        <div className="w-1.5 h-1.5 rounded-sm bg-current" />
                      </div>
                      <span className="text-sm">Program</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {programFilter !== 'all' && <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                          {uniquePrograms.find(p => p.id === programFilter)?.title}
                        </span>}
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
                        </div> : <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          
                        </div>}
                      <span className="text-sm truncate flex-1">{program.title}</span>
                      {programFilter === program.id && <Check className="h-4 w-4 ml-auto flex-shrink-0" />}
                    </button>)}
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Request Payout Button */}
        <Button 
          onClick={() => setPayoutDialogOpen(true)}
          disabled={availableForPayout < 1}
          className="gap-2 rounded-[9px] px-4 py-2 h-auto bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}
        >
          <DollarSign className="h-4 w-4" />
          <span className="font-medium">Request all payouts</span>
          {availableForPayout >= 1 && (
            <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
              ${availableForPayout.toFixed(2)}
            </span>
          )}
        </Button>

        {/* Active clearing info */}
        {payoutRequests.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 rounded-lg text-orange-600 dark:text-orange-400">
                  <Lock className="h-4 w-4" />
                  <span className="text-sm font-medium" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                    ${payoutRequests.reduce((sum, r) => sum + r.total_amount, 0).toFixed(2)} clearing
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-2">
                  {payoutRequests.map(r => (
                    <div key={r.id} className="text-sm">
                      <p className="font-medium">${r.total_amount.toFixed(2)}</p>
                      <p className="text-muted-foreground">
                        Clears {formatDistanceToNow(new Date(r.clearing_ends_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Payout Request Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
              Request Payout
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Request your approved earnings to be paid out.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Amount */}
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600 dark:text-green-400" style={{ fontFamily: 'Inter' }}>
                ${availableForPayout.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                from {availableSubmissions.length} approved video{availableSubmissions.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 bg-muted/30 rounded-xl p-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <div>
                  <p className="font-medium text-sm">Submission approved → Request payout</p>
                  <p className="text-xs text-muted-foreground">Once approved, click "Request all payouts" (minimum $1.00).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">2</div>
                <div>
                  <p className="font-medium text-sm">7-day clearing period</p>
                  <p className="text-xs text-muted-foreground">Brands can flag videos for review (days 1-4). Your earnings are locked but new ones still accumulate.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                <div>
                  <p className="font-medium text-sm">Funds paid out</p>
                  <p className="text-xs text-muted-foreground">After 7 days, funds are sent automatically to your wallet. Request new accumulated earnings afterwards.</p>
                </div>
              </div>
            </div>

            {availableForPayout < 1 && (
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">Minimum payout is $1.00. Keep creating to earn more!</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRequestPayout}
              disabled={availableForPayout < 1 || requestingPayout}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {requestingPayout ? 'Requesting...' : `Request $${availableForPayout.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions Table */}
      <div className="pb-6 px-0">
        {submissions.length === 0 ? <div className="text-center py-12">
            <Video className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
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
            <div className="overflow-x-auto border border-[#dce1eb] dark:border-[#141414] rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#dce1eb] dark:border-[#141414] hover:bg-transparent">
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Video</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Program</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Account</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Status</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12 text-right" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Views</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Submitted</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12 text-right" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Payout</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12 w-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}></TableHead>
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

                    return (
                      <TableRow key={submission.id} className="hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors border-[#dce1eb] dark:border-[#141414]">
                        {/* Video Thumbnail & Title */}
                        <TableCell className="py-3">
                          <a 
                            href={submission.video_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 group"
                          >
                            {/* 9:16 aspect ratio thumbnail */}
                            <div className="w-10 h-[60px] rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                              {submission.video_cover_url ? (
                                <img 
                                  src={submission.video_cover_url} 
                                  alt={submission.video_title || 'Video'} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video className="w-4 h-4 text-muted-foreground" />
                                </div>
                              )}
                              {/* Platform badge */}
                              {getPlatformIcon(submission.platform) && (
                                <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                                  <img 
                                    src={getPlatformIcon(submission.platform)!} 
                                    alt={submission.platform} 
                                    className="w-2.5 h-2.5"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 max-w-[200px]">
                              <p className="text-sm font-medium truncate group-hover:underline transition-colors" style={{
                                fontFamily: 'Inter',
                                letterSpacing: '-0.3px'
                              }}>
                                {submission.video_title || 'Untitled Video'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {submission.video_upload_date 
                                  ? format(new Date(submission.video_upload_date), 'MMM d, yyyy')
                                  : format(new Date(submission.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </a>
                        </TableCell>
                        
                        {/* Program */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            {submission.program.brand_logo_url ? (
                              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                                <img src={submission.program.brand_logo_url} alt={submission.program.brand_name || 'Brand'} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <span className="text-xs text-foreground font-medium">
                                  {submission.program.title.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-sm font-medium truncate max-w-[120px]" style={{
                              fontFamily: 'Inter',
                              letterSpacing: '-0.3px'
                            }}>
                              {submission.program.title}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Account */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            {getPlatformIcon(submission.platform) && <img src={getPlatformIcon(submission.platform)!} alt={submission.platform} className="w-4 h-4" />}
                            <span className="text-sm text-white dark:text-white" style={{
                              fontFamily: 'Inter',
                              letterSpacing: '-0.3px'
                            }}>
                              {submission.video_author_username || '—'}
                            </span>
                          </div>
                        </TableCell>
                        
                        {/* Status */}
                        <TableCell className="py-3">
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
                              {(submission.likes || submission.comments || submission.shares) && (
                                <TooltipContent side="top" className="bg-popover border border-border rounded-xl shadow-xl p-3">
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
                                </TooltipContent>
                              )}
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
                        
                        {/* Payout */}
                        <TableCell className="py-3 text-right">
                          {submission.status === 'approved' && submission.estimated_payout ? (
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400" style={{
                              fontFamily: 'Inter',
                              letterSpacing: '-0.5px'
                            }}>
                              ${submission.estimated_payout.toFixed(2)}
                            </span>
                          ) : submission.status === 'pending' && submission.estimated_payout ? (
                            <span className="text-sm text-muted-foreground" style={{
                              fontFamily: 'Inter',
                              letterSpacing: '-0.5px'
                            }}>
                              ~${submission.estimated_payout.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground/50" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>—</span>
                          )}
                        </TableCell>
                        
                        {/* Link */}
                        <TableCell className="py-3">
                          <a href={submission.video_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted transition-colors inline-flex">
                            <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </a>
                        </TableCell>
                      </TableRow>
                    );
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
    </Card>;
}