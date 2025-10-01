import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ImportCampaignStatsDialogProps {
  campaignId: string;
  onImportComplete: () => void;
}

export function ImportCampaignStatsDialog({ 
  campaignId, 
  onImportComplete 
}: ImportCampaignStatsDialogProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
    } else {
      toast.error("Please select a valid CSV file");
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const rows = text.split("\n").filter(row => row.trim());
      const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
      
      // Expected headers: creator_id, views, earnings
      if (!headers.includes("creator_id") || !headers.includes("views") || !headers.includes("earnings")) {
        toast.error("CSV must contain creator_id, views, and earnings columns");
        return;
      }

      const creatorIdIndex = headers.indexOf("creator_id");
      const viewsIndex = headers.indexOf("views");
      const earningsIndex = headers.indexOf("earnings");

      const updates: Array<{ creator_id: string; views: number; earnings: number }> = [];

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(",").map(c => c.trim());
        if (cols.length < 3) continue;

        const creatorId = cols[creatorIdIndex];
        const views = parseInt(cols[viewsIndex]) || 0;
        const earnings = parseFloat(cols[earningsIndex]) || 0;

        updates.push({ creator_id: creatorId, views, earnings });
      }

      // Update submissions
      for (const update of updates) {
        const { error } = await supabase
          .from("campaign_submissions")
          .update({ 
            views: update.views, 
            earnings: update.earnings,
            status: "approved"
          })
          .eq("campaign_id", campaignId)
          .eq("creator_id", update.creator_id);

        if (error) {
          console.error("Error updating submission:", error);
        }
      }

      toast.success(`Successfully imported stats for ${updates.length} creators`);
      setOpen(false);
      setFile(null);
      onImportComplete();
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
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Stats
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#202020] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Import Campaign Statistics</DialogTitle>
          <DialogDescription className="text-white/60">
            Upload a CSV file with creator statistics (creator_id, views, earnings)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-white/60">CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-white/60
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-white/10 file:text-white
                hover:file:bg-white/20"
            />
          </div>

          {file && (
            <div className="text-sm text-white/60">
              Selected: {file.name}
            </div>
          )}

          <div className="bg-white/5 p-3 rounded-md text-xs text-white/60">
            <p className="font-medium mb-1">CSV Format Example:</p>
            <code className="block">
              creator_id,views,earnings<br />
              uuid-1234,10000,25.50<br />
              uuid-5678,5000,12.25
            </code>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="text-white/60 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="bg-primary hover:bg-primary/90"
          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
