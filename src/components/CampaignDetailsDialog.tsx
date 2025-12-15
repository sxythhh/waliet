import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink, CheckCircle, TrendingUp, MessageSquare, ChevronDown, ChevronUp, Plus, Link2, Megaphone } from "lucide-react";
import addDiamondIcon from "@/assets/add-diamond-icon.svg";
import warningIcon from "@/assets/warning-icon.svg";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/ThemeProvider";
import tiktokIcon from "@/assets/tiktok-logo-white.png";
import tiktokIconBlack from "@/assets/tiktok-logo-black-new.png";
import instagramIcon from "@/assets/instagram-logo-white.png";
import instagramIconBlack from "@/assets/instagram-logo-black.png";
import youtubeIcon from "@/assets/youtube-logo-white.png";
import youtubeIconBlack from "@/assets/youtube-logo-black-new.png";
import xIcon from "@/assets/x-logo.png";
import xIconLight from "@/assets/x-logo-light.png";
interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
}
interface AssetLink {
  label: string;
  url: string;
}
interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  description: string | null;
  status: string;
  budget: number;
  budget_used?: number | null;
  rpm_rate: number;
  allowed_platforms: string[] | null;
  start_date?: string | null;
  end_date: string | null;
  created_at: string;
  hashtags?: string[] | null;
  guidelines?: string | null;
  embed_url?: string | null;
  connected_accounts?: ConnectedAccount[];
  asset_links?: AssetLink[] | null;
  requirements?: string[] | null;
  campaign_update?: string | null;
  campaign_update_at?: string | null;
  payout_day_of_week?: number | null;
}
interface CampaignDetailsDialogProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoin?: () => void;
  onConnectAccount?: () => void;
  onManageAccount?: (account: ConnectedAccount) => void;
}
const calculateTimeAgo = (createdAt: string) => {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  return `${diffHours}h ago`;
};
const calculateDaysUntilEnd = (endDate: string | null) => {
  if (!endDate) return null;
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};
const getNextPayoutDate = (payoutDayOfWeek: number = 2) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  // Calculate days until next payout day
  let daysUntilPayout = (payoutDayOfWeek - dayOfWeek + 7) % 7;
  if (daysUntilPayout === 0) daysUntilPayout = 7; // If today is payout day, next week
  const nextPayoutDate = new Date(now);
  nextPayoutDate.setDate(now.getDate() + daysUntilPayout);
  nextPayoutDate.setHours(12, 0, 0, 0);
  return {
    date: nextPayoutDate,
    daysUntil: daysUntilPayout
  };
};
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
const getFaviconUrl = (url: string) => {
  try {
    const urlObj = new URL(url);
    // Use Clearbit for high-quality logos
    return `https://logo.clearbit.com/${urlObj.hostname}`;
  } catch {
    return null;
  }
};
const renderDescriptionWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0; // Reset regex
      return <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-[#2060df] hover:underline">
          {part}
        </a>;
    }
    return part;
  });
};
export function CampaignDetailsDialog({
  campaign,
  open,
  onOpenChange,
  onJoin,
  onConnectAccount,
  onManageAccount
}: CampaignDetailsDialogProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expectedPayout, setExpectedPayout] = useState<{
    views: number;
    amount: number;
  } | null>(null);
  const {
    resolvedTheme
  } = useTheme();

  // Fetch latest view metrics from Shortimize data
  useEffect(() => {
    const fetchExpectedPayout = async () => {
      if (!campaign?.id || !open) return;

      // Get the most recent metrics snapshot for this campaign
      const {
        data: metrics
      } = await supabase.from('campaign_video_metrics').select('total_views, recorded_at').eq('campaign_id', campaign.id).order('recorded_at', {
        ascending: false
      }).limit(1);
      if (metrics && metrics.length > 0) {
        // Use latest total views for cumulative earnings display
        const totalViews = Number(metrics[0]?.total_views) || 0;

        // Calculate payout: (views / 1000) * rpm_rate
        const amount = totalViews / 1000 * campaign.rpm_rate;
        setExpectedPayout({
          views: totalViews,
          amount
        });
      } else {
        setExpectedPayout(null);
      }
    };
    fetchExpectedPayout();
  }, [campaign?.id, campaign?.rpm_rate, open]);
  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return isLightMode ? tiktokIconBlack : tiktokIcon;
      case "instagram":
        return isLightMode ? instagramIconBlack : instagramIcon;
      case "youtube":
        return isLightMode ? youtubeIconBlack : youtubeIcon;
      case "x":
        return isLightMode ? xIconLight : xIcon;
      default:
        return null;
    }
  };
  if (!campaign) return null;
  const daysUntilEnd = calculateDaysUntilEnd(campaign.end_date);
  const timeAgo = calculateTimeAgo(campaign.created_at);
  const hasConnectedAccounts = campaign.connected_accounts && campaign.connected_accounts.length > 0;
  const hasAssetLinks = campaign.asset_links && campaign.asset_links.length > 0;
  const hasRequirements = campaign.requirements && campaign.requirements.length > 0;
  const nextPayout = getNextPayoutDate(campaign.payout_day_of_week ?? 2);
  const startDate = campaign.start_date || campaign.created_at;
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-8">
        {/* Header */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4">
          {campaign.brand_logo_url && <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 ring-1 ring-border/50 bg-muted">
              <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-full h-full object-cover" />
            </div>}
          <div className="flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-semibold mb-1" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.5px'
          }}>{campaign.brand_name}</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-muted-foreground" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
              <span>Started {formatDate(startDate)}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40 hidden sm:block" />
              <span className="hidden sm:inline">{timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Campaign Update Banner */}
        {campaign.campaign_update && (
          <div className="mb-4 p-3 rounded-xl bg-[#2060df]/10 border border-[#2060df]/20 flex items-start gap-3">
            <Megaphone className="w-4 h-4 text-[#2060df] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#2060df] mb-1" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                Campaign Update
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                {campaign.campaign_update}
              </p>
            </div>
          </div>
        )}

        {/* Next Payout Card */}
        <div className="mb-4 p-4 rounded-2xl px-0 py-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.3px'
            }}>Next Payout</p>
              <p className="text-sm font-semibold" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.5px'
            }}>
                {nextPayout.date.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[...Array(7)].map((_, i) => <div key={i} className={`w-1.5 h-5 sm:h-6 rounded-full transition-all ${i < 7 - nextPayout.daysUntil ? 'bg-[#2060df]' : 'bg-muted-foreground/20'}`} />)}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.3px'
            }}>
                {nextPayout.daysUntil === 1 ? 'Tomorrow' : `${nextPayout.daysUntil} days`}
              </p>
            </div>
          </div>
          
          {/* Demographics Reminder Notice - show 1 day before payout */}
          {nextPayout.daysUntil === 1 && (
            <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-transparent flex items-center gap-3">
              <img src={warningIcon} alt="" className="w-4 h-4 flex-shrink-0" />
              <p className="text-xs text-amber-600 dark:text-amber-400" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                Payout is tomorrow! Make sure to submit your view demographics before the deadline.
              </p>
            </div>
          )}

          {/* Expected Payout Card */}
          {expectedPayout !== null && <div className="mt-3 p-3 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f]">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.3px'
              }}>Overall Expected Payout</p>
                  <p style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.5px'
              }} className="text-lg font-semibold text-foreground">
                    ${expectedPayout.amount.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.3px'
              }}>Total views</p>
                  <p className="text-sm font-medium" style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.5px'
              }}>
                    {expectedPayout.views.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {/* Budget Progress Bar */}
              {(() => {
            const paidOut = campaign.budget_used || 0;
            const expected = expectedPayout.amount;
            const total = campaign.budget || 1;
            const remaining = Math.max(0, total - paidOut - expected);
            const paidPercent = paidOut / total * 100;
            const expectedPercent = expected / total * 100;
            const remainingPercent = remaining / total * 100;
            return <div>
                    <div className="h-2 rounded-full overflow-hidden flex bg-muted/50">
                      <div className="bg-[#22c55e] transition-all" style={{
                  width: `${Math.min(paidPercent, 100)}%`
                }} />
                      <div className="transition-all relative overflow-hidden" style={{
                  width: `${Math.min(expectedPercent, 100 - paidPercent)}%`,
                  background: `repeating-linear-gradient(
                            -45deg,
                            #f59e0b,
                            #f59e0b 4px,
                            #d97706 4px,
                            #d97706 8px
                          )`,
                  backgroundSize: '200% 100%',
                  animation: 'stripeMove 1s linear infinite'
                }} />
                      <div className="bg-muted-foreground/20 transition-all" style={{
                  width: `${remainingPercent}%`
                }} />
                    </div>
                    <div style={{
                fontFamily: 'Inter',
                letterSpacing: '-0.3px'
              }} className="justify-between mt-2 text-[10px] flex flex-row">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                        <span className="text-muted-foreground">Paid ${paidOut.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                        <span className="text-muted-foreground">Expected ${expected.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                        <span className="text-muted-foreground">Left ${remaining.toFixed(0)}</span>
                      </div>
                    </div>
                  </div>;
          })()}
            </div>}
        </div>

        {/* Description with gradient + read more */}
        {campaign.description && <div className="mb-4">
            <div className="relative">
              <div className={`text-sm text-foreground/90 leading-relaxed overflow-hidden transition-all whitespace-pre-line ${showFullDescription ? '' : 'max-h-[100px]'}`} style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
                {renderDescriptionWithLinks(campaign.description)}
              </div>
              {!showFullDescription && campaign.description.length > 200 && <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />}
            </div>
            {campaign.description.length > 200 && <div className="flex justify-center mt-2">
                <button onClick={() => setShowFullDescription(!showFullDescription)} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
                  {showFullDescription ? 'Show less' : 'Show more'}
                </button>
              </div>}
          </div>}

        {/* Stats Grid - responsive layout */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl mb-4 bg-sidebar">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide" style={{
            fontFamily: 'Inter'
          }}>Ends</p>
            <p className="font-semibold text-xs sm:text-sm" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.5px'
          }}>{daysUntilEnd !== null ? `${daysUntilEnd}d` : "—"}</p>
          </div>

          <div className="text-center hidden sm:block">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide" style={{
            fontFamily: 'Inter'
          }}>Language</p>
            <p className="font-semibold text-sm" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.5px'
          }}>English</p>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide" style={{
            fontFamily: 'Inter'
          }}>Platforms</p>
            <div className="flex justify-center gap-1 mt-1.5">
              {campaign.allowed_platforms?.map(platform => {
              const iconSrc = getPlatformIcon(platform);
              return iconSrc ? <img key={platform} src={iconSrc} alt={platform} className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : null;
            })}
            </div>
          </div>

          <div className="text-center hidden sm:block">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide" style={{
            fontFamily: 'Inter'
          }}>Pay Type</p>
            <p className="font-semibold text-sm" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.5px'
          }}>Per view</p>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide" style={{
            fontFamily: 'Inter'
          }}>Per 1M Views</p>
            <p className="font-semibold text-xs sm:text-sm text-[#2060df]" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.5px'
          }}>${(campaign.rpm_rate * 1000).toLocaleString()}</p>
          </div>
        </div>

        {/* Connected Accounts Section */}
        {(onConnectAccount || onManageAccount) && <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.5px'
          }}>Your Connected Accounts</h4>
              {onConnectAccount && <button onClick={onConnectAccount} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white bg-[#2061de] hover:bg-[#1a4db8] transition-colors border-t border-[#4b85f7]" style={{
            fontFamily: 'Inter',
            letterSpacing: '-0.3px'
          }}>
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>}
            </div>
            
            {hasConnectedAccounts ? <div className="flex flex-wrap gap-2">
                {campaign.connected_accounts!.map(account => <button key={account.id} onClick={() => onManageAccount?.(account)} className="group relative flex items-center gap-2.5 pl-3 pr-4 py-2.5 transition-all duration-200 cursor-pointer bg-popover rounded-md">
                    <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center shadow-sm">
                      {getPlatformIcon(account.platform) && <img src={getPlatformIcon(account.platform)!} alt={account.platform} className="w-4 h-4" />}
                    </div>
                    <span className="font-medium text-sm" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.3px'
            }}>{account.username}</span>
                  </button>)}
              </div> : <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <img src={addDiamondIcon} alt="Add" className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{
              fontFamily: 'Inter',
              letterSpacing: '-0.3px'
            }}>No accounts connected</p>
                  <p className="text-xs text-muted-foreground">Connect an account to start earning</p>
                </div>
              </div>}
          </div>}

        {/* Asset Links Section */}
        {hasAssetLinks && <div className="mb-4">
            <h4 className="text-sm font-semibold mb-3" style={{
          letterSpacing: '-0.5px'
        }}>Campaign Assets</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {campaign.asset_links!.map((link, index) => {
            const faviconUrl = getFaviconUrl(link.url);
            return <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] hover:bg-[#e8e8e8] dark:hover:bg-[#141414] transition-colors group">
                    {faviconUrl && <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={faviconUrl} alt="" className="w-6 h-6 object-contain" onError={e => {
                  e.currentTarget.style.display = 'none';
                }} />
                      </div>}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm truncate">{link.label}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{link.url}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </a>;
          })}
            </div>
          </div>}

        {/* Requirements Section */}
        {hasRequirements && <div className="mb-4">
            <h4 className="text-sm font-semibold mb-3" style={{
          letterSpacing: '-0.5px'
        }}>Campaign Requirements</h4>
            <div className="space-y-2">
              {campaign.requirements!.map((req, index) => <div key={index} className="gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#f4f4f4] dark:bg-[#0f0f0f] flex items-center justify-start">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#2060df] flex items-center justify-center text-white text-[10px] sm:text-xs font-semibold shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed">{req}</p>
                </div>)}
            </div>
          </div>}

        {/* Campaign Link Card */}
        {campaign.embed_url && <div className="mb-4 p-4 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <span className="text-primary font-bold text-lg">)l.</span>
                </div>
                <div>
                  <p className="font-semibold text-sm">{campaign.brand_name} | Vyro</p>
                  <p className="text-xs text-muted-foreground">{campaign.embed_url}</p>
                </div>
              </div>
              <a href={campaign.embed_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </a>
            </div>
          </div>}

        {/* Join Button */}
        {onJoin && <Button onClick={onJoin} className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-full" size="lg">
            Join campaign
          </Button>}
      </DialogContent>
    </Dialog>;
}