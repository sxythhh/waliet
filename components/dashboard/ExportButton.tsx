"use client";

import { useState } from "react";
import { MdDownload, MdCalendarToday } from "react-icons/md";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ExportType = "purchases" | "sessions" | "analytics" | "buyers";

interface ExportButtonProps {
  className?: string;
}

export function ExportButton({ className }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [exportType, setExportType] = useState<ExportType | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleExport = async (type: ExportType, useDateRange: boolean = false) => {
    if (useDateRange) {
      setExportType(type);
      setShowDateDialog(true);
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch("/api/sellers/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `export_${type}.csv`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset state
      setShowDateDialog(false);
      setStartDate("");
      setEndDate("");
      setExportType(null);
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    { type: "purchases" as const, label: "Purchases", description: "All completed purchases" },
    { type: "sessions" as const, label: "Sessions", description: "All session history" },
    { type: "analytics" as const, label: "Daily Analytics", description: "Daily revenue stats" },
    { type: "buyers" as const, label: "Buyers", description: "Buyer list with insights" },
  ];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={cn("gap-2", className)} disabled={isExporting}>
            <MdDownload className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Export Data</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {exportOptions.map((option) => (
            <DropdownMenuItem
              key={option.type}
              onClick={() => handleExport(option.type, option.type !== "buyers")}
              className="flex flex-col items-start"
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Export {exportType}</DialogTitle>
            <DialogDescription>
              Optionally specify a date range for your export, or leave blank to export all data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative">
                <MdCalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative">
                <MdCalendarToday className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => exportType && handleExport(exportType, false)}
              disabled={isExporting}
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
