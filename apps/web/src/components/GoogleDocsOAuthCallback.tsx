import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export function GoogleDocsOAuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent double processing
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");

      // Handle OAuth error
      if (error) {
        const errorDescription = searchParams.get("error_description");
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "google-docs-oauth-error",
              error: errorDescription || error,
            },
            window.location.origin
          );
          window.close();
          return;
        }
        setStatus("error");
        setErrorMessage(errorDescription || error);
        return;
      }

      if (!code) {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "google-docs-oauth-error",
              error: "Missing authorization code",
            },
            window.location.origin
          );
          window.close();
          return;
        }
        setStatus("error");
        setErrorMessage("Missing authorization code");
        return;
      }

      // Verify we have state
      if (!state) {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "google-docs-oauth-error",
              error: "Missing state parameter",
            },
            window.location.origin
          );
          window.close();
          return;
        }
        setStatus("error");
        setErrorMessage("Missing state parameter");
        return;
      }

      // Verify CSRF - compare state from URL with stored state
      const storedState = sessionStorage.getItem("google_docs_oauth_state");
      sessionStorage.removeItem("google_docs_oauth_state"); // Clear immediately

      if (!storedState || state !== storedState) {
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "google-docs-oauth-error",
              error: "Security verification failed. Please try again.",
            },
            window.location.origin
          );
          window.close();
          return;
        }
        setStatus("error");
        setErrorMessage("Security verification failed. Please try again.");
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/google/docs-callback`;

        // Exchange code for tokens
        const { data, error: functionError } = await supabase.functions.invoke(
          "google-docs-auth",
          {
            body: {
              action: "exchange_code",
              code,
              redirect_uri: redirectUri,
              state,
            },
          }
        );

        // Check for error in the response data
        if (data?.error) {
          throw new Error(data.error);
        }

        if (functionError) {
          let msg = functionError.message || "Failed to connect Google Docs";
          // Try to extract error message from FunctionsHttpError
          if (functionError.name === "FunctionsHttpError") {
            try {
              const errorBody = await (functionError as unknown as { context?: { json?: () => Promise<{ error?: string }> } }).context?.json?.();
              if (errorBody?.error) msg = errorBody.error;
            } catch {
              const context = (functionError as unknown as { context?: { error?: string } }).context;
              if (context?.error) msg = context.error;
            }
          }
          throw new Error(msg);
        }

        setStatus("success");

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "google-docs-oauth-success",
            },
            window.location.origin
          );
          window.close();
        }
      } catch (error: unknown) {
        console.error("Error connecting Google Docs:", error);
        const errorMsg = error instanceof Error ? error.message : "Failed to connect Google Docs";

        if (window.opener) {
          window.opener.postMessage(
            {
              type: "google-docs-oauth-error",
              error: errorMsg,
            },
            window.location.origin
          );
          window.close();
        }

        setStatus("error");
        setErrorMessage(errorMsg);
      }
    };

    handleCallback();
  }, [searchParams]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="text-4xl">📄</div>
          <p className="text-destructive font-medium">Error connecting Google Docs</p>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
          <p className="text-muted-foreground text-xs">You can close this window and try again.</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="text-4xl">✅</div>
          <p className="text-green-500 font-medium">Google Docs connected!</p>
          <p className="text-muted-foreground text-sm">You can close this window.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Connecting Google Docs...</p>
      </div>
    </div>
  );
}
