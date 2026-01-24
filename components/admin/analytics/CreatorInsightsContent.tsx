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
  AlertTriangle,
  Search,
  TrendingUp,
  Shield,
  Activity,
  Eye,
  X,
} from "lucide-react";
import { PageLoading } from "@/components/ui/loading-bar";
import { useCreatorInsights, type CreatorInsight } from "@/hooks/useCreatorInsights";
import { formatDistanceToNow } from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

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
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
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
            <SheetTitle className="font-inter tracking-[-0.5px]">Creator Profile</SheetTitle>
            <Button variant="ghost" size="icon" aria-label="Close panel" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={creator.avatar_url || undefined} />
              <AvatarFallback className="text-lg font-inter">
                {creator.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold font-inter tracking-[-0.5px]">{creator.username}</h3>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">{creator.email}</p>
              <Badge className={cn("mt-1", getRetentionColor(creator.retentionStatus))}>
                {creator.retentionStatus}
              </Badge>
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    Performance
                  </span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold font-inter tracking-[-0.5px] tabular-nums">{creator.performanceScore}</div>
                <Progress value={creator.performanceScore} className="h-1.5 mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    Risk Score
                  </span>
                  <Shield
                    className={cn(
                      "h-4 w-4",
                      creator.fraudRiskScore > 50
                        ? "text-red-500"
                        : creator.fraudRiskScore > 25
                        ? "text-amber-500"
                        : "text-emerald-500"
                    )}
                  />
                </div>
                <div className="text-2xl font-bold font-inter tracking-[-0.5px] tabular-nums">{creator.fraudRiskScore}</div>
                <Progress
                  value={creator.fraudRiskScore}
                  className={cn(
                    "h-1.5 mt-2",
                    creator.fraudRiskScore > 50
                      ? "[&>div]:bg-red-500"
                      : creator.fraudRiskScore > 25
                      ? "[&>div]:bg-amber-500"
                      : "[&>div]:bg-emerald-500"
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-inter tracking-[-0.3px]">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Total Earnings", value: formatCurrency(creator.totalEarnings), className: "text-emerald-500" },
                { label: "Submissions", value: creator.totalSubmissions.toString() },
                { label: "Approval Rate", value: `${creator.approvalRate.toFixed(1)}%` },
                { label: "Monthly Velocity", value: `${formatCurrency(creator.earningsVelocity)}/mo` },
                { label: "Last Active", value: creator.lastActive
                  ? formatDistanceToNow(new Date(creator.lastActive), { addSuffix: true })
                  : "Never" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-inter tracking-[-0.3px]">
                    {item.label}
                  </span>
                  <span className={cn("font-semibold font-inter tracking-[-0.3px] tabular-nums", item.className)}>
                    {item.value}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Platform Breakdown */}
          {pieData.length > 0 && (
            <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-inter tracking-[-0.3px]">Platform Distribution</CardTitle>
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
                      <span className="text-xs capitalize font-inter tracking-[-0.3px]">{p.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Earnings Trend */}
          <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-inter tracking-[-0.3px]">Earnings Trend (7 days)</CardTitle>
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

export function CreatorInsightsContent() {
  const { loading, creators, stats } = useCreatorInsights();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCreator, setSelectedCreator] = useState<CreatorInsight | null>(null);
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
    const variants: Record<string, { class: string; label: string }> = {
      active: { class: "bg-emerald-500/10 text-emerald-500 border-0", label: "Active" },
      "at-risk": { class: "bg-amber-500/10 text-amber-500 border-0", label: "At Risk" },
      dormant: { class: "bg-orange-500/10 text-orange-500 border-0", label: "Dormant" },
      churned: { class: "bg-red-500/10 text-red-500 border-0", label: "Churned" },
    };
    const v = variants[status];
    return <Badge className={v.class}>{v.label}</Badge>;
  };

  const openDetail = (creator: CreatorInsight) => {
    setSelectedCreator(creator);
    setDetailOpen(true);
  };

  if (loading) {
    return <PageLoading text="Loading insights..." />;
  }

  return (
    <>
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { icon: Users, color: "blue", value: stats.total, label: "Total" },
              { icon: UserCheck, color: "emerald", value: stats.active, label: "Active" },
              { icon: AlertTriangle, color: "amber", value: stats.atRisk, label: "At Risk" },
              { icon: Activity, color: "orange", value: stats.dormant, label: "Dormant" },
              { icon: TrendingUp, color: "violet", value: stats.avgPerformanceScore, label: "Avg Score" },
              { icon: Shield, color: "red", value: stats.avgFraudRiskScore, label: "Avg Risk" },
            ].map((stat) => (
              <Card key={stat.label} className="bg-card dark:bg-[#0e0e0e] border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-${stat.color}-500/10 rounded-lg`}>
                      <stat.icon className={`h-5 w-5 text-${stat.color}-500`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-inter tracking-[-0.5px] tabular-nums">{stat.value}</p>
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search creators..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-muted/30 dark:bg-muted/20 border-border/50 font-inter tracking-[-0.3px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-muted/30 dark:bg-muted/20 border-border/50 font-inter tracking-[-0.3px]">
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
          <Card className="bg-card dark:bg-[#0e0e0e] border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30 dark:bg-muted/20">
                      {["Creator", "Status", "Performance", "Risk", "Earnings", "Trend", "Actions"].map((h) => (
                        <th key={h} className="text-left p-4 text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCreators.map((creator) => (
                      <tr
                        key={creator.id}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={creator.avatar_url || undefined} />
                              <AvatarFallback className="text-xs font-inter">
                                {creator.username.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm font-inter tracking-[-0.3px]">
                                {creator.username}
                              </p>
                              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                                {creator.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">{getRetentionBadge(creator.retentionStatus)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Progress value={creator.performanceScore} className="w-16 h-2" />
                            <span className="text-sm font-medium font-inter tracking-[-0.3px] tabular-nums">
                              {creator.performanceScore}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Progress
                              value={creator.fraudRiskScore}
                              className={cn(
                                "w-16 h-2",
                                creator.fraudRiskScore > 50
                                  ? "[&>div]:bg-red-500"
                                  : creator.fraudRiskScore > 25
                                  ? "[&>div]:bg-amber-500"
                                  : "[&>div]:bg-emerald-500"
                              )}
                            />
                            <span className="text-sm font-medium font-inter tracking-[-0.3px] tabular-nums">
                              {creator.fraudRiskScore}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-semibold text-emerald-500 font-inter tracking-[-0.3px] tabular-nums">
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
                            className="font-inter tracking-[-0.3px]"
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
      </div>

      <CreatorDetailPanel
        creator={selectedCreator}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
}
