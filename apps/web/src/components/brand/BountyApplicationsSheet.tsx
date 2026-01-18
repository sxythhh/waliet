import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Check, X, Clock, User, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useBrandUsage } from "@/hooks/useBrandUsage";

interface Application {
  id: string;
  user_id: string;
  video_url: string;
  application_text: string;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
  proposed_rate: number | null;
  approved_rate: number | null;
  rate_status: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

interface BountyApplicationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bountyId: string;
  bountyTitle: string;
  maxAccepted: number;
  currentAccepted: number;
  brandId: string;
  subscriptionPlan?: string | null;
  paymentModel?: string | null;
  flatRateMin?: number | null;
  flatRateMax?: number | null;
}

export function BountyApplicationsSheet({
  open,
  onOpenChange,
  bountyId,
  bountyTitle,
  maxAccepted,
  currentAccepted,
  brandId,
  subscriptionPlan,
  paymentModel,
  flatRateMin,
  flatRateMax,
}: BountyApplicationsSheetProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [counterRates, setCounterRates] = useState<Record<string, string>>({});
  const { canHireCreator } = useBrandUsage(brandId, subscriptionPlan);

  const isFlatRate = paymentModel === 'flat_rate';

  useEffect(() => {
    if (open) {
      fetchApplications();
    }
  }, [open, bountyId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('bounty_applications')
        .select('*')
        .eq('bounty_campaign_id', bountyId)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data separately for each application
      const applicationsWithProfiles = await Promise.all(
        (data || []).map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, full_name')
            .eq('id', app.user_id)
            .single();
          
          return { ...app, profiles: profile };
        })
      );

      setApplications(applicationsWithProfiles as any);
    } catch (error: any) {
      console.error("Error fetching applications:", error);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  // Handle approving a creator's proposed rate
  const handleApproveRate = async (applicationId: string) => {
    const application = applications.find(app => app.id === applicationId);
    if (!application || !application.proposed_rate) return;

    setProcessing(applicationId);
    try {
      const { error } = await supabase
        .from('bounty_applications')
        .update({
          approved_rate: application.proposed_rate,
          rate_status: 'approved',
        })
        .eq('id', applicationId);

      if (error) throw error;
      toast.success(`Rate of $${application.proposed_rate} approved`);
      fetchApplications();
    } catch (error: any) {
      console.error("Error approving rate:", error);
      toast.error("Failed to approve rate");
    } finally {
      setProcessing(null);
    }
  };

  // Handle sending a counter offer
  const handleCounterOffer = async (applicationId: string) => {
    const counterRate = counterRates[applicationId];
    if (!counterRate) {
      toast.error("Please enter a counter rate");
      return;
    }

    const rate = parseFloat(counterRate);
    if (isNaN(rate) || rate <= 0) {
      toast.error("Please enter a valid rate");
      return;
    }

    if (flatRateMin && rate < flatRateMin) {
      toast.error(`Rate must be at least $${flatRateMin}`);
      return;
    }
    if (flatRateMax && rate > flatRateMax) {
      toast.error(`Rate cannot exceed $${flatRateMax}`);
      return;
    }

    setProcessing(applicationId);
    try {
      const { error } = await supabase
        .from('bounty_applications')
        .update({
          approved_rate: rate,
          rate_status: 'countered',
        })
        .eq('id', applicationId);

      if (error) throw error;
      toast.success(`Counter offer of $${rate} sent`);
      setCounterRates(prev => ({ ...prev, [applicationId]: '' }));
      fetchApplications();
    } catch (error: any) {
      console.error("Error sending counter offer:", error);
      toast.error("Failed to send counter offer");
    } finally {
      setProcessing(null);
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    // Check hire limit based on subscription plan (early exit)
    if (newStatus === 'accepted' && !canHireCreator) {
      toast.error("Hire limit reached. Upgrade your plan to work with more creators.");
      return;
    }

    setProcessing(applicationId);
    try {
      // Get the application details
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      // RACE CONDITION FIX: Re-fetch current accepted count from database
      // This prevents exceeding max_accepted_creators during rapid-fire accepts
      if (newStatus === 'accepted') {
        const { count: freshAcceptedCount, error: countError } = await supabase
          .from('bounty_applications')
          .select('*', { count: 'exact', head: true })
          .eq('bounty_campaign_id', bountyId)
          .eq('status', 'accepted');

        if (countError) {
          throw new Error('Failed to verify capacity');
        }

        if ((freshAcceptedCount ?? 0) >= maxAccepted) {
          toast.error(`Maximum capacity of ${maxAccepted} creators reached. Another user may have just been accepted.`);
          setProcessing(null);
          fetchApplications(); // Refresh to show updated state
          return;
        }
      }

      const { error } = await supabase
        .from('bounty_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      // If accepted, handle integrations (Discord, Analytics tracking)
      if (newStatus === 'accepted') {
        try {
          // Get bounty campaign details including discord and analytics settings
          const { data: bounty, error: bountyError } = await supabase
            .from('bounty_campaigns')
            .select('discord_guild_id, discord_role_id, auto_track_shortimize, analytics_provider')
            .eq('id', bountyId)
            .single();

          if (bountyError) throw bountyError;

          // Determine analytics provider (use new column with fallback to legacy)
          const analyticsProvider = bounty?.analytics_provider || (bounty?.auto_track_shortimize ? 'shortimize' : 'none');

          // Track in analytics provider if configured
          if (analyticsProvider !== 'none') {
            try {
              const functionName = analyticsProvider === 'viral' ? 'track-boost-user-viral' : 'track-boost-user';
              await supabase.functions.invoke(functionName, {
                body: {
                  bountyId,
                  userId: application.user_id
                }
              });
            } catch (trackError) {
              console.error(`Analytics tracking error (${analyticsProvider}):`, trackError);
              // Don't show error toast - tracking is non-blocking
            }
          }

          // Add to Discord server if configured
          if (bounty?.discord_guild_id) {
            const { data, error: discordError } = await supabase.functions.invoke('add-to-discord-server', {
              body: {
                userId: application.user_id,
                guildId: bounty.discord_guild_id,
                roleId: bounty.discord_role_id || undefined
              }
            });

            if (discordError) {
              console.error('Failed to add user to Discord server:', discordError);
              toast.error('Application accepted, but failed to add user to Discord server. They may need to join manually.');
            } else if (data?.success) {
              const roleMsg = data.roleAssigned ? ' with role assigned' : '';
              toast.success(`Application accepted! ${data.alreadyMember ? 'User was already in Discord server.' : `User added to Discord server${roleMsg}.`}`);
            }
          } else {
            toast.success('Application accepted');
          }
        } catch (discordError: any) {
          console.error('Discord auto-join error:', discordError);
          toast.success('Application accepted (Discord auto-join unavailable)');
        }
      } else {
        toast.success(`Application ${newStatus}`);
      }

      fetchApplications();
      
      // Refresh parent to update counts
      onOpenChange(false);
      setTimeout(() => onOpenChange(true), 100);
    } catch (error: any) {
      console.error("Error updating application:", error);
      toast.error(error.message || "Failed to update application");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
          <Check className="h-3 w-3 mr-1" />
          Accepted
        </Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
          <X className="h-3 w-3 mr-1" />
          Rejected
        </Badge>;
      default:
        return null;
    }
  };

  const pendingCount = applications.filter(app => app.status === 'pending').length;
  const acceptedCount = applications.filter(app => app.status === 'accepted').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-[#0a0a0a] border-l border-white/10 text-white p-0">
        <SheetHeader className="p-6 border-b border-white/10">
          <SheetTitle className="text-xl text-white">{bountyTitle}</SheetTitle>
          <SheetDescription className="text-white/60">
            Review and manage applications for this boost campaign
          </SheetDescription>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                {pendingCount} Pending
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
                {acceptedCount} / {maxAccepted} Accepted
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="text-center text-white/60 py-12">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="text-center text-white/60 py-12">
                <User className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>No applications yet</p>
              </div>
            ) : (
              applications.map((application) => (
                <div
                  key={application.id}
                  className="p-4 rounded-lg border border-white/10 bg-[#131313] space-y-4"
                >
                  {/* Applicant Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={application.profiles.avatar_url || ""} />
                        <AvatarFallback className="bg-muted">
                          {application.profiles.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-white">
                          {application.profiles.full_name || application.profiles.username}
                        </p>
                        <p className="text-sm text-white/60">@{application.profiles.username}</p>
                      </div>
                    </div>
                    {getStatusBadge(application.status)}
                  </div>

                  {/* Application Text */}
                  {application.application_text && (
                    <div className="p-3 rounded bg-[#0a0a0a] border border-white/5">
                      <p className="text-sm text-white/80">{application.application_text}</p>
                    </div>
                  )}

                  {/* Rate Proposal Section - Only for flat_rate boosts */}
                  {isFlatRate && application.proposed_rate && (
                    <div className="p-3 rounded bg-[#0a0a0a] border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-white/50 mb-1">Proposed Rate</p>
                          <p className="text-lg font-semibold text-white">${application.proposed_rate.toLocaleString()}/post</p>
                        </div>
                        {application.rate_status === 'approved' && (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Check className="h-3 w-3 mr-1" />
                            Rate Approved
                          </Badge>
                        )}
                        {application.rate_status === 'countered' && application.approved_rate && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Counter: ${application.approved_rate}
                          </Badge>
                        )}
                      </div>

                      {/* Rate Approval/Counter UI for pending applications */}
                      {application.status === 'pending' && application.rate_status !== 'approved' && (
                        <div className="space-y-2 pt-2 border-t border-white/10">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApproveRate(application.id)}
                              disabled={processing === application.id}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              size="sm"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept ${application.proposed_rate}
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
                              <Input
                                type="number"
                                value={counterRates[application.id] || ''}
                                onChange={(e) => setCounterRates(prev => ({ ...prev, [application.id]: e.target.value }))}
                                placeholder={`${Math.round(((flatRateMin || 0) + (flatRateMax || 0)) / 2)}`}
                                className="pl-6 h-8 bg-[#1a1a1a] border-white/10 text-white text-sm"
                              />
                            </div>
                            <Button
                              onClick={() => handleCounterOffer(application.id)}
                              disabled={processing === application.id || !counterRates[application.id]}
                              variant="outline"
                              className="bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5"
                              size="sm"
                            >
                              Counter
                            </Button>
                          </div>
                          {flatRateMin !== undefined && flatRateMax !== undefined && (
                            <p className="text-[10px] text-white/40">Your range: ${flatRateMin} - ${flatRateMax} per post</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video Link */}
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(application.video_url, '_blank')}
                      className="w-full bg-[#1a1a1a] border-white/10 text-white hover:bg-white/5"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Application Video
                    </Button>
                  </div>

                  {/* Application Date */}
                  <div className="text-xs text-white/50">
                    Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
                  </div>

                  {/* Action Buttons */}
                  {application.status === 'pending' && (
                    <div className="space-y-2 pt-2">
                      {/* Capacity Warning */}
                      {acceptedCount >= maxAccepted && (
                        <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span>Boost is at full capacity ({acceptedCount}/{maxAccepted}). Increase max creators to accept more applications.</span>
                        </div>
                      )}
                      {!canHireCreator && acceptedCount < maxAccepted && (
                        <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span>Hire limit reached. Upgrade your plan to accept more creators.</span>
                        </div>
                      )}
                      {/* Rate approval warning for flat_rate boosts */}
                      {isFlatRate && application.proposed_rate && application.rate_status !== 'approved' && application.rate_status !== 'countered' && (
                        <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span>Please approve or counter the rate before accepting this creator.</span>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdateStatus(application.id, 'accepted')}
                          disabled={
                            processing === application.id ||
                            acceptedCount >= maxAccepted ||
                            !canHireCreator ||
                            (isFlatRate && application.proposed_rate && application.rate_status !== 'approved' && application.rate_status !== 'countered')
                          }
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleUpdateStatus(application.id, 'rejected')}
                          disabled={processing === application.id}
                          variant="destructive"
                          className="flex-1"
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {application.status !== 'pending' && application.reviewed_at && (
                    <div className="text-xs text-white/40">
                      Reviewed {formatDistanceToNow(new Date(application.reviewed_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}