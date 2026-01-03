import { useState } from "react";
import { ChevronDown, ChevronUp, Info, Video, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudienceInsightsGuidanceProps {
  platform: string;
  defaultExpanded?: boolean;
}

const platformGuidance: Record<string, {
  appName: string;
  steps: string[];
  tips: string[];
}> = {
  tiktok: {
    appName: "TikTok",
    steps: [
      "Open TikTok and go to your Profile",
      "Tap the menu (three lines) in the top right",
      "Select 'Creator tools' or 'Business Suite'",
      "Tap 'Analytics'",
      "Go to the 'Followers' tab",
      "Scroll to see demographics (Gender, Age, Top territories)"
    ],
    tips: [
      "Record in landscape mode for better visibility",
      "Pause briefly on each section so data is readable",
      "Show the full demographics breakdown including age and location"
    ]
  },
  instagram: {
    appName: "Instagram",
    steps: [
      "Open Instagram and go to your Profile",
      "Tap the menu (three lines) in the top right",
      "Select 'Insights' (requires Professional account)",
      "Go to 'Total followers'",
      "Scroll to see demographics (Gender, Age, Top locations)"
    ],
    tips: [
      "Make sure you have a Professional or Creator account",
      "Show both age distribution and top countries",
      "Keep the video short but include all key metrics"
    ]
  },
  youtube: {
    appName: "YouTube Studio",
    steps: [
      "Open the YouTube Studio app or studio.youtube.com",
      "Go to 'Analytics'",
      "Select the 'Audience' tab",
      "Scroll to see demographics (Age, Gender, Geography)"
    ],
    tips: [
      "You can use the mobile app or desktop site",
      "Show the audience demographics charts clearly",
      "Include both age and geographic distribution"
    ]
  }
};

export function AudienceInsightsGuidance({ platform, defaultExpanded = true }: AudienceInsightsGuidanceProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const guidance = platformGuidance[platform.toLowerCase()];

  if (!guidance) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
          Record a video showing your audience demographics from your analytics dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
            How to record your {guidance.appName} insights
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 space-y-4 bg-background">
          {/* Steps */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <BarChart3 className="h-3.5 w-3.5" />
              Steps to find your analytics
            </div>
            <ol className="space-y-1.5 pl-1">
              {guidance.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <Video className="h-3.5 w-3.5" />
              Recording tips
            </div>
            <ul className="space-y-1.5 pl-1">
              {guidance.tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm" style={{ fontFamily: 'Inter', letterSpacing: '-0.3px' }}>
                  <span className="flex-shrink-0 text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
