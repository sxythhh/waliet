import { CheckCircle2 } from "lucide-react";
import type { PlatformInfo } from "@/types/portfolio";

interface PlatformLinksProps {
  platforms: PlatformInfo[];
}

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "tiktok": return "bg-black text-white hover:bg-black/80";
    case "youtube": return "bg-red-600 text-white hover:bg-red-500";
    case "instagram": return "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400";
    case "twitter": return "bg-black text-white hover:bg-black/80";
    case "twitch": return "bg-purple-600 text-white hover:bg-purple-500";
    case "linkedin": return "bg-blue-600 text-white hover:bg-blue-500";
    case "facebook": return "bg-blue-500 text-white hover:bg-blue-400";
    case "snapchat": return "bg-yellow-400 text-black hover:bg-yellow-300";
    case "pinterest": return "bg-red-500 text-white hover:bg-red-400";
    case "threads": return "bg-black text-white hover:bg-black/80";
    default: return "bg-muted text-foreground hover:bg-muted/80";
  }
};

const getPlatformName = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "tiktok": return "TikTok";
    case "youtube": return "YouTube";
    case "instagram": return "Instagram";
    case "twitter": return "X";
    case "twitch": return "Twitch";
    case "linkedin": return "LinkedIn";
    case "facebook": return "Facebook";
    case "snapchat": return "Snapchat";
    case "pinterest": return "Pinterest";
    case "threads": return "Threads";
    default: return platform;
  }
};

const formatFollowers = (count: number | undefined) => {
  if (!count) return null;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

export function PlatformLinks({ platforms }: PlatformLinksProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {platforms.map((platform) => (
        <a
          key={platform.platform}
          href={platform.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-['Inter'] ${getPlatformColor(platform.platform)}`}
        >
          <span className="font-medium text-sm">
            {getPlatformName(platform.platform)}
          </span>
          <span className="opacity-80 text-sm">@{platform.handle}</span>
          {platform.verified && (
            <CheckCircle2 className="h-4 w-4" />
          )}
          {platform.followers && (
            <span className="text-xs opacity-70">
              • {formatFollowers(platform.followers)}
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
