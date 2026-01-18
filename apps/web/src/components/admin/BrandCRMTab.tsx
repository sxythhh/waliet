import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminConfirmDialog } from "@/components/admin/design-system/AdminDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import {
  RefreshCw,
  Link2,
  Unlink,
  Plus,
  Phone,
  Mail,
  StickyNote,
  Calendar,
  DollarSign,
  TrendingUp,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  Circle,
} from "lucide-react";

import {
  useCloseBrand,
  useCloseLeadStatuses,
  useSyncBrandToClose,
  useFetchFromClose,
  useUpdateCloseStatus,
  useUnlinkFromClose,
} from "@/hooks/useCloseBrand";
import {
  useCloseOpportunities,
  useCloseOpportunityStatuses,
  useOpportunityMetrics,
  CloseOpportunity,
} from "@/hooks/useCloseOpportunities";
import {
  useCloseActivities,
  getActivityTypeInfo,
  formatDuration,
  CloseActivity,
} from "@/hooks/useCloseActivities";
import { OpportunityDialog } from "./OpportunityDialog";
import { ActivityLogDialog } from "./ActivityLogDialog";

interface BrandCRMTabProps {
  brandId: string;
  brandName: string;
}

export function BrandCRMTab({ brandId, brandName }: BrandCRMTabProps) {
  const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<CloseOpportunity | null>(null);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);

  // Queries
  const { data: closeBrand, isLoading: brandLoading } = useCloseBrand(brandId);
  const { data: leadStatuses } = useCloseLeadStatuses();
  const { data: opportunities, isLoading: oppsLoading } = useCloseOpportunities(brandId);
  const { data: oppStatuses } = useCloseOpportunityStatuses();
  const { data: activities, isLoading: activitiesLoading } = useCloseActivities(brandId, { limit: 10 });
  const metrics = useOpportunityMetrics(opportunities);

  // Mutations
  const syncToClose = useSyncBrandToClose();
  const fetchFromClose = useFetchFromClose();
  const updateStatus = useUpdateCloseStatus();
  const unlinkFromClose = useUnlinkFromClose();

  const isLinked = !!closeBrand?.close_lead_id;
  const isSyncing = syncToClose.isPending || fetchFromClose.isPending;

  const handleCreateLead = () => {
    syncToClose.mutate({ brandId, action: "create" });
  };

  const handleSyncFromClose = () => {
    fetchFromClose.mutate(brandId);
  };

  const handleUnlink = () => {
    setUnlinkConfirmOpen(true);
  };

  const executeUnlink = () => {
    unlinkFromClose.mutate(brandId, {
      onSuccess: () => setUnlinkConfirmOpen(false),
    });
  };

  const handleStatusChange = (statusId: string) => {
    updateStatus.mutate({ brandId, statusId });
  };

  const handleEditOpportunity = (opp: CloseOpportunity) => {
    setEditingOpportunity(opp);
    setOpportunityDialogOpen(true);
  };

  const getActivityIcon = (type: CloseActivity["activity_type"]) => {
    switch (type) {
      case "call": return <Phone className="h-4 w-4" />;
      case "email": return <Mail className="h-4 w-4" />;
      case "note": return <StickyNote className="h-4 w-4" />;
      case "meeting": return <Calendar className="h-4 w-4" />;
      case "sms": return <MessageSquare className="h-4 w-4" />;
      case "task_completed": return <CheckCircle2 className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  if (brandLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">
            Close CRM
          </h3>
          {isLinked && (
            <a
              href={`https://app.close.com/lead/${closeBrand?.close_lead_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px] flex items-center gap-1"
            >
              Open in Close <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {isLinked ? (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-inter tracking-[-0.5px]">Connected</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSyncFromClose}
                  disabled={isSyncing}
                  className="h-7 px-2"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUnlink}
                  className="h-7 px-2 text-muted-foreground hover:text-destructive"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Lead Status */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Lead Status
              </label>
              <Select
                value={closeBrand?.close_status_id || ""}
                onValueChange={handleStatusChange}
                disabled={updateStatus.isPending}
              >
                <SelectTrigger className="h-9 font-inter tracking-[-0.5px] bg-background border-border/50">
                  <SelectValue placeholder="Select status">
                    {closeBrand?.close_status_label || "Select status"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {leadStatuses?.map((status) => (
                    <SelectItem
                      key={status.id}
                      value={status.id}
                      className="font-inter tracking-[-0.5px]"
                    >
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sync Info */}
            {closeBrand?.close_synced_at && (
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Last synced {formatDistanceToNow(new Date(closeBrand.close_synced_at), { addSuffix: true })}
              </p>
            )}
          </div>
        ) : (
          <div className="bg-muted/50 rounded-lg p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Link2 className="h-4 w-4" />
              <span className="text-sm font-inter tracking-[-0.5px]">Not connected</span>
            </div>
            <Button
              onClick={handleCreateLead}
              disabled={isSyncing}
              className="w-full h-9 font-inter tracking-[-0.5px]"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Lead in Close
                </>
              )}
            </Button>
          </div>
        )}
      </section>

      {/* Opportunities - Only show if linked */}
      {isLinked && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">
              Opportunities
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditingOpportunity(null);
                setOpportunityDialogOpen(true);
              }}
              className="h-7 px-2 text-xs font-inter tracking-[-0.5px]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>

          {/* Pipeline Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-lg font-semibold font-inter tracking-[-0.5px]">
                ${metrics.weightedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Weighted
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-lg font-semibold font-inter tracking-[-0.5px] text-green-600">
                ${metrics.wonValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Won
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-lg font-semibold font-inter tracking-[-0.5px]">
                {metrics.activeCount}
              </p>
              <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                Active
              </p>
            </div>
          </div>

          {/* Opportunities List */}
          {oppsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : opportunities && opportunities.length > 0 ? (
            <div className="space-y-0">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  onClick={() => handleEditOpportunity(opp)}
                  className="flex items-center justify-between py-3 border-b border-border/30 last:border-0 cursor-pointer hover:opacity-70 transition-opacity"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full",
                        opp.status_type === "won" && "bg-green-500",
                        opp.status_type === "lost" && "bg-red-500",
                        opp.status_type === "active" && "bg-blue-500"
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-inter tracking-[-0.5px]">
                          ${opp.value?.toLocaleString() || 0}
                        </span>
                        {opp.value_period && opp.value_period !== "one_time" && (
                          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                            / {opp.value_period === "monthly" ? "mo" : "yr"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                        {opp.status_label} {opp.confidence && `· ${opp.confidence}%`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {opp.date_won ? (
                      <span className="text-xs text-green-600 font-inter tracking-[-0.5px]">
                        Won {format(new Date(opp.date_won), 'MMM d')}
                      </span>
                    ) : (
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-4 text-center">
              No opportunities yet
            </p>
          )}
        </section>
      )}

      {/* Activity Log - Only show if linked */}
      {isLinked && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase">
              Activity
            </h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActivityDialogOpen(true)}
              className="h-7 px-2 text-xs font-inter tracking-[-0.5px]"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Log
            </Button>
          </div>

          {activitiesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-0">
              {activities.map((activity) => {
                const typeInfo = getActivityTypeInfo(activity.activity_type);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 py-3 border-b border-border/30 last:border-0"
                  >
                    <div className={cn("mt-0.5", typeInfo.color)}>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-inter tracking-[-0.5px]">
                          {typeInfo.label}
                        </span>
                        {activity.direction && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            {activity.direction}
                          </Badge>
                        )}
                        {activity.duration_seconds && (
                          <span className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                            {formatDuration(activity.duration_seconds)}
                          </span>
                        )}
                      </div>
                      {(activity.subject || activity.body) && (
                        <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px] truncate mt-0.5">
                          {activity.subject || activity.body}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/60 font-inter tracking-[-0.5px] mt-1">
                        {activity.user_name && `${activity.user_name} · `}
                        {formatDistanceToNow(new Date(activity.activity_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px] py-4 text-center">
              No activity logged
            </p>
          )}
        </section>
      )}

      {/* Contacts - Only show if linked and has contacts */}
      {isLinked && closeBrand?.close_contacts && closeBrand.close_contacts.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.5px] uppercase mb-3">
            Contacts
          </h3>
          <div className="space-y-0">
            {closeBrand.close_contacts.map((contact) => (
              <div
                key={contact.id}
                className="py-3 border-b border-border/30 last:border-0"
              >
                <p className="text-sm font-inter tracking-[-0.5px]">
                  {contact.name}
                </p>
                {contact.title && (
                  <p className="text-xs text-muted-foreground font-inter tracking-[-0.5px]">
                    {contact.title}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-1">
                  {contact.emails?.map((email, i) => (
                    <a
                      key={i}
                      href={`mailto:${email.email}`}
                      className="text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
                    >
                      {email.email}
                    </a>
                  ))}
                  {contact.phones?.map((phone, i) => (
                    <a
                      key={i}
                      href={`tel:${phone.phone}`}
                      className="text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.5px]"
                    >
                      {phone.phone}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dialogs */}
      <OpportunityDialog
        open={opportunityDialogOpen}
        onOpenChange={(open) => {
          setOpportunityDialogOpen(open);
          if (!open) setEditingOpportunity(null);
        }}
        brandId={brandId}
        opportunity={editingOpportunity}
        statuses={oppStatuses || []}
      />

      <ActivityLogDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        brandId={brandId}
        brandName={brandName}
      />

      <AdminConfirmDialog
        open={unlinkConfirmOpen}
        onOpenChange={setUnlinkConfirmOpen}
        title="Unlink from Close CRM"
        description="Are you sure you want to unlink this brand from Close CRM? This won't delete the lead in Close."
        confirmLabel="Unlink"
        onConfirm={executeUnlink}
        variant="destructive"
        loading={unlinkFromClose.isPending}
      />
    </div>
  );
}
