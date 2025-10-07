import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CalendarIcon, RefreshCw, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ total: number; synced: number } | null>(null);
  const [shortimizeCollectionName, setShortimizeCollectionName] = useState("");
  const [deleting, setDeleting] = useState(false);

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
          
          if (values.length < 11) {
            console.warn("Skipping invalid line (expected at least 11 columns, got " + values.length + "):", line);
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

            // CSV columns: account, account_link, platform, total_videos, total_views, total_likes, total_comments, average_engagement_rate, posts_last_7_days, last_tracked, amount_of_videos_tracked
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

  const handleShortimizeSync = async () => {
    if (!shortimizeCollectionName.trim()) {
      toast.error("Please enter a Shortimize collection name");
      return;
    }

    setSyncing(true);
    setSyncProgress(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('sync-shortimize-analytics', {
        body: {
          campaignId,
          collectionNames: [shortimizeCollectionName.trim()],
        },
      });

      if (error) throw error;

      if (data.success) {
        setSyncProgress({ total: data.total, synced: data.synced });
        toast.success(`Synced ${data.synced} of ${data.total} accounts from Shortimize`);
        
        if (data.errors > 0) {
          toast.warning(`${data.errors} accounts had errors`);
        }
        
        onImportComplete();
        onMatchingRequired();
        
        // Close the dialog after successful sync
        setTimeout(() => {
          setOpen(false);
          setShortimizeCollectionName("");
          setSyncProgress(null);
        }, 1500);
      } else {
        toast.error(data.error || "Failed to sync from Shortimize");
      }
    } catch (error: any) {
      console.error("Error syncing from Shortimize:", error);
      toast.error(error.message || "Failed to sync from Shortimize");
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAllAnalytics = async () => {
    setDeleting(true);
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
        <Button variant="ghost" className="bg-[#202020] text-white hover:bg-[#121212]">
          <Upload className="h-4 w-4 mr-2" />
          Import Analytics CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#202020] border-white/10 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle>Import Campaign Analytics</DialogTitle>
          <DialogDescription className="text-white/60">
            Import analytics from Shortimize or upload a CSV file
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="shortimize" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#191919]">
            <TabsTrigger value="shortimize" className="data-[state=active]:bg-primary">
              Shortimize Sync
            </TabsTrigger>
            <TabsTrigger value="csv" className="data-[state=active]:bg-primary">
              CSV Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shortimize" className="space-y-4 mt-4">
            <div className="bg-[#191919] border border-white/10 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-white mb-1">Sync from Shortimize</h4>
                  <p className="text-xs text-white/60">
                    Automatically fetch the latest analytics data from your Shortimize tracked accounts
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="collectionName" className="text-white text-sm">Collection Name</Label>
                <Input
                  id="collectionName"
                  type="text"
                  placeholder="e.g., my-campaign-collection"
                  value={shortimizeCollectionName}
                  onChange={(e) => setShortimizeCollectionName(e.target.value)}
                  className="bg-black/30 border-white/10 text-white placeholder:text-white/40"
                />
                <p className="text-xs text-white/50">
                  Enter the exact collection name from your Shortimize dashboard
                </p>
              </div>
              
              {syncProgress && (
                <div className="bg-black/30 rounded p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">Last sync:</span>
                    <span className="text-primary font-medium">
                      {syncProgress.synced} / {syncProgress.total} accounts
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleShortimizeSync}
                disabled={syncing || !shortimizeCollectionName.trim()}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4 mt-4">
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
              Expected format: account, account_link, platform, total_videos, total_views, total_likes, total_comments, average_engagement_rate, posts_last_7_days, last_tracked, amount_of_videos_tracked
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
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="mt-4 flex justify-between">
          <Button
            variant="destructive"
            onClick={handleDeleteAllAnalytics}
            disabled={deleting || importing || syncing}
            className="mr-auto"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Analytics
              </>
            )}
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={importing || syncing || deleting}
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
    </Dialog>
  );
}
