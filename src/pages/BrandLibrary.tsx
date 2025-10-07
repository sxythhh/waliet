import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, Upload, Trash2, Download, TrendingUp, Eye, Heart, MessageCircle, BarChart3 } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface VideoAnalytic {
  id: string;
  brand_id: string;
  account: string;
  platform: string;
  video_link: string;
  video_title: string;
  views: number;
  likes: number;
  comments: number;
  engagement_rate: number;
  views_performance: number;
  upload_date: string;
  imported_at: string;
}

interface AnalyticsSummary {
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgEngagementRate: number;
  totalVideos: number;
}

export default function BrandLibrary() {
  const { slug } = useParams();
  const sidebar = useSidebar();
  const [loading, setLoading] = useState(true);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoAnalytic[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    avgEngagementRate: 0,
    totalVideos: 0,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchBrandData();
    }
  }, [slug]);

  const fetchBrandData = async () => {
    try {
      setLoading(true);
      const { data: brandData } = await supabase
        .from("brands")
        .select("id")
        .eq("slug", slug)
        .single();

      if (brandData) {
        setBrandId(brandData.id);
        await fetchVideos(brandData.id);
      }
    } catch (error) {
      console.error("Error fetching brand:", error);
      toast.error("Failed to load brand data");
    } finally {
      setLoading(false);
    }
  };

  const fetchVideos = async (brandId: string) => {
    try {
      const { data, error } = await supabase
        .from("video_analytics")
        .select("*")
        .eq("brand_id", brandId)
        .order("upload_date", { ascending: false });

      if (error) throw error;

      const videoData = (data || []) as VideoAnalytic[];
      setVideos(videoData);

      // Calculate analytics
      const summary = videoData.reduce(
        (acc, video) => ({
          totalViews: acc.totalViews + (video.views || 0),
          totalLikes: acc.totalLikes + (video.likes || 0),
          totalComments: acc.totalComments + (video.comments || 0),
          avgEngagementRate: acc.avgEngagementRate + (video.engagement_rate || 0),
          totalVideos: acc.totalVideos + 1,
        }),
        { totalViews: 0, totalLikes: 0, totalComments: 0, avgEngagementRate: 0, totalVideos: 0 }
      );

      if (summary.totalVideos > 0) {
        summary.avgEngagementRate = summary.avgEngagementRate / summary.totalVideos;
      }

      setAnalytics(summary);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load video analytics");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !brandId) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setUploading(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());

      const videoData: Array<{
        brand_id: string;
        account: string;
        platform: string;
        video_link: string;
        video_title?: string;
        views?: number;
        likes?: number;
        comments?: number;
        engagement_rate?: number;
        views_performance?: number;
        upload_date?: string;
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Validate required fields and skip invalid rows
        if (row.account && row.platform && row.video_link) {
          // Parse date properly - expect format YYYY-MM-DD
          let uploadDate = row.upload_date;
          if (uploadDate && uploadDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Valid date format
          } else {
            // Default to today if invalid
            uploadDate = new Date().toISOString().split('T')[0];
          }

          videoData.push({
            brand_id: brandId,
            account: row.account,
            platform: row.platform,
            video_link: row.video_link,
            video_title: row.video_title || "",
            views: parseInt(row.views) || 0,
            likes: parseInt(row.likes) || 0,
            comments: parseInt(row.comments) || 0,
            engagement_rate: parseFloat(row.engagement_rate) || 0,
            views_performance: parseFloat(row.views_performance) || 0,
            upload_date: uploadDate,
          });
        }
      }

      const { error } = await supabase.from("video_analytics").insert(videoData);

      if (error) throw error;

      toast.success(`Successfully imported ${videoData.length} videos`);
      await fetchVideos(brandId);
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast.error("Failed to import CSV file");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleClearAll = async () => {
    if (!brandId) return;

    if (!confirm("Are you sure you want to delete all video analytics? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase.from("video_analytics").delete().eq("brand_id", brandId);

      if (error) throw error;

      toast.success("All video analytics deleted");
      setVideos([]);
      setAnalytics({
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        avgEngagementRate: 0,
        totalVideos: 0,
      });
    } catch (error) {
      console.error("Error clearing analytics:", error);
      toast.error("Failed to clear analytics");
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#191919] flex flex-col p-6">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="flex-1 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#191919] flex flex-col">
      {/* Mobile Menu Button */}
      <div className="md:hidden p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => sidebar.setOpenMobile(true)}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Video Library & Analytics</h1>
            <p className="text-sm text-white/60 mt-1">Track and analyze your video performance</p>
          </div>
          <div className="flex gap-2">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              disabled={uploading}
            />
            <label htmlFor="csv-upload">
              <Button variant="default" disabled={uploading} asChild>
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Import CSV"}
                </span>
              </Button>
            </label>
            {videos.length > 0 && (
              <Button variant="destructive" onClick={handleClearAll}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#202020] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-white/60" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(analytics.totalViews)}</div>
              <p className="text-xs text-white/60 mt-1">{analytics.totalVideos} videos</p>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Total Likes</CardTitle>
              <Heart className="h-4 w-4 text-white/60" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(analytics.totalLikes)}</div>
              <p className="text-xs text-white/60 mt-1">Across all videos</p>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Total Comments</CardTitle>
              <MessageCircle className="h-4 w-4 text-white/60" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(analytics.totalComments)}</div>
              <p className="text-xs text-white/60 mt-1">Engagement count</p>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/60">Avg Engagement</CardTitle>
              <BarChart3 className="h-4 w-4 text-white/60" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics.avgEngagementRate.toFixed(2)}%</div>
              <p className="text-xs text-white/60 mt-1">Average rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Videos Table */}
        {videos.length === 0 ? (
          <Card className="bg-[#202020] border-white/10">
            <CardContent className="py-16 text-center">
              <Upload className="h-12 w-12 text-white/60 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No videos imported yet</h3>
              <p className="text-sm text-white/60 mb-6">Upload a CSV file to start tracking your video analytics</p>
              <label htmlFor="csv-upload">
                <Button asChild>
                  <span>Import CSV</span>
                </Button>
              </label>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#202020] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Video Performance</CardTitle>
              <CardDescription className="text-white/60">Detailed analytics for all imported videos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comments</TableHead>
                      <TableHead className="text-right">Engagement</TableHead>
                      <TableHead>Upload Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videos.map((video) => (
                      <TableRow key={video.id}>
                        <TableCell className="font-medium">
                          <a
                            href={video.video_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-primary transition-colors"
                          >
                            {video.account}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {video.platform}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-white/60">
                          {video.video_title}
                        </TableCell>
                        <TableCell className="text-right text-white">
                          {formatNumber(video.views)}
                        </TableCell>
                        <TableCell className="text-right text-white">
                          {formatNumber(video.likes)}
                        </TableCell>
                        <TableCell className="text-right text-white">
                          {formatNumber(video.comments)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={video.engagement_rate > 5 ? "default" : "secondary"}>
                            {video.engagement_rate.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/60">
                          {new Date(video.upload_date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
