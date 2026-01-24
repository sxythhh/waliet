import { useEffect, useState, useCallback } from "react";
import { useTour } from "./useTour";
import { TourSpotlight } from "./TourSpotlight";
import { TourTooltip } from "./TourTooltip";

interface SpotlightBounds {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ProductTour() {
  const tour = useTour();
  const [targetBounds, setTargetBounds] = useState<SpotlightBounds | null>(null);

  // Keyboard navigation
  useEffect(() => {
    if (!tour.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          tour.skip();
          break;
        case "ArrowRight":
        case "Enter":
          e.preventDefault();
          tour.next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          tour.prev();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tour.isActive, tour.next, tour.prev, tour.skip]);

  const handleBoundsChange = useCallback((bounds: SpotlightBounds | null) => {
    setTargetBounds(bounds);
  }, []);

  if (!tour.isActive || !tour.currentStep) {
    return null;
  }

  return (
    <TourSpotlight
      target={tour.currentStep.target}
      isActive={tour.isActive}
      highlight={tour.currentStep.highlight}
      onBoundsChange={handleBoundsChange}
    >
      <TourTooltip
        step={tour.currentStep}
        targetBounds={targetBounds}
        currentIndex={tour.currentStepIndex}
        totalSteps={tour.totalSteps}
        onNext={tour.next}
        onPrev={tour.prev}
        onSkip={tour.skip}
        isTransitioning={tour.isTransitioning}
      />
    </TourSpotlight>
  );
}

// Export hook for external access (e.g., restart tour button)
export { useTour } from "./useTour";
