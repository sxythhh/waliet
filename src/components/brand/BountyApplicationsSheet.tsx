import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Check, X, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Application {
  id: string;
  user_id: string;
  video_url: string;
  application_text: string;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
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
}

export function BountyApplicationsSheet({ 
  open, 
  onOpenChange, 
  bountyId, 
  bountyTitle,
  maxAccepted,
  currentAccepted 
}: BountyApplicationsSheetProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

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

  const handleUpdateStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    // Check if we're at capacity when trying to accept
    if (newStatus === 'accepted' && currentAccepted >= maxAccepted) {
      toast.error(`You've reached the maximum of ${maxAccepted} accepted creators`);
      return;
    }

    setProcessing(applicationId);
    try {
      // Get the application details
      const application = applications.find(app => app.id === applicationId);
      if (!application) throw new Error('Application not found');

      const { error } = await supabase
        .from('bounty_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      // If accepted, try to add user to Discord server
      if (newStatus === 'accepted') {
        try {
          // Get bounty campaign details including discord_guild_id
          const { data: bounty, error: bountyError } = await supabase
            .from('bounty_campaigns')
            .select('discord_guild_id')
            .eq('id', bountyId)
            .single();

          if (bountyError) throw bountyError;

          if (bounty?.discord_guild_id) {
            const { data, error: discordError } = await supabase.functions.invoke('add-to-discord-server', {
              body: {
                userId: application.user_id,
                guildId: bounty.discord_guild_id
              }
            });

            if (discordError) {
              console.error('Failed to add user to Discord server:', discordError);
              toast.error('Application accepted, but failed to add user to Discord server. They may need to join manually.');
            } else if (data?.success) {
              toast.success(`Application accepted! ${data.alreadyMember ? 'User was already in Discord server.' : 'User added to Discord server.'}`);
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
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleUpdateStatus(application.id, 'accepted')}
                        disabled={processing === application.id || acceptedCount >= maxAccepted}
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