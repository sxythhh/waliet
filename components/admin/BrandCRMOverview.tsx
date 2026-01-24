import { formatDistanceToNow } from "date-fns";
import {
  ExternalLink,
  Phone,
  Mail,
  User,
  Activity,
  TrendingUp,
  MessageSquare,
  PhoneCall,
  FileText,
  Calendar,
  LinkIcon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCloseBrand, useCloseLeadStatuses, useUpdateCloseStatus } from "@/hooks/useCloseBrand";
import { useCloseOpportunities } from "@/hooks/useCloseOpportunities";
import { useCloseActivities } from "@/hooks/useCloseActivities";
import { cn } from "@/lib/utils";

interface BrandCRMOverviewProps {
  brandId: string;
  closeLeadId: string | null;
}

// Format currency
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

// Activity type icons
const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: PhoneCall,
  email: Mail,
  note: FileText,
  meeting: Calendar,
  sms: MessageSquare,
  task_completed: Activity,
};

export function BrandCRMOverview({ brandId, closeLeadId }: BrandCRMOverviewProps) {
  const { data: crmData, isLoading: crmLoading } = useCloseBrand(brandId);
  const { data: statuses = [], isLoading: statusesLoading } = useCloseLeadStatuses();
  const { data: opportunities = [] } = useCloseOpportunities(brandId);
  const { data: activities = [] } = useCloseActivities(brandId);
  const updateStatus = useUpdateCloseStatus();

  const isLoading = crmLoading || statusesLoading;

  if (!closeLeadId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-border/50">
        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <LinkIcon className="h-5 w-5 text-muted-foreground/60" />
        </div>
        <p className="text-sm font-medium font-inter tracking-[-0.5px] text-foreground">
          Not connected to Close
        </p>
        <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px] mt-1">
          Sync this brand to see CRM data
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  // Calculate pipeline metrics
  const activeOpps = opportunities.filter((o) => o.status_type === "active");
  const wonOpps = opportunities.filter((o) => o.status_type === "won");
  const weightedValue = activeOpps.reduce(
    (sum, o) => sum + ((o.value || 0) * (o.confidence || 50)) / 100,
    0
  );
  const wonValue = wonOpps.reduce((sum, o) => sum + (o.value || 0), 0);

  // Get last 5 activities
  const recentActivities = activities.slice(0, 5);

  // Get contacts
  const contacts = crmData?.close_contacts || [];

  return (
    <div className="space-y-4">
      {/* Status & Link Row */}
      <div className="flex items-center justify-between gap-3">
        <Select
          value={crmData?.close_status_id || ""}
          onValueChange={(value) => updateStatus.mutate({ brandId, statusId: value })}
          disabled={updateStatus.isPending}
        >
          <SelectTrigger className="flex-1 h-9 text-sm font-inter tracking-[-0.5px] bg-muted/30 dark:bg-muted/20 border-0 rounded-lg">
            <SelectValue placeholder="Select status">
              {crmData?.close_status_label || "Select status"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
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
        <a
          href={`https://app.close.com/lead/${closeLeadId}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-medium font-inter tracking-[-0.3px] text-muted-foreground hover:text-foreground bg-muted/30 dark:bg-muted/20 rounded-lg transition-colors"
        >
          Open
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground font-inter tracking-[-0.3px] mb-1">
            Pipeline
          </p>
          <p className="text-base font-semibold font-inter tracking-[-0.5px]">
            {formatCurrency(weightedValue)}
          </p>
        </div>
        <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground font-inter tracking-[-0.3px] mb-1">
            Won
          </p>
          <p className="text-base font-semibold font-inter tracking-[-0.5px] text-emerald-500 flex items-center justify-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {formatCurrency(wonValue)}
          </p>
        </div>
        <div className="bg-muted/30 dark:bg-muted/20 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase text-muted-foreground font-inter tracking-[-0.3px] mb-1">
            Active
          </p>
          <p className="text-base font-semibold font-inter tracking-[-0.5px]">
            {activeOpps.length}
          </p>
        </div>
      </div>

      {/* Contacts */}
      {contacts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px] uppercase">
              Contacts
            </span>
          </div>
          <div className="space-y-1.5">
            {contacts.slice(0, 3).map((contact: any, idx: number) => (
              <div
                key={contact.id || idx}
                className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 dark:bg-muted/20"
              >
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium font-inter">
                  {contact.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium font-inter tracking-[-0.5px] truncate">
                    {contact.name || "Unknown"}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {contact.emails?.[0]?.email && (
                      <a
                        href={`mailto:${contact.emails[0].email}`}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{contact.emails[0].email}</span>
                      </a>
                    )}
                    {contact.phones?.[0]?.phone && (
                      <a
                        href={`tel:${contact.phones[0].phone}`}
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="h-3 w-3" />
                        {contact.phones[0].phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentActivities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px] uppercase">
              Recent Activity
            </span>
          </div>
          <div className="space-y-1">
            {recentActivities.map((activity: any) => {
              const Icon = ACTIVITY_ICONS[activity.activity_type] || Activity;
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-2 py-1.5"
                >
                  <div
                    className={cn(
                      "h-5 w-5 rounded flex items-center justify-center shrink-0",
                      activity.direction === "inbound"
                        ? "bg-blue-500/10 text-blue-500"
                        : "bg-emerald-500/10 text-emerald-500"
                    )}
                  >
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="text-xs font-medium font-inter tracking-[-0.3px] capitalize flex-1 truncate">
                    {activity.activity_type}
                    {activity.direction && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({activity.direction})
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-inter tracking-[-0.3px] shrink-0">
                    {formatDistanceToNow(new Date(activity.activity_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {opportunities.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground font-inter tracking-[-0.3px] uppercase">
                Opportunities
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground font-inter">
              {opportunities.length} total
            </span>
          </div>
          <div className="space-y-1">
            {opportunities.slice(0, 4).map((opp: any) => (
              <div
                key={opp.id}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30 dark:bg-muted/20"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      opp.status_type === "won"
                        ? "bg-emerald-500"
                        : opp.status_type === "lost"
                        ? "bg-red-500"
                        : "bg-blue-500"
                    )}
                  />
                  <span className="text-xs font-inter tracking-[-0.3px] capitalize">
                    {opp.status_label || opp.status_type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {opp.value && (
                    <span className="text-xs font-medium font-inter tracking-[-0.3px]">
                      {formatCurrency(opp.value)}
                    </span>
                  )}
                  {opp.confidence && opp.status_type === "active" && (
                    <span className="text-[10px] text-muted-foreground font-inter">
                      {opp.confidence}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last synced footer */}
      <p className="text-[10px] text-muted-foreground/60 font-inter tracking-[-0.3px] text-center pt-1">
        Synced {crmData?.close_synced_at
          ? formatDistanceToNow(new Date(crmData.close_synced_at), { addSuffix: true })
          : "never"}
      </p>
    </div>
  );
}
