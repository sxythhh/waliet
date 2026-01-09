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
  MessageSquare,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  parseQAFile,
  getQAPreview,
  enrichWithCategories,
  type ParsedQA,
  type QAParseResult,
} from "@/lib/qa-parser";

interface TrainingDataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ImportResult {
  id: string;
  question: string;
  success: boolean;
  error?: string;
}

interface ImportResponse {
  success: boolean;
  imported: number;
  errors: number;
  results: ImportResult[];
}

type Step = "upload" | "preview" | "importing" | "results";

const CATEGORIES = [
  { value: "billing", label: "Billing & Payments" },
  { value: "technical", label: "Technical Support" },
  { value: "account", label: "Account & Profile" },
  { value: "campaign", label: "Campaigns" },
  { value: "payout", label: "Payouts & Earnings" },
  { value: "general", label: "General" },
];

export function TrainingDataImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: TrainingDataImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [parseResult, setParseResult] = useState<QAParseResult | null>(null);
  const [qaData, setQaData] = useState<ParsedQA[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResponse, setImportResponse] = useState<ImportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [defaultCategory, setDefaultCategory] = useState<string>("__auto__");

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("upload");
        setParseResult(null);
        setQaData([]);
        setImportProgress(0);
        setImportResponse(null);
        setDefaultCategory("__auto__");
      }, 300);
    }
  }, [open]);

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
    const validExtensions = [".txt", ".md", ".markdown"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      toast.error("Please upload a .txt or .md file");
      return;
    }

    setIsLoading(true);
    const result = await parseQAFile(file);
    setParseResult(result);

    if (result.success && result.totalParsed > 0) {
      // Enrich with auto-detected categories
      const enriched = enrichWithCategories(result.data);
      setQaData(enriched);
      setStep("preview");
    } else {
      toast.error(result.errors[0] || "No Q&A pairs found in file");
    }

    setIsLoading(false);
  };

  const handleImport = async () => {
    if (qaData.length === 0) return;

    setStep("importing");
    setImportProgress(0);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        toast.error("Not authenticated");
        setStep("preview");
        return;
      }

      // Apply default category to items without a category
      const effectiveDefault = defaultCategory === "__auto__" ? null : defaultCategory;
      const dataToImport = qaData.map((qa) => ({
        question: qa.question,
        answer: qa.answer,
        category: qa.category || effectiveDefault || null,
      }));

      // Simulate progress while waiting
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-chat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "import",
            qa_pairs: dataToImport,
          }),
        }
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      const results: ImportResponse = await response.json();
      setImportResponse(results);
      setImportProgress(100);
      setStep("results");

      if (results.imported > 0) {
        toast.success(`Successfully imported ${results.imported} Q&A pairs`);
        onImportComplete?.();
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Import failed");
      setStep("preview");
    }
  };

  const previewRows = qaData.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Import Training Data
          </DialogTitle>
          <DialogDescription>
            Upload Q&A pairs to train the support chatbot with RAG
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
                accept=".txt,.md,.markdown"
                onChange={handleFileChange}
                className="hidden"
                id="qa-upload"
                disabled={isLoading}
              />
              <label
                htmlFor="qa-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                {isLoading ? (
                  <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="h-10 w-10 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {isLoading ? "Parsing Q&A pairs..." : "Drop your text file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse (.txt, .md)
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-muted/30 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Supported formats:</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  <code className="bg-muted px-1 rounded">Q: ... A: ...</code> - Simple
                  colon format
                </p>
                <p>
                  <code className="bg-muted px-1 rounded">Question: ... Answer: ...</code>{" "}
                  - Full word format
                </p>
                <p>
                  <code className="bg-muted px-1 rounded">**Q:** ... **A:** ...</code> -
                  Markdown format
                </p>
                <p>
                  <code className="bg-muted px-1 rounded">1. Q: ... A: ...</code> -
                  Numbered format
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && parseResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-4">
              <div>
                <p className="font-medium">{qaData.length} Q&A pairs ready to import</p>
                {parseResult.skipped > 0 && (
                  <p className="text-xs text-amber-500 mt-1">
                    {parseResult.skipped} pairs skipped (too short or malformed)
                  </p>
                )}
              </div>
              <Badge variant="secondary">
                <MessageSquare className="h-3 w-3 mr-1" />
                RAG Training
              </Badge>
            </div>

            {/* Default Category */}
            <div className="flex items-center gap-3 bg-muted/20 rounded-lg p-3">
              <span className="text-sm text-muted-foreground">Default category:</span>
              <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto-detect</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-1/2">
                        Question
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-1/2">
                        Answer
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-muted-foreground w-24">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((qa, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="px-4 py-3 align-top">
                          <p className="line-clamp-2 text-sm">{qa.question}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {qa.answer}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {qa.category ? (
                            <Badge variant="outline" className="text-xs capitalize">
                              {qa.category}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {qaData.length > 5 && (
                <div className="px-4 py-2 bg-muted/30 text-xs text-muted-foreground text-center">
                  + {qaData.length - 5} more Q&A pairs
                </div>
              )}
            </div>

            {/* Parsing Errors */}
            {parseResult.errors.length > 0 && (
              <div className="border border-amber-500/30 rounded-lg p-3">
                <p className="text-sm font-medium mb-2 flex items-center gap-2 text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  Parsing warnings ({parseResult.errors.length})
                </p>
                <div className="max-h-24 overflow-y-auto text-xs text-amber-400 space-y-1">
                  {parseResult.errors.slice(0, 5).map((error, i) => (
                    <p key={i}>{error}</p>
                  ))}
                  {parseResult.errors.length > 5 && (
                    <p className="text-amber-400/50">
                      + {parseResult.errors.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleImport}>
                <Brain className="h-4 w-4 mr-2" />
                Import & Generate Embeddings
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="py-8 space-y-6">
            <div className="text-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Generating embeddings...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Processing {qaData.length} Q&A pairs with OpenAI
              </p>
            </div>
            <Progress value={importProgress} className="h-2" />
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && importResponse && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-500">
                  {importResponse.imported}
                </p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-center">
                <XCircle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-rose-500">
                  {importResponse.errors}
                </p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {/* Errors List */}
            {importResponse.errors > 0 && (
              <div className="border border-rose-500/30 rounded-lg p-4">
                <p className="text-sm font-medium mb-2 flex items-center gap-2 text-rose-500">
                  <XCircle className="h-4 w-4" />
                  Import Errors
                </p>
                <div className="max-h-32 overflow-y-auto text-xs text-rose-400 space-y-1">
                  {importResponse.results
                    .filter((r) => !r.success)
                    .slice(0, 10)
                    .map((item, i) => (
                      <p key={i}>
                        "{item.question}...": {item.error}
                      </p>
                    ))}
                </div>
              </div>
            )}

            {/* Success Message */}
            {importResponse.imported > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-sm text-emerald-600">
                  Successfully imported {importResponse.imported} Q&A pairs. The support
                  chatbot will now use these as reference examples for similar questions.
                </p>
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
