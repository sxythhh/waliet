import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook that handles OAuth redirects when Supabase redirects to the root URL
 * instead of /auth/callback. This happens when the Supabase dashboard
 * redirect URLs are configured to go to the root.
 */
export function useOAuthRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHandledRedirect = useRef(false);

  useEffect(() => {
    // Only process if we have a code in the URL (OAuth callback)
    const urlParams = new URLSearchParams(location.search);
    const hasCode = urlParams.has('code');

    if (!hasCode || hasHandledRedirect.current) {
      return;
    }

    const handleOAuthRedirect = async () => {
      // Wait a bit for Supabase to process the code
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        return;
      }

      hasHandledRedirect.current = true;

      // Check for stored redirect URL
      const redirectUrl = sessionStorage.getItem('auth_redirect_url') || localStorage.getItem('auth_redirect_url');

      if (redirectUrl) {
        sessionStorage.removeItem('auth_redirect_url');
        localStorage.removeItem('auth_redirect_url');

        // If redirecting to a brand invite page, set flag for auto-accept
        if (redirectUrl.includes('/join/') || redirectUrl.includes('/invite/')) {
          sessionStorage.setItem('brand_invite_auto_accept', 'true');
          localStorage.setItem('brand_invite_auto_accept', 'true');
        }

        navigate(redirectUrl, { replace: true });
      }
    };

    handleOAuthRedirect();
  }, [location.search, navigate]);
}
