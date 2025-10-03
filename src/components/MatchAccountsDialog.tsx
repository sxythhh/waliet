import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Users, Link as LinkIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MatchResult {
  account_username: string;
  platform: string;
  matched: boolean;
  user_id?: string;
  user_name?: string;
  avatar_url?: string;
}

interface MatchAccountsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  onMatchComplete: () => void;
}

export function MatchAccountsDialog({
  open,
  onOpenChange,
  campaignId,
  onMatchComplete,
}: MatchAccountsDialogProps) {
  const [matching, setMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [stats, setStats] = useState({ matched: 0, unmatched: 0, total: 0 });

  useEffect(() => {
    if (open) {
      performMatching();
    }
  }, [open, campaignId]);

  const performMatching = async () => {
    setMatching(true);
    try {
      // Call the database function to match accounts
      const { data: matchStats, error: matchError } = await supabase
        .rpc('match_analytics_to_users', { p_campaign_id: campaignId });

      if (matchError) throw matchError;

      if (matchStats && matchStats.length > 0) {
        setStats({
          matched: matchStats[0].matched_count || 0,
          unmatched: matchStats[0].unmatched_count || 0,
          total: matchStats[0].total_count || 0,
        });
      }

      // Fetch detailed results
      const { data: analytics, error: analyticsError } = await supabase
        .from('campaign_account_analytics')
        .select(`
          account_username,
          platform,
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('campaign_id', campaignId);

      if (analyticsError) throw analyticsError;

      const results: MatchResult[] = (analytics || []).map((item: any) => ({
        account_username: item.account_username,
        platform: item.platform,
        matched: !!item.user_id,
        user_id: item.user_id,
        user_name: item.profiles?.username,
        avatar_url: item.profiles?.avatar_url,
      }));

      setMatchResults(results);
      toast.success(`Matched ${stats.matched} of ${stats.total} accounts`);
    } catch (error) {
      console.error('Error matching accounts:', error);
      toast.error('Failed to match accounts');
    } finally {
      setMatching(false);
    }
  };

  const handleClose = () => {
    onMatchComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#202020] border-white/10 text-white max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Account Matching Results
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Linking imported analytics to campaign participants
          </DialogDescription>
        </DialogHeader>

        {matching ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-white/60">Matching accounts to users...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#191919] rounded-lg p-4 border border-white/10">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-sm text-white/60 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Total Accounts
                </div>
              </div>
              <div className="bg-[#191919] rounded-lg p-4 border border-emerald-500/20">
                <div className="text-2xl font-bold text-emerald-400">{stats.matched}</div>
                <div className="text-sm text-white/60 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Matched
                </div>
              </div>
              <div className="bg-[#191919] rounded-lg p-4 border border-red-500/20">
                <div className="text-2xl font-bold text-red-400">{stats.unmatched}</div>
                <div className="text-sm text-white/60 flex items-center gap-1">
                  <XCircle className="h-4 w-4 text-red-400" />
                  Unmatched
                </div>
              </div>
            </div>

            {/* Results List */}
            <div>
              <h4 className="text-sm font-medium text-white/80 mb-3">Detailed Results</h4>
              <ScrollArea className="h-[300px] rounded-lg border border-white/10 bg-[#191919]">
                <div className="p-4 space-y-2">
                  {matchResults.map((result, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        result.matched
                          ? 'bg-emerald-500/5 border border-emerald-500/20'
                          : 'bg-red-500/5 border border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {result.matched ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white truncate">
                              {result.account_username}
                            </span>
                            <Badge
                              variant="outline"
                              className="capitalize border-white/20 text-xs"
                            >
                              {result.platform}
                            </Badge>
                          </div>
                          {result.matched && result.user_name && (
                            <div className="text-sm text-white/60 flex items-center gap-1 mt-1">
                              <Users className="h-3 w-3" />
                              Linked to: @{result.user_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleClose}
                className="bg-primary hover:bg-primary/90"
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
