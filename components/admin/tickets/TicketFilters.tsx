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
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={ref}
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-8 pr-7 h-7 text-xs"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: "" })}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status */}
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ status: value as TicketStatus | "all" })}
        >
          <SelectTrigger className="h-7 w-[110px] text-xs">
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
          <SelectTrigger className="h-7 w-[100px] text-xs">
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
          <SelectTrigger className="h-7 w-[110px] text-xs">
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
          <SelectTrigger className="h-7 w-[110px] text-xs">
            <SelectValue placeholder="Assigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {adminUsers.map((admin) => (
              <SelectItem key={admin.id} value={admin.id}>
                {admin.full_name || admin.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Refresh */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-7 w-7 p-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
    );
  }
);
