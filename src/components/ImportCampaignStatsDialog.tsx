import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ImportCampaignStatsDialogProps {
  campaignId: string;
  onImportComplete: () => void;
  onMatchingRequired: () => void;
}

export function ImportCampaignStatsDialog({
  campaignId,
  onImportComplete,
  onMatchingRequired,
}: ImportCampaignStatsDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' && nextChar === '"' && inQuotes) {
        // Handle escaped quotes within a quoted field
        current += '"';
        i++; // Skip the next quote
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  };

  const parseDate = (dateStr: string): string | null => {
    try {
      const [day, month, year] = dateStr.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch {
      return null;
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates for this data");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date must be after start date");
      return;
    }

    setImporting(true);
    setProgress(0);
    
    try {
      let text = await file.text();
      
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.substring(1);
      }
      
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        setImporting(false);
        return;
      }

      // Skip header row
      const dataLines = lines.slice(1).filter(line => line.trim());
      const totalLines = dataLines.length;
      let processedLines = 0;
      let successCount = 0;
      
      // Process in batches
      const batchSize = 10;
      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);
        const records = [];

        for (const line of batch) {
          const values = parseCSVLine(line);
          
          if (values.length < 13) {
            console.warn("Skipping invalid line (expected 13 columns, got " + values.length + "):", line);
            continue;
          }

          try {
            // Parse posts_last_7_days JSON, handling escaped quotes
            let postsLast7Days = null;
            if (values[8] && values[8].trim()) {
              try {
                postsLast7Days = JSON.parse(values[8]);
              } catch (jsonError) {
                console.error("Error parsing JSON for posts_last_7_days:", values[8], jsonError);
              }
            }

            // CSV columns: account, account_link, platform, total_videos, total_views, total_likes, total_comments, average_engagement_rate, posts_last_7_days, last_tracked, amount_of_videos_tracked, first_video_posted, last_video_posted
            const record = {
              campaign_id: campaignId,
              account_username: values[0] || '',
              account_link: values[1] || null,
              platform: values[2] || 'unknown',
              total_videos: parseInt(values[3]) || 0,
              total_views: parseInt(values[4]) || 0,
              total_likes: parseInt(values[5]) || 0,
              total_comments: parseInt(values[6]) || 0,
              average_engagement_rate: parseFloat(values[7]) || 0,
              outperforming_video_rate: 0,
              average_video_views: parseInt(values[4]) / Math.max(parseInt(values[3]), 1) || 0,
              posts_last_7_days: postsLast7Days,
              last_tracked: parseDate(values[9]),
              amount_of_videos_tracked: values[10] || null,
              start_date: format(startDate, 'yyyy-MM-dd'),
              end_date: format(endDate, 'yyyy-MM-dd')
            };

            records.push(record);
          } catch (error) {
            console.error("Error parsing line:", line, error);
          }
        }

        if (records.length > 0) {
          const { data, error } = await supabase
            .from("campaign_account_analytics")
            .upsert(records, { 
              onConflict: 'campaign_id,account_username,platform,start_date,end_date',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error("Error inserting batch:", error);
            toast.error(`Error in batch: ${error.message}`);
          } else {
            successCount += records.length;
          }
        }

        processedLines += batch.length;
        setProgress((processedLines / totalLines) * 100);
      }

      if (successCount > 0) {
        toast.success(`Successfully imported ${successCount} records for ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`);
        setOpen(false);
        setFile(null);
        setProgress(0);
        setStartDate(undefined);
        setEndDate(undefined);
        onImportComplete();
        // Trigger account matching
        onMatchingRequired();
      } else {
        toast.error("No records were imported. Please check your CSV format.");
      }
    } catch (error) {
      console.error("Error importing stats:", error);
      toast.error("Failed to import stats");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-[#202020] border-white/10 text-white hover:bg-[#121212]">
          <Upload className="h-4 w-4 mr-2" />
          Import Analytics CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#202020] border-white/10 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Campaign Analytics</DialogTitle>
          <DialogDescription className="text-white/60">
            Upload a CSV file with account analytics for a specific time period. Accounts can have multiple records for different date ranges.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-white text-sm font-medium">Data Period</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-xs text-white/60">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-[#191919] border-white/10 text-white hover:bg-white/5",
                        !startDate && "text-white/40"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#2a2a2a] border-white/10" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-xs text-white/60">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-[#191919] border-white/10 text-white hover:bg-white/5",
                        !endDate && "text-white/40"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#2a2a2a] border-white/10" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => startDate ? date < startDate : false}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {startDate && endDate && (
              <p className="text-xs text-primary/80">
                Importing data for {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
              </p>
            )}
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="file" className="text-white">CSV File</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-[#191919] border-white/10 text-white mt-2"
            />
            <p className="text-xs text-white/40 mt-2">
              Expected format: account, account_link, platform, total_videos, total_views, total_likes, total_comments, average_engagement_rate, posts_last_7_days, last_tracked, amount_of_videos_tracked, first_video_posted, last_video_posted
            </p>
          </div>
          
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Importing...</span>
                <span className="text-white">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={importing}
            className="text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || !startDate || !endDate || importing}
            className="bg-primary hover:bg-primary/90"
          >
            {importing ? "Importing..." : "Import Analytics"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
