import { Layers, Dock, Compass, User, ArrowUpRight, LogOut, Settings, Trophy, Gift, MessageSquare, HelpCircle } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import newLogo from "@/assets/new-logo.png";
import viralityIcon from "@/assets/virality-icon.png";
import discordIcon from "@/assets/discord-icon.png";
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
    icon: null as any
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
      <header className="md:hidden fixed top-0 left-0 right-0 z-10 flex h-14 items-center justify-between bg-[#0a0a0a] px-4">
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
                <div>
                  <h3 className="text-xl font-bold mb-1">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="secondary" onClick={() => handleTabClick("profile")}>
                    Settings
                  </Button>
                  <ThemeToggle />
                </div>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-3 px-0 py-2 text-left hover:opacity-70 transition-opacity" onClick={() => navigate("/leaderboard")}>
                    <Trophy className="w-4 h-4" />
                    <span className="font-medium text-sm">Leaderboard</span>
                  </button>
                  <button className="w-full flex items-center gap-3 px-0 py-2 text-left hover:opacity-70 transition-opacity" onClick={() => navigate("/referrals")}>
                    <Gift className="w-4 h-4" />
                    <span className="font-medium text-sm">Referrals</span>
                  </button>
                  <button className="w-full flex items-center justify-between px-0 py-2 text-left hover:opacity-70 transition-opacity" onClick={() => window.open("https://discord.gg/virality", "_blank")}>
                    <div className="flex items-center gap-3">
                      <img src={discordIcon} alt="Discord" className="w-4 h-4 rounded" />
                      <span className="font-medium text-sm">Discord</span>
                    </div>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  <button className="w-full flex items-center gap-2 px-0 py-2 text-left hover:opacity-70 transition-opacity" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium text-sm">Log out</span>
                  </button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-around bg-[#0a0a0a] px-2">
        {menuItems.map(item => {
          const isActive = location.pathname === '/dashboard' && currentTab === item.tab;
          return (
            <button
              key={item.title}
              onClick={() => handleTabClick(item.tab)}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-12 transition-all ${
                isActive 
                  ? 'text-white' 
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {item.tab === "campaigns" ? (
                <WebStoriesIcon className="h-5 w-5" />
              ) : (
                <item.icon className="h-5 w-5" />
              )}
              <span className="text-[10px] font-medium">{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 lg:w-64 h-screen sticky top-0 bg-[#0a0a0a] shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5">
          <OptimizedImage src={viralityIcon} alt="Logo" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-geist font-bold tracking-tighter-custom text-lg text-white">
            VIRALITY
          </span>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-2 py-2">
          <div>
            {menuItems.map(item => {
              const isActive = location.pathname === '/dashboard' && currentTab === item.tab;
              return (
                <button
                  key={item.title}
                  onClick={() => handleTabClick(item.tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-white/10 text-white' 
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.tab === "campaigns" ? (
                    <WebStoriesIcon className="h-5 w-5" />
                  ) : (
                    <item.icon className="h-5 w-5" />
                  )}
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary Links */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <button
              onClick={() => navigate("/leaderboard")}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Trophy className="h-5 w-5" />
              <span>Leaderboard</span>
            </button>
            <button
              onClick={() => navigate("/referrals")}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Gift className="h-5 w-5" />
              <span>Referrals</span>
            </button>
            <button
              onClick={() => window.open("https://discord.gg/virality", "_blank")}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img src={discordIcon} alt="Discord" className="w-5 h-5 rounded" />
                <span>Discord</span>
              </div>
              <ArrowUpRight className="w-4 h-4 opacity-50" />
            </button>
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-2 border-t border-white/10">
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2.5 hover:bg-white/5 transition-colors">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-neutral-800 text-neutral-300 text-sm">
                    {getInitial()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">{displayName}</p>
                  <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-[#141414] border-white/10" align="start" side="top">
              <div className="space-y-1">
                <button
                  onClick={() => handleTabClick("profile")}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                <div className="flex items-center gap-3 px-3 py-2">
                  <span className="text-sm text-neutral-300 flex-1">Theme</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => window.open("https://virality.cc/help", "_blank")}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 transition-colors"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Support</span>
                </button>
                <div className="my-1 border-t border-white/10" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log out</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </aside>
    </>
  );
}
