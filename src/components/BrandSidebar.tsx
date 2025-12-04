import { useState, useEffect } from "react";
import { Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { NavLink, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Campaign {
  id: string;
  title: string;
  slug: string;
  brand_logo_url: string | null;
}

export function BrandSidebar() {
  const { campaignSlug } = useParams();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, slug, brand_logo_url')
        .order('title');

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (slug: string) => campaignSlug === slug;

  if (loading) {
    return (
      <aside className={cn(
        "h-screen border-r border-border bg-card flex flex-col sticky top-0 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-32" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full mb-2" />
          ))}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={cn(
      "h-screen border-r border-border bg-card flex flex-col sticky top-0 transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className={cn(
        "p-4 border-b border-border",
        isCollapsed ? "flex justify-center" : ""
      )}>
        {!isCollapsed && (
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Campaigns
          </h2>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {campaigns.map((campaign) => {
          const active = isActive(campaign.slug);
          return (
            <NavLink
              key={campaign.id}
              to={`/manage/${campaign.slug}`}
              className={cn(
                "flex items-center rounded-md transition-colors font-medium hover:bg-muted/50",
                active ? "bg-muted text-foreground" : "text-muted-foreground",
                isCollapsed ? "justify-center py-3 px-2" : "gap-3 px-3 py-2"
              )}
              title={isCollapsed ? campaign.title : undefined}
            >
              {campaign.brand_logo_url ? (
                <img
                  src={campaign.brand_logo_url}
                  alt={campaign.title}
                  className="h-6 w-6 rounded object-cover shrink-0"
                />
              ) : (
                <Building2 className="h-5 w-5 shrink-0" />
              )}
              {!isCollapsed && (
                <span className={cn(
                  "text-sm font-sans tracking-tight truncate",
                  active && "font-semibold"
                )}>
                  {campaign.title}
                </span>
              )}
            </NavLink>
          );
        })}

        {campaigns.length === 0 && !isCollapsed && (
          <div className="text-sm text-muted-foreground text-center py-8">
            No campaigns yet
          </div>
        )}
      </nav>

      <div className={cn(
        "p-[10px] border-t border-border",
        isCollapsed ? "flex justify-center" : "flex gap-2"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "bg-muted/50 hover:bg-muted",
            isCollapsed ? "h-10 w-10 p-0" : "h-10 w-10 p-0"
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}
