import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, ChevronRight, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleDocument {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

interface BlueprintFields {
  title?: string;
  content?: string;
  brand_voice?: string;
  target_personas?: Array<{
    name: string;
    target_audience: string;
    description: string;
  }>;
  hooks?: string[];
  talking_points?: string[];
  dos_and_donts?: {
    dos: string[];
    donts: string[];
  };
  call_to_action?: string;
  hashtags?: string[];
  platforms?: string[];
}

interface GoogleDocsImportButtonProps {
  onImport: (fields: BlueprintFields) => void;
  variant?: "button" | "card";
  className?: string;
}

export function GoogleDocsImportButton({
  onImport,
  variant = "button",
  className,
}: GoogleDocsImportButtonProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documents, setDocuments] = useState<GoogleDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [importingDocId, setImportingDocId] = useState<string | null>(null);
  const { toast } = useToast();

  // Check connection status on mount and when auth state changes
  useEffect(() => {
    checkConnection();

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        checkConnection();
      } else if (event === 'SIGNED_OUT') {
        setIsConnected(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkConnection = async () => {
    try {
      // First check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        console.log("No session found, skipping Google Docs connection check");
        setIsConnected(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("google-docs-auth", {
        body: { action: "check_connection" },
      });

      if (error) {
        console.error("Error checking connection:", error);
        setIsConnected(false);
        return;
      }

      setIsConnected(data?.connected || false);
    } catch (error) {
      console.error("Error checking connection:", error);
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to connect Google Docs.",
        });
        return;
      }

      const redirectUri = `${window.location.origin}/google/docs-callback`;

      // Get the OAuth URL from the Edge Function
      const { data, error } = await supabase.functions.invoke("google-docs-auth", {
        body: {
          action: "get_auth_url",
          redirect_uri: redirectUri,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to get authorization URL");
      }

      if (!data?.auth_url) {
        throw new Error("No authorization URL returned");
      }

      // Store state for CSRF protection
      sessionStorage.setItem("google_docs_oauth_state", data.state);

      // Open Google OAuth in a popup
      const popup = window.open(
        data.auth_url,
        "Google Docs OAuth",
        "width=500,height=700"
      );

      // Listen for OAuth completion
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "google-docs-oauth-success") {
          window.removeEventListener("message", handleMessage);
          popup?.close();
          toast({
            title: "Connected!",
            description: "Google Docs connected successfully. You can now import documents.",
          });
          setIsConnected(true);
          // Automatically open the documents modal after connecting
          setTimeout(() => fetchAndShowDocuments(), 500);
        } else if (event.data.type === "google-docs-oauth-error") {
          window.removeEventListener("message", handleMessage);
          popup?.close();
          toast({
            variant: "destructive",
            title: "Error",
            description: event.data.error || "Failed to connect Google Docs.",
          });
        }
      };

      window.addEventListener("message", handleMessage);

      // Cleanup on popup close
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          window.removeEventListener("message", handleMessage);
          setLoading(false);
        }
      }, 500);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect Google Docs.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("google-docs-auth", {
        body: { action: "disconnect" },
      });

      if (error) {
        throw new Error(error.message || "Failed to disconnect Google Docs");
      }

      toast({
        title: "Disconnected",
        description: "Google Docs disconnected successfully.",
      });
      setIsConnected(false);
      setDocumentsOpen(false);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect Google Docs.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAndShowDocuments = async () => {
    setLoadingDocuments(true);
    setDocumentsOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke("google-docs-import", {
        body: { action: "list_documents" },
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch documents");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setDocuments(data?.documents || []);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch documents.",
      });
      setDocumentsOpen(false);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleSelectDocument = async (doc: GoogleDocument) => {
    setImportingDocId(doc.id);

    try {
      // Step 1: Fetch document content
      const { data: fetchData, error: fetchError } = await supabase.functions.invoke(
        "google-docs-import",
        {
          body: {
            action: "fetch_document",
            document_id: doc.id,
          },
        }
      );

      if (fetchError) {
        throw new Error(fetchError.message || "Failed to fetch document");
      }

      if (fetchData?.error) {
        throw new Error(fetchData.error);
      }

      const documentContent = fetchData?.document?.content;
      if (!documentContent) {
        throw new Error("Document is empty or could not be read");
      }

      // Step 2: Extract blueprint fields using AI
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        "google-docs-import",
        {
          body: {
            action: "extract_blueprint",
            document_content: documentContent,
          },
        }
      );

      if (extractError) {
        throw new Error(extractError.message || "Failed to extract content");
      }

      if (extractData?.error) {
        throw new Error(extractData.error);
      }

      const fields = extractData?.fields;
      if (!fields) {
        throw new Error("No content could be extracted from the document");
      }

      // Step 3: Call the onImport callback
      onImport(fields);

      toast({
        title: "Import Successful",
        description: `Content imported from "${doc.name}"`,
      });

      setDocumentsOpen(false);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import document.",
      });
    } finally {
      setImportingDocId(null);
    }
  };

  const handleClick = () => {
    if (isConnected === null) {
      // Still checking connection status
      return;
    }

    if (isConnected) {
      fetchAndShowDocuments();
    } else {
      handleConnect();
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Button variant
  if (variant === "button") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={loading || isConnected === null}
          className={cn("gap-2", className)}
        >
          {loading || isConnected === null ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          Import from Google Docs
        </Button>

        <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select a Document</DialogTitle>
              <DialogDescription>
                Choose a Google Doc to import as your blueprint
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No Google Docs found</p>
                  <p className="text-sm mt-1">Create a document in Google Docs first</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDocument(doc)}
                    disabled={importingDocId !== null}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border border-border",
                      "hover:bg-muted/50 transition-colors text-left",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      {importingDocId === doc.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Modified {formatDate(doc.modifiedTime)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            {isConnected && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="gap-2 text-muted-foreground hover:text-destructive"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  Disconnect Google Account
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Card variant (for template selector)
  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading || isConnected === null}
        className={cn(
          "flex flex-col items-center gap-3 p-6 rounded-xl border border-dashed border-border",
          "hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
          {loading || isConnected === null ? (
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          ) : (
            <FileText className="h-6 w-6 text-blue-500" />
          )}
        </div>
        <div className="text-center">
          <div className="font-medium">Import from Google Docs</div>
          <div className="text-sm text-muted-foreground mt-1">
            Use an existing brand guidelines document
          </div>
        </div>
      </button>

      <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select a Document</DialogTitle>
            <DialogDescription>
              Choose a Google Doc to import as your blueprint
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No Google Docs found</p>
                <p className="text-sm mt-1">Create a document in Google Docs first</p>
              </div>
            ) : (
              documents.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDocument(doc)}
                  disabled={importingDocId !== null}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border border-border",
                    "hover:bg-muted/50 transition-colors text-left",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    {importingDocId === doc.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{doc.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Modified {formatDate(doc.modifiedTime)}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))
            )}
          </div>

          {isConnected && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="gap-2 text-muted-foreground hover:text-destructive"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                Disconnect Google Account
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
