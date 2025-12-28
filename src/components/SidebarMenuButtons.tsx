import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/ThemeProvider";

// Light mode icons
import discordIconLight from "@/assets/discord-icon-light.svg";
import supportIconLight from "@/assets/support-icon-light.svg";
import lightbulbIconLight from "@/assets/lightbulb-icon-light.svg";
import bugIconLight from "@/assets/bug-icon-light.svg";

interface SidebarMenuButtonsProps {
  onFeedback: (type: "feature" | "bug") => void;
  supportIcon: string;
  lightbulbIcon: string;
  bugIcon: string;
}

const SidebarMenuButtons = ({ onFeedback, supportIcon, lightbulbIcon, bugIcon }: SidebarMenuButtonsProps) => {
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const { theme } = useTheme();
  
  // Determine if we're in light mode
  const isLightMode = theme === "light" || (theme === "system" && !window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Select icons based on theme
  const currentDiscordIcon = isLightMode ? discordIconLight : "/lovable-uploads/0b07b88a-cde1-4778-a64e-2adbb5eb1251.webp";
  const currentSupportIcon = isLightMode ? supportIconLight : supportIcon;
  const currentLightbulbIcon = isLightMode ? lightbulbIconLight : lightbulbIcon;
  const currentBugIcon = isLightMode ? bugIconLight : bugIcon;

  const icons = [
    currentDiscordIcon,
    currentSupportIcon,
    currentLightbulbIcon,
    currentBugIcon
  ];

  useEffect(() => {
    if (loadedCount >= icons.length) {
      setIconsLoaded(true);
    }
  }, [loadedCount, icons.length]);

  const handleImageLoad = () => {
    setLoadedCount(prev => prev + 1);
  };

  // Preload images
  useEffect(() => {
    setLoadedCount(0);
    setIconsLoaded(false);
    icons.forEach(src => {
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageLoad; // Count errors too to prevent infinite loading
      img.src = src;
    });
  }, [isLightMode]);

  if (!iconsLoaded) {
    return (
      <div className="space-y-0.5 mb-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-full flex items-center gap-3 px-2.5 py-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-0.5 mb-3">
      <button 
        onClick={() => window.open("https://discord.gg/virality", "_blank")} 
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <img alt="Discord" className="w-5 h-5 rounded opacity-60" src={currentDiscordIcon} />
        <span className="text-sm font-medium font-inter tracking-[-0.5px]">Discord</span>
      </button>
      <button 
        onClick={() => window.location.href = "/support"} 
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <img src={currentSupportIcon} alt="Support" className="w-5 h-5 opacity-60" />
        <span className="text-sm font-medium font-inter tracking-[-0.5px]">Support</span>
      </button>
      <button 
        onClick={() => onFeedback("feature")} 
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <img src={currentLightbulbIcon} alt="Feature Request" className="w-5 h-5 opacity-60" />
        <span className="text-sm font-medium font-inter tracking-[-0.5px]">Feature Request</span>
      </button>
      <button 
        onClick={() => onFeedback("bug")} 
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <img src={currentBugIcon} alt="Report Bug" className="w-5 h-5 opacity-60" />
        <span className="text-sm font-medium font-inter tracking-[-0.5px]">Report Bug</span>
      </button>
    </div>
  );
};

export default SidebarMenuButtons;
