import { Airplay, Dock, Compass, User } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import wordmarkLogo from "@/assets/wordmark-logo.png";

const menuItems = [
  {
    title: "Campaigns",
    tab: "campaigns",
    icon: Airplay
  },
  {
    title: "Wallet",
    tab: "wallet",
    icon: Dock
  },
  {
    title: "Discover",
    tab: "discover",
    icon: Compass
  },
  {
    title: "Profile",
    tab: "profile",
    icon: User
  }
];

export function AppSidebar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "campaigns";

  const handleTabClick = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
  };

  return (
    <nav className="sticky top-0 z-10 flex h-14 md:h-16 items-center justify-center md:justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-6">
      {/* Logo */}
      <div className="hidden md:flex items-center">
        <img src={wordmarkLogo} alt="Logo" className="h-8" />
      </div>

      {/* Navigation Items */}
      <div className="flex items-center gap-0.5 md:gap-1">
        {menuItems.map(item => {
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.title}
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center justify-center gap-0.5 md:gap-1 w-14 h-12 md:w-auto md:h-auto md:px-6 md:py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <item.icon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden md:block text-xs font-medium">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* User Profile Placeholder */}
      <div className="hidden md:flex items-center">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </nav>
  );
}