import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Sparklines, SparklinesLine } from "react-sparklines";
import {
  Users,
  UserCheck,
  UserMinus,
  AlertTriangle,
  Search,
  TrendingUp,
  DollarSign,
  Shield,
  Activity,
  Eye,
  X,
} from "lucide-react";
import { PageLoading } from "@/components/ui/loading-bar";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { useCreatorInsights, type CreatorInsight } from "@/hooks/useCreatorInsights";
import { formatDistanceToNow } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#000000",
  instagram: "#E4405F",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
};

interface CreatorDetailPanelProps {
  creator: CreatorInsight | null;
  open: boolean;
  onClose: () => void;
}

function CreatorDetailPanel({ creator, open, onClose }: CreatorDetailPanelProps) {
  if (!creator) return null;

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getRetentionColor = (status: CreatorInsight["retentionStatus"]) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "at-risk":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "dormant":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "churned":
        return "bg-red-500/10 text-red-500 border-red-500/20";
    }
  };

  const pieData = creator.platformBreakdown.map((p) => ({
    name: p.platform,
    value: p.count,
    color: PLATFORM_COLORS[p.platform.toLowerCase()] || "#888",
  }));

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Creator Profile</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={creator.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {creator.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{creator.username}</h3>
              <p className="text-sm text-muted-foreground">{creator.email}</p>
              <Badge className={`mt-1 ${getRetentionColor(creator.retentionStatus)}`}>
                {creator.retentionStatus}
              </Badge>
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Performance
                  </span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold">{creator.performanceScore}</div>
                <Progress
                  value={creator.performanceScore}
                  className="h-1.5 mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Risk Score
                  </span>
                  <Shield
                    className={`h-4 w-4 ${
                      creator.fraudRiskScore > 50
                        ? "text-red-500"
                        : creator.fraudRiskScore > 25
                        ? "text-amber-500"
                        : "text-green-500"
                    }`}
                  />
                </div>
                <div className="text-2xl font-bold">{creator.fraudRiskScore}</div>
                <Progress
                  value={creator.fraudRiskScore}
                  className={`h-1.5 mt-2 ${
                    creator.fraudRiskScore > 50
                      ? "[&>div]:bg-red-500"
                      : creator.fraudRiskScore > 25
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-green-500"
                  }`}
                />
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Earnings
                </span>
                <span className="font-semibold text-green-500">
                  {formatCurrency(creator.totalEarnings)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Submissions
                </span>
                <span className="font-semibold">{creator.totalSubmissions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Approval Rate
                </span>
                <span className="font-semibold">
                  {creator.approvalRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Monthly Velocity
                </span>
                <span className="font-semibold">
                  {formatCurrency(creator.earningsVelocity)}/mo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Last Active
                </span>
                <span className="text-sm">
                  {creator.lastActive
                    ? formatDistanceToNow(new Date(creator.lastActive), {
                        addSuffix: true,
                      })
                    : "Never"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Platform Breakdown */}
          {pieData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((p) => (
                    <div key={p.name} className="flex items-center gap-1.5">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-xs capitalize">{p.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Earnings Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Earnings Trend (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[80px]">
                <Sparklines data={creator.sparkline} height={80}>
                  <SparklinesLine color="#8b5cf6" />
                </Sparklines>
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AdminCreatorInsights() {
  const { loading, creators, stats } = useCreatorInsights();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCreator, setSelectedCreator] = useState<CreatorInsight | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredCreators = creators.filter((c) => {
    const matchesSearch =
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || c.retentionStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const getRetentionBadge = (status: CreatorInsight["retentionStatus"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-0">Active</Badge>;
      case "at-risk":
        return <Badge className="bg-amber-500/10 text-amber-500 border-0">At Risk</Badge>;
      case "dormant":
        return <Badge className="bg-orange-500/10 text-orange-500 border-0">Dormant</Badge>;
      case "churned":
        return <Badge className="bg-red-500/10 text-red-500 border-0">Churned</Badge>;
    }
  };

  const openDetail = (creator: CreatorInsight) => {
    setSelectedCreator(creator);
    setDetailOpen(true);
  };

  return (
    <AdminPermissionGuard resource="users">
      <div className="flex flex-col h-full">
        <div className="border-b p-6">
          <h1 className="text-2xl font-bold tracking-tight">Creator Insights</h1>
          <p className="text-muted-foreground">
            Deep creator intelligence and performance analysis
          </p>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <PageLoading text="Loading insights..." />
          ) : (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <UserCheck className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.active}</p>
                        <p className="text-xs text-muted-foreground">Active</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.atRisk}</p>
                        <p className="text-xs text-muted-foreground">At Risk</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Activity className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.dormant}</p>
                        <p className="text-xs text-muted-foreground">Dormant</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-500/10 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.avgPerformanceScore}</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg">
                        <Shield className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats.avgFraudRiskScore}</p>
                        <p className="text-xs text-muted-foreground">Avg Risk</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search creators..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="at-risk">At Risk</SelectItem>
                    <SelectItem value="dormant">Dormant</SelectItem>
                    <SelectItem value="churned">Churned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Creator Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                            Creator
                          </th>
                          <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                            Performance
                          </th>
                          <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                            Risk
                          </th>
                          <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                            Earnings
                          </th>
                          <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                            Trend
                          </th>
                          <th className="text-left p-4 text-xs font-medium text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCreators.map((creator) => (
                          <tr
                            key={creator.id}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={creator.avatar_url || undefined}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {creator.username.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {creator.username}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {creator.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              {getRetentionBadge(creator.retentionStatus)}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={creator.performanceScore}
                                  className="w-16 h-2"
                                />
                                <span className="text-sm font-medium">
                                  {creator.performanceScore}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={creator.fraudRiskScore}
                                  className={`w-16 h-2 ${
                                    creator.fraudRiskScore > 50
                                      ? "[&>div]:bg-red-500"
                                      : creator.fraudRiskScore > 25
                                      ? "[&>div]:bg-amber-500"
                                      : "[&>div]:bg-green-500"
                                  }`}
                                />
                                <span className="text-sm font-medium">
                                  {creator.fraudRiskScore}
                                </span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="text-sm font-semibold text-green-500">
                                {formatCurrency(creator.totalEarnings)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="w-20 h-8">
                                <Sparklines data={creator.sparkline}>
                                  <SparklinesLine color="#8b5cf6" />
                                </Sparklines>
                              </div>
                            </td>
                            <td className="p-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDetail(creator)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <CreatorDetailPanel
        creator={selectedCreator}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </AdminPermissionGuard>
  );
}
