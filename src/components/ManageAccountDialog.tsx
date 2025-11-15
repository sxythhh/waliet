import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Link2, Unlink, BadgeCheck, Clock, XCircle, AlertCircle, Calendar } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
interface Campaign {
  id: string;
  title: string;
  brand_name: string;
  brand_logo_url: string | null;
  brands?: {
    logo_url: string;
  } | null;
}
interface ConnectedCampaign extends Campaign {
  connection_id: string;
  connected_at: string;
}
interface ManageAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    username: string;
    platform: string;
    account_link?: string | null;
  };
  demographicStatus: 'approved' | 'pending' | 'rejected' | null;
  daysUntilNext: number | null;
  lastSubmissionDate: string | null;
  nextSubmissionDate: Date | null;
  onUpdate: () => void;
  onSubmitDemographics: () => void;
  platformIcon: React.ReactNode;
}
export function ManageAccountDialog({
  open,
  onOpenChange,
  account,
  demographicStatus,
  daysUntilNext,
  lastSubmissionDate,
  nextSubmissionDate,
  onUpdate,
  onSubmitDemographics,
  platformIcon
}: ManageAccountDialogProps) {
  const {
    toast
  } = useToast();
  const [connectedCampaigns, setConnectedCampaigns] = useState<ConnectedCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const fetchCampaigns = async () => {
    if (!account) return;
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch campaigns the user has approved submissions for
      const {
        data: submissions
      } = await supabase.from('campaign_submissions').select('campaign_id, campaigns(id, title, brand_name, brand_logo_url, brands(logo_url))').eq('creator_id', user.id).eq('status', 'approved');
      const approvedCampaigns = submissions?.map(s => s.campaigns).filter(Boolean) as Campaign[] || [];

      // Fetch campaigns already connected to this social account
      const {
        data: connections
      } = await supabase.from('social_account_campaigns').select(`
          id,
          connected_at,
          campaign_id,
          campaigns(id, title, brand_name, brand_logo_url, brands(logo_url))
        `).eq('social_account_id', account.id);
      const connected = connections?.map(conn => ({
        ...(conn.campaigns as Campaign),
        connection_id: conn.id,
        connected_at: conn.connected_at
      })) || [];
      setConnectedCampaigns(connected);

      // Filter out already connected campaigns from available list
      const connectedIds = connected.map(c => c.id);
      const available = approvedCampaigns.filter(c => !connectedIds.includes(c.id));
      setAvailableCampaigns(available);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load campaigns"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleLink = async (campaignId: string) => {
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const {
        error
      } = await supabase.from('social_account_campaigns').insert({
        social_account_id: account.id,
        campaign_id: campaignId
      });
      if (error) throw error;

      // Track account in Shortimize
      try {
        console.log('Tracking account in Shortimize...');
        const { error: trackError } = await supabase.functions.invoke('track-campaign-user', {
          body: {
            campaignId: campaignId,
            userId: user.id
          }
        });
        
        if (trackError) {
          console.error('Error tracking account:', trackError);
        } else {
          console.log('Successfully tracked account in Shortimize');
        }
      } catch (error) {
        console.error('Error calling track function:', error);
      }

      toast({
        title: "Success",
        description: "Campaign linked successfully"
      });
      await fetchCampaigns();
      onUpdate();
    } catch (error) {
      console.error('Error linking campaign:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to link campaign"
      });
    }
  };
  const handleUnlink = async (connectionId: string) => {
    try {
      const {
        error
      } = await supabase.from('social_account_campaigns').delete().eq('id', connectionId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Campaign unlinked successfully"
      });
      await fetchCampaigns();
      onUpdate();
    } catch (error) {
      console.error('Error unlinking campaign:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to unlink campaign"
      });
    }
  };
  const handleDelete = async () => {
    try {
      const {
        error
      } = await supabase.from('social_accounts').delete().eq('id', account.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Social account deleted successfully"
      });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete account"
      });
    }
  };

  // Fetch campaigns when dialog opens
  useEffect(() => {
    if (open) {
      fetchCampaigns();
    }
  }, [open]);
  return <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Account</DialogTitle>
            
          </DialogHeader>

          <div className="space-y-6">
            {/* Account Info */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <div className="p-2 rounded-md bg-background">
                {platformIcon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{account.username}</h3>
                  {demographicStatus === 'approved' && <BadgeCheck className="h-4 w-4 text-success" />}
                  {demographicStatus === 'pending' && <Clock className="h-4 w-4 text-warning" />}
                  {demographicStatus === 'rejected' && <XCircle className="h-4 w-4 text-destructive" />}
                  {!demographicStatus && <AlertCircle className="h-4 w-4 text-destructive" />}
                </div>
                <p className="text-sm text-muted-foreground capitalize">{account.platform}</p>
              </div>
              {account.account_link && <Button variant="secondary" size="sm" onClick={() => window.open(account.account_link!, '_blank')} className="bg-muted border-0">
                  View Profile
                </Button>}
            </div>

            <Separator />

            {/* Demographics Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Demographics</h4>
              
              {/* Last Submission Date */}
              {lastSubmissionDate && <div className="text-sm text-muted-foreground">
                  Last submitted: {formatDistanceToNow(new Date(lastSubmissionDate), {
                addSuffix: true
              })}
                </div>}
              
              {/* Next Submission Date - only show if approved */}
              {demographicStatus === 'approved' && nextSubmissionDate && <div className="text-sm text-muted-foreground">
                  Next submission: {format(nextSubmissionDate, "MMM d, yyyy")}
                </div>}
              
              {demographicStatus === 'approved' && daysUntilNext !== null ? <Button variant="secondary" disabled className="w-full gap-2">
                  <Calendar className="h-4 w-4" />
                  Next submission in {daysUntilNext} days
                </Button> : demographicStatus === 'pending' ? <Button variant="secondary" disabled className="w-full">
                  Pending Review
                </Button> : <Button onClick={onSubmitDemographics} className="w-full" variant={demographicStatus === 'rejected' ? 'destructive' : 'default'}>
                  {demographicStatus === 'rejected' ? 'Resubmit Demographics' : 'Submit Demographics'}
                </Button>}
            </div>

            <Separator />

            {/* Connected Campaigns */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm">Connected Campaigns</h4>
              {loading ? <p className="text-sm text-muted-foreground">Loading campaigns...</p> : connectedCampaigns.length === 0 ? <p className="text-sm text-muted-foreground">No campaigns connected yet</p> : <div className="space-y-2">
                  {connectedCampaigns.map(campaign => <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        {(campaign.brand_logo_url || campaign.brands?.logo_url) && <img src={campaign.brand_logo_url || campaign.brands?.logo_url} alt={campaign.brand_name} className="w-8 h-8 rounded object-cover" />}
                        <div>
                          <p className="font-medium text-sm">{campaign.title}</p>
                          <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleUnlink(campaign.connection_id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>)}
                </div>}
            </div>

            {/* Available Campaigns */}
            {availableCampaigns.length > 0 && <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Available to Link</h4>
                  <div className="space-y-2">
                    {availableCampaigns.map(campaign => <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          {(campaign.brand_logo_url || campaign.brands?.logo_url) && <img src={campaign.brand_logo_url || campaign.brands?.logo_url} alt={campaign.brand_name} className="w-8 h-8 rounded object-cover" />}
                          <div>
                            <p className="font-medium text-sm">{campaign.title}</p>
                            <p className="text-xs text-muted-foreground">{campaign.brand_name}</p>
                          </div>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleLink(campaign.id)} className="bg-muted border-0">
                          <Link2 className="h-4 w-4 mr-1" />
                          Link
                        </Button>
                      </div>)}
                  </div>
                </div>
              </>}

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-3">
              
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="w-full gap-2">
                <Trash2 className="h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this social account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
}