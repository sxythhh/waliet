import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplyToBountySheet } from "@/components/ApplyToBountySheet";
import { useAuth } from "@/contexts/AuthContext";
import { X, Users, Video, DollarSign, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import DOMPurify from "dompurify";

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
  blueprint_id: string | null;
}

interface Brand {
  name: string;
  logo_url: string | null;
  description: string | null;
}

interface Blueprint {
  id: string;
  title: string;
  content: string | null;
  brand_voice: string | null;
  call_to_action: string | null;
  content_guidelines: string | null;
  hashtags: string[] | null;
  hooks: any | null;
  talking_points: any | null;
  dos_and_donts: any | null;
  example_videos: any | null;
}

const PublicBounty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bounty, setBounty] = useState<BountyCampaign | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApplySheet, setShowApplySheet] = useState(false);
  const [showFloatingMenu, setShowFloatingMenu] = useState(true);

  useEffect(() => {
    fetchBountyData();
  }, [id]);

  const fetchBountyData = async () => {
    try {
      const { data: bountyData, error: bountyError } = await supabase
        .from("bounty_campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (bountyError) throw bountyError;
      if (!bountyData) {
        setLoading(false);
        return;
      }

      setBounty(bountyData);

      // Fetch brand data
      if (bountyData.brand_id) {
        const { data: brandData } = await supabase
          .from("brands")
          .select("name, logo_url, description")
          .eq("id", bountyData.brand_id)
          .maybeSingle();

        if (brandData) {
          setBrand(brandData);
        }
      }

      // Fetch blueprint data if linked
      if (bountyData.blueprint_id) {
        const { data: blueprintData } = await supabase
          .from("blueprints")
          .select("*")
          .eq("id", bountyData.blueprint_id)
          .maybeSingle();

        if (blueprintData) {
          setBlueprint(blueprintData);
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
      sessionStorage.setItem('applyReturnUrl', window.location.pathname);
      navigate("/auth");
      return;
    }
    setShowApplySheet(true);
  };

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

  if (!bounty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold font-inter tracking-[-0.5px]">Boost Not Found</h1>
          <p className="text-muted-foreground font-inter tracking-[-0.5px]">
            This boost campaign doesn't exist or is no longer available.
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const isFull = bounty.accepted_creators_count >= bounty.max_accepted_creators;
  const availableSpots = bounty.max_accepted_creators - bounty.accepted_creators_count;

  // If there's an embed URL, show fullscreen iframe view
  if (bounty.blueprint_embed_url) {
    return (
      <div className="relative h-screen w-screen overflow-hidden">
        <iframe
          src={bounty.blueprint_embed_url.startsWith('http') 
            ? bounty.blueprint_embed_url 
            : `https://${bounty.blueprint_embed_url}`}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Campaign Blueprint"
        />

        {!isFull && showFloatingMenu && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-background/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-6 max-w-md w-[90vw] sm:w-full">
              <div className="flex items-center gap-4 mb-4">
                {brand?.logo_url && (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="h-14 w-14 rounded-xl object-cover ring-2 ring-primary/20"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg font-inter tracking-[-0.5px]">{brand?.name || bounty.title}</h3>
                  <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">
                    {availableSpots} {availableSpots === 1 ? 'spot' : 'spots'} remaining
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="lg"
                  variant="outline"
                  className="sm:hidden"
                  onClick={() => setShowFloatingMenu(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <Button
                  size="lg"
                  className="flex-1 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  onClick={handleApplyClick}
                >
                  {user ? "Apply Now" : "Sign In to Apply"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isFull && !showFloatingMenu && (
          <button
            onClick={() => setShowFloatingMenu(true)}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 sm:hidden bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg font-inter tracking-[-0.5px] font-medium"
          >
            Apply Now
          </button>
        )}

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
  }

  // Show detailed boost page when no embed URL
  return (
    <div className="min-h-screen bg-background">
      {/* Header with banner */}
      <div className="relative">
        {bounty.banner_url ? (
          <div className="h-48 md:h-64 w-full overflow-hidden">
            <img 
              src={bounty.banner_url} 
              alt={bounty.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
          </div>
        ) : (
          <div className="h-32 md:h-40 w-full bg-gradient-to-r from-primary/20 to-primary/5" />
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-32">
        {/* Brand & Title Section */}
        <div className="relative -mt-12 mb-8">
          <div className="flex items-end gap-4">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={brand?.logo_url || undefined} />
              <AvatarFallback className="text-2xl font-bold">{brand?.name?.charAt(0) || 'B'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 pb-1">
              <p className="text-sm text-muted-foreground font-inter tracking-[-0.5px]">{brand?.name}</p>
              <h1 className="text-2xl md:text-3xl font-bold font-inter tracking-[-0.5px]">{bounty.title}</h1>
            </div>
            <Badge variant={bounty.status === 'active' ? 'default' : 'secondary'} className="mb-1">
              {bounty.status}
            </Badge>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-inter tracking-[-0.5px]">Monthly</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px]">${bounty.monthly_retainer}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Video className="h-4 w-4" />
              <span className="text-xs font-inter tracking-[-0.5px]">Videos/mo</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px]">{bounty.videos_per_month}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-inter tracking-[-0.5px]">Spots</span>
            </div>
            <p className="text-xl font-bold font-inter tracking-[-0.5px]">{availableSpots} / {bounty.max_accepted_creators}</p>
          </div>
          {bounty.end_date && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-inter tracking-[-0.5px]">Ends</span>
              </div>
              <p className="text-xl font-bold font-inter tracking-[-0.5px]">{format(new Date(bounty.end_date), 'MMM d')}</p>
            </div>
          )}
        </div>

        {/* Description */}
        {bounty.description && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">About</h2>
            <p className="text-muted-foreground font-inter tracking-[-0.5px] whitespace-pre-wrap">{bounty.description}</p>
          </div>
        )}

        {/* Content Guidelines from Blueprint */}
        {blueprint?.content_guidelines && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Content Guidelines</h2>
            <p className="text-muted-foreground font-inter tracking-[-0.5px] whitespace-pre-wrap">{blueprint.content_guidelines}</p>
          </div>
        )}

        {/* Blueprint Content */}
        {blueprint && (
          <div className="space-y-8">
            {blueprint.content && (
              <div>
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Brief</h2>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none font-inter"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(blueprint.content) }}
                />
              </div>
            )}

            {blueprint.hooks && blueprint.hooks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Hooks</h2>
                <ul className="space-y-2">
                  {blueprint.hooks.map((hook: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground font-inter tracking-[-0.5px]">
                      <span className="text-primary">•</span>
                      <span>{typeof hook === 'string' ? hook : hook.text || hook.content}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blueprint.talking_points && blueprint.talking_points.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Talking Points</h2>
                <ul className="space-y-2">
                  {blueprint.talking_points.map((point: any, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground font-inter tracking-[-0.5px]">
                      <span className="text-primary">•</span>
                      <span>{typeof point === 'string' ? point : point.text || point.content}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blueprint.dos_and_donts && (
              <div className="grid md:grid-cols-2 gap-6">
                {blueprint.dos_and_donts.dos && blueprint.dos_and_donts.dos.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px] text-green-500">Do's</h2>
                    <ul className="space-y-2">
                      {blueprint.dos_and_donts.dos.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground font-inter tracking-[-0.5px]">
                          <span className="text-green-500">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {blueprint.dos_and_donts.donts && blueprint.dos_and_donts.donts.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px] text-red-500">Don'ts</h2>
                    <ul className="space-y-2">
                      {blueprint.dos_and_donts.donts.map((item: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground font-inter tracking-[-0.5px]">
                          <span className="text-red-500">✗</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {blueprint.call_to_action && (
              <div>
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Call to Action</h2>
                <p className="text-muted-foreground font-inter tracking-[-0.5px]">{blueprint.call_to_action}</p>
              </div>
            )}

            {blueprint.hashtags && blueprint.hashtags.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Hashtags</h2>
                <div className="flex flex-wrap gap-2">
                  {blueprint.hashtags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="font-inter tracking-[-0.5px]">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {blueprint.brand_voice && (
              <div>
                <h2 className="text-lg font-semibold mb-3 font-inter tracking-[-0.5px]">Brand Voice</h2>
                <p className="text-muted-foreground font-inter tracking-[-0.5px]">{blueprint.brand_voice}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Apply Button */}
      {!isFull && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border">
          <div className="max-w-4xl mx-auto">
            <Button
              size="lg"
              className="w-full shadow-lg font-inter tracking-[-0.5px]"
              onClick={handleApplyClick}
            >
              {user ? "Apply Now" : "Sign In to Apply"}
            </Button>
          </div>
        </div>
      )}

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