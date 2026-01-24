import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export type CampaignDetailsSectionType =
  | "overview"
  | "training"
  | "submissions"
  | "guidelines"
  | "support";

export interface CampaignDetailsSection {
  type: CampaignDetailsSectionType;
  moduleId?: string; // For training module selection
}

interface CampaignDetailsContextValue {
  // Navigation
  activeSection: CampaignDetailsSection;
  setActiveSection: (section: CampaignDetailsSection) => void;

  // Sidebar state
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: (open: boolean) => void;
  leftSidebarCollapsed: boolean;
  setLeftSidebarCollapsed: (collapsed: boolean) => void;

  // Mobile state
  isMobile: boolean;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  // Right panel (mobile)
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
}

const CampaignDetailsContext = React.createContext<CampaignDetailsContextValue | null>(null);

export function useCampaignDetails() {
  const context = React.useContext(CampaignDetailsContext);
  if (!context) {
    throw new Error("useCampaignDetails must be used within a CampaignDetailsSidebarProvider");
  }
  return context;
}

interface CampaignDetailsSidebarProviderProps {
  children: React.ReactNode;
  defaultSection?: CampaignDetailsSection;
}

export function CampaignDetailsSidebarProvider({
  children,
  defaultSection = { type: "overview" }
}: CampaignDetailsSidebarProviderProps) {
  const isMobile = useIsMobile();

  // Navigation state
  const [activeSection, setActiveSection] = React.useState<CampaignDetailsSection>(defaultSection);

  // Sidebar state
  const [leftSidebarOpen, setLeftSidebarOpen] = React.useState(true);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = React.useState(false);

  // Mobile state
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);
  const [rightPanelOpen, setRightPanelOpen] = React.useState(false);

  // Close mobile nav when section changes
  React.useEffect(() => {
    if (isMobile) {
      setMobileNavOpen(false);
    }
  }, [activeSection, isMobile]);

  // Persist sidebar collapsed state
  React.useEffect(() => {
    const stored = localStorage.getItem("campaign-details-sidebar-collapsed");
    if (stored !== null) {
      setLeftSidebarCollapsed(stored === "true");
    }
  }, []);

  React.useEffect(() => {
    localStorage.setItem("campaign-details-sidebar-collapsed", String(leftSidebarCollapsed));
  }, [leftSidebarCollapsed]);

  const contextValue = React.useMemo<CampaignDetailsContextValue>(
    () => ({
      activeSection,
      setActiveSection,
      leftSidebarOpen,
      setLeftSidebarOpen,
      leftSidebarCollapsed,
      setLeftSidebarCollapsed,
      isMobile,
      mobileNavOpen,
      setMobileNavOpen,
      rightPanelOpen,
      setRightPanelOpen,
    }),
    [
      activeSection,
      leftSidebarOpen,
      leftSidebarCollapsed,
      isMobile,
      mobileNavOpen,
      rightPanelOpen,
    ]
  );

  return (
    <CampaignDetailsContext.Provider value={contextValue}>
      {children}
    </CampaignDetailsContext.Provider>
  );
}
