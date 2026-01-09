import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseCSVFile,
  getUniqueStatuses,
  getPreviewRows,
  type ParsedLead,
  type ParseResult,
} from "@/lib/csv-parser";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CloseStatus {
  id: string;
  label: string;
}

interface ImportResults {
  imported: Array<{ email: string; close_lead_id: string; name: string }>;
  skipped: Array<{ email: string; reason: string; name: string }>;
  errors: Array<{ email: string; error: string; name: string }>;
}

type Step = "upload" | "preview" | "mapping" | "importing" | "results";

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [closeStatuses, setCloseStatuses] = useState<CloseStatus[]>([]);
  const [statusMapping, setStatusMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch Close statuses when dialog opens
  useEffect(() => {
    if (open && closeStatuses.length === 0) {
      fetchCloseStatuses();
    }
  }, [open]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("upload");
        setParseResult(null);
        setStatusMapping({});
        setImportProgress(0);
        setImportResults(null);
      }, 300);
    }
  }, [open]);

  const fetchCloseStatuses = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-leads-to-close`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "get_statuses" }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCloseStatuses(data.statuses || []);
      }
    } catch (error) {
      console.error("Failed to fetch Close statuses:", error);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      await processFile(files[0]);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.[0]) {
      await processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setIsLoading(true);
    const result = await parseCSVFile(file);
    setParseResult(result);
    setIsLoading(false);

    if (result.success && result.rowCount > 0) {
      // Initialize status mapping with empty values
      const statuses = getUniqueStatuses(result.data);
      const initialMapping: Record<string, string> = {};
      statuses.forEach((status) => {
        initialMapping[status] = "";
      });
      setStatusMapping(initialMapping);
      setStep("preview");
    } else {
      toast.error(result.errors[0] || "Failed to parse CSV");
    }
  };

  const handleImport = async () => {
    if (!parseResult?.data.length) return;

    setStep("importing");
    setImportProgress(0);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("Not authenticated");
        return;
      }

      // Filter out empty status mappings
      const filteredMapping: Record<string, string> = {};
      Object.entries(statusMapping).forEach(([key, value]) => {
        if (value) {
          filteredMapping[key] = value;
        }
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-leads-to-close`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "import",
            leads: parseResult.data,
            status_mapping: filteredMapping,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      const results = await response.json();
      setImportResults(results);
      setImportProgress(100);
      setStep("results");

      if (results.imported.length > 0) {
        toast.success(`Successfully imported ${results.imported.length} leads to Close`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Import failed");
      setStep("preview");
    }
  };

  const uniqueStatuses = parseResult ? getUniqueStatuses(parseResult.data) : [];
  const previewRows = parseResult ? getPreviewRows(parseResult.data, 5) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Leads to Close CRM
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import leads directly into your Close CRM account
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
                disabled={isLoading}
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                {isLoading ? (
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="h-10 w-10 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isLoading ? "Parsing CSV..." : "Drop your CSV file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Expected columns:</p>
              <div className="flex flex-wrap gap-2">
                {["name", "email", "phone", "status", "created"].map((col) => (
                  <Badge key={col} variant="secondary" className="text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Only <code className="text-primary">email</code> is required. Other
                columns are optional.
              </p>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && parseResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4">
              <div>
                <p className="font-medium">{parseResult.rowCount} leads ready to import</p>
                {parseResult.errors.length > 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    {parseResult.errors.length} rows skipped due to errors
                  </p>
                )}
              </div>
              <Badge variant="secondary">{parseResult.headers.length} columns</Badge>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["name", "email", "phone", "status"].map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2 text-left font-medium text-muted-foreground"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-4 py-2">{row.name || "-"}</td>
                        <td className="px-4 py-2 text-muted-foreground">{row.email}</td>
                        <td className="px-4 py-2">{row.phone || "-"}</td>
                        <td className="px-4 py-2">
                          {row.status && (
                            <Badge variant="outline" className="text-xs">
                              {row.status}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseResult.rowCount > 5 && (
                <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground text-center">
                  + {parseResult.rowCount - 5} more rows
                </div>
              )}
            </div>

            {/* Status Mapping */}
            {uniqueStatuses.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Map statuses to Close CRM:</p>
                <div className="grid gap-2">
                  {uniqueStatuses.map((status) => (
                    <div
                      key={status}
                      className="flex items-center gap-3 bg-muted/20 rounded-lg p-3"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Select
                        value={statusMapping[status] || ""}
                        onValueChange={(value) =>
                          setStatusMapping((prev) => ({ ...prev, [status]: value }))
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Close status (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Use default status</SelectItem>
                          {closeStatuses.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {parseResult.rowCount} Leads
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Importing leads to Close CRM...</p>
              <p className="text-sm text-muted-foreground mt-1">
                This may take a few minutes for large imports
              </p>
            </div>
            <Progress value={importProgress} className="h-2" />
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && importResults && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-500">
                  {importResults.imported.length}
                </p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
                <SkipForward className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-500">
                  {importResults.skipped.length}
                </p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-center">
                <XCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-rose-500">
                  {importResults.errors.length}
                </p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {/* Skipped List */}
            {importResults.skipped.length > 0 && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Skipped (duplicates)
                </p>
                <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-1">
                  {importResults.skipped.slice(0, 10).map((item, i) => (
                    <p key={i}>
                      {item.email} - {item.reason}
                    </p>
                  ))}
                  {importResults.skipped.length > 10 && (
                    <p className="text-muted-foreground/50">
                      + {importResults.skipped.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Errors List */}
            {importResults.errors.length > 0 && (
              <div className="border border-rose-500/30 rounded-lg p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2 text-rose-500">
                  <XCircle className="h-4 w-4" />
                  Errors
                </p>
                <div className="max-h-32 overflow-y-auto text-xs text-rose-400 space-y-1">
                  {importResults.errors.map((item, i) => (
                    <p key={i}>
                      {item.email}: {item.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Import More
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
