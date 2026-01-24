import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { TOUR_STEPS, TourStep } from "./tour-steps";

export interface TourState {
  isActive: boolean;
  isDemoMode: boolean;
  isOnboardingMode: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;
  isTransitioning: boolean;
}

export interface TourActions {
  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  goToStep: (index: number) => void;
  setTransitioning: (value: boolean) => void;
}

const TOUR_STORAGE_KEY = "virality_tour_completed";
const TOUR_STEP_KEY = "virality_tour_step";

export function useTour(): TourState & TourActions {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isDemoMode = searchParams.get("demo") === "active";
  const isOnboardingMode = searchParams.get("onboarding") === "active";
  const shouldStartTour = isDemoMode || isOnboardingMode;
  const currentStep = isActive ? TOUR_STEPS[currentStepIndex] : null;

  // Auto-start tour when entering demo or onboarding mode
  // Demo mode: always restart fresh
  // Onboarding mode: only start if not completed before
  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: always restart fresh
      localStorage.removeItem(TOUR_STORAGE_KEY);
      localStorage.removeItem(TOUR_STEP_KEY);
      setCurrentStepIndex(0);
      setIsActive(true);
    } else if (isOnboardingMode) {
      // Onboarding mode: check if already completed
      const hasCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
      if (!hasCompleted) {
        // Restore last step if available
        const savedStep = localStorage.getItem(TOUR_STEP_KEY);
        if (savedStep) {
          const stepIndex = parseInt(savedStep, 10);
          if (stepIndex >= 0 && stepIndex < TOUR_STEPS.length) {
            setCurrentStepIndex(stepIndex);
          }
        }
        setIsActive(true);
      }
    }
    // Only depend on mode flags, not isActive, to avoid restart loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, isOnboardingMode]);

  // Navigate to correct tab when step changes
  useEffect(() => {
    if (!currentStep || !isActive) return;

    const currentTab = searchParams.get("tab");
    const currentSubtab = searchParams.get("subtab");

    // Only navigate if we need to change tabs
    if (currentStep.tab !== currentTab || currentStep.subtab !== currentSubtab) {
      setIsTransitioning(true);
      const newParams = new URLSearchParams(searchParams);
      newParams.set("tab", currentStep.tab);
      if (currentStep.subtab) {
        newParams.set("subtab", currentStep.subtab);
      } else {
        newParams.delete("subtab");
      }
      setSearchParams(newParams, { replace: true });

      // Give time for tab to render before showing spotlight
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, [currentStep, isActive, searchParams, setSearchParams]);

  // Save progress
  useEffect(() => {
    if (isActive) {
      localStorage.setItem(TOUR_STEP_KEY, currentStepIndex.toString());
    }
  }, [currentStepIndex, isActive]);

  const start = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
    localStorage.removeItem(TOUR_STORAGE_KEY);
    localStorage.removeItem(TOUR_STEP_KEY);
  }, []);

  const next = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tour complete
      setIsActive(false);
      localStorage.setItem(TOUR_STORAGE_KEY, "true");
      localStorage.removeItem(TOUR_STEP_KEY);
      // Clear demo workspace from localStorage to prevent errors on auth page
      if (isDemoMode) {
        localStorage.removeItem("lastWorkspace");
      }
      // Redirect to auth page
      navigate("/auth");
    }
  }, [currentStepIndex, navigate, isDemoMode]);

  const prev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  }, [currentStepIndex]);

  const skip = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    localStorage.removeItem(TOUR_STEP_KEY);
    // Clear demo workspace from localStorage to prevent errors on auth page
    if (isDemoMode) {
      localStorage.removeItem("lastWorkspace");
    }
    // Redirect to auth page
    navigate("/auth");
  }, [navigate, isDemoMode]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < TOUR_STEPS.length) {
      setCurrentStepIndex(index);
    }
  }, []);

  return {
    isActive,
    isDemoMode,
    isOnboardingMode,
    currentStepIndex,
    currentStep,
    totalSteps: TOUR_STEPS.length,
    isTransitioning,
    start,
    next,
    prev,
    skip,
    goToStep,
    setTransitioning: setIsTransitioning,
  };
}
