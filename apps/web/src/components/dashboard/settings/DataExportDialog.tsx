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
import { Download, Loader2, FileJson, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function DataExportDialog() {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to export your data");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to export data");
      }

      const data = await response.json();

      // Create and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `virality-data-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExported(true);
      toast.success("Your data has been exported successfully");
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setExported(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 font-inter tracking-[-0.5px]">
          <Download className="h-4 w-4" />
          Export My Data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-inter tracking-[-0.5px]">
            Export Your Data
          </DialogTitle>
          <DialogDescription className="font-inter tracking-[-0.5px]">
            Download a copy of all your personal data stored on Virality.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {exported ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-center text-muted-foreground font-inter tracking-[-0.5px]">
                Your data export has been downloaded. Check your downloads folder.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <FileJson className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium font-inter tracking-[-0.5px]">
                    JSON Format
                  </p>
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] mt-1">
                    Your data will be exported as a JSON file containing your profile,
                    wallet transactions, submissions, and more.
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                <p className="font-medium text-foreground mb-2">Included data:</p>
                <ul className="list-disc list-inside space-y-1 ml-1">
                  <li>Profile information</li>
                  <li>Wallet balance and transaction history</li>
                  <li>Connected social accounts</li>
                  <li>Campaign applications and submissions</li>
                  <li>Payment history</li>
                  <li>Login sessions</li>
                  <li>Notification preferences</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {exported ? "Close" : "Cancel"}
          </Button>
          {!exported && (
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Data
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
