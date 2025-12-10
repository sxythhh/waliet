import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Home, Video, Users, DollarSign } from "lucide-react";
import { CampaignAnalyticsTable } from "@/components/CampaignAnalyticsTable";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  budget: number;
  budget_used: number;
  rpm_rate: number;
  status: string;
  banner_url: string | null;
  slug: string;
  brand_id: string | null;
}

interface BrandCampaignDetailViewProps {
  campaignId: string;
}

type DetailTab = "home" | "videos" | "creators" | "payouts";

export function BrandCampaignDetailView({ campaignId }: BrandCampaignDetailViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>("home");

  useEffect(() => {
    fetchCampaign();
  }, [campaignId]);

  const fetchCampaign = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (error) {
      console.error("Error fetching campaign:", error);
    } else {
      setCampaign(data);
    }
    setLoading(false);
  };

  const handleBack = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("campaign");
    setSearchParams(newParams);
  };

  const detailTabs = [
    { id: "home" as DetailTab, label: "Home", icon: Home },
    { id: "videos" as DetailTab, label: "Videos", icon: Video },
    { id: "creators" as DetailTab, label: "Creators", icon: Users },
    { id: "payouts" as DetailTab, label: "Payouts", icon: DollarSign },
  ];

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Campaign not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with back button and campaign title */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">{campaign.title}</h1>
      </div>

      {/* Tab Navigation - Horizontal bottom style */}
      <div className="border-b border-border">
        <nav className="flex gap-0">
          {detailTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDetailTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeDetailTab === tab.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area - Uses the existing CampaignAnalyticsTable for all tabs */}
      <div className="flex-1 overflow-auto">
        <CampaignAnalyticsTable campaignId={campaignId} />
      </div>
    </div>
  );
}
