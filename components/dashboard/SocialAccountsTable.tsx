import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTheme } from "@/components/ThemeProvider";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { AudienceInsightsStatusCard } from "@/components/AudienceInsightsStatusCard";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";

interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
}

interface DemographicSubmission {
  id: string;
  tier1_percentage: number;
  status: string;
  score: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  screenshot_url: string | null;
}

export interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  account_link: string | null;
  follower_count: number | null;
  is_verified: boolean;
  connected_at: string;
  bio: string | null;
  avatar_url: string | null;
  hidden_from_public: boolean;
  connected_campaigns?: Array<{
    connection_id: string;
    campaign: Campaign;
  }>;
  demographic_submissions?: DemographicSubmission[];
  // zkTLS verification fields
  zktls_verified?: boolean;
  zktls_verified_at?: string | null;
  zktls_expires_at?: string | null;
  zktls_engagement_rate?: number | null;
  zktls_avg_views?: number | null;
  zktls_demographics?: Record<string, any> | null;
}

interface SocialAccountsTableProps {
  accounts: SocialAccount[];
  onRefresh: () => void;
  onManageAccount: (account: SocialAccount) => void;
  onUnlinkCampaign: (connectionId: string, campaignTitle: string) => void;
  onVerifyAccount: (account: {
    id: string;
    platform: string;
    username: string;
  }) => void;
  onSubmitDemographics: (account: {
    id: string;
    platform: string;
    username: string;
  }) => void;
  onVerifyZkTLS?: (account: {
    id: string;
    platform: string;
    username: string;
  }) => void;
}

export function SocialAccountsTable({
  accounts,
  onRefresh,
  onManageAccount,
  onUnlinkCampaign,
  onVerifyAccount,
  onSubmitDemographics,
  onVerifyZkTLS,
}: SocialAccountsTableProps) {
  const { resolvedTheme } = useTheme();

  const getPlatformIcon = (platform: string) => {
    const isLightMode = resolvedTheme === "light";
    switch (platform.toLowerCase()) {
      case "tiktok":
        return <img src={isLightMode ? tiktokLogoBlack : tiktokLogo} alt="TikTok" className="w-4 h-4" />;
      case "instagram":
        return <img src={isLightMode ? instagramLogoBlack : instagramLogo} alt="Instagram" className="w-4 h-4" />;
      case "youtube":
        return <img src={isLightMode ? youtubeLogoBlack : youtubeLogo} alt="YouTube" className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatFollowerCount = (count: number | null) => {
    if (!count) return "—";
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {accounts.map(account => {
          const connectedCampaigns = account.connected_campaigns || [];
          const demographicSubmissions = [...(account.demographic_submissions || [])].sort(
            (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          );

          return (
            <div
              key={account.id}
              className="p-4 rounded-xl bg-muted/50 dark:bg-muted/30 space-y-3"
            >
              {/* Header Row - Account & Manage Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-background flex items-center justify-center">
                    {getPlatformIcon(account.platform)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground font-inter tracking-[-0.3px]">
                        {account.username}
                      </span>
                      {account.is_verified ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                          Verified
                        </span>
                      ) : (
                        <button
                          onClick={() => onVerifyAccount({
                            id: account.id,
                            platform: account.platform,
                            username: account.username
                          })}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-500/30 transition-colors"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                      {formatFollowerCount(account.follower_count)} followers
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onManageAccount(account)}
                  className="h-9 px-4 rounded-xl bg-white dark:bg-background hover:bg-muted transition-colors text-sm font-medium font-inter tracking-[-0.3px]"
                >
                  Manage
                </button>
              </div>

              {/* Info Row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {connectedCampaigns.length > 0 && (
                  <span className="font-inter tracking-[-0.3px]">
                    {connectedCampaigns.length} campaign{connectedCampaigns.length !== 1 ? "s" : ""}
                  </span>
                )}
                <AudienceInsightsStatusCard
                  accountId={account.id}
                  platform={account.platform}
                  username={account.username}
                  submissions={demographicSubmissions}
                  campaignIds={connectedCampaigns.map(c => c.campaign.id)}
                  onSubmitNew={() => onSubmitDemographics({
                    id: account.id,
                    platform: account.platform,
                    username: account.username
                  })}
                  onRefresh={onRefresh}
                  zkTLSData={account.zktls_verified !== undefined ? {
                    zktls_verified: account.zktls_verified || false,
                    zktls_verified_at: account.zktls_verified_at,
                    zktls_expires_at: account.zktls_expires_at,
                    zktls_engagement_rate: account.zktls_engagement_rate,
                    zktls_avg_views: account.zktls_avg_views,
                    zktls_demographics: account.zktls_demographics,
                  } : undefined}
                  onVerifyZkTLS={onVerifyZkTLS ? () => onVerifyZkTLS({
                    id: account.id,
                    platform: account.platform,
                    username: account.username
                  }) : undefined}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-x-auto border border-border rounded-xl">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border dark:border-[#141414] hover:bg-transparent dark:bg-[#080808]">
              <TableHead className="text-foreground font-medium text-sm h-12 tracking-tighter">Account</TableHead>
              <TableHead className="text-foreground font-medium text-sm h-12 tracking-tighter">Followers</TableHead>
              <TableHead className="text-foreground font-medium text-sm h-12 tracking-tighter">Audience Insights</TableHead>
              <TableHead className="text-foreground font-medium text-sm h-12 text-right tracking-tighter">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map(account => {
              const connectedCampaigns = account.connected_campaigns || [];
              const demographicSubmissions = [...(account.demographic_submissions || [])].sort(
                (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
              );

              return (
                <TableRow
                  key={account.id}
                  className="hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors border-border dark:border-[#141414]"
                >
                  {/* Account Info */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(account.platform)}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-medium text-foreground truncate"
                            style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
                          >
                            {account.username}
                          </span>
                          {!account.is_verified && (
                            <button
                              onClick={() => onVerifyAccount({
                                id: account.id,
                                platform: account.platform,
                                username: account.username
                              })}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-500/30 transition-colors"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {/* Followers */}
                  <TableCell className="py-3">
                    <span
                      className="text-sm text-foreground"
                      style={{ fontFamily: "Inter", letterSpacing: "-0.3px" }}
                    >
                      {formatFollowerCount(account.follower_count)}
                    </span>
                  </TableCell>

                  {/* Audience Insights */}
                  <TableCell className="py-3">
                    <AudienceInsightsStatusCard
                      accountId={account.id}
                      platform={account.platform}
                      username={account.username}
                      submissions={demographicSubmissions}
                      campaignIds={connectedCampaigns.map(c => c.campaign.id)}
                      onSubmitNew={() => onSubmitDemographics({
                        id: account.id,
                        platform: account.platform,
                        username: account.username
                      })}
                      onRefresh={onRefresh}
                      zkTLSData={account.zktls_verified !== undefined ? {
                        zktls_verified: account.zktls_verified || false,
                        zktls_verified_at: account.zktls_verified_at,
                        zktls_expires_at: account.zktls_expires_at,
                        zktls_engagement_rate: account.zktls_engagement_rate,
                        zktls_avg_views: account.zktls_avg_views,
                        zktls_demographics: account.zktls_demographics,
                      } : undefined}
                      onVerifyZkTLS={onVerifyZkTLS ? () => onVerifyZkTLS({
                        id: account.id,
                        platform: account.platform,
                        username: account.username
                      }) : undefined}
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onManageAccount(account)}
                      className="h-8 px-3 text-xs font-medium border-0"
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
