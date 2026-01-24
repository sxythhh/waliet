import { useState, useMemo, useCallback, memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Building2,
  Loader2,
  DollarSign,
  GripVertical,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandContextSheet } from "./BrandContextSheet";
import { BrandWithCRM } from "@/hooks/useBrandsWithCRM";
import { useCloseLeadStatusesCached, useUpdateCloseStatus, useSyncBrandToClose } from "@/hooks/useCloseBrand";
import { getStatusColor } from "./CloseStatusBadge";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface PipelineColumn {
  id: string | null;
  label: string;
  color: string;
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

// Initial visible count per column (for performance)
const INITIAL_VISIBLE_COUNT = 20;

interface BrandPipelineViewProps {
  brands: BrandWithCRM[];
  isLoading: boolean;
}

export function BrandPipelineView({ brands, isLoading }: BrandPipelineViewProps) {
  const queryClient = useQueryClient();
  const { data: closeStatuses = [], isLoading: statusesLoading } = useCloseLeadStatusesCached();
  const [selectedBrand, setSelectedBrand] = useState<BrandWithCRM | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeDragBrand, setActiveDragBrand] = useState<BrandWithCRM | null>(null);

  // Track expanded columns (show all brands)
  const [expandedColumns, setExpandedColumns] = useState<Set<string | null>>(new Set());

  const updateStatus = useUpdateCloseStatus();
  const syncToClose = useSyncBrandToClose();

  // Configure drag sensors - require 8px movement to start drag (prevents accidental drags)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Build dynamic columns from Close statuses
  const columns = useMemo((): PipelineColumn[] => {
    // Start with "Unlinked" column for brands not in Close
    const cols: PipelineColumn[] = [
      { id: null, label: "Unlinked", color: "#6b7280" },
    ];

    // Add Close statuses
    for (const status of closeStatuses) {
      cols.push({
        id: status.id,
        label: status.label,
        color: getStatusColor(status.label),
      });
    }

    return cols;
  }, [closeStatuses]);

  // Group brands by column
  const brandsByColumn = useMemo(() => {
    const map = new Map<string | null, BrandWithCRM[]>();

    // Initialize all columns with empty arrays
    for (const col of columns) {
      map.set(col.id, []);
    }

    // Assign brands to columns
    for (const brand of brands) {
      const columnId = brand.close_status_id;
      const existing = map.get(columnId);
      if (existing) {
        existing.push(brand);
      } else if (columnId === null) {
        // Brand without Close status goes to Unlinked
        map.get(null)?.push(brand);
      } else {
        // Brand with unknown status (status might not be in our list yet)
        // Add to a dynamic column or to Unlinked
        map.get(null)?.push(brand);
      }
    }

    return map;
  }, [brands, columns]);

  // Calculate pipeline totals by column
  const columnTotals = useMemo(() => {
    const totals = new Map<string | null, number>();
    for (const col of columns) {
      const colBrands = brandsByColumn.get(col.id) || [];
      const total = colBrands.reduce((sum, b) => sum + (b.weighted_pipeline_value || 0), 0);
      totals.set(col.id, total);
    }
    return totals;
  }, [columns, brandsByColumn]);

  // Memoized callbacks
  const handleBrandClick = useCallback((brand: BrandWithCRM) => {
    setSelectedBrand(brand);
    setSheetOpen(true);
  }, []);

  const handleExpandColumn = useCallback((columnId: string | null) => {
    setExpandedColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const brandId = event.active.id as string;
    const brand = brands.find((b) => b.id === brandId);
    setActiveDragBrand(brand || null);
  }, [brands]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragBrand(null);

    const { active, over } = event;
    if (!over) return;

    const brandId = active.id as string;
    const newStatusId = over.id as string | null;
    const brand = brands.find((b) => b.id === brandId);

    if (!brand) return;

    // Don't do anything if dropped on the same column
    const currentStatusId = brand.close_status_id;
    if (currentStatusId === newStatusId) return;

    // Handle dragging to "Unlinked" column - not supported
    if (newStatusId === "unlinked") {
      return;
    }

    // Handle dragging from "Unlinked" to a status column
    if (!brand.close_lead_id && newStatusId) {
      // Need to create a Close lead first, then update status
      syncToClose.mutate(
        { brandId, action: "create" },
        {
          onSuccess: () => {
            // After creating lead, update its status
            updateStatus.mutate(
              { brandId, statusId: newStatusId },
              {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ["brands-with-crm"] });
                },
              }
            );
          },
        }
      );
      return;
    }

    // Handle dragging between status columns
    if (brand.close_lead_id && newStatusId) {
      updateStatus.mutate(
        { brandId, statusId: newStatusId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["brands-with-crm"] });
          },
        }
      );
    }
  }, [brands, syncToClose, updateStatus, queryClient]);

  const loading = isLoading || statusesLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (brands.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <Building2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No brands yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first brand or sync from Close to get started
        </p>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Pipeline Columns - horizontal scroll on mobile */}
        <div className="overflow-x-auto pb-4">
          <div className="grid gap-4 min-h-[500px]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(250px, 1fr))` }}>
            {columns.map((column) => {
              const colBrands = brandsByColumn.get(column.id) || [];
              const colTotal = columnTotals.get(column.id) || 0;
              const isExpanded = expandedColumns.has(column.id);

              return (
                <DroppableColumn
                  key={column.id ?? "unlinked"}
                  columnId={column.id}
                  label={column.label}
                  color={column.color}
                  brands={colBrands}
                  total={colTotal}
                  onBrandClick={handleBrandClick}
                  isExpanded={isExpanded}
                  onToggleExpand={handleExpandColumn}
                  initialVisibleCount={INITIAL_VISIBLE_COUNT}
                />
              );
            })}
          </div>
        </div>

        {/* Drag Overlay - shows the brand card while dragging */}
        <DragOverlay dropAnimation={null}>
          {activeDragBrand ? (
            <BrandCardOverlay brand={activeDragBrand} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Brand Context Sheet */}
      <BrandContextSheet
        brand={selectedBrand}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onBrandUpdated={() => {}}
      />
    </>
  );
}

// Droppable Column Component
interface DroppableColumnProps {
  columnId: string | null;
  label: string;
  color: string;
  brands: BrandWithCRM[];
  total: number;
  onBrandClick: (brand: BrandWithCRM) => void;
  isExpanded: boolean;
  onToggleExpand: (columnId: string | null) => void;
  initialVisibleCount: number;
}

const DroppableColumn = memo(function DroppableColumn({
  columnId,
  label,
  color,
  brands,
  total,
  onBrandClick,
  isExpanded,
  onToggleExpand,
  initialVisibleCount,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId ?? "unlinked",
  });

  // Limit visible brands for performance
  const visibleBrands = isExpanded ? brands : brands.slice(0, initialVisibleCount);
  const hiddenCount = brands.length - visibleBrands.length;

  const handleToggle = useCallback(() => {
    onToggleExpand(columnId);
  }, [onToggleExpand, columnId]);

  return (
    <div ref={setNodeRef} className="flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 py-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-sm font-medium font-inter tracking-[-0.5px]">{label}</span>
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px] tabular-nums">
            ({brands.length})
          </span>
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px] flex items-center gap-0.5">
            <DollarSign className="h-3 w-3" />
            {formatCurrency(total)}
          </span>
        )}
      </div>

      {/* Column Content - droppable area */}
      <div
        className={cn(
          "flex-1 space-y-2 rounded-lg p-2 -m-2",
          isOver && "bg-primary/5 border-2 border-dashed border-primary/30"
        )}
      >
        {brands.length === 0 ? (
          <div className={cn(
            "flex items-center justify-center h-20 text-xs text-muted-foreground font-inter tracking-[-0.3px] border border-dashed rounded-lg",
            isOver ? "border-primary/30 bg-primary/5" : "border-border/50"
          )}>
            {isOver ? "Drop here" : "No brands"}
          </div>
        ) : (
          <>
            {visibleBrands.map((brand) => (
              <DraggableBrandCard
                key={brand.id}
                brand={brand}
                onClick={onBrandClick}
              />
            ))}
            {/* Show more button */}
            {hiddenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggle}
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px] border border-dashed border-border/50 hover:border-border"
              >
                <ChevronDown className="h-3 w-3 mr-1" />
                Show {hiddenCount} more
              </Button>
            )}
            {isExpanded && brands.length > initialVisibleCount && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggle}
                className="w-full h-8 text-xs text-muted-foreground hover:text-foreground font-inter tracking-[-0.3px]"
              >
                Show less
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// Draggable Brand Card Wrapper - Memoized
interface DraggableBrandCardProps {
  brand: BrandWithCRM;
  onClick: (brand: BrandWithCRM) => void;
}

const DraggableBrandCard = memo(function DraggableBrandCard({ brand, onClick }: DraggableBrandCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: brand.id,
  });

  const handleClick = useCallback(() => {
    onClick(brand);
  }, [onClick, brand]);

  return (
    <div
      ref={setNodeRef}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <BrandCard
        brand={brand}
        onClick={handleClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
});

// Brand Card Component - Memoized
interface BrandCardProps {
  brand: BrandWithCRM;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const BrandCard = memo(function BrandCard({ brand, onClick, isDragging, dragHandleProps }: BrandCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer bg-card border border-border/50",
        isDragging
          ? "shadow-lg ring-2 ring-primary/20"
          : "hover:bg-muted/50"
      )}
    >
      {/* Drag Handle */}
      <div
        {...dragHandleProps}
        className="shrink-0 cursor-grab active:cursor-grabbing p-0.5 -ml-1 rounded hover:bg-muted/50 text-muted-foreground/50 hover:text-muted-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Logo */}
      <Avatar className="h-9 w-9 rounded-lg">
        <AvatarImage src={brand.logo_url || ""} alt={brand.name} className="object-cover" />
        <AvatarFallback className="rounded-lg bg-muted text-xs font-medium font-inter">
          {brand.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium font-inter tracking-[-0.5px] truncate">{brand.name}</span>
          {brand.is_verified && (
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {brand.weighted_pipeline_value > 0 ? (
            <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              {formatCurrency(brand.weighted_pipeline_value)} pipeline
            </span>
          ) : brand.subscription_plan ? (
            <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px] capitalize">
              {brand.subscription_plan}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
              {formatDistanceToNow(new Date(brand.created_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// Lightweight overlay for drag (no hooks, just display)
function BrandCardOverlay({ brand }: { brand: BrandWithCRM }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg cursor-grabbing bg-card border border-border shadow-lg ring-2 ring-primary/20">
      <div className="shrink-0 p-0.5 -ml-1 text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </div>
      <Avatar className="h-9 w-9 rounded-lg">
        <AvatarImage src={brand.logo_url || ""} alt={brand.name} className="object-cover" />
        <AvatarFallback className="rounded-lg bg-muted text-xs font-medium font-inter">
          {brand.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium font-inter tracking-[-0.5px] truncate">{brand.name}</span>
          {brand.is_verified && (
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
