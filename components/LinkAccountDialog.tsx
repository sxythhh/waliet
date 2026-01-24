import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Plus, ArrowLeft, Loader2 } from "lucide-react";
import tiktokLogo from "@/assets/tiktok-logo-white.png";
import tiktokLogoBlack from "@/assets/tiktok-logo-black-new.png";
import instagramLogo from "@/assets/instagram-logo-white.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogo from "@/assets/youtube-logo-white.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black-new.png";
import xLogo from "@/assets/x-logo.png";
import xLogoLight from "@/assets/x-logo-light.png";

interface SocialAccount {
  id: string;
  platform: string;
  username: string;
}

interface LinkAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onAddNewAccount: () => void;
  onSuccess: () => void;
}

type View = "main" | "select-existing";

export function LinkAccountDialog({
  open,
  onOpenChange,
  campaignId,
  onAddNewAccount,
  onSuccess
}: LinkAccountDialogProps) {
  const [view, setView] = useState<View>("main");
  const [existingAccounts, setExistingAccounts] = useState<SocialAccount[]>([]);
  const [linkedAccountIds, setLinkedAccountIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [linkingAccountId, setLinkingAccountId] = useState<string | null>(null);
  const { toast } = useToast();
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
      case "twitter":
      case "x":
        return <img src={isLightMode ? xLogoLight : xLogo} alt="X" className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Reset view when dialog opens/closes
  useEffect(() => {
    if (open) {
      setView("main");
      setLinkingAccountId(null);
    }
  }, [open]);

  const fetchExistingAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error("Auth error:", authError);
        throw new Error("Authentication failed");
      }
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Fetch all user's social accounts
      const { data: accounts, error } = await supabase
        .from("social_accounts")
        .select("id, platform, username")
        .eq("user_id", user.id)
        .order("connected_at", { ascending: false });

      if (error) {
        console.error("Error fetching social accounts:", error);
        throw error;
      }

      // Fetch accounts already linked to this campaign
      const { data: linkedAccounts, error: linkedError } = await supabase
        .from("social_account_campaigns")
        .select("social_account_id")
        .eq("campaign_id", campaignId)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (linkedError) {
        console.error("Error fetching linked accounts:", linkedError);
        throw linkedError;
      }

      const linkedIds = new Set(linkedAccounts?.map(la => la.social_account_id) || []);
      setLinkedAccountIds(linkedIds);
      setExistingAccounts(accounts || []);
    } catch (error: any) {
      console.error("Error in fetchExistingAccounts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load accounts"
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId, toast]);

  // Fetch existing accounts when switching to select view
  useEffect(() => {
    if (view === "select-existing" && open && campaignId) {
      fetchExistingAccounts();
    }
  }, [view, open, campaignId, fetchExistingAccounts]);

  const handleLinkAccount = async (account: SocialAccount) => {
    setLinkingAccountId(account.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if a record already exists (active or disconnected)
      const { data: existingRecord } = await supabase
        .from("social_account_campaigns")
        .select("id, status")
        .eq("social_account_id", account.id)
        .eq("campaign_id", campaignId)
        .maybeSingle();

      if (existingRecord?.status === "active") {
        toast({
          title: "Already linked",
          description: `@${account.username} is already connected to this campaign`
        });
        onSuccess();
        onOpenChange(false);
        return;
      }

      // Update existing or insert new record
      const { error } = existingRecord
        ? await supabase
            .from("social_account_campaigns")
            .update({
              status: "active",
              disconnected_at: null
            })
            .eq("id", existingRecord.id)
        : await supabase
            .from("social_account_campaigns")
            .insert({
              social_account_id: account.id,
              campaign_id: campaignId,
              user_id: user.id,
              status: "active"
            });

      if (error) throw error;

      toast({
        title: "Account linked",
        description: `@${account.username} is now connected to this campaign`
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error linking account:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to link account"
      });
    } finally {
      setLinkingAccountId(null);
    }
  };

  const availableAccounts = existingAccounts.filter(acc => !linkedAccountIds.has(acc.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] p-0 gap-0 overflow-hidden border-border/50 [&>button]:hidden">
        {view === "main" ? (
          <>
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-[15px] font-semibold tracking-[-0.3px]">
                Link Account
              </h2>
              <p className="text-[13px] text-muted-foreground mt-0.5 tracking-[-0.2px]">
                Connect a social account to this campaign
              </p>
            </div>

            {/* Options */}
            <div className="px-3 pb-2 space-y-1">
              {/* Link Existing Option */}
              <button
                onClick={() => setView("select-existing")}
                className="w-full group flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div>
                  <p className="text-[13px] font-medium tracking-[-0.2px]">
                    Select Existing
                  </p>
                  <p className="text-[11px] text-muted-foreground tracking-[-0.2px]">
                    From your connected accounts
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              {/* Add New Option */}
              <button
                onClick={() => {
                  onOpenChange(false);
                  onAddNewAccount();
                }}
                className="w-full group flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div>
                  <p className="text-[13px] font-medium tracking-[-0.2px]">
                    Add New Account
                  </p>
                  <p className="text-[11px] text-muted-foreground tracking-[-0.2px]">
                    Connect & verify a new account
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </div>

            {/* Footer */}
            <div className="px-3 pb-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-9 rounded-xl text-[13px] font-medium hover:bg-muted/50"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Header with back button */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
              <button
                onClick={() => setView("main")}
                className="w-8 h-8 rounded-lg bg-muted/30 hover:bg-muted/50 flex items-center justify-center transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.3px]">
                  Select Account
                </h2>
                <p className="text-[12px] text-muted-foreground tracking-[-0.2px]">
                  Choose an account to link
                </p>
              </div>
            </div>

            {/* Account List */}
            <div className="px-3 pb-3 max-h-[280px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : availableAccounts.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <p className="text-[13px] text-muted-foreground tracking-[-0.2px]">
                    {existingAccounts.length > 0
                      ? "All your accounts are already linked"
                      : "No accounts found"}
                  </p>
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      onAddNewAccount();
                    }}
                    variant="outline"
                    className="mt-3 h-8 px-3 rounded-lg text-[12px]"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleLinkAccount(account)}
                      disabled={linkingAccountId === account.id}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
                    >
                      {/* Platform Icon */}
                      <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0 ring-1 ring-border/50">
                        {getPlatformIcon(account.platform)}
                      </div>

                      {/* Username */}
                      <span className="text-[13px] font-medium truncate tracking-[-0.2px] flex-1">
                        @{account.username}
                      </span>

                      {/* Action */}
                      {linkingAccountId === account.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - only show if there are accounts */}
            {!loading && availableAccounts.length > 0 && (
              <div className="px-3 pb-3 pt-1 border-t border-border/50">
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onAddNewAccount();
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add new account instead
                </button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
