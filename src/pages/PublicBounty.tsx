import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Video, Users, Calendar, ArrowLeft } from "lucide-react";
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
      navigate("/auth");
      return;
    }
    setShowApplySheet(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div
        className="h-64 bg-cover bg-center relative"
        style={{
          backgroundImage: bounty.banner_url
            ? `url(${bounty.banner_url})`
            : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-foreground)))",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 pb-8">
        {/* Brand Info Card */}
        {brand && (
          <Card className="p-4 mb-6 flex items-center gap-4 bg-card/95 backdrop-blur">
            {brand.logo_url && (
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold text-lg">{brand.name}</h3>
              {brand.description && (
                <p className="text-sm text-muted-foreground">{brand.description}</p>
              )}
            </div>
          </Card>
        )}

        {/* Main Content */}
        <Card className="p-6 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{bounty.title}</h1>
              <Badge variant={bounty.status === "active" ? "default" : "secondary"}>
                {bounty.status}
              </Badge>
            </div>
            {bounty.description && (
              <p className="text-muted-foreground">{bounty.description}</p>
            )}
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Monthly Retainer</span>
              </div>
              <p className="text-2xl font-bold">${bounty.monthly_retainer}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Video className="h-4 w-4" />
                <span className="text-sm">Videos Per Month</span>
              </div>
              <p className="text-2xl font-bold">{bounty.videos_per_month}</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Available Positions</span>
              </div>
              <p className="text-2xl font-bold">
                {availableSpots} / {bounty.max_accepted_creators}
              </p>
            </Card>
          </div>

          {/* Timeline */}
          {(bounty.start_date || bounty.end_date) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {bounty.start_date && (
                <span>
                  Starts: {new Date(bounty.start_date).toLocaleDateString()}
                </span>
              )}
              {bounty.end_date && (
                <span>
                  Ends: {new Date(bounty.end_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {/* Content Requirements */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Content Style Requirements</h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground whitespace-pre-wrap">
                {bounty.content_style_requirements}
              </p>
            </div>
          </div>

          {/* Apply Button */}
          <div className="pt-4 border-t">
            {isFull ? (
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-muted-foreground">
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
        </Card>
      </div>

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
