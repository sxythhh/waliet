import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Clock, X, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import tiktokLogoBlack from "@/assets/tiktok-logo-black.png";
import instagramLogoBlack from "@/assets/instagram-logo-black.png";
import youtubeLogoBlack from "@/assets/youtube-logo-black.png";

interface PendingRequest {
  id: string;
  brand_id: string;
  social_account_id: string | null;
  message: string | null;
  expires_at: string;
  requested_at: string;
  brands: {
    name: string;
    logo_url: string | null;
  };
  social_accounts: {
    platform: string;
    username: string;
  } | null;
}

interface PendingInsightsRequestsBannerProps {
  onSubmitInsights: (socialAccountId?: string) => void;
  className?: string;
}

export function PendingInsightsRequestsBanner({
  onSubmitInsights,
  className
}: PendingInsightsRequestsBannerProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [declining, setDeclining] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('audience_insights_requests')
        .select(`
          id,
          brand_id,
          social_account_id,
          message,
          expires_at,
          requested_at,
          brands(name, logo_url),
          social_accounts(platform, username)
        `)
        .eq('creator_id', session.user.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (requestId: string) => {
    setDeclining(requestId);
    try {
      const { error } = await supabase
        .from('audience_insights_requests')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Remove from local state
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error declining request:', error);
    } finally {
      setDeclining(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "tiktok":
        return <img src={tiktokLogoBlack} alt="TikTok" className="w-4 h-4" />;
      case "instagram":
        return <img src={instagramLogoBlack} alt="Instagram" className="w-4 h-4" />;
      case "youtube":
        return <img src={youtubeLogoBlack} alt="YouTube" className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading || requests.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium font-inter tracking-[-0.3px]">
          Audience Insights Requests
        </span>
        <Badge variant="secondary" className="text-xs">
          {requests.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {requests.map((request) => {
          const expiresIn = formatDistanceToNow(new Date(request.expires_at), { addSuffix: true });
          const isExpiringSoon = new Date(request.expires_at).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000; // 2 days

          return (
            <div
              key={request.id}
              className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Brand Logo */}
                  {request.brands?.logo_url ? (
                    <img
                      src={request.brands.logo_url}
                      alt={request.brands.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium font-inter tracking-[-0.3px] truncate">
                      {request.brands?.name || 'Unknown Brand'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {request.social_accounts && (
                        <>
                          {getPlatformIcon(request.social_accounts.platform)}
                          <span>@{request.social_accounts.username}</span>
                          <span>•</span>
                        </>
                      )}
                      <span className={isExpiringSoon ? 'text-amber-500' : ''}>
                        Expires {expiresIn}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decline Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                  onClick={() => handleDecline(request.id)}
                  disabled={declining === request.id}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Message */}
              {request.message && (
                <p className="text-xs text-muted-foreground italic pl-13">
                  "{request.message}"
                </p>
              )}

              {/* Action */}
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={() => onSubmitInsights(request.social_account_id || undefined)}
              >
                Share Insights
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
