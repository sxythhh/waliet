import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

            <TabsContent value="chart" className="space-y-4">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...historyData].reverse()}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number) => value.toLocaleString()}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="views" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="likes" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="comments" stroke="#ffc658" strokeWidth={2} />
                    <Line type="monotone" dataKey="shares" stroke="#ff7c7c" strokeWidth={2} />
                  </LineChart>
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
