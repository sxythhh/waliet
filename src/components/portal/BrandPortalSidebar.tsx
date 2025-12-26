import { useSearchParams, useNavigate } from "react-router-dom";
import { Home, Briefcase, Wallet, FileVideo, User, LogOut, ExternalLink } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  brand_color: string | null;
  description: string | null;
}

interface BrandPortalSidebarProps {
  brand: Brand;
  currentTab: string;
}

const menuItems = [
  { title: "Home", tab: "home", icon: Home },
  { title: "Campaigns", tab: "campaigns", icon: Briefcase },
  { title: "Earnings", tab: "earnings", icon: Wallet },
  { title: "Submissions", tab: "submissions", icon: FileVideo },
  { title: "Profile", tab: "profile", icon: User },
];

export function BrandPortalSidebar({ brand, currentTab }: BrandPortalSidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        setProfile(data);
      }
    };
    fetchProfile();
  }, []);

  const handleTabClick = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", tab);
    setSearchParams(newParams);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const accentColor = brand.brand_color || "#2061de";

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-lg">
            <AvatarImage src={brand.logo_url || ""} alt={brand.name} className="object-cover" />
            <AvatarFallback 
              className="rounded-lg text-white font-semibold"
              style={{ backgroundColor: accentColor }}
            >
              {brand.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">{brand.name}</h2>
            <p className="text-xs text-gray-500">Creator Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = currentTab === item.tab;
          const Icon = item.icon;
          
          return (
            <button
              key={item.tab}
              onClick={() => handleTabClick(item.tab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                isActive 
                  ? "text-white font-medium shadow-sm" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
              style={isActive ? { backgroundColor: accentColor } : undefined}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-gray-100">
        {/* Go to Main Dashboard */}
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors mb-2"
        >
          <ExternalLink className="h-5 w-5" />
          <span className="text-sm">Main Dashboard</span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
              {profile?.username?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.username || "Creator"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-gray-400 hover:text-gray-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
