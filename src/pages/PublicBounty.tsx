import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplyToBountySheet } from "@/components/ApplyToBountySheet";
import { useAuth } from "@/contexts/AuthContext";

interface BountyCampaign {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  monthly_retainer: number;
  videos_per_month: number;
  max_accepted_creators: number;
  accepted_creators_count: number;
  content_style_requirements: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  brand_id: string;
  blueprint_embed_url: string | null;
}

interface Brand {
  name: string;
  logo_url: string | null;
  description: string | null;
}

const PublicBounty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bounty, setBounty] = useState<BountyCampaign | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplySheet, setShowApplySheet] = useState(false);

  useEffect(() => {
    fetchBountyData();
  }, [id]);

  const fetchBountyData = async () => {
    try {
      const { data: bountyData, error: bountyError } = await supabase
        .from("bounty_campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (bountyError) throw bountyError;

      setBounty(bountyData);

      if (bountyData.brand_id) {
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .select("name, logo_url, description")
          .eq("id", bountyData.brand_id)
          .single();

        if (!brandError) {
          setBrand(brandData);
        }
      }
    } catch (error) {
      console.error("Error fetching bounty:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = () => {
    if (!user) {
      // Store return URL for redirect after auth
      sessionStorage.setItem('applyReturnUrl', window.location.pathname);
      navigate("/auth");
      return;
    }
    setShowApplySheet(true);
  };

  // Handle auto-open apply sheet after auth redirect
  useEffect(() => {
    const returnUrl = sessionStorage.getItem('applyReturnUrl');
    if (user && returnUrl === window.location.pathname) {
      sessionStorage.removeItem('applyReturnUrl');
      setShowApplySheet(true);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!bounty || !bounty.blueprint_embed_url) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Bounty Not Found</h1>
          <p className="text-muted-foreground">
            This bounty campaign doesn't exist or is no longer available.
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const isFull = bounty.accepted_creators_count >= bounty.max_accepted_creators;
  const availableSpots = bounty.max_accepted_creators - bounty.accepted_creators_count;

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full Screen Iframe */}
      <iframe
        src={bounty.blueprint_embed_url.startsWith('http') 
          ? bounty.blueprint_embed_url 
          : `https://${bounty.blueprint_embed_url}`}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Campaign Blueprint"
      />

      {/* Floating Brand Card */}
      {!isFull && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-background/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-6 max-w-md w-[90vw] sm:w-full">
            {/* Brand Info */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border/50">
              {brand?.logo_url && (
                <img
                  src={brand.logo_url}
                  alt={brand.name}
                  className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary/20"
                />
              )}
              <div className="flex-1">
                <h3 className="font-bold text-lg">{brand?.name || bounty.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} remaining
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Monthly Retainer</p>
                <p className="text-xl font-bold text-primary">${bounty.monthly_retainer}</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Videos/Month</p>
                <p className="text-xl font-bold text-primary">{bounty.videos_per_month}</p>
              </div>
            </div>

            {/* Apply Button */}
            <Button
              size="lg"
              className="w-full shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
              onClick={handleApplyClick}
            >
              {user ? "Apply Now" : "Sign In to Apply"}
            </Button>
          </div>
        </div>
      )}

      {/* Apply Sheet */}
      {bounty && (
        <ApplyToBountySheet
          open={showApplySheet}
          onOpenChange={setShowApplySheet}
          bounty={bounty}
          onSuccess={() => {
            setShowApplySheet(false);
            fetchBountyData();
          }}
        />
      )}
    </div>
  );
};

export default PublicBounty;
