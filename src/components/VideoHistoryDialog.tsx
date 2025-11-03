import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface VideoHistoryData {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  bookmarks: number;
  engagements: number;
}

interface VideoHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video: any;
  historyData: VideoHistoryData[] | null;
  loading: boolean;
}

export function VideoHistoryDialog({
  open,
  onOpenChange,
  video,
  historyData,
  loading
}: VideoHistoryDialogProps) {
  const [activeMetric, setActiveMetric] = React.useState<'views' | 'likes' | 'comments' | 'shares'>('views');
  
  if (!video) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-instrument tracking-tight">
            Video History: {video.username}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {video.title || 'Untitled'} • {video.platform}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : historyData && historyData.length > 0 ? (
          <Tabs defaultValue="chart" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>

            <TabsContent value="chart" className="space-y-6">
              {/* Metric Selector */}
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => setActiveMetric('views')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeMetric === 'views' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Views
                </button>
                <button 
                  onClick={() => setActiveMetric('likes')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeMetric === 'likes' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Likes
                </button>
                <button 
                  onClick={() => setActiveMetric('comments')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeMetric === 'comments' 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Comments
                </button>
                <button 
                  onClick={() => setActiveMetric('shares')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeMetric === 'shares' 
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Shares
                </button>
              </div>

              <div className="h-[400px] bg-black/30 rounded-xl p-4 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...historyData].reverse()}>
                    <defs>
                      <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorShares" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#666"
                      tick={{ fill: '#666', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0a0a0a', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '8px 12px'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number) => [value.toLocaleString(), activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)]}
                    />
                    {activeMetric === 'views' && (
                      <Area 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#a855f7" 
                        strokeWidth={2.5}
                        fill="url(#colorViews)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#a855f7' }}
                      />
                    )}
                    {activeMetric === 'likes' && (
                      <Area 
                        type="monotone" 
                        dataKey="likes" 
                        stroke="#10b981" 
                        strokeWidth={2.5}
                        fill="url(#colorLikes)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#10b981' }}
                      />
                    )}
                    {activeMetric === 'comments' && (
                      <Area 
                        type="monotone" 
                        dataKey="comments" 
                        stroke="#06b6d4" 
                        strokeWidth={2.5}
                        fill="url(#colorComments)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#06b6d4' }}
                      />
                    )}
                    {activeMetric === 'shares' && (
                      <Area 
                        type="monotone" 
                        dataKey="shares" 
                        stroke="#f97316" 
                        strokeWidth={2.5}
                        fill="url(#colorShares)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#f97316' }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Current Views</p>
                  <p className="text-2xl font-bold">
                    {video.latest_views?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Current Likes</p>
                  <p className="text-2xl font-bold">
                    {video.latest_likes?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Current Comments</p>
                  <p className="text-2xl font-bold">
                    {video.latest_comments?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Current Shares</p>
                  <p className="text-2xl font-bold">
                    {video.latest_shares?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Current Engagements</p>
                  <p className="text-2xl font-bold">
                    {video.latest_engagements?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Engagement Rate</p>
                  <p className="text-2xl font-bold">
                    {(video.latest_views || 0) > 0 
                      ? (((video.latest_engagements || 0) / video.latest_views) * 100).toFixed(2)
                      : '0.00'}%
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="table">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Likes</TableHead>
                      <TableHead className="text-right">Comments</TableHead>
                      <TableHead className="text-right">Shares</TableHead>
                      <TableHead className="text-right">Bookmarks</TableHead>
                      <TableHead className="text-right">Engagements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{row.views.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.likes.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.comments.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.shares.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.bookmarks.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{row.engagements.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No history data available for this video</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
