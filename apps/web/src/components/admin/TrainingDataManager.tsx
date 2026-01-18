import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrainingDataImportDialog } from "@/components/admin/TrainingDataImportDialog";
import { AdminConfirmDialog } from "@/components/admin/design-system/AdminDialog";
import { Button } from "@/components/ui/button";
import { Input as AdminInput } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Brain,
  Upload,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrainingConversation {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  source: string;
  quality_score: number | null;
  retrieval_count: number;
  last_retrieved_at: string | null;
  is_active: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "billing", label: "Billing & Payments" },
  { value: "technical", label: "Technical Support" },
  { value: "account", label: "Account & Profile" },
  { value: "campaign", label: "Campaigns" },
  { value: "payout", label: "Payouts & Earnings" },
  { value: "general", label: "General" },
];

export function TrainingDataManager() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Confirm dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false);
  const [clearAllStep, setClearAllStep] = useState<1 | 2>(1);
  const [clearAllConfirmText, setClearAllConfirmText] = useState("");

  const queryClient = useQueryClient();

  // Fetch training conversations
  const { data: conversations, isLoading, refetch } = useQuery({
    queryKey: ["training-conversations", categoryFilter, showInactive],
    queryFn: async () => {
      let query = supabase
        .from("training_conversations")
        .select("*")
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (!showInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as TrainingConversation[];
    },
  });

  // Stats query
  const { data: stats } = useQuery({
    queryKey: ["training-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("training_conversations")
        .select("is_active, retrieval_count");

      if (error) throw error;

      const active = data?.filter((c) => c.is_active).length || 0;
      const inactive = data?.filter((c) => !c.is_active).length || 0;
      const totalRetrievals = data?.reduce((sum, c) => sum + (c.retrieval_count || 0), 0) || 0;

      return { active, inactive, totalRetrievals, total: data?.length || 0 };
    },
  });

  // Toggle active status
  const toggleActive = async (id: string, currentState: boolean) => {
    const { error } = await supabase
      .from("training_conversations")
      .update({ is_active: !currentState })
      .eq("id", id);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success(currentState ? "Conversation deactivated" : "Conversation activated");
    refetch();
    queryClient.invalidateQueries({ queryKey: ["training-stats"] });
  };

  // Request delete confirmation
  const requestDeleteConversation = (id: string) => {
    setItemToDelete(id);
    setDeleteConfirmOpen(true);
  };

  // Execute delete after confirmation
  const executeDeleteConversation = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase
      .from("training_conversations")
      .delete()
      .eq("id", itemToDelete);

    if (error) {
      toast.error("Failed to delete conversation");
      return;
    }

    toast.success("Conversation deleted");
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["training-stats"] });
  };

  // Request clear all confirmation (step 1)
  const requestClearAllData = () => {
    setClearAllStep(1);
    setClearAllConfirmText("");
    setClearAllConfirmOpen(true);
  };

  // Handle clear all step progression
  const handleClearAllStep = () => {
    if (clearAllStep === 1) {
      setClearAllStep(2);
    } else {
      // Step 2: check confirmation text
      if (clearAllConfirmText !== "DELETE") {
        toast.error("Deletion cancelled - confirmation text did not match");
        return;
      }
      executeClearAllData();
    }
  };

  // Execute clear all after confirmation
  const executeClearAllData = async () => {
    setIsClearing(true);
    try {
      const { error } = await supabase
        .from("training_conversations")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all rows

      if (error) {
        toast.error("Failed to clear training data: " + error.message);
        return;
      }

      toast.success("All training data has been cleared");
      setClearAllConfirmOpen(false);
      setClearAllStep(1);
      setClearAllConfirmText("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["training-stats"] });
    } catch (error) {
      toast.error("Failed to clear training data");
    } finally {
      setIsClearing(false);
    }
  };

  // Filter by search
  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.question.toLowerCase().includes(query) ||
      conv.answer.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Training Data
          </h2>
          <p className="text-muted-foreground text-sm">
            Manage Q&A pairs for RAG-enhanced support chat
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats?.total && stats.total > 0 ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={requestClearAllData}
              disabled={isClearing}
            >
              {isClearing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Clear All Data
            </Button>
          ) : null}
          <Button onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Training Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">Total Q&A Pairs</span>
            </div>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">Active</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats?.active || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <EyeOff className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Inactive</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats?.inactive || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Total Retrievals</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {stats?.totalRetrievals?.toLocaleString() || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions or answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          <EyeOff className="h-4 w-4 mr-2" />
          {showInactive ? "Showing All" : "Show Inactive"}
        </Button>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredConversations?.length ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Brain className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No training conversations found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import your first batch
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Question</TableHead>
                  <TableHead className="w-1/3">Answer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-center">Retrievals</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConversations.map((conv) => (
                  <TableRow key={conv.id}>
                    <TableCell className="align-top">
                      <p className="line-clamp-2 text-sm">{conv.question}</p>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {conv.answer}
                      </p>
                    </TableCell>
                    <TableCell>
                      {conv.category ? (
                        <Badge variant="outline" className="capitalize text-xs">
                          {conv.category}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          conv.retrieval_count > 0 ? "text-blue-600" : "text-muted-foreground"
                        )}
                      >
                        {conv.retrieval_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={conv.is_active ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          conv.is_active
                            ? "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30"
                            : ""
                        )}
                      >
                        {conv.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => toggleActive(conv.id, conv.is_active)}
                          >
                            {conv.is_active ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => requestDeleteConversation(conv.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TrainingDataImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ["training-stats"] });
        }}
      />

      {/* Delete single conversation confirmation */}
      <AdminConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setItemToDelete(null);
        }}
        title="Delete Training Conversation"
        description="Are you sure you want to delete this training conversation? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={executeDeleteConversation}
        variant="destructive"
      />

      {/* Clear all data confirmation (two-step) */}
      <AdminConfirmDialog
        open={clearAllConfirmOpen}
        onOpenChange={(open) => {
          setClearAllConfirmOpen(open);
          if (!open) {
            setClearAllStep(1);
            setClearAllConfirmText("");
          }
        }}
        title={clearAllStep === 1 ? "Delete All Training Data" : "Confirm Permanent Deletion"}
        description={
          clearAllStep === 1
            ? "Are you sure you want to delete ALL training data? This will permanently remove all Q&A pairs and cannot be undone."
            : undefined
        }
        confirmLabel={clearAllStep === 1 ? "Continue" : "Delete All Data"}
        onConfirm={handleClearAllStep}
        variant="destructive"
        loading={isClearing}
      >
        {clearAllStep === 2 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm permanent deletion of all {stats?.total || 0} Q&A pairs.
            </p>
            <AdminInput
              value={clearAllConfirmText}
              onChange={(e) => setClearAllConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="font-mono"
              autoFocus
            />
          </div>
        )}
      </AdminConfirmDialog>
    </div>
  );
}
