import { useState, useMemo, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronUp,
  ChevronDown,
  Settings2,
  LayoutGrid,
  LayoutList,
} from "lucide-react";
import {
  TABLE,
  TYPOGRAPHY,
  TRANSITIONS,
  RADII,
  BACKGROUNDS,
  BORDERS,
} from "@/lib/admin-tokens";

// =============================================================================
// TYPES
// =============================================================================

export interface AdminTableColumn<T> {
  /** Unique column identifier */
  id: string;
  /** Column header text */
  header: string;
  /** Key to access data (for simple values) */
  accessorKey?: keyof T;
  /** Function to access data (for computed values) */
  accessorFn?: (row: T) => ReactNode;
  /** Custom cell renderer */
  cell?: (row: T, index: number) => ReactNode;
  /** Column width class */
  width?: string;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Responsive priority: 1=always, 2=hide tablet, 3=hide mobile */
  priority?: 1 | 2 | 3;
  /** Enable sorting */
  sortable?: boolean;
  /** Label for card view */
  cardLabel?: string;
  /** Hide in card view */
  hideInCard?: boolean;
}

export interface AdminTableProps<T> {
  /** Table data */
  data: T[];
  /** Column definitions */
  columns: AdminTableColumn<T>[];
  /** Function to get unique row ID */
  getRowId: (row: T) => string;
  /** Row click handler */
  onRowClick?: (row: T) => void;
  /** Enable row selection */
  selectable?: boolean;
  /** Selected row IDs */
  selectedIds?: Set<string>;
  /** Selection change handler */
  onSelectionChange?: (ids: Set<string>) => void;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon */
  emptyIcon?: ReactNode;
  /** View mode: auto switches based on screen size */
  viewMode?: "table" | "cards" | "auto";
  /** Show column visibility toggle */
  showColumnToggle?: boolean;
  /** Show view mode toggle */
  showViewToggle?: boolean;
  /** Additional wrapper class */
  className?: string;
  /** Row class function */
  rowClassName?: (row: T) => string;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Custom card renderer */
  renderCard?: (row: T, isSelected: boolean) => ReactNode;
}

type SortDirection = "asc" | "desc" | null;
interface SortState {
  columnId: string | null;
  direction: SortDirection;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AdminTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  loading = false,
  emptyMessage = "No data found",
  emptyIcon,
  viewMode = "auto",
  showColumnToggle = true,
  showViewToggle = true,
  className,
  rowClassName,
  stickyHeader = false,
  renderCard,
}: AdminTableProps<T>) {
  // State
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [manualView, setManualView] = useState<"table" | "cards" | null>(null);
  const [sort, setSort] = useState<SortState>({ columnId: null, direction: null });

  // Computed
  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenColumns.has(col.id)),
    [columns, hiddenColumns]
  );

  const sortedData = useMemo(() => {
    if (!sort.columnId || !sort.direction) return data;

    const column = columns.find((c) => c.id === sort.columnId);
    if (!column) return data;

    return [...data].sort((a, b) => {
      const aVal = column.accessorKey
        ? a[column.accessorKey]
        : column.accessorFn
        ? column.accessorFn(a)
        : null;
      const bVal = column.accessorKey
        ? b[column.accessorKey]
        : column.accessorFn
        ? column.accessorFn(b)
        : null;

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [data, sort, columns]);

  const currentView = manualView || (viewMode === "auto" ? null : viewMode);

  // Handlers
  const toggleColumn = (columnId: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const toggleRowSelection = (rowId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!onSelectionChange) return;

    const next = new Set(selectedIds);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    onSelectionChange(next);
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(getRowId)));
    }
  };

  const handleSort = (columnId: string) => {
    setSort((prev) => {
      if (prev.columnId !== columnId) {
        return { columnId, direction: "asc" };
      }
      if (prev.direction === "asc") {
        return { columnId, direction: "desc" };
      }
      return { columnId: null, direction: null };
    });
  };

  const getCellValue = (row: T, column: AdminTableColumn<T>): ReactNode => {
    if (column.cell) return column.cell(row, data.indexOf(row));
    if (column.accessorFn) return column.accessorFn(row);
    if (column.accessorKey) return row[column.accessorKey] as ReactNode;
    return null;
  };

  // Renderers
  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className={cn(stickyHeader && "sticky top-0 z-10")}>
          <tr className={cn("border-b", BORDERS.default)}>
            {selectable && (
              <th className={cn("w-12", TABLE.headerCell)}>
                <Checkbox
                  checked={data.length > 0 && selectedIds.size === data.length}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
            )}
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  TABLE.headerCell,
                  column.width,
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                  column.priority === 2 && "hidden md:table-cell",
                  column.priority === 3 && "hidden lg:table-cell",
                  column.sortable && "cursor-pointer select-none hover:text-foreground"
                )}
                onClick={() => column.sortable && handleSort(column.id)}
              >
                <span className="inline-flex items-center gap-1">
                  {column.header}
                  {column.sortable && sort.columnId === column.id && (
                    sort.direction === "asc" ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.has(rowId);

            return (
              <tr
                key={rowId}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  TABLE.row,
                  onRowClick && "cursor-pointer",
                  isSelected ? TABLE.rowSelected : TABLE.rowHover,
                  TRANSITIONS.fast,
                  rowClassName?.(row)
                )}
              >
                {selectable && (
                  <td
                    className={cn("w-12", TABLE.bodyCell)}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRowSelection(rowId)}
                    />
                  </td>
                )}
                {visibleColumns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      TABLE.bodyCell,
                      column.width,
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.priority === 2 && "hidden md:table-cell",
                      column.priority === 3 && "hidden lg:table-cell"
                    )}
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sortedData.map((row) => {
        const rowId = getRowId(row);
        const isSelected = selectedIds.has(rowId);

        if (renderCard) {
          return (
            <div key={rowId} onClick={() => onRowClick?.(row)}>
              {renderCard(row, isSelected)}
            </div>
          );
        }

        const cardColumns = visibleColumns.filter((col) => !col.hideInCard);

        return (
          <div
            key={rowId}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "p-4",
              "rounded-xl",
              "border border-border/50",
              "transition-all duration-200",
              onRowClick && "cursor-pointer",
              isSelected
                ? "bg-primary/5 border-primary/30 hover:bg-primary/10"
                : "bg-muted/30 dark:bg-muted/20 hover:bg-muted/40 dark:hover:bg-muted/30"
            )}
          >
            {selectable && (
              <div
                className={cn(
                  "flex items-center gap-2 mb-3 pb-3 border-b",
                  BORDERS.subtle
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleRowSelection(rowId)}
                />
                <span className={TYPOGRAPHY.caption}>Select</span>
              </div>
            )}
            <div className="space-y-2">
              {cardColumns.map((column) => (
                <div
                  key={column.id}
                  className="flex items-start justify-between gap-2"
                >
                  <span className={TYPOGRAPHY.caption}>
                    {column.cardLabel || column.header}
                  </span>
                  <span
                    className={cn(
                      TYPOGRAPHY.value,
                      "text-right",
                      column.align === "left" && "text-left",
                      column.align === "center" && "text-center"
                    )}
                  >
                    {getCellValue(row, column)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {emptyIcon && <div className="mb-4 text-muted-foreground/50">{emptyIcon}</div>}
      <p className={TYPOGRAPHY.body}>{emptyMessage}</p>
    </div>
  );

  const renderLoading = () => (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Controls */}
      {(showViewToggle || showColumnToggle) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* View toggle (mobile) */}
            {showViewToggle && viewMode === "auto" && (
              <div className="flex items-center gap-1 lg:hidden">
                <Button
                  variant={currentView === "cards" || !currentView ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setManualView("cards")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={currentView === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setManualView("table")}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Column visibility */}
          {showColumnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Columns</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={!hiddenColumns.has(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        renderLoading()
      ) : data.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          {/* Auto mode: responsive switching */}
          {viewMode === "auto" && !manualView && (
            <>
              <div className="lg:hidden">{renderCardView()}</div>
              <div className="hidden lg:block">{renderTableView()}</div>
            </>
          )}
          {/* Manual/forced mode */}
          {currentView === "cards" && renderCardView()}
          {currentView === "table" && renderTableView()}
        </>
      )}
    </div>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useAdminTable<T>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const clearSelection = () => setSelectedIds(new Set());

  const selectAll = (data: T[], getRowId: (row: T) => string) => {
    setSelectedIds(new Set(data.map(getRowId)));
  };

  const isAllSelected = (data: T[], getRowId: (row: T) => string) => {
    return data.length > 0 && selectedIds.size === data.length;
  };

  return {
    selectedIds,
    setSelectedIds,
    clearSelection,
    selectAll,
    isAllSelected,
    selectedCount: selectedIds.size,
  };
}
