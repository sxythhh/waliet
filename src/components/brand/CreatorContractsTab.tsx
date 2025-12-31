import { useState, useEffect } from "react";
import { Search, Plus, CheckCircle, Clock, AlertCircle, MoreHorizontal, Download, Send, Eye, Pencil, Trash2, Filter, FileText, Settings2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { ContractTemplatesTab } from "./ContractTemplatesTab";
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
  content: string;
  default_monthly_rate: number | null;
  default_videos_per_month: number | null;
  default_duration_months: number;
  is_default: boolean;
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
export function CreatorContractsTab({
  brandId
}: CreatorContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<'contracts' | 'templates'>('contracts');

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
      const {
        data: boostsData
      } = await supabase.from('bounty_campaigns').select('id, title, monthly_retainer, videos_per_month').eq('brand_id', brandId).eq('status', 'active');
      setBoosts(boostsData || []);

      // Fetch templates
      const { data: templatesData } = await supabase
        .from('contract_templates')
        .select('id, name, content, default_monthly_rate, default_videos_per_month, default_duration_months, is_default')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      setTemplates(templatesData || []);

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
  };
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = contract.title.toLowerCase().includes(searchQuery.toLowerCase()) || contract.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) || contract.boost_title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  const stats = {
    total: contracts.length,
    signed: contracts.filter(c => c.status === 'signed').length,
    pending: contracts.filter(c => c.status === 'sent' || c.status === 'viewed').length,
    draft: contracts.filter(c => c.status === 'draft').length
  };
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
      const {
        error
      } = await supabase.from('creator_contracts').insert({
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
        await supabase.rpc('increment_template_usage', { template_id_param: newContract.template_id });
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
  const handleSendReminder = (contract: Contract) => {
    toast.success(`Reminder sent to ${contract.creator_name}`);
  };
  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setViewDialogOpen(true);
  };
  // Handle template selection
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

  if (loading) {
    return <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>;
  }

  // Show templates view
  if (activeView === 'templates') {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-border bg-background shrink-0">
          <div className="flex px-4 gap-0">
            <button
              onClick={() => setActiveView('contracts')}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative text-muted-foreground hover:text-foreground"
            >
              <FileText className="h-4 w-4" />
              Contracts
            </button>
            <button
              onClick={() => setActiveView('templates')}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
            >
              <Settings2 className="h-4 w-4" />
              Templates
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <ContractTemplatesTab brandId={brandId} />
        </div>
      </div>
    );
  }

  return <div className="h-full flex flex-col">
      {/* View Tabs */}
      <div className="border-b border-border bg-background shrink-0">
        <div className="flex px-4 gap-0">
          <button
            onClick={() => setActiveView('contracts')}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
          >
            <FileText className="h-4 w-4" />
            Contracts
          </button>
          <button
            onClick={() => setActiveView('templates')}
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            Templates
          </button>
        </div>
      </div>

      {/* Contracts List */}
      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="flex flex-col gap-3 items-start justify-end md:flex-row mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-muted/30 h-8">
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
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="h-8 px-3 gap-1.5 font-inter tracking-[-0.5px] text-xs border-t border-[#4b85f7] bg-[#2061de] hover:bg-[#2061de]/90">
            <Plus className="h-3.5 w-3.5" />
            Create Contract
          </Button>
        </div>
        <div className="space-y-3">
          {filteredContracts.length === 0 ? <Card className="p-12 text-center">
              
              <p className="text-lg font-medium font-instrument">No contracts yet</p>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mb-4">
                Create your first contract to get started with creator agreements
              </p>
              
            </Card> : filteredContracts.map(contract => {
          const StatusIcon = statusConfig[contract.status].icon;
          return <Card key={contract.id} className="group hover:bg-muted/20 transition-all duration-200 cursor-pointer border-border/50 bg-card/50" onClick={() => handleViewContract(contract)}>
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
                            <Badge variant="secondary" className={`${statusConfig[contract.status].color} text-[10px] font-['Inter'] tracking-[-0.3px] px-2 py-0.5 shrink-0`}>
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
                          <p className="text-[11px] text-muted-foreground/70 font-['Inter'] tracking-[-0.3px] pt-0.5">
                            Created {formatDistanceToNow(new Date(contract.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        {contract.status === 'sent' && (
                          <Button variant="outline" size="sm" className="font-['Inter'] tracking-[-0.5px] text-xs h-8" onClick={() => handleSendReminder(contract)}>
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Remind
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="font-['Inter'] tracking-[-0.3px]">
                            <DropdownMenuItem onClick={() => handleViewContract(contract)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download PDF
                            </DropdownMenuItem>
                            {contract.status === 'draft' && (
                              <>
                                <DropdownMenuItem>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>;
        })}
        </div>
      </ScrollArea>

      {/* Create Contract Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <div className="p-6 pb-4">
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className="font-instrument tracking-tight text-lg">New Contract</DialogTitle>
              <DialogDescription className="font-inter tracking-[-0.5px] text-xs">
                Send an e-signature ready agreement
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="px-6 pb-6 space-y-5">
            {templates.length > 0 && (
              <div className="space-y-1.5">
                <Label className="font-inter tracking-[-0.5px] text-xs text-muted-foreground">Template</Label>
                <Select value={newContract.template_id} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-10 bg-muted/40 border-0 font-inter tracking-[-0.5px]">
                    <SelectValue placeholder="Select a template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} {template.is_default && '(Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="font-inter tracking-[-0.5px] text-xs text-muted-foreground">Job Post / Boost (Optional)</Label>
              <Select value={newContract.boost_id} onValueChange={v => {
              const boost = boosts.find(b => b.id === v);
              setNewContract({
                ...newContract,
                boost_id: v,
                monthly_rate: boost?.monthly_retainer?.toString() || newContract.monthly_rate,
                videos_per_month: boost?.videos_per_month?.toString() || newContract.videos_per_month
              });
            }}>
                <SelectTrigger className="h-10 bg-muted/40 border-0 font-inter tracking-[-0.5px]">
                  <SelectValue placeholder="Select a job post" />
                </SelectTrigger>
                <SelectContent>
                  {boosts.map(boost => <SelectItem key={boost.id} value={boost.id}>
                      {boost.title} - ${boost.monthly_retainer}/mo
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="font-inter tracking-[-0.5px] text-xs text-muted-foreground">Creator Email</Label>
              <Input 
                type="email" 
                placeholder="creator@example.com" 
                value={newContract.creator_email} 
                onChange={e => setNewContract({
                  ...newContract,
                  creator_email: e.target.value
                })} 
                className="h-10 bg-muted/40 border-0 font-inter tracking-[-0.5px]" 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-inter tracking-[-0.5px] text-xs text-muted-foreground">Monthly Rate</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" placeholder="1000" value={newContract.monthly_rate} onChange={e => setNewContract({
                  ...newContract,
                  monthly_rate: e.target.value
                })} className="h-10 bg-muted/40 border-0 pl-7 font-inter tracking-[-0.5px]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="font-inter tracking-[-0.5px] text-xs text-muted-foreground">Videos/Month</Label>
                <Input type="number" placeholder="4" value={newContract.videos_per_month} onChange={e => setNewContract({
                ...newContract,
                videos_per_month: e.target.value
              })} className="h-10 bg-muted/40 border-0 font-inter tracking-[-0.5px]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="font-inter tracking-[-0.5px] text-xs text-muted-foreground">Start Date</Label>
                <Input type="date" value={newContract.start_date} onChange={e => setNewContract({
                ...newContract,
                start_date: e.target.value
              })} className="h-10 bg-muted/40 border-0 font-inter tracking-[-0.5px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="font-inter tracking-[-0.5px] text-xs text-muted-foreground">Duration</Label>
                <Select value={newContract.duration_months} onValueChange={v => setNewContract({
                ...newContract,
                duration_months: v
              })}>
                  <SelectTrigger className="h-10 bg-muted/40 border-0 font-inter tracking-[-0.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 month</SelectItem>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-inter tracking-[-0.5px] text-xs text-muted-foreground">Additional Terms</Label>
              <Textarea placeholder="Any custom terms or conditions..." value={newContract.custom_terms} onChange={e => setNewContract({
              ...newContract,
              custom_terms: e.target.value
            })} className="min-h-[72px] bg-muted/40 border-0 font-inter tracking-[-0.5px] resize-none" />
            </div>
          </div>
          
          <div className="flex gap-2 p-4 bg-muted/20">
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} className="flex-1 h-10 font-inter tracking-[-0.5px]">
              Cancel
            </Button>
            <Button onClick={handleCreateContract} className="flex-1 h-10 font-inter tracking-[-0.5px]">
              <Plus className="h-4 w-4 mr-2" />
              Create Contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-instrument tracking-tight">
              {selectedContract?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedContract && <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedContract.creator_avatar || undefined} />
                    <AvatarFallback>{selectedContract.creator_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedContract.creator_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedContract.boost_title}</p>
                  </div>
                </div>
                <Badge className={statusConfig[selectedContract.status].color}>
                  {statusConfig[selectedContract.status].label}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Monthly Rate</p>
                  <p className="text-lg font-semibold">${selectedContract.monthly_rate}</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Videos per Month</p>
                  <p className="text-lg font-semibold">{selectedContract.videos_per_month}</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                  <p className="text-lg font-semibold">{format(new Date(selectedContract.start_date), 'MMM d, yyyy')}</p>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">End Date</p>
                  <p className="text-lg font-semibold">
                    {selectedContract.end_date ? format(new Date(selectedContract.end_date), 'MMM d, yyyy') : 'Ongoing'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Terms & Conditions</p>
                <p className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg">
                  {selectedContract.terms}
                </p>
              </div>

              {selectedContract.signed_at && <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">
                    Signed on {format(new Date(selectedContract.signed_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>}
            </div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}