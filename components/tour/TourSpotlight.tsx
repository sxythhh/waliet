import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface SpotlightBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourSpotlightProps {
  target: string;
  isActive: boolean;
  highlight?: boolean;
  padding?: number;
  children: React.ReactNode;
  onBoundsChange?: (bounds: SpotlightBounds | null) => void;
}

export function TourSpotlight({
  target,
  isActive,
  highlight = true,
  padding = 8,
  children,
  onBoundsChange,
}: TourSpotlightProps) {
  const [bounds, setBounds] = useState<SpotlightBounds | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);

  const updateBounds = useCallback(() => {
    const element = document.querySelector(`[data-tour-target="${target}"]`);
    if (!element) {
      setBounds(null);
      onBoundsChange?.(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const newBounds = {
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    };
    setBounds(newBounds);
    onBoundsChange?.(newBounds);
  }, [target, padding, onBoundsChange]);

  // Initial mount and target change
  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    // Small delay for entrance animation
    const showTimer = setTimeout(() => {
      updateBounds();
      setIsVisible(true);
    }, 50);

    // Set up resize observer
    const element = document.querySelector(`[data-tour-target="${target}"]`);
    if (element) {
      observerRef.current = new ResizeObserver(updateBounds);
      observerRef.current.observe(element);
    }

    // Update on scroll/resize
    window.addEventListener("scroll", updateBounds, true);
    window.addEventListener("resize", updateBounds);

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("scroll", updateBounds, true);
      window.removeEventListener("resize", updateBounds);
      observerRef.current?.disconnect();
    };
  }, [isActive, target, updateBounds]);

  if (!isActive) return null;

  // Generate SVG mask path for spotlight cutout
  const generateMaskPath = () => {
    if (!bounds || !highlight) {
      return `M0,0 L${window.innerWidth},0 L${window.innerWidth},${window.innerHeight} L0,${window.innerHeight} Z`;
    }

    const radius = 12;
    const { top, left, width, height } = bounds;

    // Outer path (full screen) + inner path (cutout with rounded corners)
    return `
      M0,0
      L${window.innerWidth},0
      L${window.innerWidth},${window.innerHeight}
      L0,${window.innerHeight}
      Z
      M${left + radius},${top}
      L${left + width - radius},${top}
      Q${left + width},${top} ${left + width},${top + radius}
      L${left + width},${top + height - radius}
      Q${left + width},${top + height} ${left + width - radius},${top + height}
      L${left + radius},${top + height}
      Q${left},${top + height} ${left},${top + height - radius}
      L${left},${top + radius}
      Q${left},${top} ${left + radius},${top}
      Z
    `;
  };

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[9998] pointer-events-none transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* SVG Overlay with cutout */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "auto" }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {bounds && highlight && (
              <rect
                x={bounds.left}
                y={bounds.top}
                width={bounds.width}
                height={bounds.height}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
          className="backdrop-blur-sm"
        />
      </svg>

      {/* Glow ring around target */}
      {bounds && highlight && (
        <div
          className={cn(
            "absolute rounded-xl pointer-events-none transition-all duration-300",
            "ring-2 ring-primary/30 ring-offset-2 ring-offset-transparent",
            "shadow-[0_0_30px_5px_rgba(139,92,246,0.15)]"
          )}
          style={{
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            height: bounds.height,
          }}
        />
      )}

      {/* Tooltip container */}
      <div className="pointer-events-auto">{children}</div>
    </div>,
    document.body
  );
}
