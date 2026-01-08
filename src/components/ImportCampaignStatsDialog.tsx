import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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
      if (!dateStr || !dateStr.trim()) return null;
      const cleanDate = dateStr.trim();
      const [day, month, year] = cleanDate.split('/').map(s => s.trim());
      if (!day || !month || !year) return null;
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
      
      type AnalyticsRecord = {
        campaign_id: string;
        account_username: string;
        account_link: string | null;
        platform: string;
        total_videos: number;
        total_views: number;
        total_likes: number;
        total_comments: number;
        average_engagement_rate: number;
        outperforming_video_rate: number;
        average_video_views: number;
        posts_last_7_days: any;
        last_tracked: string | null;
        amount_of_videos_tracked: string | null;
        start_date: string;
        end_date: string;
      };
      
      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);
        const records: AnalyticsRecord[] = [];

        for (const line of batch) {
          const values = parseCSVLine(line);
          
          if (values.length < 10) {
            console.warn("Skipping invalid line (expected at least 10 columns, got " + values.length + "):", line);
            continue;
          }

          try {
            // Detect CSV format based on column count
            // New format (12 cols): account, account_link, platform, amount_of_videos_tracked, outperforming_video_rate, average_engagement_rate, total_views, total_likes, total_comments, average_video_views, posts_last_7_days, last_tracked
            // Old format (10 cols): account, account_link, platform, amount_of_videos_tracked, average_engagement_rate, total_views, total_likes, total_comments, posts_last_7_days, last_tracked
            const isNewFormat = values.length >= 12;

            // Column indices based on format
            const cols = isNewFormat ? {
              account: 0,
              account_link: 1,
              platform: 2,
              amount_of_videos_tracked: 3,
              outperforming_video_rate: 4,
              average_engagement_rate: 5,
              total_views: 6,
              total_likes: 7,
              total_comments: 8,
              average_video_views: 9,
              posts_last_7_days: 10,
              last_tracked: 11,
            } : {
              account: 0,
              account_link: 1,
              platform: 2,
              amount_of_videos_tracked: 3,
              outperforming_video_rate: -1, // Not present in old format
              average_engagement_rate: 4,
              total_views: 5,
              total_likes: 6,
              total_comments: 7,
              average_video_views: -1, // Not present in old format
              posts_last_7_days: 8,
              last_tracked: 9,
            };

            // Parse posts_last_7_days JSON, handling escaped quotes
            let postsLast7Days = null;
            const postsValue = values[cols.posts_last_7_days];
            if (postsValue && postsValue.trim()) {
              try {
                postsLast7Days = JSON.parse(postsValue);
              } catch (jsonError) {
                console.error("Error parsing JSON for posts_last_7_days:", postsValue, jsonError);
              }
            }

            const amountOfVideosTracked = values[cols.amount_of_videos_tracked] || '0';
            const totalViews = parseInt(values[cols.total_views], 10) || 0;
            const totalLikes = parseInt(values[cols.total_likes], 10) || 0;
            const totalComments = parseInt(values[cols.total_comments], 10) || 0;
            const totalVideos = parseInt(amountOfVideosTracked, 10) || 0;
            const outperformingRate = cols.outperforming_video_rate >= 0 ? (parseFloat(values[cols.outperforming_video_rate]) || 0) : 0;
            const avgVideoViews = cols.average_video_views >= 0
              ? (parseFloat(values[cols.average_video_views]) || 0)
              : (totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0);

            const record = {
              campaign_id: campaignId,
              account_username: values[cols.account] || '',
              account_link: values[cols.account_link] || null,
              platform: values[cols.platform] || 'unknown',
              total_videos: totalVideos,
              total_views: totalViews,
              total_likes: totalLikes,
              total_comments: totalComments,
              average_engagement_rate: parseFloat(values[cols.average_engagement_rate]) || 0,
              outperforming_video_rate: outperformingRate,
              average_video_views: avgVideoViews,
              posts_last_7_days: postsLast7Days,
              last_tracked: parseDate(values[cols.last_tracked]),
              amount_of_videos_tracked: amountOfVideosTracked,
              start_date: format(startDate, 'yyyy-MM-dd'),
              end_date: format(endDate, 'yyyy-MM-dd')
            };

            records.push(record);
          } catch (error) {
            console.error("Error parsing line:", line, error);
          }
        }

        if (records.length > 0) {
          // Deduplicate records within this batch based on unique key (campaign_id, account_username, platform)
          // Keep the last occurrence of each duplicate
          const deduplicatedRecords = records.reduce((acc, record) => {
            const key = `${record.campaign_id}|${record.account_username}|${record.platform}`;
            acc.set(key, record); // This will overwrite any previous record with same key
            return acc;
          }, new Map<string, AnalyticsRecord>());
          
          const uniqueRecords = Array.from(deduplicatedRecords.values());
          
          // Upsert records - update if same account/platform exists for this campaign
          const { data, error } = await supabase
            .from("campaign_account_analytics")
            .upsert(uniqueRecords, { 
              onConflict: 'campaign_id,account_username,platform',
              ignoreDuplicates: false
            });

          if (error) {
            console.error("Error inserting batch:", error);
            toast.error(`Error in batch: ${error.message}`);
          } else {
            successCount += uniqueRecords.length;
          }
        }

        processedLines += batch.length;
        setProgress((processedLines / totalLines) * 100);
      }

      if (successCount > 0) {
        // Auto-match accounts to users after import
        try {
          const { data: matchStats, error: matchError } = await supabase
            .rpc('match_analytics_to_users', { p_campaign_id: campaignId });
          
          if (!matchError && matchStats?.[0]) {
            const matched = matchStats[0].matched_count || 0;
            const total = matchStats[0].total_count || 0;
            toast.success(`Imported ${successCount} records, linked ${matched} of ${total} accounts`);
          } else {
            toast.success(`Successfully imported ${successCount} records for ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`);
          }
        } catch (matchErr) {
          console.error('Error matching accounts:', matchErr);
          toast.success(`Successfully imported ${successCount} records for ${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`);
        }
        
        setOpen(false);
        setFile(null);
        setProgress(0);
        setStartDate(undefined);
        setEndDate(undefined);
        onImportComplete();
        onMatchingRequired();
      } else {
        toast.error("No records were imported. Please check your CSV format.");
      }
    } catch (error) {
      console.error("Error importing stats:", error);
      toast.error("Failed to import stats");
    } finally {
    }
  };

  const handleDeleteAllAnalytics = async () => {
    setDeleting(true);
    setDeleteConfirmOpen(false);
    try {
      const { error } = await supabase
        .from('campaign_account_analytics')
        .delete()
        .eq('campaign_id', campaignId);

      if (error) throw error;

      toast.success("All analytics data deleted successfully");
      onImportComplete();
      setOpen(false);
    } catch (error: any) {
      console.error("Error deleting analytics:", error);
      toast.error(error.message || "Failed to delete analytics");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="bg-muted/50 hover:bg-muted gap-2 font-sans tracking-[-0.5px]">
          <Upload className="h-3.5 w-3.5" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#202020] border-white/10 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Campaign Analytics</DialogTitle>
          <DialogDescription className="text-white/60">
            Upload a CSV file with analytics data
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-white text-sm font-medium">Data Period <span className="text-red-500">*</span></Label>
            <p className="text-xs text-white/60">Select the time period this data represents</p>
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
            <Label htmlFor="file" className="text-white">CSV File <span className="text-red-500">*</span></Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-[#191919] border-white/10 text-white mt-2"
            />
            {file && (
              <p className="text-xs text-green-500 mt-2">
                ✓ {file.name} selected
              </p>
            )}
            <p className="text-xs text-white/40 mt-2">
              Supports both formats: 12-column (with outperforming_video_rate, average_video_views) and 10-column (legacy)
            </p>
          </div>
          
          {/* Validation warning */}
          {(!startDate || !endDate || !file) && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <p className="text-xs text-yellow-500/90">
                <strong>Required:</strong> Please select both start/end dates and upload a CSV file to continue.
              </p>
            </div>
          )}
          
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
        
        <DialogFooter className="mt-4 flex justify-between">
          <Button
            variant="destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={deleting || importing}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All Analytics
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={importing || deleting}
              className="text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || !startDate || !endDate || importing || deleting}
              className="bg-primary hover:bg-primary/90"
            >
              {importing ? "Importing..." : "Import Analytics"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-[#202020] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Analytics?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This will permanently delete all imported analytics data for this campaign. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllAnalytics}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
