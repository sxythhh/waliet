import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Building2,
  DollarSign,
  Users,
  Loader2,
} from "lucide-react";
import { CampaignReviewDialog } from "@/components/admin/campaign-review/CampaignReviewDialog";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";

interface Campaign {
  id: string;
  title: string;
  description: string;
  reward_amount: number;
  status: string;
  review_status: string;
  review_notes: string | null;
  created_at: string;
  brand_id: string;
  brands: {
    name: string;
    logo_url: string | null;
    slug: string;
  };
}

export default function AdminCampaignReview() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending_review");
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bounty_campaigns")
        .select(`
          id,
          title,
          description,
          reward_amount,
          status,
          review_status,
          review_notes,
          created_at,
          brand_id,
          brands (
            name,
            logo_url,
            slug
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load campaigns",
      });
    } finally {
      setLoading(false);
    }
  };

  const getReviewStatusBadge = (status: string) => {
    switch (status) {
      case "pending_review":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-0">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-0">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-0">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "changes_requested":
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-0">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Changes Requested
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status || "Draft"}
          </Badge>
        );
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (activeTab === "all") return true;
    return c.review_status === activeTab;
  });

  const stats = {
    pending: campaigns.filter((c) => c.review_status === "pending_review").length,
    approved: campaigns.filter((c) => c.review_status === "approved").length,
    rejected: campaigns.filter((c) => c.review_status === "rejected").length,
    changes: campaigns.filter((c) => c.review_status === "changes_requested").length,
  };

  const openReviewDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDialogOpen(true);
  };

  return (
    <AdminPermissionGuard requiredPermission="manage_brands">
      <div className="flex flex-col h-full">
        <div className="border-b p-6">
          <h1 className="text-2xl font-bold tracking-tight">Campaign Review</h1>
          <p className="text-muted-foreground">
            Review and approve campaigns before they go live
          </p>
        </div>

        <div className="p-6 flex-1 overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pending}</p>
                    <p className="text-xs text-muted-foreground">Pending Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.approved}</p>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.rejected}</p>
                    <p className="text-xs text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-500/5 border-orange-500/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.changes}</p>
                    <p className="text-xs text-muted-foreground">Changes Requested</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending_review">
                Pending ({stats.pending})
              </TabsTrigger>
              <TabsTrigger value="changes_requested">
                Changes Requested ({stats.changes})
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Clock className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-lg font-medium text-muted-foreground">
                      No campaigns to review
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Campaigns submitted for review will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredCampaigns.map((campaign) => (
                    <Card
                      key={campaign.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openReviewDialog(campaign)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            {/* Brand Logo */}
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              {campaign.brands?.logo_url ? (
                                <img
                                  src={campaign.brands.logo_url}
                                  alt={campaign.brands.name}
                                  className="h-full w-full rounded-lg object-cover"
                                />
                              ) : (
                                <Building2 className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>

                            {/* Campaign Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate">
                                  {campaign.title}
                                </h3>
                                {getReviewStatusBadge(campaign.review_status)}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                by {campaign.brands?.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Submitted{" "}
                                {formatDistanceToNow(new Date(campaign.created_at), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Reward & Action */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-lg font-bold">
                                <DollarSign className="h-4 w-4" />
                                {campaign.reward_amount}
                              </div>
                              <p className="text-xs text-muted-foreground">per submission</p>
                            </div>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>

                        {campaign.review_notes && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">
                              Review Notes:
                            </p>
                            <p className="text-sm">{campaign.review_notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Review Dialog */}
        {selectedCampaign && (
          <CampaignReviewDialog
            campaign={selectedCampaign}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onReviewComplete={() => {
              fetchCampaigns();
              setDialogOpen(false);
            }}
          />
        )}
      </div>
    </AdminPermissionGuard>
  );
}
