import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, TrendingUp, Eye, Heart, MessageSquare, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface VideoData {
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
}

export function VideosTab() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      
      const parsedData: VideoData[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values: string[] = [];
        let currentValue = '';
        let insideQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());

        if (values.length >= 10) {
          parsedData.push({
            account: values[0],
            platform: values[1],
            video_link: values[2],
            video_title: values[3],
            views: parseInt(values[4]) || 0,
            likes: parseInt(values[5]) || 0,
            comments: parseInt(values[6]) || 0,
            engagement_rate: parseFloat(values[7]) || 0,
            views_performance: parseFloat(values[8]) || 0,
            upload_date: values[9]
          });
        }
      }

      setVideos(parsedData);
      toast.success(`Imported ${parsedData.length} videos`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error('Failed to parse CSV file');
    } finally {
      setIsLoading(false);
    }
  };

  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
  const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
  const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);
  const avgEngagementRate = videos.length > 0 
    ? videos.reduce((sum, v) => sum + v.engagement_rate, 0) / videos.length 
    : 0;

  // Prepare cumulative views data sorted by date
  const cumulativeData = videos
    .sort((a, b) => {
      const dateA = new Date(a.upload_date.split('/').reverse().join('-'));
      const dateB = new Date(b.upload_date.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    })
    .reduce((acc: any[], video, index) => {
      const prevViews = index > 0 ? acc[index - 1].cumulativeViews : 0;
      acc.push({
        date: video.upload_date,
        views: video.views,
        cumulativeViews: prevViews + video.views,
        engagement: video.engagement_rate
      });
      return acc;
    }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Video Analytics Import</span>
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button disabled={isLoading} asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    {isLoading ? 'Importing...' : 'Import CSV'}
                  </span>
                </Button>
              </label>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {videos.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {videos.length} videos
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
                <Heart className="h-4 w-4 text-pink-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((totalLikes / totalViews) * 100).toFixed(2)}% like rate
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
                <MessageSquare className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalComments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(totalComments / videos.length).toFixed(1)} avg per video
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgEngagementRate.toFixed(2)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Engagement rate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cumulative Views Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  cumulativeViews: {
                    label: "Cumulative Views",
                    color: "hsl(var(--primary))",
                  },
                  views: {
                    label: "Video Views",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[400px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cumulativeData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeViews" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      name="Cumulative Views"
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="views" 
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      name="Video Views"
                      dot={{ fill: 'hsl(var(--chart-2))', r: 3 }}
                      opacity={0.6}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videos
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 10)
                  .map((video, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a 
                          href={video.video_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium hover:text-primary transition-colors line-clamp-1"
                        >
                          {video.video_title}
                        </a>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {video.views.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="h-3 w-3" />
                            {video.likes.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {video.comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {video.engagement_rate.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {video.upload_date}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {videos.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No videos imported yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Upload a CSV file to view video analytics, cumulative views, and performance metrics
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
