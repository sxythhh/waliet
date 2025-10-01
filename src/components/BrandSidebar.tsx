import { Home, FolderOpen, Image, Library, User, ExternalLink } from "lucide-react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { title: "Home", icon: Home, path: "" },
  { title: "Management", icon: FolderOpen, path: "management" },
  { title: "Assets", icon: Image, path: "assets" },
  { title: "Library", icon: Library, path: "library" },
  { title: "Account", icon: User, path: "account" },
];

interface Brand {
  name: string;
  slug: string;
}

export function BrandSidebar() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("name, slug")
        .order("name");

      if (!error && data) {
        setBrands(data);
      }
      setLoading(false);
    };

    fetchBrands();
  }, []);

  // Wait for brands to load before rendering
  if (loading || brands.length === 0) {
    return (
      <Sidebar className="border-r-0 bg-sidebar">
        <SidebarHeader className="border-b border-white/10 p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-lg">
              V
            </div>
            <span className="text-xl font-bold text-white">VIRALITY</span>
          </div>
          <div className="text-white/60 text-sm">Loading brands...</div>
        </SidebarHeader>
      </Sidebar>
    );
  }

  const currentBrand = brands.find((b) => b.slug === slug) || brands[0];
  const currentSlug = slug || brands[0].slug;

  return (
    <Sidebar className="border-r-0 bg-sidebar">
      <SidebarHeader className="border-b border-white/10 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-lg">
            V
          </div>
          <span className="text-xl font-bold text-white">
            VIRALITY
          </span>
        </div>
        
        <Select
          value={currentSlug}
          onValueChange={(value) => navigate(`/brand/${value}`)}
        >
          <SelectTrigger className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
            <SelectValue>
              {currentBrand?.name || "Select Brand"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#2a2a2a] border-white/10">
            {brands.map((brand) => (
              <SelectItem 
                key={brand.slug} 
                value={brand.slug}
                className="text-white hover:bg-white/10 focus:bg-white/10"
              >
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={`/brand/${currentSlug}${item.path ? `/${item.path}` : ''}`}
                      end
                      style={({ isActive }) => ({
                        backgroundColor: isActive ? '#5865F2' : 'transparent',
                        color: 'white',
                      })}
                      className="hover:bg-[#2C2C2C] transition-colors"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button className="w-full bg-primary hover:bg-primary/90 text-white">
          <ExternalLink className="h-4 w-4 mr-2" />
          Book a Call
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
