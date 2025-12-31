import { useState } from "react";
import { DiscordIntegrationTab } from "./DiscordIntegrationTab";
import { LowBalanceSettingsTab } from "./LowBalanceSettingsTab";
import { MilestoneConfigTab } from "./MilestoneConfigTab";
import { TierPromotionTab } from "./TierPromotionTab";
import { CreatorStrikesTab } from "./CreatorStrikesTab";

type SettingsSection = "discord" | "balance" | "milestones" | "tiers" | "strikes";

interface BrandSettingsTabProps {
  brandId: string;
}

export function BrandSettingsTab({ brandId }: BrandSettingsTabProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>("discord");

  const sections: { id: SettingsSection; label: string }[] = [
    { id: "discord", label: "Discord" },
    { id: "balance", label: "Balance" },
    { id: "milestones", label: "Milestones" },
    { id: "tiers", label: "Creator Tiers" },
    { id: "strikes", label: "Strikes" },
  ];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-48 border-r border-border bg-muted/30 flex-shrink-0">
        <nav className="p-2 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                activeSection === section.id
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeSection === "discord" && <DiscordIntegrationTab brandId={brandId} />}
        {activeSection === "balance" && <LowBalanceSettingsTab brandId={brandId} />}
        {activeSection === "milestones" && <MilestoneConfigTab brandId={brandId} />}
        {activeSection === "tiers" && <TierPromotionTab brandId={brandId} />}
        {activeSection === "strikes" && <CreatorStrikesTab brandId={brandId} />}
      </div>
    </div>
  );
}
