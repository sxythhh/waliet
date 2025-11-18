import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DollarSign, Video, Users, Calendar, X } from "lucide-react";
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
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);

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
      navigate("/auth");
      return;
    }
    setShowApplySheet(true);
  };

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

      {/* Floating Apply Button */}
      <Button
        size="lg"
        className="fixed bottom-8 right-8 z-50 shadow-2xl hover:scale-105 transition-transform"
        onClick={() => setShowDetailsSheet(true)}
      >
        View Details & Apply
      </Button>

      {/* Details Sidebar */}
      <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Bounty Details</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDetailsSheet(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Brand Info */}
            {brand && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                {brand.logo_url && (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h3 className="font-semibold">{brand.name}</h3>
                  {brand.description && (
                    <p className="text-xs text-muted-foreground">{brand.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Title & Status */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">{bounty.title}</h2>
                <Badge variant={bounty.status === "active" ? "default" : "secondary"}>
                  {bounty.status}
                </Badge>
              </div>
              {bounty.description && (
                <p className="text-sm text-muted-foreground">{bounty.description}</p>
              )}
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Monthly Retainer</span>
                </div>
                <p className="text-xl font-bold">${bounty.monthly_retainer}</p>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Video className="h-4 w-4" />
                  <span className="text-xs">Videos Per Month</span>
                </div>
                <p className="text-xl font-bold">{bounty.videos_per_month}</p>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Available Positions</span>
                </div>
                <p className="text-xl font-bold">
                  {availableSpots} / {bounty.max_accepted_creators}
                </p>
              </Card>
            </div>

            {/* Timeline */}
            {(bounty.start_date || bounty.end_date) && (
              <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs font-medium">Timeline</span>
                </div>
                {bounty.start_date && (
                  <p className="text-sm">
                    Starts: {new Date(bounty.start_date).toLocaleDateString()}
                  </p>
                )}
                {bounty.end_date && (
                  <p className="text-sm">
                    Ends: {new Date(bounty.end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            {/* Content Requirements */}
            <div>
              <h3 className="font-semibold mb-2">Content Style Requirements</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {bounty.content_style_requirements}
              </p>
            </div>

            {/* Apply Button */}
            <div className="pt-4">
              {isFull ? (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    This bounty campaign is currently full. All positions have been filled.
                  </p>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleApplyClick}
                >
                  {user ? "Apply Now" : "Sign In to Apply"}
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

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
