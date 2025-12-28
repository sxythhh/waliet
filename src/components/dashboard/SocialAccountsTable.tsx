import { useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { ArrowUpRight, Link2, Trash2, X, MoreHorizontal, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { DemographicStatusCard } from "@/components/DemographicStatusCard";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import demographicsIcon from "@/assets/demographics-icon.svg";
import demographicsRequiredIcon from "@/assets/demographics-required-icon.svg";
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
interface SocialAccount {
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
}
interface SocialAccountsTableProps {
  accounts: SocialAccount[];
  onRefresh: () => void;
  onDeleteAccount: (accountId: string) => void;
  onLinkCampaign: (account: SocialAccount) => void;
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
}
export function SocialAccountsTable({
  accounts,
  onRefresh,
  onDeleteAccount,
  onLinkCampaign,
  onUnlinkCampaign,
  onVerifyAccount,
  onSubmitDemographics
}: SocialAccountsTableProps) {
  const {
    resolvedTheme
  } = useTheme();
  const {
    toast
  } = useToast();
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
  const handleToggleVisibility = async (account: SocialAccount) => {
    const newValue = !account.hidden_from_public;
    await supabase.from("social_accounts").update({
      hidden_from_public: newValue
    }).eq("id", account.id);
    onRefresh();
  };
  return <div className="overflow-x-auto border border-border rounded-xl">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#dce1eb] dark:border-[#141414] hover:bg-transparent dark:bg-[#080808]">
            <TableHead className="text-foreground font-medium text-sm h-12 tracking-tighter">Account</TableHead>
            <TableHead className="text-foreground font-medium text-sm h-12 tracking-tighter">Followers</TableHead>
            <TableHead className="text-foreground font-medium text-sm h-12 tracking-tighter">Campaigns</TableHead>
            <TableHead className="text-foreground font-medium text-sm h-12 tracking-tighter">Demographics</TableHead>
            <TableHead className="text-foreground font-medium text-sm h-12 tracking-tighter">Status</TableHead>
            <TableHead className="text-foreground font-medium text-sm h-12 text-right tracking-tighter">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map(account => {
          const connectedCampaigns = account.connected_campaigns || [];
          const demographicSubmissions = [...(account.demographic_submissions || [])].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
          const latestDemographicSubmission = demographicSubmissions[0];
          return <TableRow key={account.id} className="hover:bg-[#fafafa] dark:hover:bg-[#0a0a0a] transition-colors border-[#dce1eb] dark:border-[#141414]">
                {/* Account Info */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-3">
                    {getPlatformIcon(account.platform)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate" style={{
                      fontFamily: "Inter",
                      letterSpacing: "-0.3px"
                    }}>
                          {account.username}
                        </span>
                        {!account.is_verified && <button onClick={() => onVerifyAccount({
                      id: account.id,
                      platform: account.platform,
                      username: account.username
                    })} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-medium hover:bg-amber-500/30 transition-colors">
                            Verify
                          </button>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Connected {format(new Date(account.connected_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Followers */}
                <TableCell className="py-3">
                  <span className="text-sm text-foreground" style={{
                fontFamily: "Inter",
                letterSpacing: "-0.3px"
              }}>
                    {formatFollowerCount(account.follower_count)}
                  </span>
                </TableCell>

                {/* Campaigns */}
                <TableCell className="py-3">
                  {connectedCampaigns.length > 0 ? <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-sm text-primary hover:underline cursor-pointer" style={{
                    fontFamily: "Inter",
                    letterSpacing: "-0.3px"
                  }}>
                          {connectedCampaigns.length} campaign{connectedCampaigns.length !== 1 ? "s" : ""}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 bg-popover border rounded-xl z-50" align="start">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground font-medium mb-2">Linked Campaigns</p>
                          {connectedCampaigns.map(({
                      connection_id,
                      campaign
                    }) => <div key={campaign.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                              {campaign.brand_logo_url && <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-5 h-5 rounded object-cover" />}
                              <span className="text-sm flex-1 truncate">{campaign.title}</span>
                              <button onClick={() => onUnlinkCampaign(connection_id, campaign.title)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all">
                                <X className="w-3 h-3 text-destructive" />
                              </button>
                            </div>)}
                        </div>
                      </PopoverContent>
                    </Popover> : <span className="text-sm text-muted-foreground">—</span>}
                </TableCell>

                {/* Demographics */}
                <TableCell className="py-3">
                  {demographicSubmissions.length === 0 ? <button onClick={() => onSubmitDemographics({
                id: account.id,
                platform: account.platform,
                username: account.username
              })} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors">
                      <img src={demographicsRequiredIcon} alt="" className="h-3 w-3" />
                      Required
                    </button> : <DemographicStatusCard accountId={account.id} platform={account.platform} username={account.username} submissions={demographicSubmissions} campaignIds={connectedCampaigns.map(c => c.campaign.id)} onSubmitNew={() => onSubmitDemographics({
                id: account.id,
                platform: account.platform,
                username: account.username
              })} onRefresh={onRefresh} />}
                </TableCell>

                {/* Status */}
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    {account.is_verified ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </span> : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3 w-3" />
                        Unverified
                      </span>}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted" onClick={() => onLinkCampaign(account)} title="Link to campaign">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted" onClick={() => handleToggleVisibility(account)} title={account.hidden_from_public ? "Show on public profile" : "Hide from public profile"}>
                      {account.hidden_from_public ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    {account.account_link && <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted" onClick={() => window.open(account.account_link!, "_blank")} title="Open profile">
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </Button>}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10" onClick={() => onDeleteAccount(account.id)} title="Delete account">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>;
        })}
        </TableBody>
      </Table>
    </div>;
}