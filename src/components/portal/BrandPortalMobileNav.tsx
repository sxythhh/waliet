import { useSearchParams } from "react-router-dom";
import { Home, Briefcase, Wallet, FileVideo, MessageCircle, MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Brand } from "@/pages/BrandPortal";

interface BrandPortalMobileNavProps {
  brand: Brand;
  currentTab: string;
}

const mainTabs = [
  { title: "Home", tab: "home", icon: Home },
  { title: "Campaigns", tab: "campaigns", icon: Briefcase },
  { title: "Wallet", tab: "wallet", icon: Wallet },
  { title: "Messages", tab: "messages", icon: MessageCircle },
];

const moreTabs = [
  { title: "Submissions", tab: "submissions", icon: FileVideo },
  { title: "Earnings", tab: "earnings", icon: Wallet },
  { title: "Resources", tab: "resources", icon: FileVideo },
  { title: "Settings", tab: "settings", icon: Home },
];

export function BrandPortalMobileNav({ brand, currentTab }: BrandPortalMobileNavProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);

  const accentColor = brand.brand_color || "#2061de";

  const handleTabClick = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams);
    setMoreOpen(false);
  };

  const isMoreActive = moreTabs.some(t => t.tab === currentTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-background border-t border-gray-200 dark:border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mainTabs.map((item) => {
          const isActive = currentTab === item.tab;
          const Icon = item.icon;

          return (
            <button
              key={item.tab}
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all ${
                  isActive ? "bg-opacity-15" : ""
                }`}
                style={isActive ? { backgroundColor: `${accentColor}20` } : undefined}
              >
                <Icon
                  className="h-5 w-5"
                  style={isActive ? { color: accentColor } : undefined}
                />
              </div>
              <span className="text-[10px] font-medium tracking-tight">{item.title}</span>
            </button>
          );
        })}

        {/* More Menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isMoreActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <div
                className={`p-1.5 rounded-lg transition-all ${
                  isMoreActive ? "bg-opacity-15" : ""
                }`}
                style={isMoreActive ? { backgroundColor: `${accentColor}20` } : undefined}
              >
                <MoreHorizontal
                  className="h-5 w-5"
                  style={isMoreActive ? { color: accentColor } : undefined}
                />
              </div>
              <span className="text-[10px] font-medium tracking-tight">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <div className="py-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 px-1">More Options</h3>
              <div className="grid grid-cols-4 gap-4">
                {moreTabs.map((item) => {
                  const isActive = currentTab === item.tab;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.tab}
                      onClick={() => handleTabClick(item.tab)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                        isActive
                          ? "bg-muted"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <Icon
                        className="h-6 w-6"
                        style={isActive ? { color: accentColor } : undefined}
                      />
                      <span className="text-xs font-medium">{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
