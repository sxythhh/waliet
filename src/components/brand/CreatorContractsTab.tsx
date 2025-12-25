import { useState, useEffect } from "react";
import { Search, Plus, FileText, CheckCircle, Clock, AlertCircle, MoreHorizontal, Download, Send, Eye, Pencil, Trash2, Filter } from "lucide-react";
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

interface CreatorContractsTabProps {
  brandId: string;
}

// Mock data - in production this would come from a contracts table
const generateMockContracts = (boosts: Boost[]): Contract[] => {
  return boosts.slice(0, 3).map((boost, idx) => ({
    id: `contract-${idx}`,
    title: `${boost.title} - Creator Agreement`,
    creator_id: `creator-${idx}`,
    creator_name: ['Sarah Johnson', 'Mike Chen', 'Alex Rivera'][idx] || 'Creator',
    creator_avatar: null,
    boost_id: boost.id,
    boost_title: boost.title,
    status: (['signed', 'sent', 'draft'] as const)[idx] || 'draft',
    monthly_rate: boost.monthly_retainer,
    videos_per_month: boost.videos_per_month,
    start_date: new Date(Date.now() - idx * 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + (12 - idx) * 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - (idx + 5) * 24 * 60 * 60 * 1000).toISOString(),
    signed_at: idx === 0 ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() : null,
    terms: `Standard content creation agreement for ${boost.title}. Creator agrees to produce ${boost.videos_per_month} videos per month at $${boost.monthly_retainer}/month.`
  }));
};

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground', icon: FileText },
  sent: { label: 'Awaiting Signature', color: 'bg-amber-500/10 text-amber-500', icon: Clock },
  viewed: { label: 'Viewed', color: 'bg-blue-500/10 text-blue-500', icon: Eye },
  signed: { label: 'Signed', color: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-500/10 text-red-500', icon: AlertCircle },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: AlertCircle }
};

export function CreatorContractsTab({ brandId }: CreatorContractsTabProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // New contract form state
  const [newContract, setNewContract] = useState({
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

      const fetchedBoosts = boostsData || [];
      setBoosts(fetchedBoosts);

      // For now, generate mock contracts from boosts
      // In production, this would fetch from a contracts table
      setContracts(generateMockContracts(fetchedBoosts));
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.creator_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.boost_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
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
    if (!newContract.boost_id || !newContract.creator_email) {
      toast.error('Please fill in all required fields');
      return;
    }

    // In production, this would create a real contract and send for e-signature
    toast.success('Contract created and sent for signature');
    setCreateDialogOpen(false);
    setNewContract({
      boost_id: '',
      creator_email: '',
      monthly_rate: '',
      videos_per_month: '',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      duration_months: '12',
      custom_terms: ''
    });
    fetchData();
  };

  const handleSendReminder = (contract: Contract) => {
    toast.success(`Reminder sent to ${contract.creator_name}`);
  };

  const handleViewContract = (contract: Contract) => {
    setSelectedContract(contract);
    setViewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
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
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold font-instrument tracking-tight">Creator Contracts</h2>
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
              Manage agreements and e-signatures with creators
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Contract
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold font-instrument">{stats.total}</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Total Contracts</p>
            </CardContent>
          </Card>
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4">
              <p className="text-2xl font-bold font-instrument text-emerald-500">{stats.signed}</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Signed</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4">
              <p className="text-2xl font-bold font-instrument text-amber-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Pending Signature</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4">
              <p className="text-2xl font-bold font-instrument">{stats.draft}</p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">Drafts</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/30 border-border"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px] bg-muted/30">
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
        </div>
      </div>

      {/* Contracts List */}
      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="space-y-3">
          {filteredContracts.length === 0 ? (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium font-instrument">No contracts yet</p>
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] mb-4">
                Create your first contract to get started with creator agreements
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>Create Contract</Button>
            </Card>
          ) : (
            filteredContracts.map((contract) => {
              const StatusIcon = statusConfig[contract.status].icon;
              return (
                <Card 
                  key={contract.id} 
                  className="hover:bg-muted/30 transition-colors cursor-pointer border-border"
                  onClick={() => handleViewContract(contract)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={contract.creator_avatar || undefined} />
                          <AvatarFallback className="bg-muted">
                            {contract.creator_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium font-inter tracking-[-0.5px] truncate">
                              {contract.title}
                            </p>
                            <Badge className={`${statusConfig[contract.status].color} text-[10px] shrink-0`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[contract.status].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                            {contract.creator_name} • ${contract.monthly_rate}/mo • {contract.videos_per_month} videos/mo
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {contract.boost_title && <span className="text-primary">{contract.boost_title}</span>}
                            {' • '}Created {formatDistanceToNow(new Date(contract.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        {contract.status === 'sent' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSendReminder(contract)}
                          >
                            <Send className="h-3.5 w-3.5 mr-1.5" />
                            Remind
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Create Contract Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-instrument tracking-tight">Create New Contract</DialogTitle>
            <DialogDescription className="font-inter tracking-[-0.5px]">
              Generate an e-signature ready contract for a creator
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="font-inter tracking-[-0.5px]">Job Post / Boost *</Label>
              <Select 
                value={newContract.boost_id} 
                onValueChange={(v) => {
                  const boost = boosts.find(b => b.id === v);
                  setNewContract({
                    ...newContract, 
                    boost_id: v,
                    monthly_rate: boost?.monthly_retainer.toString() || '',
                    videos_per_month: boost?.videos_per_month.toString() || ''
                  });
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a job post" />
                </SelectTrigger>
                <SelectContent>
                  {boosts.map(boost => (
                    <SelectItem key={boost.id} value={boost.id}>
                      {boost.title} - ${boost.monthly_retainer}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-inter tracking-[-0.5px]">Creator Email *</Label>
              <Input 
                type="email"
                placeholder="creator@email.com"
                value={newContract.creator_email}
                onChange={(e) => setNewContract({...newContract, creator_email: e.target.value})}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-inter tracking-[-0.5px]">Monthly Rate ($)</Label>
                <Input 
                  type="number"
                  placeholder="1000"
                  value={newContract.monthly_rate}
                  onChange={(e) => setNewContract({...newContract, monthly_rate: e.target.value})}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="font-inter tracking-[-0.5px]">Videos/Month</Label>
                <Input 
                  type="number"
                  placeholder="4"
                  value={newContract.videos_per_month}
                  onChange={(e) => setNewContract({...newContract, videos_per_month: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="font-inter tracking-[-0.5px]">Start Date</Label>
                <Input 
                  type="date"
                  value={newContract.start_date}
                  onChange={(e) => setNewContract({...newContract, start_date: e.target.value})}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="font-inter tracking-[-0.5px]">Duration</Label>
                <Select 
                  value={newContract.duration_months} 
                  onValueChange={(v) => setNewContract({...newContract, duration_months: v})}
                >
                  <SelectTrigger className="mt-2">
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

            <div>
              <Label className="font-inter tracking-[-0.5px]">Additional Terms (Optional)</Label>
              <Textarea 
                placeholder="Any custom terms or conditions..."
                value={newContract.custom_terms}
                onChange={(e) => setNewContract({...newContract, custom_terms: e.target.value})}
                className="mt-2 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateContract}>
              <Send className="h-4 w-4 mr-2" />
              Create & Send
            </Button>
          </DialogFooter>
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
          {selectedContract && (
            <div className="space-y-6">
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

              {selectedContract.signed_at && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm">
                    Signed on {format(new Date(selectedContract.signed_at), 'MMM d, yyyy \'at\' h:mm a')}
                  </span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
