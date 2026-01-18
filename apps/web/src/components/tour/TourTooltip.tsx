import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { TourStep, TooltipPosition } from "./tour-steps";
import { useTheme } from "@/components/ThemeProvider";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";

interface TooltipBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourTooltipProps {
  step: TourStep;
  targetBounds: TooltipBounds | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isTransitioning?: boolean;
}

const TOOLTIP_WIDTH = 340;
const TOOLTIP_OFFSET = 16;

export function TourTooltip({
  step,
  targetBounds,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isTransitioning = false,
}: TourTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position based on target bounds and preferred position
  useEffect(() => {
    if (!targetBounds || isTransitioning) {
      setIsVisible(false);
      return;
    }

    const tooltipHeight = tooltipRef.current?.offsetHeight || 200;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let top = 0;
    let left = 0;

    // Calculate position based on step.position preference
    switch (step.position) {
      case "top":
        top = targetBounds.top - tooltipHeight - TOOLTIP_OFFSET;
        left = targetBounds.left + targetBounds.width / 2 - TOOLTIP_WIDTH / 2;
        break;
      case "bottom":
        top = targetBounds.top + targetBounds.height + TOOLTIP_OFFSET;
        left = targetBounds.left + targetBounds.width / 2 - TOOLTIP_WIDTH / 2;
        break;
      case "left":
        top = targetBounds.top + targetBounds.height / 2 - tooltipHeight / 2;
        left = targetBounds.left - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
        break;
      case "right":
        top = targetBounds.top + targetBounds.height / 2 - tooltipHeight / 2;
        left = targetBounds.left + targetBounds.width + TOOLTIP_OFFSET;
        break;
    }

    // Clamp to viewport bounds
    left = Math.max(16, Math.min(left, viewport.width - TOOLTIP_WIDTH - 16));
    top = Math.max(16, Math.min(top, viewport.height - tooltipHeight - 16));

    // Fallback: if target is not highlighted (welcome/complete screens), center the tooltip
    if (!step.highlight) {
      top = viewport.height / 2 - tooltipHeight / 2;
      left = viewport.width / 2 - TOOLTIP_WIDTH / 2;
    }

    setPosition({ top, left });

    // Slight delay for smooth entrance
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [targetBounds, step.position, step.highlight, isTransitioning]);

  const { theme, setTheme } = useTheme();
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-[9999] transition-all duration-300 ease-out",
        isVisible && !isTransitioning
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2"
      )}
      style={{
        top: position.top,
        left: position.left,
        width: TOOLTIP_WIDTH,
      }}
    >
      <div className="bg-[#0a0a0a]/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Content */}
        <div className="p-5">
          {/* Title + Skip */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[15px] font-semibold text-white tracking-[-0.3px]">
              {step.title}
            </h3>
            <button
              onClick={onSkip}
              className="text-[12px] font-medium text-white/40 hover:text-white/60 transition-colors tracking-[-0.5px]"
            >
              Skip
            </button>
          </div>

          {/* Description */}
          <p className="text-[13px] text-white/60 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="w-[72px]">
            {isFirstStep ? (
              <button
                onClick={toggleTheme}
                className="h-9 w-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                {theme === "dark" ? (
                  <DarkModeRounded sx={{ fontSize: 18 }} className="text-white/60" />
                ) : (
                  <LightModeRounded sx={{ fontSize: 18 }} className="text-white/60" />
                )}
              </button>
            ) : (
              <button
                onClick={onPrev}
                className="h-9 px-4 text-[13px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors tracking-[-0.5px]"
              >
                Back
              </button>
            )}
          </div>
          <span className="text-[12px] text-white/40 tabular-nums tracking-[-0.5px]">
            {currentIndex + 1} of {totalSteps}
          </span>
          <button
            onClick={onNext}
            className="h-9 px-5 text-[13px] font-semibold bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors tracking-[-0.5px]"
          >
            {isLastStep ? "Finish" : "Next"}
          </button>
        </div>
      </div>

      {/* Arrow pointer (only when highlighting) */}
      {step.highlight && targetBounds && <TooltipArrow position={step.position} />}
    </div>
  );
}

function TooltipArrow({ position }: { position: TooltipPosition }) {
  const baseClasses = "absolute w-3 h-3 bg-[#0a0a0a]/95 rotate-45";

  switch (position) {
    case "top":
      return (
        <div
          className={cn(baseClasses, "-bottom-1.5 left-1/2 -translate-x-1/2")}
        />
      );
    case "bottom":
      return (
        <div
          className={cn(baseClasses, "-top-1.5 left-1/2 -translate-x-1/2")}
        />
      );
    case "left":
      return (
        <div
          className={cn(baseClasses, "-right-1.5 top-1/2 -translate-y-1/2")}
        />
      );
    case "right":
      return (
        <div
          className={cn(baseClasses, "-left-1.5 top-1/2 -translate-y-1/2")}
        />
      );
  }
}
