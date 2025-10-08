import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Upload, TrendingUp, Eye, Heart, MessageSquare, BarChart3 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
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
            <Card className="bg-[#1a1a1a] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Likes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Comments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalComments.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card className="bg-[#1a1a1a] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgEngagementRate.toFixed(2)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#202020] to-[#1a1a1a] border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
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
                }}
                className="h-[400px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))', opacity: 0.2 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      axisLine={{ stroke: 'hsl(var(--border))', opacity: 0.2 }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent className="border-0 bg-[#0C0C0C]/95 backdrop-blur-sm" />}
                      cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, opacity: 0.2 }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cumulativeViews" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fill="url(#cumulativeGradient)"
                      name="Cumulative Views"
                      dot={false}
                      activeDot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#1a1a1a] via-[#202020] to-[#1a1a1a] border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {videos
                  .sort((a, b) => b.views - a.views)
                  .slice(0, 10)
                  .map((video, index) => (
                    <div 
                      key={index} 
                      className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-[#151515] to-[#1a1a1a] hover:from-[#1a1a1a] hover:to-[#202020] transition-all duration-300 border border-white/5 hover:border-primary/20"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center font-bold text-white shadow-lg shadow-primary/20">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a 
                          href={video.video_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-white hover:text-primary transition-colors line-clamp-1"
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
