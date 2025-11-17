import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowLeft, Users, DollarSign, Video, Calendar, Clock, Check, X, ExternalLink, TrendingUp, Target } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { OptimizedImage } from "@/components/OptimizedImage";

interface BoostCampaign {
  id: string;
  title: string;
  description: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  content_style_requirements: string;
  max_accepted_creators: number;
  accepted_creators_count: number;
  start_date: string | null;
  end_date: string | null;
  banner_url: string | null;
  status: string;
  created_at: string;
  brand_id: string;
}

interface Application {
  id: string;
  video_url: string;
  application_text: string;
  status: string;
  applied_at: string;
  reviewed_at: string | null;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

interface Brand {
  name: string;
  logo_url: string | null;
  slug: string;
}

export default function BoostCampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<BoostCampaign | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    if (!id) return;

    setLoading(true);
    try {
      // Fetch campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('bounty_campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;
      if (!campaignData) {
        toast.error("Boost campaign not found");
        navigate(-1);
        return;
      }

      setCampaign(campaignData);

      // Fetch brand
      const { data: brandData } = await supabase
        .from('brands')
        .select('name, logo_url, slug')
        .eq('id', campaignData.brand_id)
        .single();

      if (brandData) setBrand(brandData);

      // Fetch applications
      await fetchApplications();
    } catch (error: any) {
      console.error("Error fetching campaign:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('bounty_applications')
        .select('*')
        .eq('bounty_campaign_id', id)
        .order('applied_at', { ascending: false });

      if (error) throw error;

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
    }
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    if (!campaign) return;

    if (newStatus === 'accepted' && campaign.accepted_creators_count >= campaign.max_accepted_creators) {
      toast.error(`You've reached the maximum of ${campaign.max_accepted_creators} accepted creators`);
      return;
    }

    setProcessing(applicationId);
    try {
      const { error } = await supabase
        .from('bounty_applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      toast.success(`Application ${newStatus}`);
      await fetchCampaignData();
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

  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
          <div className="h-64 bg-muted animate-pulse rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const pendingCount = applications.filter(app => app.status === 'pending').length;
  const acceptedCount = applications.filter(app => app.status === 'accepted').length;
  const rejectedCount = applications.filter(app => app.status === 'rejected').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            {brand && (
              <div className="flex items-center gap-3">
                {brand.logo_url && (
                  <OptimizedImage
                    src={brand.logo_url}
                    alt={brand.name}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Boost Campaign</p>
                  <h1 className="text-2xl font-bold">{campaign.title}</h1>
                </div>
              </div>
            )}
          </div>

          {campaign.banner_url && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden">
              <OptimizedImage
                src={campaign.banner_url}
                alt={campaign.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Retainer</p>
                  <p className="text-2xl font-bold">${campaign.monthly_retainer.toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Videos/Month</p>
                  <p className="text-2xl font-bold">{campaign.videos_per_month}</p>
                </div>
                <Video className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Positions</p>
                  <p className="text-2xl font-bold">
                    {acceptedCount} / {campaign.max_accepted_creators}
                  </p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Applications</p>
                  <p className="text-2xl font-bold">{applications.length}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="applications" className="w-full">
          <TabsList className="w-full justify-start mb-6">
            <TabsTrigger value="applications">
              Applications ({pendingCount} pending)
            </TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="accepted">Accepted ({acceptedCount})</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            {applications.filter(app => app.status === 'pending').length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p className="text-muted-foreground">No pending applications</p>
                </CardContent>
              </Card>
            ) : (
              applications.filter(app => app.status === 'pending').map((application) => (
                <Card key={application.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={application.profiles.avatar_url || ""} />
                          <AvatarFallback>
                            {application.profiles.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {application.profiles.full_name || application.profiles.username}
                          </p>
                          <p className="text-sm text-muted-foreground">@{application.profiles.username}</p>
                        </div>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>

                    {application.application_text && (
                      <div className="p-4 rounded-lg bg-muted/50 mb-4">
                        <p className="text-sm">{application.application_text}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(application.video_url, '_blank')}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Application Video
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground mb-4">
                      Applied {formatDistanceToNow(new Date(application.applied_at), { addSuffix: true })}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleUpdateStatus(application.id, 'accepted')}
                        disabled={processing === application.id || acceptedCount >= campaign.max_accepted_creators}
                        className="flex-1 bg-green-600 hover:bg-green-700"
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
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.description && (
                  <div>
                    <p className="text-sm font-medium mb-2">Description</p>
                    <p className="text-sm text-muted-foreground">{campaign.description}</p>
                  </div>
                )}

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-2">Content Requirements</p>
                  <p className="text-sm text-muted-foreground">{campaign.content_style_requirements}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  {campaign.start_date && (
                    <div>
                      <p className="text-sm font-medium mb-1">Start Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(campaign.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {campaign.end_date && (
                    <div>
                      <p className="text-sm font-medium mb-1">End Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(campaign.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium mb-1">Status</p>
                  <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                    {campaign.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accepted Tab */}
          <TabsContent value="accepted" className="space-y-4">
            {applications.filter(app => app.status === 'accepted').length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p className="text-muted-foreground">No accepted creators yet</p>
                </CardContent>
              </Card>
            ) : (
              applications.filter(app => app.status === 'accepted').map((application) => (
                <Card key={application.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={application.profiles.avatar_url || ""} />
                          <AvatarFallback>
                            {application.profiles.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {application.profiles.full_name || application.profiles.username}
                          </p>
                          <p className="text-sm text-muted-foreground">@{application.profiles.username}</p>
                          {application.reviewed_at && (
                            <p className="text-xs text-muted-foreground">
                              Accepted {formatDistanceToNow(new Date(application.reviewed_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(application.status)}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
