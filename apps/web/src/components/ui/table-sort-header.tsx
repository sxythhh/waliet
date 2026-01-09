import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TableHead } from "./table";

export type SortDirection = "asc" | "desc" | null;

export interface TableSortHeaderProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Callback when sort is triggered */
  onSort?: () => void;
  /** Column identifier for accessibility */
  columnId?: string;
}

/**
 * Sortable table header cell with visual indicators.
 * 
 * @example
 * ```tsx
 * const [sort, setSort] = useState<{ column: string; direction: SortDirection }>({ 
 *   column: "name", 
 *   direction: "asc" 
 * });
 * 
 * <TableSortHeader
 *   sortable
 *   sortDirection={sort.column === "name" ? sort.direction : null}
 *   onSort={() => handleSort("name")}
 * >
 *   Name
 * </TableSortHeader>
 * ```
 */
const TableSortHeader = React.forwardRef<
  HTMLTableCellElement,
  TableSortHeaderProps
>(
  (
    {
      sortable = false,
      sortDirection = null,
      onSort,
      columnId,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const handleClick = () => {
      if (sortable && onSort) {
        onSort();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (sortable && onSort && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onSort();
      }
    };

    const getSortIcon = () => {
      if (!sortable) return null;
      
      if (sortDirection === "asc") {
        return <ArrowUp className="h-4 w-4" aria-hidden="true" />;
      }
      if (sortDirection === "desc") {
        return <ArrowDown className="h-4 w-4" aria-hidden="true" />;
      }
      return <ArrowUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />;
    };

    const getAriaSort = (): "ascending" | "descending" | "none" | undefined => {
      if (!sortable) return undefined;
      if (sortDirection === "asc") return "ascending";
      if (sortDirection === "desc") return "descending";
      return "none";
    };

    return (
      <TableHead
        ref={ref}
        className={cn(
          sortable && [
            "cursor-pointer select-none",
            "hover:bg-muted/50 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          ],
          className
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={sortable ? 0 : undefined}
        role={sortable ? "columnheader" : undefined}
        aria-sort={getAriaSort()}
        id={columnId}
        {...props}
      >
        <div className="flex items-center gap-2">
          <span>{children}</span>
          {getSortIcon()}
        </div>
      </TableHead>
    );
  }
);

TableSortHeader.displayName = "TableSortHeader";

export { TableSortHeader };
