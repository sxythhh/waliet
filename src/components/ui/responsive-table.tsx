import * as React from "react";
import { cn } from "@/lib/utils";

export interface ResponsiveTableProps {
  /** Table content */
  children: React.ReactNode;
  /** Additional className for wrapper */
  className?: string;
  /** Show scroll shadow indicators */
  showScrollShadow?: boolean;
  /** Max height for scrollable area (enables vertical scrolling) */
  maxHeight?: string | number;
}

/**
 * Responsive table wrapper with horizontal scroll and optional shadow indicators.
 * Wraps table content to enable horizontal scrolling on smaller screens.
 * 
 * @example
 * ```tsx
 * <ResponsiveTable showScrollShadow maxHeight={400}>
 *   <Table>
 *     <TableHeader>...</TableHeader>
 *     <TableBody>...</TableBody>
 *   </Table>
 * </ResponsiveTable>
 * ```
 */
export function ResponsiveTable({
  children,
  className,
  showScrollShadow = true,
  maxHeight,
}: ResponsiveTableProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = React.useState(false);
  const [showRightShadow, setShowRightShadow] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      const el = scrollRef.current;
      if (!el || !showScrollShadow) return;

      const { scrollLeft, scrollWidth, clientWidth } = el;
      const hasHorizontalScroll = scrollWidth > clientWidth;
      
      setShowLeftShadow(hasHorizontalScroll && scrollLeft > 0);
      setShowRightShadow(hasHorizontalScroll && scrollLeft < scrollWidth - clientWidth - 1);
    };

    const el = scrollRef.current;
    if (el) {
      checkScroll();
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [showScrollShadow]);

  return (
    <div className={cn("relative rounded-lg border border-border", className)}>
      {/* Left scroll shadow */}
      {showScrollShadow && showLeftShadow && (
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10"
          aria-hidden="true"
        />
      )}

      {/* Right scroll shadow */}
      {showScrollShadow && showRightShadow && (
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10"
          aria-hidden="true"
        />
      )}

      {/* Scrollable content */}
      <div
        ref={scrollRef}
        className={cn(
          "overflow-x-auto",
          maxHeight && "overflow-y-auto"
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

ResponsiveTable.displayName = "ResponsiveTable";
