import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export type SourceType = "campaign" | "boost";

export type SourceDetailsSectionType =
  | "overview"
  | "blueprint"
  | "training"
  | "submissions"
  | "assets"
  | "earnings"
  | "support"
  | "progress" // For boost progress section
  | "agreement"; // For boost contract/agreement section

export interface SourceDetailsSection {
  type: SourceDetailsSectionType;
  moduleId?: string; // For training module selection
}

interface SourceDetailsContextValue {
  // Source type
  sourceType: SourceType;

  // Public view mode (no auth required, hides personal data)
  isPublicView: boolean;

  // Navigation
  activeSection: SourceDetailsSection;
  setActiveSection: (section: SourceDetailsSection) => void;

  // Sidebar state
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  leftSidebarCollapsed: boolean;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;

  // Mobile state
  isMobile: boolean;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
  mobileNavJustOpened: boolean; // Prevents accidental taps when sidebar just opened

  // Right panel (mobile)
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
}

const SourceDetailsContext = React.createContext<SourceDetailsContextValue | null>(null);

export function useSourceDetails() {
  const context = React.useContext(SourceDetailsContext);
  if (!context) {
    throw new Error("useSourceDetails must be used within a SourceDetailsSidebarProvider");
  }
  return context;
}

interface SourceDetailsSidebarProviderProps {
  children: React.ReactNode;
  sourceType: SourceType;
  defaultSection?: SourceDetailsSection;
  isPublicView?: boolean;
}

export function SourceDetailsSidebarProvider({
  children,
  sourceType,
  defaultSection = { type: "overview" },
  isPublicView = false
}: SourceDetailsSidebarProviderProps) {
  const isMobile = useIsMobile();

  // Navigation state
  const [activeSection, setActiveSection] = React.useState<SourceDetailsSection>(defaultSection);

  // Sidebar state
  const [leftSidebarOpen, setLeftSidebarOpen] = React.useState(true);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = React.useState(false);

  // Mobile state
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [rightPanelOpen, setRightPanelOpen] = React.useState(false);
  const [mobileNavJustOpened, setMobileNavJustOpened] = React.useState(false);

  // Track when mobile nav just opened to prevent accidental taps
  React.useEffect(() => {
    if (mobileNavOpen) {
      setMobileNavJustOpened(true);
      const timer = setTimeout(() => setMobileNavJustOpened(false), 500);
      return () => clearTimeout(timer);
    } else {
      setMobileNavJustOpened(false);
    }
  }, [mobileNavOpen]);

  // Close mobile nav when section changes
  React.useEffect(() => {
    if (isMobile) {
      setMobileNavOpen(false);
    }
  }, [activeSection, isMobile]);

  // Persist sidebar collapsed state
  React.useEffect(() => {
    const storageKey = `${sourceType}-details-sidebar-collapsed`;
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) {
      setLeftSidebarCollapsed(stored === "true");
    }
  }, [sourceType]);

  React.useEffect(() => {
    const storageKey = `${sourceType}-details-sidebar-collapsed`;
    localStorage.setItem(storageKey, String(leftSidebarCollapsed));
  }, [leftSidebarCollapsed, sourceType]);

  const contextValue = React.useMemo<SourceDetailsContextValue>(
    () => ({
      sourceType,
      isPublicView,
      activeSection,
      setActiveSection,
      leftSidebarOpen,
      setLeftSidebarOpen,
      leftSidebarCollapsed,
      setLeftSidebarCollapsed,
      isMobile,
      mobileNavOpen,
      setMobileNavOpen,
      mobileNavJustOpened,
      rightPanelOpen,
      setRightPanelOpen,
    }),
    [
      sourceType,
      isPublicView,
      activeSection,
      leftSidebarOpen,
      leftSidebarCollapsed,
      isMobile,
      mobileNavOpen,
      mobileNavJustOpened,
      rightPanelOpen,
    ]
  );

  return (
    <SourceDetailsContext.Provider value={contextValue}>
      {children}
    </SourceDetailsContext.Provider>
  );
}
