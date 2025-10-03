import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ImportCampaignStatsDialogProps {
  campaignId: string;
  onImportComplete: () => void;
}

export function ImportCampaignStatsDialog({
  campaignId,
  onImportComplete,
}: ImportCampaignStatsDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(val => val.replace(/^"|"$/g, ''));
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

    setImporting(true);
    setProgress(0);
    
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or invalid");
        return;
      }

      // Skip header row and BOM if present
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
            console.warn("Skipping invalid line:", line);
            continue;
          }

          try {
            const record = {
              campaign_id: campaignId,
              account_username: values[0] || '',
              account_link: values[1] || null,
              platform: values[2] || 'unknown',
              outperforming_video_rate: parseFloat(values[3]) || 0,
              total_videos: parseInt(values[4]) || 0,
              total_views: parseInt(values[5]) || 0,
              total_likes: parseInt(values[6]) || 0,
              total_comments: parseInt(values[7]) || 0,
              average_engagement_rate: parseFloat(values[8]) || 0,
              average_video_views: parseFloat(values[9]) || 0,
              posts_last_7_days: values[10] ? JSON.parse(values[10]) : null,
              last_tracked: parseDate(values[11]),
              amount_of_videos_tracked: values[12] || null,
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
              onConflict: 'campaign_id,account_username',
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
        toast.success(`Successfully imported ${successCount} records`);
        setOpen(false);
        setFile(null);
        setProgress(0);
        onImportComplete();
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
            Upload a CSV file with detailed account analytics data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
              Expected format: account, account_link, platform, outperforming_video_rate, total_videos, total_views, total_likes, total_comments, average_engagement_rate, average_video_views, posts_last_7_days, last_tracked, amount_of_videos_tracked
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
            disabled={!file || importing}
            className="bg-primary hover:bg-primary/90"
          >
            {importing ? "Importing..." : "Import Analytics"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
