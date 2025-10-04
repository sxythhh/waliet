import { Home, FolderOpen, Layers, BookOpen, Receipt, GraduationCap, Map, ArrowUpRight } from "lucide-react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarHeader } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
interface Brand {
  name: string;
  slug: string;
  logo_url: string | null;
  brand_type: string | null;
  show_account_tab: boolean | null;
}
export function BrandSidebar() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignCount, setCampaignCount] = useState(0);
  useEffect(() => {
    const fetchBrands = async () => {
      const {
        data,
        error
      } = await supabase.from("brands").select("name, slug, logo_url, brand_type, show_account_tab").order("name");
      if (!error && data) {
        setBrands(data);
      }
      setLoading(false);
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!slug) return;
      
      const { data: brand } = await supabase
        .from("brands")
        .select("id")
        .eq("slug", slug)
        .single();
      
      if (brand) {
        const { count } = await supabase
          .from("campaigns")
          .select("*", { count: 'exact', head: true })
          .eq("brand_id", brand.id);
        
        setCampaignCount(count || 0);
      }
    };
    fetchCampaigns();
  }, [slug]);

  // Wait for brands to load before rendering
  if (loading || brands.length === 0) {
    return <Sidebar className="border-r border-[#272727] bg-[#202020]">
        <SidebarHeader className="border-b border-transparent p-6 bg-[#202020]">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center font-bold text-lg">
              V
            </div>
            <span className="text-xl font-bold text-white">VIRALITY</span>
          </div>
          <div className="text-white/60 text-sm">Loading brands...</div>
        </SidebarHeader>
      </Sidebar>;
  }
  const currentBrand = brands.find(b => b.slug === slug) || brands[0];
  const currentSlug = slug || brands[0].slug;

  // Define menu items dynamically based on brand type
  const baseMenuItems = [{
    title: "Home",
    icon: Home,
    path: ""
  }, ...(currentBrand?.brand_type === "client" && campaignCount === 0 ? [] : [{
    title: "Management",
    icon: FolderOpen,
    path: "management"
  }]), currentBrand?.brand_type === "DWY" ? {
    title: "Roadmap",
    icon: Map,
    path: "assets"
  } : {
    title: "Assets",
    icon: Layers,
    path: "assets"
  }, {
    title: "Library",
    icon: BookOpen,
    path: "library"
  }];

  // Conditionally add Account tab based on show_account_tab setting
  if (currentBrand?.show_account_tab !== false) {
    baseMenuItems.push({
      title: "Account",
      icon: Receipt,
      path: "account"
    });
  }

  // Add Training for DWY brands
  const dynamicMenuItems = currentBrand?.brand_type === "DWY" ? [...baseMenuItems, {
    title: "Training",
    icon: GraduationCap,
    path: "training"
  }] : baseMenuItems;
  return <Sidebar className="border-r border-[#272727] bg-[#202020] font-instrument">
      <SidebarHeader className="p-4 bg-[#202020] px-[5px] py-[5px]">
        <Select value={currentSlug} onValueChange={value => navigate(`/brand/${value}`)}>
          <SelectTrigger className="w-full bg-white/5 border-none text-white hover:bg-white/10 font-instrument">
            <SelectValue>
              <div className="flex items-center gap-2">
                {currentBrand?.logo_url ? <img src={currentBrand.logo_url} alt={currentBrand.name} className="h-5 w-5 rounded object-cover" /> : <div className="h-5 w-5 rounded bg-white/10" />}
                <span>{currentBrand?.name || "Select Brand"}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#2a2a2a] border-white/10">
            {brands.map(brand => <SelectItem key={brand.slug} value={brand.slug} className="text-white hover:bg-white/10 focus:bg-white/10">
                <div className="flex items-center gap-2">
                  {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 rounded object-cover" /> : <div className="h-5 w-5 rounded bg-white/10" />}
                  <span>{brand.name}</span>
                </div>
              </SelectItem>)}
          </SelectContent>
        </Select>
      </SidebarHeader>
      
      <SidebarContent className="bg-[#202020]">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {dynamicMenuItems.map(item => <SidebarMenuItem key={item.title}>
                  <NavLink to={`/brand/${currentSlug}${item.path ? `/${item.path}` : ''}`} end className={({
                isActive
              }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium ${isActive ? 'bg-[#5865F2] text-white hover:bg-[#5865F2]' : 'text-white hover:bg-[#2C2C2C]'}`}>
                    {({
                  isActive
                }) => <>
                        <item.icon className="h-5 w-5" style={{
                    color: isActive ? '#FFFFFF' : '#A0A1A7'
                  }} />
                        <span>{item.title}</span>
                      </>}
                  </NavLink>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Book a Call Button */}
      <div className="p-4 bg-[#202020] ">
        <a href="https://partners.virality.cc/book" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all active:scale-95" style={{
        backgroundColor: '#5865F2',
        boxShadow: '0 4px 0 0 #3b45a0',
        transform: 'translateY(-2px)'
      }}>
          <span>Book a Call</span>
          <ArrowUpRight className="h-5 w-5" />
        </a>
      </div>
    </Sidebar>;
}