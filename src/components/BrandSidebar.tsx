import { Home, FolderOpen, Pyramid, GalleryHorizontalEnd, Receipt, GraduationCap, Map, ArrowUpRight } from "lucide-react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useIsMobile } from "@/hooks/use-mobile";
interface Brand {
  name: string;
  slug: string;
  logo_url: string | null;
  brand_type: string | null;
  show_account_tab: boolean | null;
  is_active: boolean;
}
export function BrandSidebar() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAdminCheck();
  const isMobile = useIsMobile();
  const sidebar = useSidebar();
  useEffect(() => {
    const fetchBrands = async () => {
      const {
        data,
        error
      } = await supabase.from("brands").select("name, slug, logo_url, brand_type, show_account_tab, is_active").order("name");
      if (!error && data) {
        setBrands(data);
      }
      setLoading(false);
    };
    fetchBrands();
  }, []);

  // Wait for brands to load before rendering
  if (loading || brands.length === 0) {
    return <Sidebar className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className="border-b border-transparent p-6 bg-sidebar">
          <div className="h-8 w-full bg-muted rounded animate-pulse" />
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
  }];

  // Add Training as 2nd item for DWY brands
  if (currentBrand?.brand_type === "DWY") {
    baseMenuItems.push({
      title: "Training",
      icon: GraduationCap,
      path: "training"
    });
  }

  // Add Management for non-DWY brands
  if (currentBrand?.brand_type !== "DWY") {
    baseMenuItems.push({
      title: "Management",
      icon: FolderOpen,
      path: "management"
    });
  }

  // Add Roadmap/Assets based on brand type
  baseMenuItems.push(
    currentBrand?.brand_type === "DWY" ? {
      title: "Roadmap",
      icon: Map,
      path: "assets"
    } : {
      title: "Assets",
      icon: Pyramid,
      path: "assets"
    }
  );

  // Add Library
  baseMenuItems.push({
    title: "Library",
    icon: GalleryHorizontalEnd,
    path: "library"
  });

  // Conditionally add Account tab based on show_account_tab setting
  if (currentBrand?.show_account_tab !== false) {
    baseMenuItems.push({
      title: "Account",
      icon: Receipt,
      path: "account"
    });
  }

  const dynamicMenuItems = baseMenuItems;

  const brandSelector = (
    <div className="p-4 bg-sidebar px-[5px] py-[5px]">
      {isAdmin ? (
        <Select value={currentSlug} onValueChange={value => navigate(`/brand/${value}`)}>
          <SelectTrigger className="w-full bg-muted border-none text-foreground hover:bg-accent font-chakra font-semibold tracking-tight focus:ring-0 focus:ring-offset-0">
            <SelectValue>
              <div className="flex items-center gap-2">
                {currentBrand?.logo_url ? <img src={currentBrand.logo_url} alt={currentBrand.name} className="h-5 w-5 rounded object-cover" /> : <div className="h-5 w-5 rounded bg-muted" />}
                <span>{currentBrand?.name || "Select Brand"}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-card border z-50">
            {brands.filter(brand => brand.is_active).map(brand => <SelectItem key={brand.slug} value={brand.slug} className="text-foreground hover:bg-accent focus:bg-accent font-chakra font-semibold tracking-tight">
                <div className="flex items-center gap-2">
                  {brand.logo_url ? <img src={brand.logo_url} alt={brand.name} className="h-5 w-5 rounded object-cover" /> : <div className="h-5 w-5 rounded bg-muted" />}
                  <span>{brand.name}</span>
                </div>
              </SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <div className="w-full bg-muted border-none text-foreground px-3 py-2 rounded-md font-chakra font-semibold tracking-tight">
          <div className="flex items-center gap-2">
            {currentBrand?.logo_url ? <img src={currentBrand.logo_url} alt={currentBrand.name} className="h-5 w-5 rounded object-cover" /> : <div className="h-5 w-5 rounded bg-muted" />}
            <span>{currentBrand?.name || "Select Brand"}</span>
          </div>
        </div>
      )}
    </div>
  );

  const menuContent = (
    <SidebarMenu>
      {dynamicMenuItems.map(item => <SidebarMenuItem key={item.title}>
          <NavLink 
            to={`/brand/${currentSlug}${item.path ? `/${item.path}` : ''}`} 
            end 
            onClick={() => {
              if (isMobile) {
                setTimeout(() => sidebar.setOpenMobile(false), 100);
              }
            }}
            className={({
              isActive
            }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium ${isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent text-muted-foreground'}`}>
            {({
              isActive
            }) => <>
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </>}
          </NavLink>
        </SidebarMenuItem>)}
    </SidebarMenu>
  );

  const bookCallButton = currentBrand?.brand_type === "lead" ? (
    <div className="p-4 bg-sidebar">
      <a href="https://partners.virality.cc/book" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg transition-all active:scale-95 hover:bg-primary/90 shadow-lg">
        <span>Book a Call</span>
        <ArrowUpRight className="h-5 w-5" />
      </a>
    </div>
  ) : null;

  // Mobile Sheet
  if (isMobile) {
    return (
      <Sheet open={sidebar.openMobile} onOpenChange={sidebar.setOpenMobile}>
        <SheetContent side="left" className="w-80 p-0 bg-sidebar border">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {brandSelector}
          <div className="flex-1 overflow-y-auto">
            <SidebarGroup>
              <SidebarGroupContent>
                {menuContent}
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
          {bookCallButton}
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop Sidebar
  return <Sidebar className="border-r border-sidebar-border bg-sidebar font-instrument">
      {brandSelector}
      
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupContent>
            {menuContent}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {bookCallButton}
    </Sidebar>;
}