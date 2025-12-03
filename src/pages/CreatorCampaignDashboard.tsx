import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, ExternalLink } from "lucide-react";
import { AddSocialAccountDialog } from "@/components/AddSocialAccountDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import tiktokLogo from "@/assets/tiktok-logo.png";
import instagramLogo from "@/assets/instagram-logo.png";
import youtubeLogo from "@/assets/youtube-logo.png";
import xLogo from "@/assets/x-logo.png";
interface Campaign {
  id: string;
  title: string;
  description: string | null;
  brand_name: string;
  brand_logo_url: string | null;
  budget: number;
  rpm_rate: number;
  status: string | null;
  guidelines: string | null;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  allowed_platforms: string[] | null;
  embed_url: string | null;
}
interface ConnectedAccount {
  id: string;
  platform: string;
  username: string;
  account_link: string | null;
  connected_at: string;
}
interface CampaignTransaction {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
  status: string;
}
const platformIcons: Record<string, string> = {
  tiktok: tiktokLogo,
  instagram: instagramLogo,
  youtube: youtubeLogo,
  x: xLogo,
  twitter: xLogo
};
export default function CreatorCampaignDashboard() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [transactions, setTransactions] = useState<CampaignTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
  useEffect(() => {
    fetchCampaignData();
  }, [slug]);
  const fetchCampaignData = async () => {
    setLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to view this campaign"
        });
        navigate("/");
        return;
      }

      // Fetch campaign by slug
      const {
        data: campaignData,
        error: campaignError
      } = await supabase.from("campaigns").select("*").eq("slug", slug).maybeSingle();
      if (campaignError) throw campaignError;
      if (!campaignData) {
        toast({
          variant: "destructive",
          title: "Campaign not found",
          description: "This campaign doesn't exist"
        });
        navigate("/dashboard");
        return;
      }

      // Check if user has approved access
      const {
        data: submission
      } = await supabase.from("campaign_submissions").select("id, status").eq("campaign_id", campaignData.id).eq("creator_id", user.id).eq("status", "approved").limit(1).maybeSingle();
      if (!submission) {
        toast({
          variant: "destructive",
          title: "Access Denied",
          description: "You must be approved to view this campaign"
        });
        navigate("/dashboard");
        return;
      }
      setCampaign(campaignData as Campaign);

      // Fetch connected accounts for this campaign
      const {
        data: accountConnections
      } = await supabase.from("social_account_campaigns").select(`
          id,
          connected_at,
          social_accounts (
            id,
            platform,
            username,
            account_link
          )
        `).eq("campaign_id", campaignData.id).eq("user_id", user.id).eq("status", "active");
      if (accountConnections) {
        const accounts = accountConnections.filter(ac => ac.social_accounts).map(ac => ({
          id: (ac.social_accounts as any).id,
          platform: (ac.social_accounts as any).platform,
          username: (ac.social_accounts as any).username,
          account_link: (ac.social_accounts as any).account_link,
          connected_at: ac.connected_at
        }));
        setConnectedAccounts(accounts);
      }

      // Fetch transactions for this campaign
      const {
        data: txData
      } = await supabase.from("wallet_transactions").select("id, amount, description, created_at, status").eq("user_id", user.id).eq("type", "earning").neq("status", "reverted").containedBy("metadata", {
        campaign_id: campaignData.id
      }).order("created_at", {
        ascending: false
      });

      // Filter transactions that have this campaign_id in metadata
      const {
        data: allTx
      } = await supabase.from("wallet_transactions").select("id, amount, description, created_at, status, metadata").eq("user_id", user.id).eq("type", "earning").neq("status", "reverted").order("created_at", {
        ascending: false
      });
      if (allTx) {
        const campaignTx = allTx.filter(tx => {
          const metadata = tx.metadata as {
            campaign_id?: string;
          } | null;
          return metadata?.campaign_id === campaignData.id;
        });
        setTransactions(campaignTx);
      }
    } catch (error) {
      console.error("Error fetching campaign:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load campaign"
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };
  const handleAccountAdded = () => {
    fetchCampaignData();
  };
  if (loading) {
    return <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="container max-w-6xl mx-auto px-4 py-4">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <div className="grid gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="grid md:grid-cols-3 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </div>;
  }
  if (!campaign) return null;
  const daysRemaining = campaign.end_date ? Math.max(0, Math.ceil((new Date(campaign.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
  return <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8">
          {/* Campaign Header */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {campaign.brand_logo_url && <img src={campaign.brand_logo_url} alt={campaign.brand_name} className="w-20 h-20 rounded-xl object-cover border" />}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{campaign.title}</h1>
                
              </div>
              <p className="text-muted-foreground">{campaign.brand_name}</p>
              {campaign.description && <p className="text-sm text-muted-foreground max-w-2xl">{campaign.description}</p>}
            </div>
          </div>

          {/* Stats Grid */}
          

          {/* Connected Accounts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">Connected Accounts</CardTitle>
                <CardDescription>Social accounts linked to this campaign</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowAddAccountDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Button>
            </CardHeader>
            <CardContent>
              {connectedAccounts.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  <p>No accounts connected yet</p>
                  <p className="text-sm">Connect a social account to start tracking</p>
                </div> : <div className="grid gap-3">
                  {connectedAccounts.map(account => <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-center gap-3">
                        <img src={platformIcons[account.platform.toLowerCase()] || platformIcons.tiktok} alt={account.platform} className="w-8 h-8 object-contain" />
                        <div>
                          <p className="font-medium">{account.username}</p>
                          
                        </div>
                      </div>
                      {account.account_link && <Button variant="ghost" size="sm" asChild>
                          <a href={account.account_link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>}
                    </div>)}
                </div>}
            </CardContent>
          </Card>

          {/* Platforms */}
          {campaign.allowed_platforms && campaign.allowed_platforms.length > 0}

          {/* Payouts Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Payouts</CardTitle>
              <CardDescription>Earnings from this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? <div className="text-center py-6 text-muted-foreground">
                  <p>No payouts yet</p>
                  <p className="text-sm">Your earnings will appear here</p>
                </div> : <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>{tx.description || "Campaign payout"}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          +${tx.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>}
            </CardContent>
          </Card>

          {/* Guidelines */}
          {campaign.guidelines && <Card>
              <CardHeader>
                <CardTitle className="text-lg">Guidelines</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{campaign.guidelines}</p>
              </CardContent>
            </Card>}
        </div>
      </div>

      {/* Add Account Dialog */}
      <AddSocialAccountDialog open={showAddAccountDialog} onOpenChange={setShowAddAccountDialog} onSuccess={handleAccountAdded} />
    </div>;
}