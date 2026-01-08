import { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight, ExternalLink, Link2, Plus, Loader2, FileText, PenLine } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { SubmitVideoDialog } from "@/components/SubmitVideoDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import DOMPurify from "dompurify";
import tiktokIcon from "@/assets/tiktok-logo-white.png";
import tiktokIconBlack from "@/assets/tiktok-logo-black-new.png";
import instagramIcon from "@/assets/instagram-logo-white.png";
import instagramIconBlack from "@/assets/instagram-logo-black.png";
import youtubeIcon from "@/assets/youtube-logo-white.png";
import youtubeIconBlack from "@/assets/youtube-logo-black-new.png";
import { SubmissionsTab } from "@/components/dashboard/SubmissionsTab";
import { BoostQuickActionsCard } from "@/components/campaign/BoostQuickActionsCard";
import { format, differenceInHours, startOfMonth, endOfMonth } from "date-fns";

interface CreatorContract {
  id: string;
  status: 'pending' | 'sent' | 'signed' | 'declined' | 'expired';
  contract_url: string | null;
  signed_at: string | null;
  sent_at: string | null;
}

interface Boost {
  id: string;
  title: string;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements?: string | null;
  blueprint_id?: string | null;
  blueprint_embed_url?: string | null;
  brand_name?: string;
  brand_logo_url?: string | null;
  brands?: {
    name: string;
    logo_url: string | null;
    is_verified?: boolean;
    slug?: string;
  };
  blueprint?: {
    content: string | null;
    hooks: any[] | null;
    talking_points: any[] | null;
    dos_and_donts: any | null;
    call_to_action: string | null;
    content_guidelines: string | null;
  } | null;
}

interface VideoSubmission {
  id: string;
  status: string;
  submitted_at: string;
  payout_amount: number | null;
}

export default function CreatorBoostDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();

  // Get boost from navigation state if available (instant load)
  const passedBoost = (location.state as { boost?: Boost } | null)?.boost;

  const [boost, setBoost] = useState<Boost | null>(passedBoost || null);
  const [loading, setLoading] = useState(!passedBoost);
  const [showSubmitVideoDialog, setShowSubmitVideoDialog] = useState(false);
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [contract, setContract] = useState<CreatorContract | null>(null);

  // Leave boost state
  const [leaveBoostDialogOpen, setLeaveBoostDialogOpen] = useState(false);
  const [leavingBoost, setLeavingBoost] = useState(false);

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokIconBlack : tiktokIcon;
      case "instagram":
        return isLightMode ? instagramIconBlack : instagramIcon;
      case "youtube":
        return isLightMode ? youtubeIconBlack : youtubeIcon;
      default:
        return null;
    }
  };

  // Fetch boost data only if not passed via navigation state
  useEffect(() => {
    const fetchBoost = async () => {
      if (!id) return;
      // Skip fetch if we already have boost data from navigation
      if (boost) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Fetch boost details
      const { data: boostData, error } = await supabase
        .from("boost_campaigns")
        .select(`
          *,
          brands (
            name,
            logo_url,
            is_verified,
            slug
          ),
          blueprints (
            content,
            hooks,
            talking_points,
            dos_and_donts,
            call_to_action,
            content_guidelines
          )
        `)
        .eq("id", id)
        .single();

      if (error || !boostData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load boost details"
        });
        navigate('/dashboard');
        return;
      }

      const brandData = boostData.brands as any;
      const blueprintData = boostData.blueprints as any;
      setBoost({
        ...boostData,
        brand_name: brandData?.name,
        brand_logo_url: brandData?.logo_url,
        brands: brandData,
        blueprint: blueprintData
      });
      setLoading(false);
    };

    fetchBoost();
  }, [id, navigate, toast, boost]);

  // Fetch submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!boost?.id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("video_submissions")
        .select("id, status, submitted_at, payout_amount")
        .eq("source_type", "boost")
        .eq("source_id", boost.id)
        .eq("creator_id", user.id)
        .order("submitted_at", { ascending: false });

      if (data) {
        setSubmissions(data);
      }
    };
    fetchSubmissions();
  }, [boost?.id]);

  // Fetch contract
  useEffect(() => {
    const fetchContract = async () => {
      if (!boost?.id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("creator_contracts")
        .select("id, status, contract_url, signed_at, sent_at")
        .eq("boost_id", boost.id)
        .eq("creator_id", user.id)
        .maybeSingle();

      if (data) {
        setContract(data as CreatorContract);
      }
    };
    fetchContract();
  }, [boost?.id]);

  const handleLeaveBoost = async () => {
    if (!boost?.id) return;
    setLeavingBoost(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to leave boost"
        });
        return;
      }

      // Update boost application status
      const { error } = await supabase
        .from("boost_applications")
        .update({ status: 'withdrawn' })
        .eq("boost_id", boost.id)
        .eq("creator_id", user.id);

      if (error) throw error;

      toast({
        title: "Left Boost",
        description: "You have successfully left this boost"
      });

      navigate('/dashboard');
    } catch (error) {
      console.error("Error leaving boost:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave boost. Please try again."
      });
    } finally {
      setLeavingBoost(false);
      setLeaveBoostDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!boost) {
    return null;
  }

  // Calculate stats
  const payoutPerVideo = boost.monthly_retainer / boost.videos_per_month;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const thisMonthSubmissions = submissions.filter(s => {
    const submitDate = new Date(s.submitted_at);
    return submitDate >= monthStart && submitDate <= monthEnd;
  });
  const approvedThisMonth = thisMonthSubmissions.filter(s => s.status === "approved").length;
  const pendingThisMonth = thisMonthSubmissions.filter(s => s.status === "pending").length;
  const activeSubmissionsThisMonth = approvedThisMonth + pendingThisMonth;
  const earnedThisMonth = approvedThisMonth * payoutPerVideo;
  const dailyLimit = Math.ceil(boost.videos_per_month / 30);
  const last24Hours = submissions.filter(s => {
    const hoursDiff = differenceInHours(now, new Date(s.submitted_at));
    return hoursDiff < 24 && s.status !== "rejected";
  });
  const dailyRemaining = Math.max(0, dailyLimit - last24Hours.length);
  const requiredPosts = Math.max(0, boost.videos_per_month - activeSubmissionsThisMonth);
  const earnedPercent = approvedThisMonth / boost.videos_per_month * 100;
  const pendingPercent = pendingThisMonth / boost.videos_per_month * 100;

  return (
    <>
      <div className="w-full px-4 sm:px-6 py-6">
        {/* Two-column layout on desktop */}
        <div className="flex gap-6">
          {/* Main Content Column */}
          <div className="flex-1 max-w-3xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
              <Link
                to="/dashboard"
                className="hover:text-foreground transition-colors font-medium"
              >
                Home
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
                {boost.title}
              </span>
            </nav>

            {/* Header */}
            <div className="flex items-start gap-3 sm:gap-4 mb-6">
              {(boost.brand_logo_url || boost.brands?.logo_url) && (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-border/50 bg-muted">
                  <img src={boost.brand_logo_url || boost.brands?.logo_url || ''} alt={boost.brand_name || boost.brands?.name || ''} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1
                  className="text-xl sm:text-2xl font-semibold"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}
                >
                  {boost.title}
                </h1>
                <div
                  className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                >
                  <span>{boost.brand_name || boost.brands?.name}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  <span className="text-primary font-medium">Retainer</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={() => setShowSubmitVideoDialog(true)}
                  className="h-9 px-4 rounded-[10px] font-medium text-sm bg-white hover:bg-neutral-100 text-black border border-border"
                  style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}
                  disabled={activeSubmissionsThisMonth >= boost.videos_per_month || dailyRemaining === 0}
                >
                  Submit Video
                </Button>
              </div>
            </div>

            {/* Contract Section */}
            {contract && (
              <div className={`mb-6 rounded-xl border p-4 flex items-center justify-between ${
                contract.status === 'signed'
                  ? 'border-green-500/30 bg-green-500/5'
                  : contract.status === 'sent' || contract.status === 'pending'
                    ? 'border-amber-500/30 bg-amber-500/5'
                    : 'border-border/50 bg-muted/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    contract.status === 'signed'
                      ? 'bg-green-500/10'
                      : 'bg-muted'
                  }`}>
                    <FileText className={`h-5 w-5 ${
                      contract.status === 'signed'
                        ? 'text-green-500'
                        : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Creator Contract</p>
                    <p className="text-xs text-muted-foreground">
                      {contract.status === 'signed'
                        ? `Signed ${contract.signed_at ? format(new Date(contract.signed_at), 'MMM d, yyyy') : ''}`
                        : contract.status === 'sent'
                          ? 'Awaiting your signature'
                          : contract.status === 'pending'
                            ? 'Contract pending'
                            : contract.status === 'declined'
                              ? 'Contract declined'
                              : 'Contract expired'
                      }
                    </p>
                  </div>
                </div>
                {contract.status === 'sent' && contract.contract_url && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 text-xs"
                    onClick={() => window.open(contract.contract_url!, '_blank')}
                  >
                    <PenLine className="h-3.5 w-3.5" />
                    Review & Sign
                  </Button>
                )}
                {contract.status === 'signed' && contract.contract_url && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-xs text-muted-foreground"
                    onClick={() => window.open(contract.contract_url!, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View
                  </Button>
                )}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-500">${earnedThisMonth.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Earned this month</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">${(pendingThisMonth * payoutPerVideo).toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending payout</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">${payoutPerVideo.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Per video</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold">${boost.monthly_retainer}</p>
                <p className="text-xs text-muted-foreground mt-1">Max monthly</p>
              </div>
            </div>

            {/* Progress Section */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Semi-circle Progress Chart */}
                <div className="relative w-32 h-16 flex-shrink-0">
                  <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                    <defs>
                      <pattern id="orangeStripes" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                        <rect width="3" height="6" fill="#f97316" />
                        <rect x="3" width="3" height="6" fill="#fb923c" />
                      </pattern>
                    </defs>

                    {/* Background arc */}
                    <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" className="stroke-black/10 dark:stroke-white/10" strokeWidth="8" strokeLinecap="round" />

                    {/* Approved arc (green) */}
                    {approvedThisMonth > 0 && <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${approvedThisMonth / boost.videos_per_month * 141.37} 141.37`} className="transition-all duration-500" />}

                    {/* Pending arc (orange animated stripes) */}
                    {pendingThisMonth > 0 && <g style={{
                    transform: `rotate(${approvedThisMonth / boost.videos_per_month * 180}deg)`,
                    transformOrigin: '50px 50px'
                  }}>
                        <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="url(#orangeStripes)" strokeWidth="8" strokeDasharray={`${pendingThisMonth / boost.videos_per_month * 141.37} 141.37`} className="transition-all duration-500" />
                      </g>}
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-0">
                    <span className="text-lg font-bold">{activeSubmissionsThisMonth}/{boost.videos_per_month}</span>
                  </div>
                </div>

                {/* Progress Legend */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Monthly Progress</span>
                    <span className="font-semibold">{activeSubmissionsThisMonth} / {boost.videos_per_month} videos</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                    {approvedThisMonth > 0 && <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${earnedPercent}%` }} />}
                    {pendingThisMonth > 0 && <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${pendingPercent}%` }} />}
                  </div>
                  <div className="flex items-center gap-4 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">{approvedThisMonth} Approved</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <span className="text-muted-foreground">{pendingThisMonth} Pending</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-muted" />
                      <span className="text-muted-foreground">{requiredPosts} Remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Guidelines */}
            {(boost.blueprint?.content || boost.content_style_requirements) && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>Content Guidelines</h4>
                {boost.blueprint?.content ? (
                  <div
                    className="text-sm text-foreground/90 leading-relaxed prose prose-sm dark:prose-invert max-w-none break-words p-4 bg-card border border-border rounded-xl"
                    style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(boost.blueprint.content) }}
                  />
                ) : (
                  <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words p-4 bg-card border border-border rounded-xl">
                    {boost.content_style_requirements}
                  </div>
                )}
              </div>
            )}

            {/* Blueprint Details */}
            {boost.blueprint && (
              <div className="space-y-4 mb-6">
                {/* Hooks */}
                {boost.blueprint.hooks && boost.blueprint.hooks.length > 0 && (
                  <div className="p-4 bg-card border border-border rounded-xl">
                    <h4 className="font-semibold text-sm mb-2">Hooks</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {boost.blueprint.hooks.map((hook: any, i: number) => (
                        <li key={i}>{typeof hook === 'string' ? hook : hook.text || hook.hook}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Talking Points */}
                {boost.blueprint.talking_points && boost.blueprint.talking_points.length > 0 && (
                  <div className="p-4 bg-card border border-border rounded-xl">
                    <h4 className="font-semibold text-sm mb-2">Talking Points</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {boost.blueprint.talking_points.map((point: any, i: number) => (
                        <li key={i}>{typeof point === 'string' ? point : point.text || point.point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Dos and Don'ts */}
                {boost.blueprint.dos_and_donts && (
                  <div className="grid grid-cols-2 gap-4">
                    {boost.blueprint.dos_and_donts.dos && boost.blueprint.dos_and_donts.dos.length > 0 && (
                      <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-xl">
                        <h4 className="font-semibold text-sm mb-2 text-green-500">Do's</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {boost.blueprint.dos_and_donts.dos.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {boost.blueprint.dos_and_donts.donts && boost.blueprint.dos_and_donts.donts.length > 0 && (
                      <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                        <h4 className="font-semibold text-sm mb-2 text-red-500">Don'ts</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {boost.blueprint.dos_and_donts.donts.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Call to Action */}
                {boost.blueprint.call_to_action && (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <h4 className="font-semibold text-sm mb-2 text-primary">Call to Action</h4>
                    <p className="text-sm text-muted-foreground">{boost.blueprint.call_to_action}</p>
                  </div>
                )}
              </div>
            )}

            {/* Your Submissions Section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3" style={{ fontFamily: 'Inter', letterSpacing: '-0.5px' }}>
                Your Submissions
              </h4>
              <SubmissionsTab boostId={boost.id} compact />
            </div>
          </div>

          {/* Right Sidebar - Info Cards */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-6 space-y-4">
              {/* Quick Stats Card */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-3">Quick Stats</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Daily Limit</span>
                    <span className="font-medium">{dailyRemaining} remaining</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Quota</span>
                    <span className="font-medium">{requiredPosts} remaining</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Platforms</span>
                    <div className="flex gap-1">
                      {['tiktok', 'instagram', 'youtube'].map(platform => {
                        const icon = getPlatformIcon(platform);
                        return icon ? <img key={platform} src={icon} alt={platform} className="w-4 h-4" /> : null;
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Info Card */}
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-3">Payment Info</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Per Video</span>
                    <span className="font-medium text-primary">${payoutPerVideo.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Max Monthly</span>
                    <span className="font-medium">${boost.monthly_retainer}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Videos Required</span>
                    <span className="font-medium">{boost.videos_per_month}/month</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <BoostQuickActionsCard
                boost={{
                  id: boost.id,
                  brand_name: boost.brand_name || boost.brands?.name,
                  brand_slug: boost.brands?.slug,
                  blueprint_id: boost.blueprint_id
                }}
                onSubmitVideo={() => setShowSubmitVideoDialog(true)}
                onLeaveBoost={() => setLeaveBoostDialogOpen(true)}
                canSubmit={activeSubmissionsThisMonth < boost.videos_per_month && dailyRemaining > 0}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Submit Video Dialog */}
      <SubmitVideoDialog
        source={{
          id: boost.id,
          title: boost.title,
          brand_name: boost.brand_name || boost.brands?.name,
          payment_model: 'pay_per_post',
          post_rate: payoutPerVideo,
          allowed_platforms: ['tiktok', 'instagram', 'youtube'],
          guidelines: boost.content_style_requirements || undefined,
          sourceType: 'boost'
        }}
        open={showSubmitVideoDialog}
        onOpenChange={setShowSubmitVideoDialog}
        onSuccess={() => {
          const fetchSubs = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
              .from("video_submissions")
              .select("id, status, submitted_at, payout_amount")
              .eq("source_type", "boost")
              .eq("source_id", boost.id)
              .eq("creator_id", user.id)
              .order("submitted_at", { ascending: false });
            if (data) setSubmissions(data);
          };
          fetchSubs();
        }}
      />

      {/* Leave Boost Confirmation Dialog */}
      <AlertDialog open={leaveBoostDialogOpen} onOpenChange={setLeaveBoostDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Boost?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this boost? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Withdraw your participation</li>
                <li>Stop your monthly retainer earnings</li>
                <li>Remove your access to boost resources</li>
              </ul>
              <p className="mt-2">You can always reapply later if the boost is still active.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveBoost} className="bg-destructive hover:bg-destructive/90">
              {leavingBoost ? "Leaving..." : "Leave Boost"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
