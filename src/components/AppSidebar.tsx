import { Layers, Dock, Compass, Coins, ArrowUpRight, LogOut } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import wordmarkLogo from "@/assets/wordmark-logo.png";
import discordIcon from "@/assets/discord-icon.png";
import { WebStoriesIcon } from "@/components/WebStoriesIcon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  const currentTab = searchParams.get("tab") || "campaigns";
  const { user } = useAuth();
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
    <nav className="fixed bottom-0 left-0 right-0 md:sticky md:top-0 md:bottom-auto z-10 flex h-14 md:h-16 items-center justify-center md:justify-between bg-background px-3 md:px-6">
      {/* Logo */}
      <div className="hidden md:flex items-center">
        <img src={wordmarkLogo} alt="Logo" className="h-12" />
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
      <div className="hidden md:flex items-center">
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
              <Button 
                className="w-full" 
                variant="secondary"
                onClick={() => handleTabClick("profile")}
              >
                Settings
              </Button>

              {/* Menu Items */}
              <div className="space-y-1">
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
                <button className="hover:text-foreground transition-colors">Privacy</button>
                <button className="hover:text-foreground transition-colors">Terms</button>
                <button className="hover:text-foreground transition-colors">Clipper Terms</button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}