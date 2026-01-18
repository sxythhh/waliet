import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { BlueprintEditor } from "@/components/brand/BlueprintEditor";

export default function BlueprintDetail() {
  const { id } = useParams();
  const [brandId, setBrandId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchBlueprintBrand = useCallback(async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("blueprints")
      .select("brand_id")
      .eq("id", id)
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setBrandId(data.brand_id);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchBlueprintBrand();
  }, [fetchBlueprintBrand]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !brandId || !id) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-foreground">Blueprint not found</p>
          <p className="text-sm text-muted-foreground">This document may have been moved or deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      <BlueprintEditor
        blueprintId={id}
        brandId={brandId}
        readOnly={true}
      />
    </div>
  );
}
