import { Layers, Dock, Compass, Coins, ArrowUpRight, LogOut } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import wordmarkLogo from "@/assets/wordmark-logo.png";
import newLogo from "@/assets/new-logo.png";
import discordIcon from "@/assets/discord-icon.png";
import trophyIcon from "@/assets/trophy-icon.png";
import moneyIcon from "@/assets/money-icon.png";
import { WebStoriesIcon } from "@/components/WebStoriesIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { OptimizedImage } from "@/components/OptimizedImage";

const menuItems = [
  {
    title: "Campaigns",
    tab: "campaigns",
    icon: null as any // Will use custom SVG
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
    icon: Coins
  }
];

export function AppSidebar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const currentTab = searchParams.get("tab") || "campaigns";
  const { user } = useAuth();
  const { theme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, full_name, username")
      .eq("id", user.id)
      .single();

    if (data) {
      setAvatarUrl(data.avatar_url);
      setDisplayName(data.full_name || data.username || user.email || "");
    } else {
      setDisplayName(user.email || "");
    }
  };

  const getInitial = () => {
    return displayName.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "U";
  };

  const handleTabClick = (tab: string) => {
    navigate(`/dashboard?tab=${tab}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast.success("Logged out successfully");
  };

  return (
    <>
      {/* Mobile Header - Top */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between bg-background px-4 border-b">
        <OptimizedImage src={newLogo} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <button className="cursor-pointer">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {getInitial()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0 bg-card" align="end">
              <div className="p-4 space-y-3">
                {/* User Info */}
                <div>
                  <h3 className="text-xl font-bold mb-1">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                {/* Settings Button */}
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="secondary"
                    onClick={() => handleTabClick("profile")}
                  >
                    Settings
                  </Button>
                  <ThemeToggle />
                </div>

                {/* Menu Items */}
                <div className="space-y-1">
                  <button 
                    className="w-full flex items-center gap-3 px-0 py-2 text-left hover:opacity-70 transition-opacity"
                    onClick={() => navigate("/leaderboard")}
                  >
                    <img src={trophyIcon} alt="Trophy" className="w-5 h-5" />
                    <span className="font-medium text-sm">Leaderboard</span>
                  </button>

                  <button 
                    className="w-full flex items-center gap-3 px-0 py-2 text-left hover:opacity-70 transition-opacity"
                    onClick={() => navigate("/referrals")}
                  >
                    <img src={moneyIcon} alt="Money" className="w-5 h-5" />
                    <span className="font-medium text-sm">Referrals</span>
                  </button>

                  <button 
                    className="w-full flex items-center justify-between px-0 py-2 text-left hover:opacity-70 transition-opacity"
                    onClick={() => window.open("https://discord.gg/your-discord", "_blank")}
                  >
                    <div className="flex items-center gap-3">
                      <img src={discordIcon} alt="Discord" className="w-5 h-5 rounded" />
                      <span className="font-medium text-sm">Discord</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  <button 
                    className="w-full flex items-center justify-between px-0 py-2 text-left hover:opacity-70 transition-opacity"
                    onClick={() => window.open("https://forms.gle/your-feedback-form", "_blank")}
                  >
                    <span className="font-medium text-sm">Give feedback</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  <button 
                    className="w-full flex items-center justify-between px-0 py-2 text-left hover:opacity-70 transition-opacity"
                    onClick={() => window.open("https://support.example.com", "_blank")}
                  >
                    <span className="font-medium text-sm">Support</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  <button 
                    className="w-full flex items-center gap-2 px-0 py-2 text-left hover:opacity-70 transition-opacity"
                    onClick={handleSignOut}
                  >
                    <span className="font-medium text-sm">Log out</span>
                  </button>
                </div>

                {/* Footer Links */}
                <div className="pt-4 border-t flex gap-4 text-sm text-muted-foreground">
                  <button 
                    className="hover:text-foreground transition-colors"
                    onClick={() => window.open("https://virality.cc/privacy-policy", "_blank")}
                  >
                    Privacy
                  </button>
                  <button 
                    className="hover:text-foreground transition-colors"
                    onClick={() => window.open("https://virality.cc/terms", "_blank")}
                  >
                    Terms
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Bottom Navigation / Desktop Top Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:sticky md:top-0 md:bottom-auto z-10 flex h-14 md:h-16 items-center justify-center md:justify-between bg-background px-3 md:px-6">
        {/* Logo - Desktop Only */}
        <div className="hidden md:flex items-center gap-2">
        <OptimizedImage src={newLogo} alt="Logo" className="h-[34px] w-[34px] rounded-lg object-cover" />
        <span
          className="font-geist font-bold tracking-tighter-custom"
          style={{
            color: theme === 'light' ? '#000000' : '#FFFFFF',
            fontSize: '18px',
            marginLeft: '-4px'
          }}
        >
          VIRALITY
        </span>
      </div>

      {/* Navigation Items */}
      <div className="flex items-center gap-0.5 md:gap-1">
        {menuItems.map(item => {
          // Only highlight if we're on /dashboard route, not other routes like /referrals
          const isActive = location.pathname === '/dashboard' && currentTab === item.tab;
          return (
            <button
              key={item.title}
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center justify-center gap-0.5 md:gap-1 w-14 h-12 md:w-auto md:h-auto md:px-6 md:py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : theme === 'light'
                    ? 'text-muted-foreground hover:bg-[#F0F0F0]'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {item.tab === "campaigns" ? (
                <WebStoriesIcon className="h-4 w-4 md:h-5 md:w-5" />
              ) : (
                <item.icon className="h-4 w-4 md:h-5 md:w-5" />
              )}
              <span className="hidden md:block text-xs font-medium tracking-[-0.5px]">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* User Profile */}
      <div className="hidden md:flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="cursor-pointer">
              <Avatar className="w-8 h-8">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  {getInitial()}
                </AvatarFallback>
              </Avatar>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0 bg-card" align="end">
            <div className="p-4 space-y-3">
              {/* User Info */}
              <div>
                <h3 className="text-xl font-bold mb-1">{displayName}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>

              {/* Settings Button */}
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  variant="secondary"
                  onClick={() => handleTabClick("profile")}
                >
                  Settings
                </Button>
                <ThemeToggle />
              </div>

              {/* Menu Items */}
              <div className="space-y-1">
                <button 
                  className="w-full flex items-center gap-3 px-0 py-2 text-left hover:opacity-70 transition-opacity"
                  onClick={() => navigate("/leaderboard")}
                >
                  <img src={trophyIcon} alt="Trophy" className="w-5 h-5" />
                  <span className="font-medium text-sm">Leaderboard</span>
                </button>

                <button 
                  className="w-full flex items-center gap-3 px-0 py-2 text-left hover:opacity-70 transition-opacity"
                  onClick={() => navigate("/referrals")}
                >
                  <img src={moneyIcon} alt="Money" className="w-5 h-5" />
                  <span className="font-medium text-sm">Referrals</span>
                </button>

                <button 
                  className="w-full flex items-center justify-between px-0 py-2 text-left hover:opacity-70 transition-opacity"
                  onClick={() => window.open("https://discord.gg/your-discord", "_blank")}
                >
                  <div className="flex items-center gap-3">
                    <img src={discordIcon} alt="Discord" className="w-5 h-5 rounded" />
                    <span className="font-medium text-sm">Discord</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button 
                  className="w-full flex items-center justify-between px-0 py-2 text-left hover:opacity-70 transition-opacity"
                  onClick={() => window.open("https://forms.gle/your-feedback-form", "_blank")}
                >
                  <span className="font-medium text-sm">Give feedback</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button 
                  className="w-full flex items-center justify-between px-0 py-2 text-left hover:opacity-70 transition-opacity"
                  onClick={() => window.open("https://support.example.com", "_blank")}
                >
                  <span className="font-medium text-sm">Support</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>

                <button 
                  className="w-full flex items-center gap-2 px-0 py-2 text-left hover:opacity-70 transition-opacity"
                  onClick={handleSignOut}
                >
                  <span className="font-medium text-sm">Log out</span>
                </button>
              </div>

               {/* Footer Links */}
               <div className="pt-4 border-t flex gap-4 text-sm text-muted-foreground">
                 <button 
                   className="hover:text-foreground transition-colors"
                   onClick={() => window.open("https://virality.cc/privacy-policy", "_blank")}
                 >
                   Privacy
                 </button>
                 <button 
                   className="hover:text-foreground transition-colors"
                   onClick={() => window.open("https://virality.cc/terms", "_blank")}
                 >
                   Terms
                 </button>
               </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      </nav>
    </>
  );
}