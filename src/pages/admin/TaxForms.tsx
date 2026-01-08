import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  FileText, Clock, CheckCircle2, XCircle, Search, X, AlertTriangle,
  Calendar, Eye, ChevronRight, User, Globe, Building2
} from "lucide-react";
import { PageLoading } from "@/components/ui/loading-bar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminPermissionGuard } from "@/components/admin/AdminPermissionGuard";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  TaxForm,
  TaxFormStatus,
  W9FormData,
  W8BENFormData,
  formatTINForDisplay,
  getDaysUntilExpiry,
  COUNTRIES,
  US_STATES,
} from "@/types/tax-forms";

interface TaxFormWithUser extends TaxForm {
  profiles: {
    id: string;
    username: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  verifier?: {
    id: string;
    username: string;
  };
}

interface TaxFormStats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  expired: number;
  w9Count: number;
  w8benCount: number;
}

type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected' | 'expired';

export default function AdminTaxForms() {
  const [taxForms, setTaxForms] = useState<TaxFormWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<TaxFormWithUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTaxForms();
  }, []);

  const fetchTaxForms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tax_forms")
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          full_name,
          email,
          avatar_url
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch tax forms"
      });
    } else {
      setTaxForms((data || []) as unknown as TaxFormWithUser[]);
    }
    setLoading(false);
  };

  const stats: TaxFormStats = useMemo(() => {
    return {
      total: taxForms.length,
      pending: taxForms.filter(f => f.status === 'pending').length,
      verified: taxForms.filter(f => f.status === 'verified').length,
      rejected: taxForms.filter(f => f.status === 'rejected').length,
      expired: taxForms.filter(f => f.status === 'expired').length,
      w9Count: taxForms.filter(f => f.form_type === 'w9').length,
      w8benCount: taxForms.filter(f => f.form_type === 'w8ben' || f.form_type === 'w8bene').length,
    };
  }, [taxForms]);

  const filteredForms = useMemo(() => {
    return taxForms.filter(form => {
      // Status filter
      if (statusFilter !== 'all' && form.status !== statusFilter) return false;

      // Form type filter
      if (formTypeFilter !== 'all' && form.form_type !== formTypeFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const userName = form.profiles?.username?.toLowerCase() || '';
        const fullName = form.profiles?.full_name?.toLowerCase() || '';
        const email = form.profiles?.email?.toLowerCase() || '';
        const formName = (form.form_data as W9FormData | W8BENFormData)?.name?.toLowerCase() || '';
        return userName.includes(query) || fullName.includes(query) || email.includes(query) || formName.includes(query);
      }

      return true;
    });
  }, [taxForms, statusFilter, formTypeFilter, searchQuery]);

  const handleVerify = async () => {
    if (!selectedForm) return;
    setProcessing(true);

    const { error } = await supabase
      .from("tax_forms")
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
      })
      .eq("id", selectedForm.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to verify tax form"
      });
    } else {
      toast({
        title: "Success",
        description: "Tax form verified successfully"
      });
      fetchTaxForms();
      setVerifyDialogOpen(false);
      setDetailsOpen(false);
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedForm || !rejectionReason.trim()) return;
    setProcessing(true);

    const { error } = await supabase
      .from("tax_forms")
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason.trim(),
      })
      .eq("id", selectedForm.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject tax form"
      });
    } else {
      toast({
        title: "Success",
        description: "Tax form rejected"
      });
      fetchTaxForms();
      setRejectDialogOpen(false);
      setDetailsOpen(false);
      setRejectionReason('');
    }
    setProcessing(false);
  };

  const getStatusBadge = (status: TaxFormStatus, expiresAt?: string) => {
    const daysUntilExpiry = getDaysUntilExpiry(expiresAt);

    if (status === 'verified' && daysUntilExpiry !== null && daysUntilExpiry <= 30) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          <Clock className="h-3 w-3 mr-1" />
          Expires in {daysUntilExpiry}d
        </Badge>
      );
    }

    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'verified':
        return (
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      default:
        return null;
    }
  };

  const getFormTypeLabel = (formType: string) => {
    switch (formType) {
      case 'w9': return 'W-9';
      case 'w8ben': return 'W-8BEN';
      case 'w8bene': return 'W-8BEN-E';
      default: return formType;
    }
  };

  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country?.name || code;
  };

  const getStateName = (code: string) => {
    const state = US_STATES.find(s => s.code === code);
    return state?.name || code;
  };

  if (loading) {
    return <PageLoading />;
  }

  return (
    <AdminPermissionGuard requiredPermission="finance">
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-geist tracking-tight">Tax Forms</h1>
            <p className="text-sm text-muted-foreground">Review and verify creator tax forms</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">Total Forms</p>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-blue-500/30 bg-blue-500/5">
            <p className="text-sm text-blue-600">Pending Review</p>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.pending}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5">
            <p className="text-sm text-emerald-600">Verified</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.verified}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">W-9 Forms</p>
            <p className="text-2xl font-bold mt-1">{stats.w9Count}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-sm text-muted-foreground">W-8BEN Forms</p>
            <p className="text-2xl font-bold mt-1">{stats.w8benCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Form Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="w9">W-9</SelectItem>
              <SelectItem value="w8ben">W-8BEN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Form Type</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name on Form</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Submitted</th>
                  <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredForms.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No tax forms found
                    </td>
                  </tr>
                ) : (
                  filteredForms.map((form) => (
                    <tr
                      key={form.id}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedForm(form);
                        setDetailsOpen(true);
                      }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={form.profiles?.avatar_url || undefined} />
                            <AvatarFallback>
                              {form.profiles?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{form.profiles?.username || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{form.profiles?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="font-mono">
                          {getFormTypeLabel(form.form_type)}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {(form.form_data as W9FormData | W8BENFormData)?.name || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(form.status as TaxFormStatus, form.expires_at)}
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <p>{format(new Date(form.created_at), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(form.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Details Sheet */}
        <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {selectedForm && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {getFormTypeLabel(selectedForm.form_type)} Details
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  {/* User Info */}
                  <div className="p-4 rounded-lg border border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={selectedForm.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {selectedForm.profiles?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{selectedForm.profiles?.username}</p>
                        <p className="text-sm text-muted-foreground">{selectedForm.profiles?.email}</p>
                        <p className="text-sm text-muted-foreground">{selectedForm.profiles?.full_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(selectedForm.status as TaxFormStatus, selectedForm.expires_at)}
                  </div>

                  {selectedForm.rejection_reason && (
                    <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                      <p className="text-sm font-medium text-red-600">Rejection Reason:</p>
                      <p className="text-sm text-muted-foreground mt-1">{selectedForm.rejection_reason}</p>
                    </div>
                  )}

                  {/* Form Data */}
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Form Information
                    </h4>

                    {selectedForm.form_type === 'w9' ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <p className="text-sm font-medium">
                              {(selectedForm.form_data as W9FormData).name}
                            </p>
                          </div>
                          {(selectedForm.form_data as W9FormData).businessName && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Business Name</Label>
                              <p className="text-sm font-medium">
                                {(selectedForm.form_data as W9FormData).businessName}
                              </p>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Federal Tax Classification</Label>
                          <p className="text-sm font-medium capitalize">
                            {(selectedForm.form_data as W9FormData).federalTaxClassification?.replace(/_/g, ' ')}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Address</Label>
                          <p className="text-sm font-medium">
                            {(selectedForm.form_data as W9FormData).address}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedForm.form_data as W9FormData).city}, {getStateName((selectedForm.form_data as W9FormData).state)} {(selectedForm.form_data as W9FormData).zipCode}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">TIN ({(selectedForm.form_data as W9FormData).tinType?.toUpperCase()})</Label>
                          <p className="text-sm font-medium font-mono">
                            {formatTINForDisplay(
                              (selectedForm.form_data as W9FormData).tin,
                              (selectedForm.form_data as W9FormData).tinType
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-muted-foreground">Name</Label>
                            <p className="text-sm font-medium">
                              {(selectedForm.form_data as W8BENFormData).name}
                            </p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Country of Citizenship</Label>
                            <p className="text-sm font-medium">
                              {getCountryName((selectedForm.form_data as W8BENFormData).countryOfCitizenship)}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                          <p className="text-sm font-medium">
                            {(selectedForm.form_data as W8BENFormData).dateOfBirth}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Permanent Address</Label>
                          <p className="text-sm font-medium">
                            {(selectedForm.form_data as W8BENFormData).permanentAddress}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedForm.form_data as W8BENFormData).city}, {getCountryName((selectedForm.form_data as W8BENFormData).country)} {(selectedForm.form_data as W8BENFormData).postalCode}
                          </p>
                        </div>
                        {(selectedForm.form_data as W8BENFormData).foreignTIN && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Foreign TIN</Label>
                            <p className="text-sm font-medium font-mono">
                              {(selectedForm.form_data as W8BENFormData).foreignTIN}
                            </p>
                          </div>
                        )}
                        {(selectedForm.form_data as W8BENFormData).claimTreatyBenefits && (
                          <div className="p-3 rounded-lg border border-border bg-muted/30">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Treaty Benefits Claimed</p>
                            <p className="text-sm">
                              <span className="font-medium">Country:</span> {getCountryName((selectedForm.form_data as W8BENFormData).treatyCountry || '')}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Article:</span> {(selectedForm.form_data as W8BENFormData).treatyArticle}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Rate:</span> {(selectedForm.form_data as W8BENFormData).treatyRate}%
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Signature Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Signature</h4>
                    <div className="p-3 rounded-lg border border-border bg-muted/30">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Signed by:</span> {selectedForm.signature_name}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Date:</span> {format(new Date(selectedForm.signature_date), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Electronic consent:</span> {selectedForm.electronic_signature_consent ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  {/* Expiry Info (W-8 only) */}
                  {selectedForm.expires_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Expires</span>
                      <span className="font-medium">{format(new Date(selectedForm.expires_at), 'MMMM d, yyyy')}</span>
                    </div>
                  )}

                  {/* Actions */}
                  {selectedForm.status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10"
                        onClick={() => setRejectDialogOpen(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => setVerifyDialogOpen(true)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Verify
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* Verify Dialog */}
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verify Tax Form</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to verify this {getFormTypeLabel(selectedForm?.form_type || '')} form for {selectedForm?.profiles?.username}?
              This will allow the user to receive payouts.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleVerify} disabled={processing}>
                {processing ? 'Verifying...' : 'Verify Form'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Tax Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this tax form. The user will be notified and asked to resubmit.
              </p>
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  placeholder="e.g., TIN does not match name, address incomplete, etc."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason('');
              }}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? 'Rejecting...' : 'Reject Form'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminPermissionGuard>
  );
}
