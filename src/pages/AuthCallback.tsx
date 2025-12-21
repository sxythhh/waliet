import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const url = new URL(window.location.href);

        const errorParam = url.searchParams.get("error") || url.searchParams.get("error_code");
        const errorDescription = url.searchParams.get("error_description");
        if (errorParam || errorDescription) {
          throw new Error(decodeURIComponent(errorDescription || errorParam || "OAuth error"));
        }

        // PKCE flow (preferred)
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
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
  }, [navigate]);

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
