import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Video, Eye, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
}

interface BrandPortalSubmissionsProps {
  brand: Brand;
  userId: string;
}

interface VideoSubmission {
  id: string;
  video_url: string;
  platform: string;
  status: string;
  views: number;
  created_at: string;
  campaign_title: string;
  type: "campaign" | "boost";
}

export function BrandPortalSubmissions({ brand, userId }: BrandPortalSubmissionsProps) {
  const [submissions, setSubmissions] = useState<VideoSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    totalViews: 0,
  });

  const accentColor = brand.brand_color || "#2061de";

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);

      // Fetch campaigns for this brand
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id, title")
        .eq("brand_id", brand.id);

      const campaignIds = campaigns?.map(c => c.id) || [];
      const campaignMap = (campaigns || []).reduce((acc, c) => {
        acc[c.id] = c.title;
        return acc;
      }, {} as Record<string, string>);

      // Fetch boost campaigns
      const { data: boostCampaigns } = await supabase
        .from("bounty_campaigns")
        .select("id, title")
        .eq("brand_id", brand.id);

      const boostIds = boostCampaigns?.map(c => c.id) || [];
      const boostMap = (boostCampaigns || []).reduce((acc, c) => {
        acc[c.id] = c.title;
        return acc;
      }, {} as Record<string, string>);

      const allSubmissions: VideoSubmission[] = [];

      // Fetch campaign video submissions
      if (campaignIds.length > 0) {
        const { data: campaignVideos } = await supabase
          .from("campaign_videos")
          .select("id, video_url, platform, status, video_views, created_at, campaign_id")
          .eq("creator_id", userId)
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false });

        if (campaignVideos) {
          allSubmissions.push(...campaignVideos.map(v => ({
            id: v.id,
            video_url: v.video_url,
            platform: v.platform || "unknown",
            status: v.status || "pending",
            views: v.video_views || 0,
            created_at: v.created_at || "",
            campaign_title: campaignMap[v.campaign_id] || "Unknown Campaign",
            type: "campaign" as const,
          })));
        }
      }

      // Fetch boost submissions
      if (boostIds.length > 0) {
        const { data: boostVideos } = await supabase
          .from("boost_video_submissions")
          .select("id, video_url, platform, status, created_at, bounty_campaign_id")
          .eq("user_id", userId)
          .in("bounty_campaign_id", boostIds)
          .order("created_at", { ascending: false });

        if (boostVideos) {
          allSubmissions.push(...boostVideos.map(v => ({
            id: v.id,
            video_url: v.video_url,
            platform: v.platform,
            status: v.status,
            views: 0,
            created_at: v.created_at,
            campaign_title: boostMap[v.bounty_campaign_id] || "Unknown Campaign",
            type: "boost" as const,
          })));
        }
      }

      // Sort by date
      allSubmissions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSubmissions(allSubmissions);

      // Calculate stats
      setStats({
        total: allSubmissions.length,
        approved: allSubmissions.filter(s => s.status === "approved").length,
        pending: allSubmissions.filter(s => s.status === "pending").length,
        totalViews: allSubmissions.reduce((sum, s) => sum + s.views, 0),
      });

      setLoading(false);
    };

    fetchSubmissions();
  }, [brand.id, userId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-50 text-emerald-600 border-0">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-50 text-amber-600 border-0">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-50 text-red-600 border-0">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-gray-500 border-gray-200 capitalize">
            {status}
          </Badge>
        );
    }
  };

  const getPlatformBadge = (platform: string) => {
    const colors: Record<string, string> = {
      tiktok: "bg-black text-white",
      youtube: "bg-red-500 text-white",
      instagram: "bg-pink-500 text-white",
    };

    return (
      <Badge className={`${colors[platform.toLowerCase()] || "bg-gray-100 text-gray-600"} border-0 capitalize`}>
        {platform}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Submissions</h1>
        <p className="text-gray-500 mt-1">Track your video submissions for {brand.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Submissions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Video className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.approved}</p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Views</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalViews.toLocaleString()}</p>
              </div>
              <div 
                className="p-3 rounded-xl"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Eye className="h-6 w-6" style={{ color: accentColor }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card className="bg-white border-gray-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">All Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <div 
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Video className="h-6 w-6" style={{ color: accentColor }} />
              </div>
              <p className="text-gray-500">No submissions yet</p>
              <p className="text-sm text-gray-400 mt-1">Your video submissions will appear here</p>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="text-gray-600 font-medium">Date</TableHead>
                    <TableHead className="text-gray-600 font-medium">Campaign</TableHead>
                    <TableHead className="text-gray-600 font-medium">Platform</TableHead>
                    <TableHead className="text-gray-600 font-medium">Views</TableHead>
                    <TableHead className="text-gray-600 font-medium">Status</TableHead>
                    <TableHead className="text-gray-600 font-medium text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id} className="hover:bg-gray-50">
                      <TableCell className="text-gray-600">
                        {format(new Date(submission.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-gray-900 font-medium">
                        {submission.campaign_title}
                      </TableCell>
                      <TableCell>
                        {getPlatformBadge(submission.platform)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {submission.views.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(submission.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(submission.video_url, "_blank")}
                          className="text-gray-500 hover:text-gray-900"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
