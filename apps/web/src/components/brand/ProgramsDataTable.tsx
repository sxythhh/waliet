import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  ChevronLeft,
  ChevronRight,
  Briefcase,
} from "lucide-react";

export interface ProgramData {
  id: string;
  title: string;
  slug: string;
  status: string;
  views: number;
  spent: number;
  creators: number;
  cpm: number;
  type: "campaign" | "boost";
}

export interface Filter {
  field: string;
  operator: string;
  value: string[];
}

interface ProgramsDataTableProps {
  campaigns: ProgramData[];
  boosts: ProgramData[];
  onToggleStatus: (id: string, type: "campaign" | "boost", isActive: boolean) => void;
  isToggling?: boolean;
  filters?: Filter[];
  onFiltersChange?: (filters: Filter[]) => void;
  onSelectProgram?: (id: string, type: "campaign" | "boost") => void;
}

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toLocaleString();
};

const formatCurrency = (num: number) => {
  return "$" + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCPM = (num: number) => {
  if (num === 0 || !isFinite(num)) return "—";
  return "$" + num.toFixed(2);
};

export function ProgramsDataTable({
  campaigns,
  boosts,
  onToggleStatus,
  isToggling,
  onSelectProgram,
}: ProgramsDataTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Combine campaigns and boosts into single list
  const allPrograms = [...campaigns, ...boosts];
  const totalPages = Math.ceil(allPrograms.length / pageSize);
  const paginatedData = allPrograms.slice((page - 1) * pageSize, page * pageSize);

  // Calculate totals
  const totals = allPrograms.reduce(
    (acc, item) => ({
      views: acc.views + item.views,
      spent: acc.spent + item.spent,
      creators: acc.creators + item.creators,
    }),
    { views: 0, spent: 0, creators: 0 }
  );
  const totalCPM = totals.views > 0 ? (totals.spent / totals.views) * 1000 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center">
        <h3 className="text-sm font-medium tracking-[-0.5px]">All Programs</h3>
      </div>

      {/* Table */}
      {allPrograms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="font-inter tracking-[-0.5px] font-medium text-foreground">
            No programs yet
          </h3>
          <p className="text-sm text-muted-foreground font-inter tracking-[-0.3px] mt-1">
            Create a campaign or boost to get started
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="w-[50px] font-inter tracking-[-0.5px] text-xs font-medium text-muted-foreground">Live</TableHead>
                <TableHead className="font-inter tracking-[-0.5px] text-xs font-medium text-muted-foreground">Name</TableHead>
                <TableHead className="w-[100px] text-right font-inter tracking-[-0.5px] text-xs font-medium text-muted-foreground">Views</TableHead>
                <TableHead className="w-[100px] text-right font-inter tracking-[-0.5px] text-xs font-medium text-muted-foreground">Spent</TableHead>
                <TableHead className="w-[100px] text-right font-inter tracking-[-0.5px] text-xs font-medium text-muted-foreground">Creators</TableHead>
                <TableHead className="w-[80px] text-right font-inter tracking-[-0.5px] text-xs font-medium text-muted-foreground">CPM</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((program) => (
                <TableRow
                  key={program.id}
                  className={`border-b border-border/30 hover:bg-muted/30 dark:hover:bg-muted/20 transition-colors ${onSelectProgram ? "cursor-pointer" : ""}`}
                  onClick={() => onSelectProgram?.(program.id, program.type)}
                >
                  <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={program.status === "active"}
                      onCheckedChange={(checked) => onToggleStatus(program.id, program.type, checked)}
                      disabled={isToggling || program.status === "completed"}
                      className="scale-75"
                    />
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium font-inter tracking-[-0.5px] text-foreground ${onSelectProgram ? "hover:underline" : ""}`}>{program.title}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium font-inter tracking-[-0.3px]">{formatNumber(program.views)}</TableCell>
                  <TableCell className="text-right font-medium font-inter tracking-[-0.3px]">{formatCurrency(program.spent)}</TableCell>
                  <TableCell className="text-right font-medium font-inter tracking-[-0.3px]">{program.creators}</TableCell>
                  <TableCell className="text-right font-medium font-inter tracking-[-0.3px]">{formatCPM(program.cpm)}</TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="bg-muted/30 dark:bg-muted/20 hover:bg-muted/30 dark:hover:bg-muted/20 border-t-2 border-border/50">
                <TableCell colSpan={2} className="font-semibold text-right font-inter tracking-[-0.5px]">
                  Totals
                </TableCell>
                <TableCell className="text-right font-semibold font-inter tracking-[-0.3px]">{formatNumber(totals.views)}</TableCell>
                <TableCell className="text-right font-semibold font-inter tracking-[-0.3px]">{formatCurrency(totals.spent)}</TableCell>
                <TableCell className="text-right font-semibold font-inter tracking-[-0.3px]">{totals.creators}</TableCell>
                <TableCell className="text-right font-semibold font-inter tracking-[-0.3px]">{formatCPM(totalCPM)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground font-inter tracking-[-0.3px]">
          <span>
            Rows {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, allPrograms.length)} of {allPrograms.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
