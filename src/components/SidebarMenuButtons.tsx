import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarMenuButtonsProps {
  onFeedback: (type: "feature" | "bug") => void;
  supportIcon: string;
  lightbulbIcon: string;
  bugIcon: string;
}

const SidebarMenuButtons = ({ onFeedback, supportIcon, lightbulbIcon, bugIcon }: SidebarMenuButtonsProps) => {
  const [iconsLoaded, setIconsLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);

  const icons = [
    "/lovable-uploads/0b07b88a-cde1-4778-a64e-2adbb5eb1251.webp",
    supportIcon,
    lightbulbIcon,
    bugIcon
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
    icons.forEach(src => {
      const img = new Image();
      img.onload = handleImageLoad;
      img.onerror = handleImageLoad; // Count errors too to prevent infinite loading
      img.src = src;
    });
  }, []);

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
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <img alt="Discord" className="w-5 h-5 rounded" src="/lovable-uploads/0b07b88a-cde1-4778-a64e-2adbb5eb1251.webp" />
        <span className="text-sm font-medium font-inter tracking-[-0.5px]">Discord</span>
      </button>
      <button 
        onClick={() => window.open("mailto:support@virality.gg", "_blank")} 
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <img src={supportIcon} alt="Support" className="w-5 h-5" />
        <span className="text-sm font-medium font-inter tracking-[-0.5px]">Support</span>
      </button>
      <button 
        onClick={() => onFeedback("feature")} 
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <img src={lightbulbIcon} alt="Feature Request" className="w-5 h-5" />
        <span className="text-sm font-medium font-inter tracking-[-0.5px]">Feature Request</span>
      </button>
      <button 
        onClick={() => onFeedback("bug")} 
        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-md text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
      >
        <img src={bugIcon} alt="Report Bug" className="w-5 h-5" />
        <span className="text-sm font-medium font-inter tracking-[-0.5px]">Report Bug</span>
      </button>
    </div>
  );
};

export default SidebarMenuButtons;
