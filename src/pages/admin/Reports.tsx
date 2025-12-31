import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminCard, AdminStatCard } from "@/components/admin/design-system/AdminCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, subDays, subMonths } from "date-fns";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Users,
  DollarSign,
  TrendingUp,
  Shield,
} from "lucide-react";

interface ReportConfig {
  id: string;
  name: string;
  description: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
  tables: string[];
}

const REPORT_CONFIGS: ReportConfig[] = [
  {
    id: "users",
    name: "Users Report",
    description: "All user profiles, signups, and account status",
    icon: Users,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    tables: ["profiles"],
  },
  {
    id: "payouts",
    name: "Payouts Report",
    description: "Payout requests, status, and processing history",
    icon: DollarSign,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    tables: ["payout_requests"],
  },
  {
    id: "transactions",
    name: "Transactions Report",
    description: "All wallet transactions and ledger entries",
    icon: TrendingUp,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    tables: ["wallet_transactions", "payment_ledger"],
  },
  {
    id: "fraud",
    name: "Fraud Report",
    description: "Fraud flags, reviews, and security incidents",
    icon: Shield,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    tables: ["fraud_flags", "security_audit_log"],
  },
];

const DATE_PRESETS = [
  { label: "Today", value: "today", days: 0 },
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "All time", value: "all", days: -1 },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [datePreset, setDatePreset] = useState("30d");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exporting, setExporting] = useState(false);

  const getDateRange = () => {
    if (customDateRange.from && customDateRange.to) {
      return { from: customDateRange.from, to: customDateRange.to };
    }

    const preset = DATE_PRESETS.find((p) => p.value === datePreset);
    if (!preset || preset.days === -1) {
      return { from: new Date("2024-01-01"), to: new Date() };
    }

    return {
      from: subDays(new Date(), preset.days),
      to: new Date(),
    };
  };

  const handleExport = async () => {
    if (!selectedReport) {
      toast.error("Please select a report type");
      return;
    }

    setExporting(true);
    const config = REPORT_CONFIGS.find((r) => r.id === selectedReport);
    if (!config) return;

    try {
      const dateRange = getDateRange();
      const allData: Record<string, any[]> = {};

      for (const table of config.tables) {
        let query = supabase.from(table).select("*");

        // Add date filtering if table has created_at
        if (dateRange.from && dateRange.to) {
          query = query
            .gte("created_at", dateRange.from.toISOString())
            .lte("created_at", dateRange.to.toISOString());
        }

        query = query.order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error) throw error;
        allData[table] = data || [];
      }

      // Generate export
      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === "csv") {
        // For CSV, combine all tables
        const combinedData = Object.entries(allData).flatMap(([tableName, rows]) =>
          rows.map((row) => ({ _table: tableName, ...row }))
        );

        if (combinedData.length === 0) {
          toast.error("No data to export for the selected period");
          return;
        }

        const headers = Object.keys(combinedData[0]);
        const csvRows = [
          headers.join(","),
          ...combinedData.map((row) =>
            headers
              .map((h) => {
                const val = row[h];
                if (val === null || val === undefined) return "";
                if (typeof val === "object") return JSON.stringify(val).replace(/"/g, '""');
                return `"${String(val).replace(/"/g, '""')}"`;
              })
              .join(",")
          ),
        ];
        content = csvRows.join("\n");
        filename = `${config.id}-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
        mimeType = "text/csv";
      } else {
        content = JSON.stringify(allData, null, 2);
        filename = `${config.id}-report-${format(new Date(), "yyyy-MM-dd")}.json`;
        mimeType = "application/json";
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`${config.name} exported successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full h-full p-4 md:p-6 pt-16 md:pt-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-inter tracking-[-0.5px] text-white">
            Reports
          </h1>
          <p className="text-sm text-white/40 font-inter tracking-[-0.5px] mt-0.5">
            Generate and export platform reports
          </p>
        </div>

        {/* Report Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {REPORT_CONFIGS.map((config) => (
            <button
              key={config.id}
              onClick={() => setSelectedReport(config.id)}
              className={cn(
                "p-5 rounded-xl text-left transition-all border",
                selectedReport === config.id
                  ? "bg-white/[0.06] border-white/20"
                  : "bg-white/[0.02] border-white/[0.04] hover:border-white/[0.1]"
              )}
            >
              <div className={cn("p-2.5 rounded-lg w-fit mb-3", config.bgColor)}>
                <config.icon className={cn("h-5 w-5", config.color)} />
              </div>
              <h3 className="text-sm font-semibold text-white font-inter tracking-[-0.5px]">
                {config.name}
              </h3>
              <p className="text-xs text-white/40 font-inter tracking-[-0.5px] mt-1">
                {config.description}
              </p>
            </button>
          ))}
        </div>

        {/* Export Configuration */}
        {selectedReport && (
          <AdminCard title="Export Configuration" subtitle="Configure date range and format">
            <div className="flex flex-wrap items-end gap-4">
              {/* Date Preset */}
              <div className="space-y-2">
                <label className="text-xs text-white/40 font-inter tracking-[-0.5px]">
                  Date Range
                </label>
                <Select value={datePreset} onValueChange={(v) => {
                  setDatePreset(v);
                  setCustomDateRange({ from: undefined, to: undefined });
                }}>
                  <SelectTrigger className="w-[180px] bg-white/[0.03] border-white/[0.06]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Picker */}
              {datePreset === "custom" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[280px] justify-start text-left font-normal bg-white/[0.03] border-white/[0.06]",
                        !customDateRange.from && "text-white/40"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "LLL dd, y")} -{" "}
                            {format(customDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(customDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#0a0a0a] border-white/10" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: customDateRange.from, to: customDateRange.to }}
                      onSelect={(range) => setCustomDateRange({ from: range?.from, to: range?.to })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}

              {/* Export Format */}
              <div className="space-y-2">
                <label className="text-xs text-white/40 font-inter tracking-[-0.5px]">
                  Format
                </label>
                <Select value={exportFormat} onValueChange={(v: "csv" | "json") => setExportFormat(v)}>
                  <SelectTrigger className="w-[120px] bg-white/[0.03] border-white/[0.06]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        CSV
                      </div>
                    </SelectItem>
                    <SelectItem value="json">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        JSON
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={exporting || !selectedReport}
                className="gap-2 bg-white text-black hover:bg-white/90"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export Report
                  </>
                )}
              </Button>
            </div>
          </AdminCard>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard
            label="Reports Generated Today"
            value="0"
            color="blue"
          />
          <AdminStatCard
            label="Last Export"
            value="Never"
          />
          <AdminStatCard
            label="Total Data Points"
            value="—"
          />
          <AdminStatCard
            label="Export Format"
            value={exportFormat.toUpperCase()}
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}
