import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAdminCheck } from "@/hooks/useAdminCheck";

export default function BrandAccount() {
  const { slug } = useParams();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [brandId, setBrandId] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) return;

      try {
        const { data, error } = await supabase
          .from("brands")
          .select("id, account_url")
          .eq("slug", slug)
          .maybeSingle() as any;

        if (error) throw error;
        if (data) {
          setBrandId(data.id);
          setAccountUrl(data.account_url || "");
        }
      } catch (error) {
        console.error("Error fetching brand:", error);
        toast.error("Failed to load account settings");
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [slug]);

  const handleSave = async () => {
    if (!brandId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({ account_url: accountUrl || null } as any)
        .eq("id", brandId);

      if (error) throw error;

      toast.success("Account URL updated successfully");
    } catch (error) {
      console.error("Error updating URL:", error);
      toast.error("Failed to update URL");
    } finally {
      setSaving(false);
    }
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen p-8 bg-[#191919] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Account Settings</h1>
        
        <Card className="bg-[#202020] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Account Page Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isAdmin && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-500 text-sm">
                  Only administrators can edit brand URLs
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="account-url" className="text-white">
                Account Page URL
              </Label>
              <Input
                id="account-url"
                type="url"
                placeholder="https://example.com/account"
                value={accountUrl}
                onChange={(e) => setAccountUrl(e.target.value)}
                className="bg-[#191919] border-white/10 text-white"
                disabled={!isAdmin}
              />
              <p className="text-sm text-white/60">
                This URL will be embedded when users visit the Account page
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !isAdmin}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? "Saving..." : "Save URL"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
