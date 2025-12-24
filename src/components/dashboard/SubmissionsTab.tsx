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
import { format } from "date-fns";
import { useTheme } from "@/components/ThemeProvider";
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
  program: {
    id: string;
    title: string;
    brand_name?: string;
    brand_logo_url?: string | null;
  };
}
export function SubmissionsTab() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
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

      // Fetch campaign video submissions
      const {
        data: campaignVideos
      } = await supabase.from('campaign_videos').select(`
          id,
          video_url,
          platform,
          status,
          created_at,
          updated_at,
          submission_text,
          estimated_payout,
          campaigns (
            id,
            title,
            brand_name,
            brand_logo_url
          )
        `).eq('creator_id', user.id).order('created_at', {
        ascending: false
      });

      // Fetch boost video submissions
      const {
        data: boostVideos
      } = await supabase.from('boost_video_submissions').select(`
          id,
          video_url,
          platform,
          status,
          created_at,
          updated_at,
          submission_notes,
          payout_amount,
          rejection_reason,
          reviewed_at,
          bounty_campaigns (
            id,
            title,
            brands (
              name,
              logo_url
            )
          )
        `).eq('user_id', user.id).order('created_at', {
        ascending: false
      });
      const allSubmissions: Submission[] = [];

      // Map campaign videos
      if (campaignVideos) {
        campaignVideos.forEach((video: any) => {
          if (video.campaigns) {
            allSubmissions.push({
              id: video.id,
              video_url: video.video_url,
              platform: video.platform || 'unknown',
              status: video.status || 'pending',
              created_at: video.created_at,
              updated_at: video.updated_at,
              submission_text: video.submission_text,
              estimated_payout: video.estimated_payout,
              type: 'campaign',
              program: {
                id: video.campaigns.id,
                title: video.campaigns.title,
                brand_name: video.campaigns.brand_name,
                brand_logo_url: video.campaigns.brand_logo_url
              }
            });
          }
        });
      }

      // Map boost videos
      if (boostVideos) {
        boostVideos.forEach((video: any) => {
          if (video.bounty_campaigns) {
            allSubmissions.push({
              id: video.id,
              video_url: video.video_url,
              platform: video.platform || 'unknown',
              status: video.status || 'pending',
              created_at: video.created_at,
              updated_at: video.updated_at,
              submission_text: video.submission_notes,
              estimated_payout: video.payout_amount,
              rejection_reason: video.rejection_reason,
              reviewed_at: video.reviewed_at,
              type: 'boost',
              program: {
                id: video.bounty_campaigns.id,
                title: video.bounty_campaigns.title,
                brand_name: video.bounty_campaigns.brands?.name,
                brand_logo_url: video.bounty_campaigns.brands?.logo_url
              }
            });
          }
        });
      }

      // Sort by created_at descending
      allSubmissions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setSubmissions(allSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
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
      {/* Filter Button */}
      <div className="pt-5 pb-4 px-0">
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
      </div>

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
                }}>Program</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Type</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Platform</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Status</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Submitted</TableHead>
                    <TableHead className="text-foreground font-medium text-sm h-12" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.5px'
                }}>Reviewed</TableHead>
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
                  {paginatedSubmissions.map(submission => <TableRow key={submission.id} className="hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors border-[#dce1eb] dark:border-[#141414]">
                      {/* Program */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          {submission.program.brand_logo_url ? <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                              <img src={submission.program.brand_logo_url} alt={submission.program.brand_name || 'Brand'} className="w-full h-full object-cover" />
                            </div> : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-xs text-foreground font-medium">
                                {submission.program.title.charAt(0).toUpperCase()}
                              </span>
                            </div>}
                          <span className="text-sm font-medium" style={{
                      fontFamily: 'Inter',
                      letterSpacing: '-0.3px'
                    }}>
                            {submission.program.title}
                          </span>
                        </div>
                      </TableCell>
                      
                      {/* Type */}
                      <TableCell className="py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${submission.type === 'campaign' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'}`} style={{
                    fontFamily: 'Inter',
                    letterSpacing: '-0.3px'
                  }}>
                          {submission.type === 'campaign' ? 'Campaign' : 'Boost'}
                        </span>
                      </TableCell>
                      
                      {/* Platform */}
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(submission.platform) && <img src={getPlatformIcon(submission.platform)!} alt={submission.platform} className="w-4 h-4" />}
                          <span className="text-sm text-muted-foreground capitalize" style={{
                      fontFamily: 'Inter',
                      letterSpacing: '-0.3px'
                    }}>
                            {submission.platform}
                          </span>
                        </div>
                      </TableCell>
                      
                      {/* Status */}
                      <TableCell className="py-4">
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
                      
                      {/* Submitted */}
                      <TableCell className="py-4">
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
                      
                      {/* Reviewed */}
                      <TableCell className="py-4 text-sm text-muted-foreground" style={{
                  fontFamily: 'Inter',
                  letterSpacing: '-0.3px'
                }}>
                        {submission.reviewed_at ? <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="underline decoration-dotted cursor-pointer hover:text-foreground">
                                  {format(new Date(submission.reviewed_at), 'MMM d')}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="bg-popover border border-border rounded-xl shadow-xl p-3">
                                <div className="space-y-1">
                                  <p className="text-xs text-muted-foreground">Reviewed</p>
                                  <p className="text-sm font-medium">{format(new Date(submission.reviewed_at), 'MMMM d, yyyy')}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider> : submission.status !== 'pending' ? format(new Date(submission.updated_at), 'MMM d') : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      
                      {/* Payout */}
                      <TableCell className="py-4 text-right">
                        {submission.status === 'approved' && submission.estimated_payout ? <span className="text-sm font-semibold text-green-600 dark:text-green-400" style={{
                    fontFamily: 'Inter',
                    letterSpacing: '-0.5px'
                  }}>
                            ${submission.estimated_payout.toFixed(2)}
                          </span> : submission.status === 'pending' && submission.estimated_payout ? <span className="text-sm text-muted-foreground" style={{
                    fontFamily: 'Inter',
                    letterSpacing: '-0.5px'
                  }}>
                            ~${submission.estimated_payout.toFixed(2)}
                          </span> : <span className="text-sm text-muted-foreground/50">—</span>}
                      </TableCell>
                      
                      {/* Link */}
                      <TableCell className="py-4">
                        <a href={submission.video_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-muted transition-colors inline-flex">
                          <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      </TableCell>
                    </TableRow>)}
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