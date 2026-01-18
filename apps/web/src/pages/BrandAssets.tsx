import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { AssetLibrary } from "@/components/assets/AssetLibrary";
import { AssetPreviewDialog } from "@/components/assets/AssetPreviewDialog";
import { AssetUploadDialog } from "@/components/assets/AssetUploadDialog";
import { AssetRequestDialog } from "@/components/assets/AssetRequestDialog";
import { AssetDeleteDialog } from "@/components/assets/AssetDeleteDialog";
import { AssetRequestsPanel, RequestCountBadge } from "@/components/assets/AssetRequestsPanel";
import type { BrandAsset } from "@/types/assets";

export default function BrandAssets() {
  const { slug } = useParams();
  const { user } = useAuth();

  // Brand data
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>("");
  const [legacyAssetsUrl, setLegacyAssetsUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("library");

  // Dialog states
  const [previewAsset, setPreviewAsset] = useState<BrandAsset | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [deleteAsset, setDeleteAsset] = useState<BrandAsset | null>(null);
  const [editAsset, setEditAsset] = useState<BrandAsset | null>(null);

  // For fulfilling a request by uploading
  const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);

  // Fetch brand and check admin status
  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) return;

      try {
        // Fetch brand data
        const { data: brand, error: brandError } = await supabase
          .from("brands")
          .select("id, name, assets_url")
          .eq("slug", slug)
          .maybeSingle();

        if (brandError) throw brandError;

        setBrandId(brand?.id || null);
        setBrandName(brand?.name || "");
        setLegacyAssetsUrl(brand?.assets_url || null);

        // Check if user is admin of this brand
        if (user?.id && brand?.id) {
          const { data: membership } = await supabase
            .from("brand_members")
            .select("role")
            .eq("brand_id", brand.id)
            .eq("user_id", user.id)
            .maybeSingle();

          setIsAdmin(
            membership?.role === "owner" || membership?.role === "admin"
          );
        }
      } catch (error) {
        console.error("Error fetching brand:", error);
        toast.error("Failed to load assets");
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [slug, user?.id]);

  // Handle fulfilling a request
  const handleFulfillRequest = (requestId: string) => {
    setFulfillingRequestId(requestId);
    setShowUploadDialog(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // No brand found
  if (!brandId) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Brand not found</div>
          <div className="text-muted-foreground">
            The brand you're looking for doesn't exist or you don't have access.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Assets</h1>
        <p className="mt-1 text-muted-foreground">
          Brand resources and materials for your content
        </p>
      </div>

      {/* Legacy assets link (if configured) */}
      {legacyAssetsUrl && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Legacy Assets</p>
              <p className="text-xs text-muted-foreground">
                Additional assets available on external platform
              </p>
            </div>
            <a
              href={legacyAssetsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Open External Assets
            </a>
          </div>
        </div>
      )}

      {/* Main content with tabs for admin */}
      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Requests
              {brandId && (
                <RequestCountBadge brandId={brandId} className="ml-2" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-0">
            <AssetLibrary
              brandId={brandId}
              isAdmin={isAdmin}
              onUpload={() => {
                setFulfillingRequestId(null);
                setShowUploadDialog(true);
              }}
              onRequestAsset={() => setShowRequestDialog(true)}
              onPreview={setPreviewAsset}
              onEdit={setEditAsset}
              onDelete={setDeleteAsset}
            />
          </TabsContent>

          <TabsContent value="requests" className="mt-0">
            <AssetRequestsPanel
              brandId={brandId}
              onFulfillRequest={handleFulfillRequest}
            />
          </TabsContent>
        </Tabs>
      ) : (
        // Non-admin view - just the library
        <AssetLibrary
          brandId={brandId}
          isAdmin={false}
          onRequestAsset={() => setShowRequestDialog(true)}
          onPreview={setPreviewAsset}
        />
      )}

      {/* Dialogs */}
      <AssetPreviewDialog
        asset={previewAsset}
        open={!!previewAsset}
        onOpenChange={(open) => !open && setPreviewAsset(null)}
      />

      <AssetUploadDialog
        brandId={brandId}
        open={showUploadDialog}
        onOpenChange={(open) => {
          setShowUploadDialog(open);
          if (!open) {
            setFulfillingRequestId(null);
            setEditAsset(null);
          }
        }}
        editAsset={editAsset}
        onEditComplete={() => setEditAsset(null)}
      />

      <AssetRequestDialog
        brandId={brandId}
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
      />

      <AssetDeleteDialog
        asset={deleteAsset}
        brandId={brandId}
        open={!!deleteAsset}
        onOpenChange={(open) => !open && setDeleteAsset(null)}
      />
    </div>
  );
}
