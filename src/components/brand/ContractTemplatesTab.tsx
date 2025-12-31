import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  FileText, Plus, MoreHorizontal, Pencil, Trash2, Copy, Star, Eye,
  Check, X, Variable, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ContractTemplatesTabProps {
  brandId: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  content: string;
  default_monthly_rate: number | null;
  default_videos_per_month: number | null;
  default_duration_months: number;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

interface TemplateVariable {
  id: string;
  variable_key: string;
  variable_label: string;
  variable_type: string;
  default_value: string | null;
  is_required: boolean;
}

const BUILT_IN_VARIABLES = [
  { key: "brand_name", label: "Brand Name", description: "Your brand's name" },
  { key: "creator_name", label: "Creator Name", description: "The creator's full name" },
  { key: "monthly_rate", label: "Monthly Rate", description: "Payment amount per month" },
  { key: "videos_per_month", label: "Videos per Month", description: "Number of videos required" },
  { key: "start_date", label: "Start Date", description: "Contract start date" },
  { key: "duration_months", label: "Duration (Months)", description: "Contract length in months" },
  { key: "additional_terms", label: "Additional Terms", description: "Custom terms for this contract" },
  { key: "signature_date", label: "Signature Date", description: "Date of signing" },
];

const DEFAULT_TEMPLATE_CONTENT = `CREATOR CONTENT AGREEMENT

This Creator Content Agreement ("Agreement") is entered into between {{brand_name}} ("Brand") and {{creator_name}} ("Creator").

TERMS AND CONDITIONS

1. CONTENT DELIVERABLES
Creator agrees to produce and deliver {{videos_per_month}} videos per month for the duration of this agreement.

2. COMPENSATION
Brand agrees to pay Creator \${{monthly_rate}} per month for the content deliverables specified above.

3. TERM
This Agreement shall commence on {{start_date}} and continue for {{duration_months}} months, unless terminated earlier in accordance with the terms herein.

4. CONTENT RIGHTS
Creator grants Brand a non-exclusive, worldwide license to use, reproduce, and distribute the content created under this Agreement for marketing and promotional purposes.

5. CONTENT GUIDELINES
Creator agrees to follow all brand guidelines provided and ensure all content is original and does not infringe upon any third-party rights.

6. TERMINATION
Either party may terminate this Agreement with 30 days written notice.

{{additional_terms}}

By signing below, both parties agree to the terms and conditions outlined in this Agreement.`;

export function ContractTemplatesTab({ brandId }: ContractTemplatesTabProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content: DEFAULT_TEMPLATE_CONTENT,
    default_monthly_rate: "",
    default_videos_per_month: "4",
    default_duration_months: "12",
    is_default: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, [brandId]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("contract_templates" as any)
        .select("*")
        .eq("brand_id", brandId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      setTemplates((data || []) as Template[]);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("Please enter template content");
      return;
    }

    try {
      const templateData = {
        brand_id: brandId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        content: formData.content,
        default_monthly_rate: formData.default_monthly_rate ? parseFloat(formData.default_monthly_rate) : null,
        default_videos_per_month: formData.default_videos_per_month ? parseInt(formData.default_videos_per_month) : null,
        default_duration_months: parseInt(formData.default_duration_months) || 12,
        is_default: formData.is_default,
        is_active: true,
      };

      if (editingTemplate) {
        const { error } = await (supabase
          .from("contract_templates" as any)
          .update(templateData)
          .eq("id", editingTemplate.id) as any);

        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { error } = await (supabase
          .from("contract_templates" as any)
          .insert(templateData) as any);

        if (error) throw error;
        toast.success("Template created");
      }

      resetForm();
      setCreateDialogOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
    }
  };

  const handleEdit = (template: Template) => {
    setFormData({
      name: template.name,
      description: template.description || "",
      content: template.content,
      default_monthly_rate: template.default_monthly_rate?.toString() || "",
      default_videos_per_month: template.default_videos_per_month?.toString() || "4",
      default_duration_months: template.default_duration_months.toString(),
      is_default: template.is_default,
    });
    setEditingTemplate(template);
    setCreateDialogOpen(true);
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const { error } = await (supabase
        .from("contract_templates" as any)
        .insert({
          brand_id: brandId,
          name: `${template.name} (Copy)`,
          description: template.description,
          content: template.content,
          default_monthly_rate: template.default_monthly_rate,
          default_videos_per_month: template.default_videos_per_month,
          default_duration_months: template.default_duration_months,
          is_default: false,
          is_active: true,
        }) as any);

      if (error) throw error;
      toast.success("Template duplicated");
      fetchTemplates();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await (supabase
        .from("contract_templates" as any)
        .delete()
        .eq("id", template.id) as any);

      if (error) throw error;
      toast.success("Template deleted");
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };

  const handleSetDefault = async (template: Template) => {
    try {
      const { error } = await (supabase
        .from("contract_templates" as any)
        .update({ is_default: true })
        .eq("id", template.id) as any);

      if (error) throw error;
      toast.success("Default template updated");
      fetchTemplates();
    } catch (error) {
      console.error("Error setting default:", error);
      toast.error("Failed to set default template");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      content: DEFAULT_TEMPLATE_CONTENT,
      default_monthly_rate: "",
      default_videos_per_month: "4",
      default_duration_months: "12",
      is_default: false,
    });
    setActiveTab("edit");
  };

  const insertVariable = (key: string) => {
    const textarea = document.getElementById("template-content") as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const before = formData.content.substring(0, start);
      const after = formData.content.substring(end);
      const newContent = before + `{{${key}}}` + after;
      setFormData({ ...formData, content: newContent });

      // Reset cursor position after React re-render
      setTimeout(() => {
        textarea.focus();
        const newPos = start + key.length + 4;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    }
  };

  const getPreviewContent = (content: string) => {
    const replacements: Record<string, string> = {
      brand_name: "Acme Brand",
      creator_name: "John Creator",
      monthly_rate: formData.default_monthly_rate || "1000",
      videos_per_month: formData.default_videos_per_month || "4",
      start_date: format(new Date(), "MMMM d, yyyy"),
      duration_months: formData.default_duration_months || "12",
      additional_terms: "No additional terms specified.",
      signature_date: format(new Date(), "MMMM d, yyyy"),
    };

    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return replacements[key] || `[${key}]`;
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.5px]">Agreement Templates</h2>
            <p className="text-sm text-muted-foreground">
              Create reusable contract templates for creator agreements
            </p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-lg font-medium mb-2">No templates yet</p>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first contract template to streamline creator agreements
          </p>
          <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={cn(
                "group hover:shadow-md transition-all cursor-pointer",
                template.is_default && "ring-2 ring-primary/20"
              )}
              onClick={() => setPreviewTemplate(template)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm truncate">{template.name}</h3>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          <Star className="h-2.5 w-2.5 mr-1 fill-amber-500 text-amber-500" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      {!template.is_default && (
                        <DropdownMenuItem onClick={() => handleSetDefault(template)}>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(template)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {template.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {template.default_monthly_rate && (
                    <span className="bg-muted px-2 py-0.5 rounded">
                      ${template.default_monthly_rate}/mo
                    </span>
                  )}
                  {template.default_videos_per_month && (
                    <span className="bg-muted px-2 py-0.5 rounded">
                      {template.default_videos_per_month} videos/mo
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs text-muted-foreground">
                  <span>Used {template.usage_count} times</span>
                  <span>{format(new Date(template.created_at), "MMM d, yyyy")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingTemplate(null);
            resetForm();
          } else {
            setCreateDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>
              Create a reusable contract template with variables
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex">
            {/* Sidebar */}
            <div className="w-64 border-r shrink-0 flex flex-col">
              <div className="p-4 border-b">
                <Label className="text-xs text-muted-foreground">Template Name</Label>
                <Input
                  placeholder="e.g., Standard Agreement"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1.5 h-9"
                />
              </div>

              <div className="p-4 border-b">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1.5 min-h-[60px] resize-none"
                />
              </div>

              <div className="p-4 border-b space-y-3">
                <Label className="text-xs text-muted-foreground">Default Values</Label>
                <div>
                  <Label className="text-xs">Monthly Rate ($)</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={formData.default_monthly_rate}
                    onChange={(e) => setFormData({ ...formData, default_monthly_rate: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Videos/Month</Label>
                  <Input
                    type="number"
                    placeholder="4"
                    value={formData.default_videos_per_month}
                    onChange={(e) => setFormData({ ...formData, default_videos_per_month: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duration (Months)</Label>
                  <Input
                    type="number"
                    placeholder="12"
                    value={formData.default_duration_months}
                    onChange={(e) => setFormData({ ...formData, default_duration_months: e.target.value })}
                    className="mt-1 h-8"
                  />
                </div>
              </div>

              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Set as Default</Label>
                  <Switch
                    checked={formData.is_default}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <Label className="text-xs text-muted-foreground mb-2 block">
                  <Variable className="h-3 w-3 inline mr-1" />
                  Insert Variable
                </Label>
                <div className="space-y-1">
                  {BUILT_IN_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors"
                    >
                      <span className="font-mono text-primary">{`{{${v.key}}}`}</span>
                      <span className="block text-muted-foreground">{v.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4 shrink-0 w-fit">
                  <TabsTrigger value="edit" className="text-xs">
                    <Pencil className="h-3 w-3 mr-1.5" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs">
                    <Eye className="h-3 w-3 mr-1.5" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="flex-1 mt-0 p-4 overflow-hidden">
                  <Textarea
                    id="template-content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter your contract template content..."
                    className="h-full font-mono text-sm resize-none"
                  />
                </TabsContent>

                <TabsContent value="preview" className="flex-1 mt-0 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    <div className="bg-white border rounded-lg p-8 shadow-sm max-w-2xl mx-auto">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {getPreviewContent(formData.content)}
                      </pre>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setEditingTemplate(null); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Check className="h-4 w-4 mr-2" />
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  {previewTemplate?.name}
                  {previewTemplate?.is_default && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-1 fill-amber-500 text-amber-500" />
                      Default
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {previewTemplate?.description || "No description"}
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => previewTemplate && handleEdit(previewTemplate)}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="bg-muted/30 border rounded-lg p-6 max-w-xl mx-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {previewTemplate && getPreviewContent(previewTemplate.content)}
              </pre>
            </div>
          </ScrollArea>

          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between text-xs text-muted-foreground">
            <span>Used {previewTemplate?.usage_count} times</span>
            <span>Created {previewTemplate && format(new Date(previewTemplate.created_at), "MMMM d, yyyy")}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
