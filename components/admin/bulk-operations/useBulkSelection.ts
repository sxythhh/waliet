import { useState, useCallback, useMemo } from "react";

export interface UseBulkSelectionReturn<T> {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  toggleItem: (id: string) => void;
  selectAll: (items: T[], getItemId: (item: T) => string) => void;
  deselectAll: () => void;
  toggleAll: (items: T[], getItemId: (item: T) => string) => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
  getSelectedItems: <T extends { id: string }>(items: T[]) => T[];
  clearSelection: () => void;
}

export function useBulkSelection<T>(
  totalItems: number = 0
): UseBulkSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectItem = useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const deselectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(
    (items: T[], getItemId: (item: T) => string) => {
      const allIds = items.map(getItemId);
      setSelectedIds(new Set(allIds));
    },
    []
  );

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback(
    (items: T[], getItemId: (item: T) => string) => {
      const allIds = items.map(getItemId);
      const allSelected = allIds.every((id) => selectedIds.has(id));
      if (allSelected) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(allIds));
      }
    },
    [selectedIds]
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedCount = selectedIds.size;

  const isAllSelected = useMemo(
    () => totalItems > 0 && selectedCount === totalItems,
    [totalItems, selectedCount]
  );

  const isPartiallySelected = useMemo(
    () => selectedCount > 0 && selectedCount < totalItems,
    [totalItems, selectedCount]
  );

  const getSelectedItems = useCallback(
    <T extends { id: string }>(items: T[]): T[] => {
      return items.filter((item) => selectedIds.has(item.id));
    },
    [selectedIds]
  );

  return {
    selectedIds,
    isAllSelected,
    isPartiallySelected,
    selectItem,
    deselectItem,
    toggleItem,
    selectAll,
    deselectAll,
    toggleAll,
    isSelected,
    selectedCount,
    getSelectedItems,
    clearSelection,
  };
}
