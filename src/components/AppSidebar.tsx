import { Airplay, Dock, Compass, Coins } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import wordmarkLogo from "@/assets/wordmark-logo.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:sticky md:top-0 md:bottom-auto z-10 flex h-14 md:h-16 items-center justify-center md:justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-3 md:px-6">
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
              <item.icon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden md:block text-xs font-medium tracking-[-0.5px]">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* User Profile */}
      <div className="hidden md:flex items-center">
        <Avatar className="w-8 h-8">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="bg-blue-500 text-white">
            {getInitial()}
          </AvatarFallback>
        </Avatar>
      </div>
    </nav>
  );
}