import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { restoreTrackingFromOAuth, getStoredUtmParams, clearStoredUtmParams, UtmParams } from "@/hooks/useUtmTracking";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Save UTM params to profile for OAuth signups (since they can't be passed via metadata)
const saveUtmToProfile = async (userId: string, utmParams: UtmParams | null) => {
  if (!utmParams) return;

  const updateData: Record<string, string | null> = {};
  if (utmParams.utm_source) updateData.utm_source = utmParams.utm_source;
  if (utmParams.utm_medium) updateData.utm_medium = utmParams.utm_medium;
  if (utmParams.utm_campaign) updateData.utm_campaign = utmParams.utm_campaign;
  if (utmParams.utm_content) updateData.utm_content = utmParams.utm_content;
  if (utmParams.utm_term) updateData.utm_term = utmParams.utm_term;
  if (utmParams.signup_url) updateData.signup_url = utmParams.signup_url;

  if (Object.keys(updateData).length === 0) return;

  try {
    await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);
  } catch (error) {
    console.error("Failed to save UTM params:", error);
  }
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { trackReferral } = useReferralTracking();
  const { toast } = useToast();

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);

        const errorParam = url.searchParams.get("error") || url.searchParams.get("error_code");
        const errorDescription = url.searchParams.get("error_description");
        if (errorParam || errorDescription) {
          throw new Error(decodeURIComponent(errorDescription || errorParam || "OAuth error"));
        }

        // Restore tracking params from sessionStorage
        restoreTrackingFromOAuth();

        // PKCE flow (preferred)
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;

          // Check if this is a new user and process referral
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Check if user was just created (metadata indicates new signup)
            const createdAt = new Date(user.created_at);
            const now = new Date();
            const isNewUser = (now.getTime() - createdAt.getTime()) < 60000; // Created within last minute

            if (isNewUser) {
              // Save UTM params to profile (OAuth doesn't pass them via metadata)
              const utmParams = getStoredUtmParams();
              await saveUtmToProfile(user.id, utmParams);

              const referralResult = await trackReferral(user.id);
              clearStoredUtmParams();

              if (referralResult.success) {
                toast({
                  title: "Welcome to Virality!",
                  description: "Referral applied successfully."
                });
              } else if (referralResult.error) {
                toast({
                  variant: "destructive",
                  title: "Referral Error",
                  description: referralResult.error
                });
              }
            }
          }

          navigate("/dashboard", { replace: true });
          return;
        }

        // Implicit flow fallback (hash tokens)
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          const { error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (setSessionError) throw setSessionError;

          // Check if this is a new user and process referral
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const createdAt = new Date(user.created_at);
            const now = new Date();
            const isNewUser = (now.getTime() - createdAt.getTime()) < 60000;

            if (isNewUser) {
              // Save UTM params to profile (OAuth doesn't pass them via metadata)
              const utmParams = getStoredUtmParams();
              await saveUtmToProfile(user.id, utmParams);

              const referralResult = await trackReferral(user.id);
              clearStoredUtmParams();

              if (referralResult.success) {
                toast({
                  title: "Welcome to Virality!",
                  description: "Referral applied successfully."
                });
              } else if (referralResult.error) {
                toast({
                  variant: "destructive",
                  title: "Referral Error",
                  description: referralResult.error
                });
              }
            }
          }

          navigate("/dashboard", { replace: true });
          return;
        }

        // Nothing to process
        navigate("/auth", { replace: true });
      } catch (e: any) {
        setError(e?.message || "Failed to finish sign-in");
      }
    };

    run();
  }, [navigate, trackReferral, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <h1 className="text-xl font-semibold">Signing you in…</h1>
          <p className="text-sm text-muted-foreground">
            Completing your Google sign-in and returning to your dashboard.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button onClick={() => navigate("/auth", { replace: true })}>
                Back to login
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Please wait…</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
