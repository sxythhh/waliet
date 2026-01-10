import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format } from "date-fns";
import {
  CheckCircle2,
  Building2,
  Loader2,
  Search,
  Settings,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandContextSheet } from "./BrandContextSheet";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Brand {
  id: string;
  name: string;
  slug: string;
  brand_type: string | null;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  renewal_date: string | null;
  logo_url: string | null;
  description: string | null;
  home_url: string | null;
  account_url: string | null;
  assets_url: string | null;
  show_account_tab: boolean;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
}

// Column configuration
const ALL_COLUMNS = [
  { id: "brand", label: "Brand", required: true },
  { id: "status", label: "Status", required: false },
  { id: "plan", label: "Plan", required: false },
  { id: "type", label: "Type", required: false },
  { id: "created", label: "Created", required: false },
  { id: "renewal", label: "Renewal", required: false },
  { id: "website", label: "Website", required: false },
] as const;

type ColumnId = typeof ALL_COLUMNS[number]["id"];

// Sortable column item for drag-and-drop reordering
interface SortableColumnItemProps {
  id: string;
  label: string;
  isVisible: boolean;
  isRequired: boolean;
  onToggle: () => void;
}

function SortableColumnItem({
  id,
  label,
  isVisible,
  isRequired,
  onToggle,
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted/70"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
      </div>
      <Checkbox
        id={`col-${id}`}
        checked={isVisible}
        onCheckedChange={onToggle}
        disabled={isRequired}
        className="h-4 w-4 rounded-[3px] border-muted-foreground/40 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
      />
      <label
        htmlFor={`col-${id}`}
        className={`text-sm font-inter tracking-[-0.5px] cursor-pointer flex-1 ${
          isRequired ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {label}
      </label>
    </div>
  );
}

function getStatusBadge(status: string | null, isActive: boolean) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-500 border-0 font-inter tracking-[-0.3px] text-[10px]">
        Active
      </Badge>
    );
  }
  if (status === "past_due") {
    return (
      <Badge className="bg-amber-500/20 text-amber-500 border-0 font-inter tracking-[-0.3px] text-[10px]">
        Past Due
      </Badge>
    );
  }
  if (status === "cancelled") {
    return (
      <Badge className="bg-red-500/20 text-red-500 border-0 font-inter tracking-[-0.3px] text-[10px]">
        Cancelled
      </Badge>
    );
  }
  // Check for new brands
  if (!status) {
    return (
      <Badge className="bg-blue-500/20 text-blue-500 border-0 font-inter tracking-[-0.3px] text-[10px]">
        New
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-0 font-inter tracking-[-0.3px] text-[10px]">
      Inactive
    </Badge>
  );
}

export function BrandTableView() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Column configuration state
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(
    new Set(["brand", "status", "plan", "type", "created", "renewal"])
  );
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>(
    ALL_COLUMNS.map((c) => c.id)
  );

  // Sorting state
  const [sortBy, setSortBy] = useState<"created" | "name" | null>("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // DnD sensors for column reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleColumnDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as ColumnId);
        const newIndex = items.indexOf(over.id as ColumnId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const toggleColumnVisibility = useCallback((columnId: ColumnId) => {
    const column = ALL_COLUMNS.find((c) => c.id === columnId);
    if (column?.required) return;
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  }, []);

  // Get ordered visible columns
  const orderedVisibleColumns = useMemo(() => {
    return columnOrder.filter((id) => visibleColumns.has(id));
  }, [columnOrder, visibleColumns]);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select(`
          id,
          name,
          slug,
          brand_type,
          is_active,
          is_verified,
          created_at,
          renewal_date,
          logo_url,
          description,
          home_url,
          account_url,
          assets_url,
          show_account_tab,
          subscription_status,
          subscription_plan,
          subscription_expires_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandClick = (brand: Brand) => {
    setSelectedBrand(brand);
    setSheetOpen(true);
  };

  const handleSort = (column: "created" | "name") => {
    if (sortBy === column) {
      if (sortOrder === "desc") {
        setSortOrder("asc");
      } else {
        setSortBy(null);
        setSortOrder("desc");
      }
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Filter and sort brands
  const filteredBrands = useMemo(() => {
    let result = brands.filter((brand) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          brand.name.toLowerCase().includes(query) ||
          brand.slug.toLowerCase().includes(query) ||
          brand.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });

    if (sortBy) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        if (sortBy === "created") {
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortBy === "name") {
          comparison = a.name.localeCompare(b.name);
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [brands, searchQuery, sortBy, sortOrder]);

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
          Create your first brand to get started
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Header with Search and Column Toggle */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-0 font-inter tracking-[-0.5px] text-sm"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 gap-1.5 font-inter tracking-[-0.5px] text-xs bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
              Edit Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[220px] p-3 bg-background border border-border shadow-lg z-50"
            align="end"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-inter tracking-[-0.5px] text-xs font-medium text-foreground">
                  Columns
                </span>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleColumnDragEnd}
              >
                <SortableContext
                  items={columnOrder}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0.5">
                    {columnOrder.map((colId) => {
                      const col = ALL_COLUMNS.find((c) => c.id === colId);
                      if (!col) return null;
                      return (
                        <SortableColumnItem
                          key={col.id}
                          id={col.id}
                          label={col.label}
                          isVisible={visibleColumns.has(col.id)}
                          isRequired={col.required}
                          onToggle={() => toggleColumnVisibility(col.id)}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              {orderedVisibleColumns.map((colId) => {
                if (colId === "brand") {
                  return (
                    <TableHead
                      key={colId}
                      className="h-11 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-inter tracking-[-0.5px] text-xs font-medium">
                          Brand
                        </span>
                        {sortBy === "name" && (
                          sortOrder === "desc" ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronUp className="h-3.5 w-3.5" />
                          )
                        )}
                      </div>
                    </TableHead>
                  );
                }
                if (colId === "created") {
                  return (
                    <TableHead
                      key={colId}
                      className="h-11 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort("created")}
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-inter tracking-[-0.5px] text-xs font-medium">
                          Created
                        </span>
                        {sortBy === "created" && (
                          sortOrder === "desc" ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronUp className="h-3.5 w-3.5" />
                          )
                        )}
                      </div>
                    </TableHead>
                  );
                }
                const col = ALL_COLUMNS.find((c) => c.id === colId);
                return (
                  <TableHead key={colId} className="h-11">
                    <span className="font-inter tracking-[-0.5px] text-xs font-medium">
                      {col?.label}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBrands.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={orderedVisibleColumns.length}
                  className="h-24 text-center"
                >
                  <p className="text-sm text-muted-foreground">
                    No brands found
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredBrands.map((brand) => (
                <TableRow
                  key={brand.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleBrandClick(brand)}
                >
                  {orderedVisibleColumns.map((colId) => {
                    if (colId === "brand") {
                      return (
                        <TableCell key={colId} className="py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 rounded-lg">
                              <AvatarImage
                                src={brand.logo_url || ""}
                                alt={brand.name}
                                className="object-cover"
                              />
                              <AvatarFallback className="rounded-lg bg-muted text-xs font-medium">
                                {brand.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium font-inter tracking-[-0.3px]">
                                  {brand.name}
                                </span>
                                {brand.is_verified && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground font-inter tracking-[-0.3px]">
                                {brand.slug}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      );
                    }
                    if (colId === "status") {
                      return (
                        <TableCell key={colId}>
                          {getStatusBadge(
                            brand.subscription_status,
                            brand.is_active
                          )}
                        </TableCell>
                      );
                    }
                    if (colId === "plan") {
                      return (
                        <TableCell key={colId}>
                          <span className="text-sm font-inter tracking-[-0.3px] capitalize">
                            {brand.subscription_plan || "-"}
                          </span>
                        </TableCell>
                      );
                    }
                    if (colId === "type") {
                      return (
                        <TableCell key={colId}>
                          <span className="text-sm font-inter tracking-[-0.3px] capitalize">
                            {brand.brand_type || "-"}
                          </span>
                        </TableCell>
                      );
                    }
                    if (colId === "created") {
                      return (
                        <TableCell key={colId}>
                          <span className="text-sm font-inter tracking-[-0.3px] text-muted-foreground">
                            {format(new Date(brand.created_at), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                      );
                    }
                    if (colId === "renewal") {
                      return (
                        <TableCell key={colId}>
                          <span className="text-sm font-inter tracking-[-0.3px] text-muted-foreground">
                            {brand.renewal_date
                              ? format(new Date(brand.renewal_date), "MMM d, yyyy")
                              : "-"}
                          </span>
                        </TableCell>
                      );
                    }
                    if (colId === "website") {
                      return (
                        <TableCell key={colId}>
                          {brand.home_url ? (
                            <a
                              href={brand.home_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-inter tracking-[-0.3px]"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Visit
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      );
                    }
                    return null;
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="mt-3 text-xs text-muted-foreground font-inter tracking-[-0.3px]">
        {filteredBrands.length} of {brands.length} brands
      </div>

      {/* Brand Context Sheet */}
      <BrandContextSheet
        brand={selectedBrand}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onBrandUpdated={fetchBrands}
      />
    </>
  );
}
