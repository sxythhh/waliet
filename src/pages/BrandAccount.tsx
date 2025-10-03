import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { LogOut } from "lucide-react";

export default function BrandAccount() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminCheck();
  const [brandId, setBrandId] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
  const [showAccountTab, setShowAccountTab] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userFullName, setUserFullName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;

      try {
        // Fetch brand data
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .select("id, account_url, show_account_tab")
          .eq("slug", slug)
          .maybeSingle() as any;

        if (brandError) throw brandError;
        if (brandData) {
          setBrandId(brandData.id);
          setAccountUrl(brandData.account_url || "");
          setShowAccountTab(brandData.show_account_tab ?? true);
        }

        // Fetch user data
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || "");
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();
          
          if (profile) {
            setUserFullName(profile.full_name || "");
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load account settings");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const handleSave = async () => {
    if (!brandId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({ 
          account_url: accountUrl || null,
          show_account_tab: showAccountTab
        } as any)
        .eq("id", brandId);

      if (error) throw error;

      toast.success("Settings updated successfully");
    } catch (error) {
      console.error("Error updating settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
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
        
        <div className="space-y-6">
          <Card className="bg-[#202020] border-white/10">
            <CardHeader>
              <CardTitle className="text-white">User Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white/60">Full Name</Label>
                <p className="text-white">{userFullName || "Not set"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-white/60">Email</Label>
                <p className="text-white">{userEmail}</p>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="mt-4"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#202020] border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Account Page Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!isAdmin && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-500 text-sm">
                  Only administrators can edit these settings
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-[#191919] rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="show-account-tab" className="text-white font-medium">
                  Show Account Tab
                </Label>
                <p className="text-sm text-white/60">
                  Display the Account tab in the sidebar navigation
                </p>
              </div>
              <Switch
                id="show-account-tab"
                checked={showAccountTab}
                onCheckedChange={setShowAccountTab}
                disabled={!isAdmin}
              />
            </div>

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
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
