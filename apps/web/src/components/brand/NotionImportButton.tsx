import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2, ChevronRight, Unlink, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  last_edited_time: string;
  url: string;
  parent_type: string;
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

interface NotionImportButtonProps {
  onImport: (fields: BlueprintFields) => void;
  variant?: "button" | "card";
  className?: string;
}

export function NotionImportButton({
  onImport,
  variant = "button",
  className,
}: NotionImportButtonProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [pages, setPages] = useState<NotionPage[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [importingPageId, setImportingPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track popup check interval for cleanup
  const popupCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Track message handler for cleanup
  const messageHandlerRef = useRef<((event: MessageEvent) => void) | null>(null);

  // Check connection status on mount and when auth state changes
  useEffect(() => {
    isMountedRef.current = true;
    checkConnection();

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!isMountedRef.current) return;
      if (event === 'SIGNED_IN') {
        checkConnection();
      } else if (event === 'SIGNED_OUT') {
        setIsConnected(false);
        setWorkspaceName(null);
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
      // Clean up any pending popup checks
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current);
        popupCheckIntervalRef.current = null;
      }
      // Clean up message handler
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
        messageHandlerRef.current = null;
      }
    };
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      // First check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        console.log("No session found, skipping Notion connection check");
        if (isMountedRef.current) setIsConnected(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("notion-auth", {
        body: { action: "check_connection" },
      });

      if (!isMountedRef.current) return;

      if (error) {
        console.error("Error checking connection:", error);
        setIsConnected(false);
        return;
      }

      setIsConnected(data?.connected || false);
      if (data?.workspace_name) {
        setWorkspaceName(data.workspace_name);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
      if (isMountedRef.current) setIsConnected(false);
    }
  }, []);

  const handleConnect = async () => {
    // Prevent multiple popups
    if (loading) return;

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to connect Notion.",
        });
        return;
      }

      const redirectUri = `${window.location.origin}/notion/callback`;

      // Get the OAuth URL from the Edge Function
      const { data, error } = await supabase.functions.invoke("notion-auth", {
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

      // Store state for CSRF protection with unique key to avoid collisions
      const stateKey = `notion_oauth_state_${Date.now()}`;
      sessionStorage.setItem("notion_oauth_state", data.state);
      sessionStorage.setItem("notion_oauth_state_key", stateKey);

      // Open Notion OAuth in a popup
      const popup = window.open(
        data.auth_url,
        "Notion OAuth",
        "width=500,height=700"
      );

      // Clean up any previous handlers
      if (messageHandlerRef.current) {
        window.removeEventListener("message", messageHandlerRef.current);
      }
      if (popupCheckIntervalRef.current) {
        clearInterval(popupCheckIntervalRef.current);
      }

      // Listen for OAuth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "notion-oauth-success") {
          // Clean up
          window.removeEventListener("message", handleMessage);
          messageHandlerRef.current = null;
          if (popupCheckIntervalRef.current) {
            clearInterval(popupCheckIntervalRef.current);
            popupCheckIntervalRef.current = null;
          }
          popup?.close();

          if (!isMountedRef.current) return;

          toast({
            title: "Connected!",
            description: "Notion connected successfully. You can now import pages.",
          });
          setIsConnected(true);
          setLoading(false);
          if (event.data.workspace_name) {
            setWorkspaceName(event.data.workspace_name);
          }
          // Automatically open the pages modal after connecting
          setTimeout(() => {
            if (isMountedRef.current) fetchAndShowPages();
          }, 500);
        } else if (event.data.type === "notion-oauth-error") {
          // Clean up
          window.removeEventListener("message", handleMessage);
          messageHandlerRef.current = null;
          if (popupCheckIntervalRef.current) {
            clearInterval(popupCheckIntervalRef.current);
            popupCheckIntervalRef.current = null;
          }
          popup?.close();

          if (!isMountedRef.current) return;

          setLoading(false);
          toast({
            variant: "destructive",
            title: "Error",
            description: event.data.error || "Failed to connect Notion.",
          });
        }
      };

      messageHandlerRef.current = handleMessage;
      window.addEventListener("message", handleMessage);

      // Cleanup on popup close
      popupCheckIntervalRef.current = setInterval(() => {
        if (popup?.closed) {
          if (popupCheckIntervalRef.current) {
            clearInterval(popupCheckIntervalRef.current);
            popupCheckIntervalRef.current = null;
          }
          if (messageHandlerRef.current) {
            window.removeEventListener("message", messageHandlerRef.current);
            messageHandlerRef.current = null;
          }
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      }, 500);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect Notion.",
      });
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("notion-auth", {
        body: { action: "disconnect" },
      });

      if (error) {
        throw new Error(error.message || "Failed to disconnect Notion");
      }

      toast({
        title: "Disconnected",
        description: "Notion disconnected successfully.",
      });
      setIsConnected(false);
      setWorkspaceName(null);
      setPagesOpen(false);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect Notion.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAndShowPages = async () => {
    setLoadingPages(true);
    setPagesOpen(true);
    setSearchQuery("");

    try {
      const { data, error } = await supabase.functions.invoke("notion-import", {
        body: { action: "list_pages" },
      });

      if (error) {
        throw new Error(error.message || "Failed to fetch pages");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setPages(data?.pages || []);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch pages.",
      });
      setPagesOpen(false);
    } finally {
      setLoadingPages(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchAndShowPages();
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("notion-import", {
        body: {
          action: "search_pages",
          query: searchQuery.trim(),
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to search pages");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setPages(data?.pages || []);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to search pages.",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPage = async (page: NotionPage) => {
    setImportingPageId(page.id);

    try {
      // Step 1: Fetch page content
      const { data: fetchData, error: fetchError } = await supabase.functions.invoke(
        "notion-import",
        {
          body: {
            action: "fetch_page",
            page_id: page.id,
          },
        }
      );

      if (fetchError) {
        throw new Error(fetchError.message || "Failed to fetch page");
      }

      if (fetchData?.error) {
        throw new Error(fetchData.error);
      }

      const pageContent = fetchData?.page?.content;
      if (!pageContent) {
        throw new Error("Page is empty or could not be read");
      }

      // Step 2: Extract blueprint fields using AI
      const { data: extractData, error: extractError } = await supabase.functions.invoke(
        "notion-import",
        {
          body: {
            action: "extract_blueprint",
            page_content: pageContent,
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
        throw new Error("No content could be extracted from the page");
      }

      // Step 3: Call the onImport callback
      onImport(fields);

      toast({
        title: "Import Successful",
        description: `Content imported from "${page.title}"`,
      });

      setPagesOpen(false);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import page.",
      });
    } finally {
      setImportingPageId(null);
    }
  };

  const handleClick = () => {
    if (isConnected === null) {
      // Still checking connection status
      return;
    }

    if (isConnected) {
      fetchAndShowPages();
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

  // Get page icon
  const getPageIcon = (page: NotionPage) => {
    if (page.icon) {
      // Check if it's an emoji
      if (page.icon.length <= 2) {
        return <span className="text-lg">{page.icon}</span>;
      }
      // It's a URL
      return <img src={page.icon} alt="" className="w-5 h-5 rounded" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  // Notion brand color
  const notionBgClass = "bg-gray-100 dark:bg-gray-800";
  const notionTextClass = "text-gray-900 dark:text-gray-100";

  // Render page list
  const renderPageList = () => (
    <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Search pages..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {loadingPages || isSearching ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No Notion pages found</p>
          <p className="text-sm mt-1">
            {searchQuery ? "Try a different search term" : "Create a page in Notion first"}
          </p>
        </div>
      ) : (
        pages.map((page) => (
          <button
            key={page.id}
            onClick={() => handleSelectPage(page)}
            disabled={importingPageId !== null}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border border-border",
              "hover:bg-muted/50 transition-colors text-left",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
              notionBgClass
            )}>
              {importingPageId === page.id ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                getPageIcon(page)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{page.title || "Untitled"}</div>
              <div className="text-xs text-muted-foreground">
                Modified {formatDate(page.last_edited_time)}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        ))
      )}
    </div>
  );

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
            <svg className="h-4 w-4" viewBox="0 0 100 100" fill="currentColor">
              <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"/>
              <path fill="#fff" d="M61.35 16.903l-52.32 3.89c-1.97 .147-2.43 .19-3.72-.87l-2.43-1.77c-.73-.58-.29-1.45.73-1.55l53.68-3.7c1.8-.15 2.72.34 3.58 1.16l2.33 1.77c.19.14.14.58-.29.63l-1.55.45zm-1.94 8.83v63.34c0 3.4-1.7 5.05-5.2 5.2l-44.56 2.62c-3.5.14-5.2-1.84-5.2-5.2V28.25c0-3.4 1.55-5.2 5.2-5.35l44.26-2.62c3.8-.15 5.5 1.7 5.5 5.05zm-43.46.29c-.78.05-1.14.15-1.56.34-.87.44-1.12 1.21-1.12 2.57v55.06c0 1.36.58 2.08 1.84 2.03l41.26-2.33c1.27-.05 1.84-.93 1.84-2.29V28.64c0-.63-.34-1.07-1.07-1.02l-41.2 2.42z"/>
            </svg>
          )}
          Import from Notion
        </Button>

        <Dialog open={pagesOpen} onOpenChange={setPagesOpen}>
          <DialogContent className="sm:max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select a Notion Page</DialogTitle>
              <DialogDescription>
                Choose a Notion page to import as your blueprint
                {workspaceName && (
                  <span className="block mt-1 text-xs">
                    Connected to: {workspaceName}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {renderPageList()}

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
                  Disconnect Notion
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
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          notionBgClass
        )}>
          {loading || isConnected === null ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <svg className={cn("h-6 w-6", notionTextClass)} viewBox="0 0 100 100" fill="currentColor">
              <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193L24.467 99.967c-4.08 0.193 -6.023 -0.39 -8.16 -3.113L3.3 79.94c-2.333 -3.113 -3.3 -5.443 -3.3 -8.167V11.113c0 -3.497 1.553 -6.413 6.017 -6.8z"/>
              <path fill="currentColor" className="text-white dark:text-gray-900" d="M61.35 16.903l-52.32 3.89c-1.97 .147-2.43 .19-3.72-.87l-2.43-1.77c-.73-.58-.29-1.45.73-1.55l53.68-3.7c1.8-.15 2.72.34 3.58 1.16l2.33 1.77c.19.14.14.58-.29.63l-1.55.45zm-1.94 8.83v63.34c0 3.4-1.7 5.05-5.2 5.2l-44.56 2.62c-3.5.14-5.2-1.84-5.2-5.2V28.25c0-3.4 1.55-5.2 5.2-5.35l44.26-2.62c3.8-.15 5.5 1.7 5.5 5.05zm-43.46.29c-.78.05-1.14.15-1.56.34-.87.44-1.12 1.21-1.12 2.57v55.06c0 1.36.58 2.08 1.84 2.03l41.26-2.33c1.27-.05 1.84-.93 1.84-2.29V28.64c0-.63-.34-1.07-1.07-1.02l-41.2 2.42z"/>
            </svg>
          )}
        </div>
        <div className="text-center">
          <div className="font-medium">Import from Notion</div>
          <div className="text-sm text-muted-foreground mt-1">
            Use an existing brand guidelines page
          </div>
        </div>
      </button>

      <Dialog open={pagesOpen} onOpenChange={setPagesOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select a Notion Page</DialogTitle>
            <DialogDescription>
              Choose a Notion page to import as your blueprint
              {workspaceName && (
                <span className="block mt-1 text-xs">
                  Connected to: {workspaceName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {renderPageList()}

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
                Disconnect Notion
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
