// Tour step definitions for the brand dashboard product tour

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  tab: string;
  subtab?: string;
  target: string; // data-tour-target selector
  title: string;
  description: string;
  position: TooltipPosition;
  highlight?: boolean; // Whether to highlight the target element
}

export const TOUR_STEPS: TourStep[] = [
  // === CAMPAIGNS TAB (Steps 1-4) ===
  {
    id: "welcome",
    tab: "campaigns",
    target: "dashboard-main",
    title: "Welcome to Virality",
    description: "Your command center for managing influencer campaigns. Let's take a quick tour of what you can do here.",
        position: "bottom",
    highlight: false,
  },
  {
    id: "campaigns-list",
    tab: "campaigns",
    target: "campaigns-list",
    title: "Your Campaigns",
    description: "View all your campaigns at a glance. Track budgets, submissions, and performance metrics for each one.",
        position: "right",
    highlight: true,
  },
  {
    id: "create-campaign",
    tab: "campaigns",
    target: "create-campaign-btn",
    title: "Create a Campaign",
    description: "Start a new campaign to work with creators. Set your budget, requirements, and let creators apply.",
        position: "bottom",
    highlight: true,
  },
  {
    id: "campaign-status",
    tab: "campaigns",
    target: "campaign-card",
    title: "Campaign Status",
    description: "Each campaign shows its status, budget spent, and creator submissions. Click to see detailed analytics.",
        position: "left",
    highlight: true,
  },

  // === BLUEPRINTS TAB (Steps 5-7) ===
  {
    id: "blueprints-intro",
    tab: "blueprints",
    target: "dashboard-main",
    title: "Content Blueprints",
    description: "Blueprints are content guidelines that help creators understand your brand voice and campaign requirements.",
        position: "bottom",
    highlight: false,
  },
  {
    id: "blueprints-list",
    tab: "blueprints",
    target: "blueprints-grid",
    title: "Your Blueprints",
    description: "View and manage all your content blueprints. Assign them to campaigns for consistent creator output.",
        position: "right",
    highlight: true,
  },
  {
    id: "create-blueprint",
    tab: "blueprints",
    target: "create-blueprint-btn",
    title: "Create a Blueprint",
    description: "Define content guidelines including hooks, talking points, dos and don'ts for creators to follow.",
        position: "bottom",
    highlight: true,
  },

  // === CREATORS TAB (Steps 8-12) ===
  {
    id: "creators-database",
    tab: "creators",
    subtab: "database",
    target: "creators-database",
    title: "Creator Database",
    description: "Browse and discover creators who match your brand. Filter by niche, engagement, and past performance.",
        position: "right",
    highlight: true,
  },
  {
    id: "creators-search",
    tab: "creators",
    subtab: "database",
    target: "creators-search",
    title: "Search & Filter",
    description: "Find the perfect creators using filters for follower count, niche, engagement rate, and more.",
        position: "bottom",
    highlight: true,
  },
  {
    id: "creator-profile",
    tab: "creators",
    subtab: "database",
    target: "creator-card",
    title: "Creator Profiles",
    description: "View detailed profiles with stats, past campaign history, and ratings from other brands.",
        position: "left",
    highlight: true,
  },
  {
    id: "creators-contracts",
    tab: "creators",
    subtab: "contracts",
    target: "contracts-list",
    title: "Manage Contracts",
    description: "Track all your creator agreements. Monitor deliverables, deadlines, and payment status.",
    position: "right",
    highlight: true,
  },

  // === WALLET TAB ===
  {
    id: "wallet-balance",
    tab: "settings",
    target: "wallet-balance",
    title: "Your Wallet",
    description: "This is your Virality balance. Use it to fund campaigns and pay creators automatically.",
        position: "right",
    highlight: true,
  },
  {
    id: "wallet-add-funds",
    tab: "settings",
    target: "payment-methods",
    title: "Add Funds",
    description: "Top up your wallet via card, crypto, wire transfer, or from your personal Virality balance.",
        position: "right",
    highlight: true,
  },
  {
    id: "wallet-transactions",
    tab: "settings",
    target: "transaction-history",
    title: "Transaction History",
    description: "Track all deposits, allocations, and payouts. Full transparency on where your budget goes.",
    position: "top",
    highlight: true,
  },

  // === COMPLETION ===
  {
    id: "tour-complete",
    tab: "settings",
    target: "dashboard-main",
    title: "You're All Set!",
    description: "You've completed the tour. Start by creating your first campaign or exploring the creator database.",
    position: "bottom",
    highlight: false,
  },
];

// Helper to get steps for a specific tab
export function getStepsForTab(tab: string, subtab?: string): TourStep[] {
  return TOUR_STEPS.filter(
    (step) => step.tab === tab && (subtab ? step.subtab === subtab : true)
  );
}

// Get step by ID
export function getStepById(id: string): TourStep | undefined {
  return TOUR_STEPS.find((step) => step.id === id);
}
