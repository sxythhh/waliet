import { useState, useEffect } from "react";
import { Search, Plus, CheckCircle, Clock, AlertCircle, MoreHorizontal, Download, Send, Eye, Pencil, Trash2, Filter, FileText, Settings2, ChevronDown, Copy, Star, Variable } from "lucide-react";
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

export function CreatorContractsTab({ brandId }: CreatorContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
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
    is_default: false,
  });

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

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch boosts/job posts
      const { data: boostsData } = await supabase
        .from('bounty_campaigns')
        .select('id, title, monthly_retainer, videos_per_month')
        .eq('brand_id', brandId)
        .eq('status', 'active');
      setBoosts(boostsData || []);

      // Fetch templates
      const { data: templatesData } = await (supabase
        .from('contract_templates' as any)
        .select('*')
        .eq('brand_id', brandId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false }) as any);
      setTemplates((templatesData || []) as Template[]);

      // Fetch contracts from database
      const { data: contractsData, error } = await supabase
        .from('creator_contracts')
        .select(`
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
        `)
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map to Contract interface with creator info
      const mappedContracts: Contract[] = await Promise.all((contractsData || []).map(async contract => {
        let creatorName = contract.creator_email;
        let creatorAvatar = null;
        if (contract.creator_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url')
            .eq('id', contract.creator_id)
            .single();
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
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.boost_title?.toLowerCase().includes(searchQuery.toLowerCase());
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
    endDate.setMonth(endDate.getMonth() + parseInt(newContract.duration_months));

    try {
      const { error } = await supabase.from('creator_contracts').insert({
        brand_id: brandId,
        template_id: newContract.template_id || null,
        boost_id: newContract.boost_id || null,
        creator_email: newContract.creator_email,
        title: boost ? `${boost.title} - Creator Agreement` : (template ? template.name : 'Creator Agreement'),
        monthly_rate: parseFloat(newContract.monthly_rate) || boost?.monthly_retainer || template?.default_monthly_rate || 0,
        videos_per_month: parseInt(newContract.videos_per_month) || boost?.videos_per_month || template?.default_videos_per_month || 1,
        start_date: newContract.start_date,
        end_date: endDate.toISOString().split('T')[0],
        duration_months: parseInt(newContract.duration_months),
        custom_terms: newContract.custom_terms,
        status: 'sent'
      });

      if (error) throw error;

      // Increment template usage count
      if (newContract.template_id) {
        try {
          await (supabase.rpc as any)('increment_template_usage', { template_id_param: newContract.template_id });
        } catch (e) {
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
        duration_months: template.default_duration_months.toString(),
      });
    } else {
      setNewContract({ ...newContract, template_id: '' });
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
        default_videos_per_month: templateForm.default_videos_per_month ? parseInt(templateForm.default_videos_per_month) : null,
        default_duration_months: parseInt(templateForm.default_duration_months) || 12,
        is_default: templateForm.is_default,
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

      resetTemplateForm();
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      fetchData();
    } catch (error: any) {
      console.error("Error saving template:", error);
      toast.error(error.message || "Failed to save template");
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
      is_default: template.is_default,
    });
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleDuplicateTemplate = async (template: Template) => {
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
      fetchData();
    } catch (error) {
      console.error("Error duplicating template:", error);
      toast.error("Failed to duplicate template");
    }
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const { error } = await (supabase
        .from("contract_templates" as any)
        .delete()
        .eq("id", template.id) as any);
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
      const { error } = await (supabase
        .from("contract_templates" as any)
        .update({ is_default: true })
        .eq("id", template.id) as any);
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
      is_default: false,
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1 p-4 md:p-6">
        {/* Templates Section - Collapsible */}
        <Collapsible open={templatesOpen} onOpenChange={setTemplatesOpen} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn("h-4 w-4 transition-transform", templatesOpen && "rotate-180")} />
                <FileText className="h-4 w-4" />
                Agreement Templates
                <Badge variant="secondary" className="text-[10px] ml-1">{templates.length}</Badge>
              </button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            {templates.length === 0 ? (
              <Card className="p-6 text-center mb-4">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No templates yet. Create one to streamline contract creation.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    className={cn(
                      "group hover:shadow-md transition-all cursor-pointer",
                      template.is_default && "ring-1 ring-primary/30"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1.5 rounded bg-muted shrink-0">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-sm truncate">{template.name}</h3>
                            {template.is_default && (
                              <Badge variant="secondary" className="text-[9px] mt-0.5">
                                <Star className="h-2 w-2 mr-0.5 fill-amber-500 text-amber-500" />
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0">
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
                            {!template.is_default && (
                              <DropdownMenuItem onClick={() => handleSetDefaultTemplate(template)}>
                                <Star className="h-4 w-4 mr-2" />
                                Set as Default
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTemplate(template)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {template.default_monthly_rate && (
                          <span className="bg-muted px-1.5 py-0.5 rounded">${template.default_monthly_rate}/mo</span>
                        )}
                        {template.default_videos_per_month && (
                          <span className="bg-muted px-1.5 py-0.5 rounded">{template.default_videos_per_month} videos</span>
                        )}
                        {template.usage_count !== undefined && (
                          <span className="ml-auto">Used {template.usage_count}x</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Contracts Section */}
        <div className="flex flex-col gap-3 items-start justify-between md:flex-row mb-4">
          <h2 className="text-lg font-semibold">Contracts</h2>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[140px] h-8 text-xs border-0 bg-muted/40 hover:bg-muted/60 transition-colors rounded-lg shadow-none focus:ring-1 focus:ring-primary/20">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Awaiting Signature</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { resetTemplateForm(); setTemplateDialogOpen(true); }}
              className="h-8 px-3 text-xs font-medium"
            >
              New Template
            </Button>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              size="sm"
              className="h-8 px-3 gap-1.5 font-inter tracking-[-0.5px] text-xs border-t border-[#4b85f7] bg-[#2061de] hover:bg-[#2061de]/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Contract
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredContracts.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-lg font-medium font-instrument">No contracts yet</p>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mb-4">
                Create your first contract to get started with creator agreements
              </p>
            </Card>
          ) : (
            filteredContracts.map(contract => {
              const StatusIcon = statusConfig[contract.status].icon;
              return (
                <Card
                  key={contract.id}
                  className="group hover:bg-muted/20 transition-all duration-200 cursor-pointer border-border/50 bg-card/50"
                  onClick={() => handleViewContract(contract)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <Avatar className="h-11 w-11 flex-shrink-0 ring-2 ring-border/30">
                          <AvatarImage src={contract.creator_avatar || undefined} />
                          <AvatarFallback className="bg-muted font-['Inter'] font-medium text-sm">
                            {contract.creator_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold font-['Inter'] tracking-[-0.5px] text-foreground truncate">
                              {contract.title}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={`${statusConfig[contract.status].color} text-[10px] font-['Inter'] tracking-[-0.3px] px-2 py-0.5 shrink-0`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[contract.status].label}
                            </Badge>
                          </div>
                          <p className="text-[13px] text-muted-foreground font-['Inter'] tracking-[-0.5px]">
                            {contract.creator_name}
                          </p>
                          <div className="flex items-center gap-3 pt-1">
                            <span className="inline-flex items-center text-xs font-['Inter'] tracking-[-0.3px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                              ${contract.monthly_rate}/mo
                            </span>
                            <span className="inline-flex items-center text-xs font-['Inter'] tracking-[-0.3px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                              {contract.videos_per_month} videos/mo
                            </span>
                            {contract.boost_title && (
                              <span className="inline-flex items-center text-xs font-['Inter'] tracking-[-0.3px] text-primary bg-primary/10 px-2 py-1 rounded-md">
                                {contract.boost_title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[11px] text-muted-foreground font-['Inter'] tracking-[-0.3px]">
                          {formatDistanceToNow(new Date(contract.created_at), { addSuffix: true })}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {(contract.status === 'sent' || contract.status === 'viewed') && (
                              <DropdownMenuItem onClick={() => toast.success(`Reminder sent to ${contract.creator_name}`)}>
                                <Send className="h-4 w-4 mr-2" />
                                Send Reminder
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Create Contract Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Contract</DialogTitle>
            <DialogDescription>
              Send a contract to a creator for signature
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={newContract.template_id} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.is_default && "(Default)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Job Post (optional)</Label>
              <Select
                value={newContract.boost_id}
                onValueChange={(value) => {
                  const boost = boosts.find(b => b.id === value);
                  if (boost) {
                    setNewContract({
                      ...newContract,
                      boost_id: value,
                      monthly_rate: boost.monthly_retainer.toString(),
                      videos_per_month: boost.videos_per_month.toString()
                    });
                  } else {
                    setNewContract({ ...newContract, boost_id: '' });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to a job post (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {boosts.map((boost) => (
                    <SelectItem key={boost.id} value={boost.id}>
                      {boost.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Creator Email *</Label>
              <Input
                type="email"
                placeholder="creator@example.com"
                value={newContract.creator_email}
                onChange={(e) => setNewContract({ ...newContract, creator_email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monthly Rate ($)</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={newContract.monthly_rate}
                  onChange={(e) => setNewContract({ ...newContract, monthly_rate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Videos per Month</Label>
                <Input
                  type="number"
                  placeholder="4"
                  value={newContract.videos_per_month}
                  onChange={(e) => setNewContract({ ...newContract, videos_per_month: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={newContract.start_date}
                  onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Select
                  value={newContract.duration_months}
                  onValueChange={(value) => setNewContract({ ...newContract, duration_months: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 6, 12, 18, 24].map((months) => (
                      <SelectItem key={months} value={months.toString()}>
                        {months} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Terms (optional)</Label>
              <Textarea
                placeholder="Any additional terms or notes..."
                value={newContract.custom_terms}
                onChange={(e) => setNewContract({ ...newContract, custom_terms: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContract}>
              Create & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedContract?.title}</DialogTitle>
            <DialogDescription>
              Contract with {selectedContract?.creator_name}
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <Badge className={statusConfig[selectedContract.status].color}>
                    {statusConfig[selectedContract.status].label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Monthly Rate</Label>
                  <p className="font-medium">${selectedContract.monthly_rate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Videos per Month</Label>
                  <p className="font-medium">{selectedContract.videos_per_month}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Start Date</Label>
                  <p className="font-medium">{format(new Date(selectedContract.start_date), 'MMM d, yyyy')}</p>
                </div>
                {selectedContract.signed_at && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Signed</Label>
                    <p className="font-medium">{format(new Date(selectedContract.signed_at), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
              {selectedContract.terms && (
                <div>
                  <Label className="text-muted-foreground text-xs">Additional Terms</Label>
                  <p className="mt-1 text-sm">{selectedContract.terms}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Editor Dialog */}
      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateDialogOpen(false);
            setEditingTemplate(null);
            resetTemplateForm();
          } else {
            setTemplateDialogOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>
              Create a reusable contract template
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    placeholder="e.g., Standard Agreement"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Default Rate ($)</Label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={templateForm.default_monthly_rate}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_monthly_rate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Videos/Month</Label>
                  <Input
                    type="number"
                    placeholder="4"
                    value={templateForm.default_videos_per_month}
                    onChange={(e) => setTemplateForm({ ...templateForm, default_videos_per_month: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select
                    value={templateForm.default_duration_months}
                    onValueChange={(value) => setTemplateForm({ ...templateForm, default_duration_months: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 6, 12, 18, 24].map((months) => (
                        <SelectItem key={months} value={months.toString()}>
                          {months} months
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Contract Content</Label>
                <Textarea
                  id="template-content"
                  placeholder="Enter your contract template content..."
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{{variable_name}}"} syntax for dynamic content. Available: brand_name, creator_name, monthly_rate, videos_per_month, start_date, duration_months, additional_terms
                </p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
