import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2, ChevronDown, ChevronUp, LayoutGrid, LayoutList } from "lucide-react";

// Column definition with priority for responsive hiding
export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => React.ReactNode;
  // Priority: 1 = always visible, 2 = hide on tablet, 3 = hide on mobile
  priority?: 1 | 2 | 3;
  // Optional width class
  width?: string;
  // Alignment
  align?: "left" | "center" | "right";
  // Custom cell renderer
  cell?: (row: T, index: number) => React.ReactNode;
  // For card view - label shown above value
  cardLabel?: string;
  // Hide in card view
  hideInCard?: boolean;
}

interface ResponsiveDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  // Unique key for each row
  getRowId: (row: T) => string;
  // Optional row click handler
  onRowClick?: (row: T) => void;
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  // Loading state
  loading?: boolean;
  // Empty state
  emptyMessage?: string;
  // Card view renderer (optional custom card)
  renderCard?: (row: T, isSelected: boolean) => React.ReactNode;
  // Force view mode (otherwise auto-switches)
  viewMode?: "table" | "cards" | "auto";
  // Additional class names
  className?: string;
  // Row class name function
  rowClassName?: (row: T) => string;
}

export function ResponsiveDataTable<T>({
  data,
  columns,
  getRowId,
  onRowClick,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  loading = false,
  emptyMessage = "No data found",
  renderCard,
  viewMode = "auto",
  className,
  rowClassName,
}: ResponsiveDataTableProps<T>) {
  // Column visibility state
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  // Manual view override
  const [manualView, setManualView] = useState<"table" | "cards" | null>(null);

  // Get visible columns based on hidden state
  const visibleColumns = useMemo(
    () => columns.filter((col) => !hiddenColumns.has(col.id)),
    [columns, hiddenColumns]
  );

  // Toggle column visibility
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

  // Selection handlers
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

  // Get cell value
  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    if (column.cell) {
      return column.cell(row, data.indexOf(row));
    }
    if (column.accessorFn) {
      return column.accessorFn(row);
    }
    if (column.accessorKey) {
      return row[column.accessorKey] as React.ReactNode;
    }
    return null;
  };

  // Determine current view mode
  const currentView = manualView || (viewMode === "auto" ? null : viewMode);

  // Render table view
  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            {selectable && (
              <th className="w-12 px-4 py-3">
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
                  "px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap",
                  column.width,
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                  // Hide based on priority
                  column.priority === 2 && "hidden md:table-cell",
                  column.priority === 3 && "hidden lg:table-cell"
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.has(rowId);

            return (
              <tr
                key={rowId}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-border/30 transition-colors",
                  onRowClick && "cursor-pointer",
                  isSelected
                    ? "bg-primary/5 hover:bg-primary/10"
                    : "hover:bg-muted/50",
                  rowClassName?.(row)
                )}
              >
                {selectable && (
                  <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                      "px-4 py-3",
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

  // Render card view
  const renderCardView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {data.map((row) => {
        const rowId = getRowId(row);
        const isSelected = selectedIds.has(rowId);

        if (renderCard) {
          return (
            <div key={rowId} onClick={() => onRowClick?.(row)}>
              {renderCard(row, isSelected)}
            </div>
          );
        }

        // Default card rendering
        const cardColumns = visibleColumns.filter((col) => !col.hideInCard);

        return (
          <div
            key={rowId}
            onClick={() => onRowClick?.(row)}
            className={cn(
              "p-4 rounded-xl border transition-colors",
              onRowClick && "cursor-pointer",
              isSelected
                ? "bg-primary/5 border-primary/30 hover:bg-primary/10"
                : "bg-muted/20 border-border/30 hover:bg-muted/40"
            )}
          >
            {selectable && (
              <div
                className="flex items-center gap-2 mb-3 pb-3 border-b border-border/30"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleRowSelection(rowId)}
                />
                <span className="text-xs text-muted-foreground">Select</span>
              </div>
            )}
            <div className="space-y-2">
              {cardColumns.map((column) => (
                <div key={column.id} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-muted-foreground shrink-0">
                    {column.cardLabel || column.header}
                  </span>
                  <span
                    className={cn(
                      "text-sm text-right",
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

  return (
    <div className={cn("space-y-3", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* View toggle (mobile only when auto) */}
          {viewMode === "auto" && (
            <div className="flex items-center gap-1 lg:hidden">
              <Button
                variant={currentView === "cards" || (!currentView) ? "secondary" : "ghost"}
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

        {/* Column visibility dropdown */}
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
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <>
          {/* Auto mode: cards on mobile, table on desktop */}
          {viewMode === "auto" && !manualView && (
            <>
              <div className="lg:hidden">{renderCardView()}</div>
              <div className="hidden lg:block">{renderTableView()}</div>
            </>
          )}
          {/* Manual or forced mode */}
          {(currentView === "cards") && renderCardView()}
          {(currentView === "table") && renderTableView()}
        </>
      )}
    </div>
  );
}

// Helper hook for managing responsive table state
export function useResponsiveTable<T>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const clearSelection = () => setSelectedIds(new Set());

  const selectAll = (data: T[], getRowId: (row: T) => string) => {
    setSelectedIds(new Set(data.map(getRowId)));
  };

  return {
    selectedIds,
    setSelectedIds,
    clearSelection,
    selectAll,
  };
}
