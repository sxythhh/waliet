import { forwardRef } from "react";
import { TicketFilters as TicketFiltersType, TicketStatus, TicketPriority, TicketCategory } from "@/types/tickets";
import { AdminUser } from "@/types/tickets";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, RefreshCw } from "lucide-react";
import { STATUS_OPTIONS, PRIORITY_OPTIONS, TICKET_CATEGORIES } from "./constants";

interface TicketFiltersProps {
  filters: TicketFiltersType;
  onFiltersChange: (filters: Partial<TicketFiltersType>) => void;
  onRefresh: () => void;
  adminUsers: AdminUser[];
  loading?: boolean;
}

export const TicketFilters = forwardRef<HTMLInputElement, TicketFiltersProps>(
  function TicketFilters(
    { filters, onFiltersChange, onRefresh, adminUsers, loading },
    ref
  ) {
    const hasActiveFilters =
      filters.status !== "all" ||
      filters.priority !== "all" ||
      filters.category !== "all" ||
      filters.assigned !== "all" ||
      filters.search.length > 0;

    const clearFilters = () => {
      onFiltersChange({
        search: "",
        status: "all",
        priority: "all",
        category: "all",
        assigned: "all",
      });
    };

    return (
      <div className="space-y-3">
        {/* Search + Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={ref}
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="pl-9 pr-8 h-9"
            />
            {filters.search && (
              <button
                onClick={() => onFiltersChange({ search: "" })}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 px-3"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status */}
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ status: value as TicketStatus | "all" })}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority */}
          <Select
            value={filters.priority}
            onValueChange={(value) => onFiltersChange({ priority: value as TicketPriority | "all" })}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {PRIORITY_OPTIONS.map((priority) => (
                <SelectItem key={priority.id} value={priority.id}>
                  {priority.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select
            value={filters.category}
            onValueChange={(value) => onFiltersChange({ category: value as TicketCategory | "all" })}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TICKET_CATEGORIES.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Assigned */}
          <Select
            value={filters.assigned}
            onValueChange={(value) => onFiltersChange({ assigned: value })}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tickets</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {adminUsers.map((admin) => (
                <SelectItem key={admin.id} value={admin.id}>
                  {admin.full_name || admin.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    );
  }
);
