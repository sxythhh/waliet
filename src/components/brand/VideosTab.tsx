import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShortimizeVideosTable } from "./ShortimizeVideosTable";
import type { TimeframeOption } from "@/components/dashboard/BrandCampaignDetailView";

interface VideosTabProps {
  campaignId: string;
  brandId: string;
  isAdmin: boolean;
  approvedCreators: Array<{
    id: string;
    creator_id: string;
    profiles: {
      username: string;
      avatar_url: string | null;
    };
  }>;
  timeframe?: TimeframeOption;
}

export function VideosTab({ campaignId, brandId, timeframe }: VideosTabProps) {
  const [collectionName, setCollectionName] = useState<string | undefined>();

  useEffect(() => {
    fetchBrandCollection();
  }, [brandId]);

  const fetchBrandCollection = async () => {
    const { data } = await supabase
      .from('brands')
      .select('collection_name')
      .eq('id', brandId)
      .single();
    
    if (data?.collection_name) {
      setCollectionName(data.collection_name);
    }
  };

  return (
    <div className="space-y-6">
      <ShortimizeVideosTable brandId={brandId} collectionName={collectionName} campaignId={campaignId} timeframe={timeframe} />
    </div>
  );
}