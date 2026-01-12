import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Plus, CheckCircle, Clock, AlertCircle, MoreHorizontal, Download, Send, Eye, Pencil, Trash2, Filter, FileText, Settings2, ChevronDown, Copy, Star, Variable } from "lucide-react";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
interface Contract {
  id: string;
  title: string;
  creator_id: string;
  creator_name: string;
  creator_avatar: string | null;
  boost_id: string | null;
  boost_title: string | null;
  status: 'draft' | 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled';
  monthly_rate: number;
  videos_per_month: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
  signed_at: string | null;
  terms: string;
}
interface Boost {
  id: string;
  title: string;
  monthly_retainer: number;
  videos_per_month: number;
}
interface Template {
  id: string;
  name: string;
  description?: string | null;
  content: string;
  default_monthly_rate: number | null;
  default_videos_per_month: number | null;
  default_duration_months: number;
  is_default: boolean;
  is_active?: boolean;
  usage_count?: number;
  created_at?: string;
}
interface CreatorContractsTabProps {
  brandId: string;
}
const statusConfig = {
  draft: {
    label: 'Draft',
    color: 'bg-muted text-muted-foreground',
    icon: FileText
  },
  sent: {
    label: 'Awaiting Signature',
    color: 'bg-amber-500/10 text-amber-500',
    icon: Clock
  },
  viewed: {
    label: 'Viewed',
    color: 'bg-blue-500/10 text-blue-500',
    icon: Eye
  },
  signed: {
    label: 'Signed',
    color: 'bg-emerald-500/10 text-emerald-500',
    icon: CheckCircle
  },
  expired: {
    label: 'Expired',
    color: 'bg-red-500/10 text-red-500',
    icon: AlertCircle
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-muted text-muted-foreground',
    icon: AlertCircle
  }
};
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
// Helper function to expand template variables
function expandTemplateContent(
  templateContent: string,
  variables: {
    brand_name: string;
    creator_name: string;
    monthly_rate: number;
    videos_per_month: number;
    start_date: string;
    duration_months: number;
    additional_terms?: string;
  }
): string {
  return templateContent
    .replace(/\{\{brand_name\}\}/g, variables.brand_name)
    .replace(/\{\{creator_name\}\}/g, variables.creator_name)
    .replace(/\{\{monthly_rate\}\}/g, variables.monthly_rate.toString())
    .replace(/\{\{videos_per_month\}\}/g, variables.videos_per_month.toString())
    .replace(/\{\{start_date\}\}/g, variables.start_date)
    .replace(/\{\{duration_months\}\}/g, variables.duration_months.toString())
    .replace(/\{\{additional_terms\}\}/g, variables.additional_terms || '');
}

export function CreatorContractsTab({
  brandId
}: CreatorContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandName, setBrandName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Template dialog state
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    description: "",
    content: DEFAULT_TEMPLATE_CONTENT,
    default_monthly_rate: "",
    default_videos_per_month: "4",
    default_duration_months: "12",
    is_default: false
  });

  // Textarea ref for cursor position
  const templateContentRef = useRef<HTMLTextAreaElement>(null);

  const CONTRACT_VARIABLES = [
    { key: 'brand_name', label: 'Brand Name' },
    { key: 'creator_name', label: 'Creator Name' },
    { key: 'monthly_rate', label: 'Monthly Rate' },
    { key: 'videos_per_month', label: 'Videos/Month' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'duration_months', label: 'Duration' },
    { key: 'additional_terms', label: 'Additional Terms' }
  ];

  const insertVariable = (variableKey: string) => {
    const textarea = templateContentRef.current;
    if (!textarea) return;

    const variableText = `{{${variableKey}}}`;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = templateForm.content;
    
    const newContent = currentContent.substring(0, start) + variableText + currentContent.substring(end);
    
    setTemplateForm({
      ...templateForm,
      content: newContent
    });

    // Restore focus and set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + variableText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // New contract form state
  const [newContract, setNewContract] = useState({
    template_id: '',
    boost_id: '',
    creator_email: '',
    monthly_rate: '',
    videos_per_month: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    duration_months: '12',
    custom_terms: ''
  });
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch brand name
      const { data: brandData } = await supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .single();
      if (brandData) {
        setBrandName(brandData.name);
      }

      // Fetch boosts/job posts
      const {
        data: boostsData
      } = await supabase.from('bounty_campaigns').select('id, title, monthly_retainer, videos_per_month').eq('brand_id', brandId).eq('status', 'active');
      setBoosts(boostsData || []);

      // Fetch templates
      const {
        data: templatesData
      } = await supabase.from('contract_templates').select('*').eq('brand_id', brandId).order('is_default', {
        ascending: false
      }).order('created_at', {
        ascending: false
      });
      setTemplates((templatesData || []) as Template[]);

      // Fetch contracts from database
      const {
        data: contractsData,
        error
      } = await supabase.from('creator_contracts').select(`
          id,
          title,
          creator_id,
          creator_email,
          boost_id,
          status,
          monthly_rate,
          videos_per_month,
          start_date,
          end_date,
          duration_months,
          custom_terms,
          signed_at,
          created_at
        `).eq('brand_id', brandId).order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Map to Contract interface with creator info
      const mappedContracts: Contract[] = await Promise.all((contractsData || []).map(async contract => {
        let creatorName = contract.creator_email;
        let creatorAvatar = null;
        if (contract.creator_id) {
          const {
            data: profile
          } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', contract.creator_id).single();
          if (profile) {
            creatorName = profile.full_name || profile.username || contract.creator_email;
            creatorAvatar = profile.avatar_url;
          }
        }

        // Get boost title
        let boostTitle = null;
        if (contract.boost_id) {
          const boost = boostsData?.find(b => b.id === contract.boost_id);
          boostTitle = boost?.title || null;
        }
        return {
          id: contract.id,
          title: contract.title,
          creator_id: contract.creator_id || '',
          creator_name: creatorName,
          creator_avatar: creatorAvatar,
          boost_id: contract.boost_id,
          boost_title: boostTitle,
          status: contract.status as Contract['status'],
          monthly_rate: Number(contract.monthly_rate) || 0,
          videos_per_month: contract.videos_per_month || 1,
          start_date: contract.start_date,
          end_date: contract.end_date,
          created_at: contract.created_at,
          signed_at: contract.signed_at,
          terms: contract.custom_terms || ''
        };
      }));
      setContracts(mappedContracts);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchQuery.toLowerCase()) || contract.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) || contract.boost_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const handleCreateContract = async () => {
    if (!newContract.creator_email) {
      toast.error('Please enter a creator email');
      return;
    }
    const boost = newContract.boost_id ? boosts.find(b => b.id === newContract.boost_id) : null;
    const template = newContract.template_id ? templates.find(t => t.id === newContract.template_id) : null;
    const startDate = new Date(newContract.start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + parseInt(newContract.duration_months, 10));

    // Calculate final values
    const monthlyRate = parseFloat(newContract.monthly_rate) || boost?.monthly_retainer || template?.default_monthly_rate || 0;
    const videosPerMonth = parseInt(newContract.videos_per_month, 10) || boost?.videos_per_month || template?.default_videos_per_month || 1;
    const durationMonths = parseInt(newContract.duration_months, 10);

    // Get template content and expand variables
    const templateContent = template?.content || DEFAULT_TEMPLATE_CONTENT;
    const creatorName = newContract.creator_email.split('@')[0]; // Use email prefix as placeholder
    const expandedContent = expandTemplateContent(templateContent, {
      brand_name: brandName || 'Brand',
      creator_name: creatorName,
      monthly_rate: monthlyRate,
      videos_per_month: videosPerMonth,
      start_date: format(startDate, 'MMMM d, yyyy'),
      duration_months: durationMonths,
      additional_terms: newContract.custom_terms || undefined,
    });

    try {
      const {
        error
      } = await supabase.from('creator_contracts').insert({
        brand_id: brandId,
        template_id: newContract.template_id || null,
        boost_id: newContract.boost_id || null,
        creator_email: newContract.creator_email,
        title: boost ? `${boost.title} - Creator Agreement` : template ? template.name : 'Creator Agreement',
        monthly_rate: monthlyRate,
        videos_per_month: videosPerMonth,
        start_date: newContract.start_date,
        end_date: endDate.toISOString().split('T')[0],
        duration_months: durationMonths,
        custom_terms: expandedContent,
        status: 'sent'
      });
      if (error) throw error;

      // Increment template usage count
      if (newContract.template_id) {
        try {
          await supabase.rpc('increment_template_usage', {
            template_id_param: newContract.template_id
          });
        } catch {
          // Function may not exist yet
        }
      }
      toast.success('Contract created and sent for signature');
      setCreateDialogOpen(false);
      setNewContract({
        template_id: '',
        boost_id: '',
        creator_email: '',
        monthly_rate: '',
        videos_per_month: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        duration_months: '12',
        custom_terms: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('Failed to create contract');
    }
  };
  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setViewDialogOpen(true);
  };
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewContract({
        ...newContract,
        template_id: templateId,
        monthly_rate: template.default_monthly_rate?.toString() || newContract.monthly_rate,
        videos_per_month: template.default_videos_per_month?.toString() || newContract.videos_per_month,
        duration_months: template.default_duration_months.toString()
      });
    } else {
      setNewContract({
        ...newContract,
        template_id: ''
      });
    }
  };

  // Template CRUD operations
  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }
    try {
      const templateData = {
        brand_id: brandId,
        name: templateForm.name.trim(),
        description: templateForm.description.trim() || null,
        content: templateForm.content,
        default_monthly_rate: templateForm.default_monthly_rate ? parseFloat(templateForm.default_monthly_rate) : null,
        default_videos_per_month: templateForm.default_videos_per_month ? parseInt(templateForm.default_videos_per_month, 10) : null,
        default_duration_months: parseInt(templateForm.default_duration_months, 10) || 12,
        is_default: templateForm.is_default,
        is_active: true
      };
      if (editingTemplate) {
        const {
          error
        } = await supabase.from("contract_templates").update(templateData).eq("id", editingTemplate.id);
        if (error) throw error;
        toast.success("Template updated");
      } else {
        const {
          error
        } = await supabase.from("contract_templates").insert(templateData);
        if (error) throw error;
        toast.success("Template created");
      }
      resetTemplateForm();
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      fetchData();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    }
  };
  const handleEditTemplate = (template: Template) => {
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      content: template.content,
      default_monthly_rate: template.default_monthly_rate?.toString() || "",
      default_videos_per_month: template.default_videos_per_month?.toString() || "4",
      default_duration_months: template.default_duration_months.toString(),
      is_default: template.is_default
    });
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };
  const handleDuplicateTemplate = async (template: Template) => {
    try {
      const {
        error
      } = await supabase.from("contract_templates").insert({
        brand_id: brandId,
        name: `${template.name} (Copy)`,
        description: template.description,
        content: template.content,
        default_monthly_rate: template.default_monthly_rate,
        default_videos_per_month: template.default_videos_per_month,
        default_duration_months: template.default_duration_months,
        is_default: false,
        is_active: true
      });
      if (error) throw error;
      toast.success("Template duplicated");
      fetchData();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };
  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      const {
        error
      } = await supabase.from("contract_templates").delete().eq("id", template.id);
      if (error) throw error;
      toast.success("Template deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template");
    }
  };
  const handleSetDefaultTemplate = async (template: Template) => {
    try {
      const {
        error
      } = await supabase.from("contract_templates").update({
        is_default: true
      }).eq("id", template.id);
      if (error) throw error;
      toast.success("Default template updated");
      fetchData();
    } catch (error) {
      console.error("Error setting default:", error);
      toast.error("Failed to set default template");
    }
  };
  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      description: "",
      content: DEFAULT_TEMPLATE_CONTENT,
      default_monthly_rate: "",
      default_videos_per_month: "4",
      default_duration_months: "12",
      is_default: false
    });
  };
  if (loading) {
    return null;
  }
  return <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold font-inter tracking-[-0.5px]">Contracts</h1>
              
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-9 px-4 gap-2 font-inter tracking-[-0.3px] text-sm">
                    Create
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5 bg-white dark:bg-[#0a0a0a] border border-border dark:border-white/[0.06]">
                  <button
                    onClick={() => setCreateDialogOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <DescriptionOutlinedIcon className="h-[18px] w-[18px] text-foreground/60 dark:text-white/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium font-inter tracking-[-0.3px] text-foreground/90 dark:text-white/90">New Contract</p>
                      <p className="text-[11px] text-muted-foreground dark:text-white/40 font-inter tracking-[-0.3px]">
                        Send an agreement to a creator
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      resetTemplateForm();
                      setTemplateDialogOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors text-left"
                  >
                    <ContentCopyOutlinedIcon className="h-[18px] w-[18px] text-foreground/60 dark:text-white/60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium font-inter tracking-[-0.3px] text-foreground/90 dark:text-white/90">New Template</p>
                      <p className="text-[11px] text-muted-foreground dark:text-white/40 font-inter tracking-[-0.3px]">
                        Create a reusable template
                      </p>
                    </div>
                  </button>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Templates Row */}
          {templates.length > 0 && <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground font-inter tracking-[-0.3px]">Templates</h2>
                <span className="text-xs text-muted-foreground">{templates.length} available</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {templates.map(template => <div key={template.id} className={cn("group flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border bg-card hover:bg-muted/30 transition-all cursor-pointer", template.is_default && "border-primary/30 bg-primary/5")}>
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium font-inter tracking-[-0.3px] truncate max-w-[120px]">{template.name}</span>
                        {template.is_default && <Star className="h-3 w-3 fill-amber-500 text-amber-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {template.default_monthly_rate && <span>${template.default_monthly_rate}/mo</span>}
                        {template.default_videos_per_month && <span>· {template.default_videos_per_month} videos</span>}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 shrink-0 ml-2">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        {!template.is_default && <DropdownMenuItem onClick={() => handleSetDefaultTemplate(template)}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTemplate(template)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>)}
              </div>
            </div>}

          {/* Contracts List */}
          <div className="space-y-3">
            {filteredContracts.map(contract => {
            const StatusIcon = statusConfig[contract.status].icon;
            return <div key={contract.id} className="group flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card hover:bg-muted/20 transition-all cursor-pointer" onClick={() => handleViewContract(contract)}>
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={contract.creator_avatar || undefined} />
                      <AvatarFallback className="bg-muted text-muted-foreground font-inter text-sm font-medium">
                        {contract.creator_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium font-inter tracking-[-0.3px] truncate">{contract.title}</span>
                        <Badge variant="secondary" className={`${statusConfig[contract.status].color} text-[10px] font-inter tracking-[-0.3px] px-2 py-0.5 shrink-0`}>
                          {statusConfig[contract.status].label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                        {contract.creator_name}
                      </p>
                    </div>

                    {contract.boost_title && <span className="hidden sm:inline-flex text-xs font-inter tracking-[-0.3px] text-primary bg-primary/10 px-2 py-1 rounded-md shrink-0">
                        {contract.boost_title}
                      </span>}

                    <span className="text-[11px] text-muted-foreground font-inter tracking-[-0.3px] shrink-0 hidden md:block">
                      {formatDistanceToNow(new Date(contract.created_at), {
                  addSuffix: true
                })}
                    </span>
                  </div>;
          })}
          </div>
        </div>
      </ScrollArea>

      {/* Create Contract Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Template Selection */}
            {templates.length > 0 ? (
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Contract Template</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(template => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleTemplateSelect(template.id)}
                      className={cn(
                        "flex flex-col items-start gap-1 p-3 rounded-lg border transition-all text-left",
                        newContract.template_id === template.id 
                          ? "border-foreground bg-foreground/5" 
                          : "border-border/50 hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-inter tracking-[-0.5px] text-sm truncate">{template.name}</span>
                        {template.is_default && <Star className="h-3 w-3 text-amber-500 shrink-0 ml-auto" />}
                      </div>
                      {template.description && (
                        <span className="text-[11px] text-muted-foreground font-inter tracking-[-0.3px] line-clamp-1">
                          {template.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-white/[0.06] rounded-lg bg-white/[0.02]">
                <DescriptionOutlinedIcon className="h-10 w-10 text-white/20 mb-3" />
                <p className="text-sm font-inter tracking-[-0.5px] text-foreground mb-1">No templates yet</p>
                <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] text-center mb-4">
                  Create a contract template first to send contracts to creators
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setTemplateDialogOpen(true);
                  }}
                  className="font-inter tracking-[-0.5px] bg-white/[0.03] hover:bg-white/[0.06] border-0"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create Template
                </Button>
              </div>
            )}

            {templates.length > 0 && (
              <>
                {/* Job Post */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Link to Job Post (optional)</Label>
                  <Select value={newContract.boost_id} onValueChange={value => {
                    const boost = boosts.find(b => b.id === value);
                    if (boost) {
                      setNewContract({
                        ...newContract,
                        boost_id: value,
                        monthly_rate: boost.monthly_retainer.toString(),
                        videos_per_month: boost.videos_per_month.toString()
                      });
                    } else {
                      setNewContract({
                        ...newContract,
                        boost_id: ''
                      });
                    }
                  }}>
                    <SelectTrigger className="h-10 font-inter tracking-[-0.5px] border-0 bg-muted/50">
                      <SelectValue placeholder="Select a job post" />
                    </SelectTrigger>
                    <SelectContent>
                      {boosts.map(boost => (
                        <SelectItem key={boost.id} value={boost.id} className="font-inter tracking-[-0.5px]">
                          {boost.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Creator Email */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Creator Email</Label>
                  <Input 
                    type="email" 
                    placeholder="creator@example.com" 
                    value={newContract.creator_email} 
                    onChange={e => setNewContract({
                      ...newContract,
                      creator_email: e.target.value
                    })} 
                    className="h-10 font-inter tracking-[-0.5px]" 
                  />
                </div>

                {/* Rate & Videos */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Monthly Rate</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-inter">$</span>
                      <Input 
                        type="number" 
                        placeholder="1000" 
                        value={newContract.monthly_rate} 
                        onChange={e => setNewContract({
                          ...newContract,
                          monthly_rate: e.target.value
                        })} 
                        className="h-10 pl-7 font-inter tracking-[-0.5px]" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Videos / Month</Label>
                    <Input 
                      type="number" 
                      placeholder="4" 
                      value={newContract.videos_per_month} 
                      onChange={e => setNewContract({
                        ...newContract,
                        videos_per_month: e.target.value
                      })} 
                      className="h-10 font-inter tracking-[-0.5px]" 
                    />
                  </div>
                </div>

                {/* Start Date & Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Start Date</Label>
                    <Input 
                      type="date" 
                      value={newContract.start_date} 
                      onChange={e => setNewContract({
                        ...newContract,
                        start_date: e.target.value
                      })} 
                      className="h-10 font-inter tracking-[-0.5px]" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Duration</Label>
                    <Select value={newContract.duration_months} onValueChange={value => setNewContract({
                      ...newContract,
                      duration_months: value
                    })}>
                      <SelectTrigger className="h-10 font-inter tracking-[-0.5px] border-0 bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 6, 12, 18, 24].map(months => (
                          <SelectItem key={months} value={months.toString()} className="font-inter tracking-[-0.5px]">
                            {months} months
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/30 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setCreateDialogOpen(false)} className="font-inter tracking-[-0.5px]">
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateContract} className="font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90">
              Create & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="font-inter tracking-[-0.5px]">{selectedContract?.title}</DialogTitle>
            <DialogDescription className="text-sm">
              Contract with {selectedContract?.creator_name}
            </DialogDescription>
          </DialogHeader>
          {selectedContract && <div className="px-6 py-5 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedContract.creator_avatar || undefined} />
                  <AvatarFallback className="bg-muted text-muted-foreground font-inter text-sm">
                    {selectedContract.creator_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium font-inter tracking-[-0.3px]">{selectedContract.creator_name}</p>
                  <Badge className={`${statusConfig[selectedContract.status].color} text-[10px] mt-0.5`}>
                    {statusConfig[selectedContract.status].label}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Monthly Rate</span>
                  <p className="text-sm font-medium font-inter">${selectedContract.monthly_rate}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Videos / Month</span>
                  <p className="text-sm font-medium font-inter">{selectedContract.videos_per_month}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Start Date</span>
                  <p className="text-sm font-medium font-inter">{format(new Date(selectedContract.start_date), 'MMM d, yyyy')}</p>
                </div>
                {selectedContract.signed_at && <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Signed</span>
                    <p className="text-sm font-medium font-inter">{format(new Date(selectedContract.signed_at), 'MMM d, yyyy')}</p>
                  </div>}
              </div>
              {selectedContract.terms && <div className="space-y-1.5 pt-2 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Additional Terms</span>
                  <p className="text-sm text-muted-foreground">{selectedContract.terms}</p>
                </div>}
            </div>}
          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-muted/20 flex-row justify-between">
            <div className="flex items-center gap-2">
              {(selectedContract?.status === 'sent' || selectedContract?.status === 'viewed') && <button onClick={() => {
              toast.success(`Reminder sent to ${selectedContract?.creator_name}`);
            }} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                  <Send className="h-3.5 w-3.5" />
                  Send Reminder
                </button>}
              <button onClick={() => toast.success('Downloading PDF...')} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
            <button onClick={() => setViewDialogOpen(false)} className="px-3 py-1.5 text-xs font-inter tracking-[-0.5px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={open => {
      if (!open) {
        setTemplateDialogOpen(false);
        setEditingTemplate(null);
        resetTemplateForm();
      } else {
        setTemplateDialogOpen(true);
      }
    }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Name & Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Template Name</Label>
                <Input placeholder="e.g., Standard Agreement" value={templateForm.name} onChange={e => setTemplateForm({
                ...templateForm,
                name: e.target.value
              })} className="h-10 font-inter tracking-[-0.5px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Description</Label>
                <Input placeholder="Brief description" value={templateForm.description} onChange={e => setTemplateForm({
                ...templateForm,
                description: e.target.value
              })} className="h-10 font-inter tracking-[-0.5px]" />
              </div>
            </div>

            {/* Defaults */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Default Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-inter">$</span>
                  <Input type="number" placeholder="1000" value={templateForm.default_monthly_rate} onChange={e => setTemplateForm({
                  ...templateForm,
                  default_monthly_rate: e.target.value
                })} className="h-10 pl-7 font-inter tracking-[-0.5px]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Videos / Month</Label>
                <Input type="number" placeholder="4" value={templateForm.default_videos_per_month} onChange={e => setTemplateForm({
                ...templateForm,
                default_videos_per_month: e.target.value
              })} className="h-10 font-inter tracking-[-0.5px]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Duration</Label>
                <Select value={templateForm.default_duration_months} onValueChange={value => setTemplateForm({
                ...templateForm,
                default_duration_months: value
              })}>
                  <SelectTrigger className="h-10 font-inter tracking-[-0.5px] border-0 bg-muted/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 6, 12, 18, 24].map(months => <SelectItem key={months} value={months.toString()} className="font-inter tracking-[-0.5px]">
                        {months} months
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contract Content */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Contract Content</Label>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-md font-inter tracking-[-0.3px]">
                  Click variables below to insert
                </span>
              </div>
              <Textarea 
                ref={templateContentRef}
                id="template-content" 
                placeholder="Enter your contract template content..." 
                value={templateForm.content} 
                onChange={e => setTemplateForm({
                  ...templateForm,
                  content: e.target.value
                })} 
                rows={12} 
                className="font-inter text-sm tracking-[-0.3px] resize-none leading-relaxed" 
              />
              <div className="flex flex-wrap gap-1.5">
                {CONTRACT_VARIABLES.map((variable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => insertVariable(variable.key)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-inter tracking-[-0.3px] bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  >
                    <Variable className="h-3 w-3" />
                    {variable.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/30 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setTemplateDialogOpen(false)} className="font-inter tracking-[-0.5px]">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveTemplate} className="font-inter tracking-[-0.5px] bg-foreground text-background hover:bg-foreground/90">
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}