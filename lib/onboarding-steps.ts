export interface OnboardingTask {
  id: string;
  title: string;
  shortTitle?: string; // Used for "Take me to X" link
  linkText?: string; // Full custom link text (overrides "Take me to X" format)
  description: string;
  link?: string;
}

export interface OnboardingSection {
  id: string;
  title: string;
  description?: string;
  tasks: OnboardingTask[];
}

// Creator onboarding steps
export const creatorOnboardingSections: OnboardingSection[] = [
  {
    id: "setup",
    title: "Setup Guide",
    tasks: [
      {
        id: "read-start-here",
        title: "Read \"Start Here\" Page",
        shortTitle: "Start Here",
        description: "Quickly understand how you can get started.",
        link: "https://whop.com/joined/contentrewards/start-here-ETQIoMnavBbQEB/app/",
      },
      {
        id: "link-social-accounts",
        title: "Link Your Social Accounts",
        shortTitle: "Link Accounts",
        description: "Connect all your social media accounts to your profile.",
        link: "https://whop.com/joined/contentrewards/link-social-accounts-C3DhwQvaFKv25D/app/",
      },
      {
        id: "discover-campaigns",
        title: "Discover Active Campaigns",
        shortTitle: "Discover Campaigns",
        description: "View all live brand campaigns available.",
        link: "https://whop.com/joined/contentrewards/discover-campaigns-B5C5S1vijHGVt9/app/",
      },
    ],
  },
  {
    id: "community",
    title: "Community",
    tasks: [
      {
        id: "interact-twitter",
        title: "Interact with us on X/Twitter",
        linkText: "Follow us on X/Twitter",
        description: "Have a question or idea? Tag us on X & we'll reply.",
        link: "https://x.com/intent/follow?screen_name=contentrewards",
      },
    ],
  },
];

// Brand onboarding steps
export const brandOnboardingSections: OnboardingSection[] = [
  {
    id: "setup",
    title: "Setup Guide",
    tasks: [
      {
        id: "brand-create-whop-business",
        title: "Create your Whop Business",
        shortTitle: "Create Whop Business",
        description: "Set up your business account on Whop to get started.",
        link: "https://whop.com/joined/content-rewards-brands/tutorial-lOvwMJTHDiKldR/app/courses/cors_bCPNCY67aGP0Y/lessons/lesn_jq9HhpXppKhwR/",
      },
      {
        id: "brand-create-community",
        title: "Create your community (Whop product)",
        shortTitle: "Create Community",
        description: "Build your community space where creators can connect with you.",
        link: "https://whop.com/joined/content-rewards-brands/tutorial-lOvwMJTHDiKldR/app/courses/cors_bCPNCY67aGP0Y/lessons/lesn_J4gZT3g8CQotf/",
      },
      {
        id: "brand-add-branding",
        title: "Add your company branding",
        shortTitle: "Add Branding",
        description: "Customize your community with your logo, colors, and brand identity.",
        link: "https://whop.com/joined/content-rewards-brands/tutorial-lOvwMJTHDiKldR/app/courses/cors_bCPNCY67aGP0Y/lessons/lesn_b61rTMYB8cCGq/",
      },
      {
        id: "brand-install-app",
        title: "Install the Content Rewards app",
        shortTitle: "Install App",
        description: "Add the Content Rewards app to your Whop community.",
        link: "https://whop.com/joined/content-rewards-brands/tutorial-lOvwMJTHDiKldR/app/courses/cors_bCPNCY67aGP0Y/lessons/lesn_rl8rinrAEKx8e/",
      },
      {
        id: "brand-launch-campaign",
        title: "Launch your first campaign",
        shortTitle: "Launch Campaign",
        description: "Create and launch your first creator campaign to start growing.",
        link: "https://whop.com/joined/content-rewards-brands/tutorial-lOvwMJTHDiKldR/app/courses/cors_bCPNCY67aGP0Y/lessons/lesn_JzpH6aJgmF72o/",
      },
    ],
  },
];

// Default export for backwards compatibility (creator steps)
export const onboardingSections = creatorOnboardingSections;

// Get sections based on account type - returns ONLY brand OR creator steps, never both
export function getOnboardingSections(accountType: "creator" | "brand" | null | undefined): OnboardingSection[] {
  if (accountType === "brand") {
    return brandOnboardingSections;
  }
  // Default to creator steps for "creator", null, or undefined
  return creatorOnboardingSections;
}

export function calculateProgress(
  completedTasks: Set<string>,
  sections: OnboardingSection[] = creatorOnboardingSections
): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = sections.reduce(
    (acc, section) => acc + section.tasks.length,
    0
  );
  // Only count completed tasks that exist in the current sections
  const validTaskIds = new Set(sections.flatMap(s => s.tasks.map(t => t.id)));
  const completed = Array.from(completedTasks).filter(id => validTaskIds.has(id)).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}
