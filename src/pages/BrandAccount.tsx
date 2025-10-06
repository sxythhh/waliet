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
import { LogOut, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMembersTab } from "@/components/brand/TeamMembersTab";
import { UserSettingsTab } from "@/components/brand/UserSettingsTab";

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
  const sidebar = useSidebar();
  const isMobile = useIsMobile();

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
    <div className="min-h-screen p-4 md:p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Menu Button */}
        <div className="mb-6 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => sidebar.setOpenMobile(true)}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-6">Account</h1>
        
        <Tabs defaultValue="team" className="w-full">
          <TabsList className="bg-[#202020] border-white/10">
            <TabsTrigger value="team" className="data-[state=active]:bg-[#191919]">
              Team
            </TabsTrigger>
            <TabsTrigger value="user" className="data-[state=active]:bg-[#191919]">
              User
            </TabsTrigger>
            <TabsTrigger value="invoices" className="data-[state=active]:bg-[#191919]">
              Invoices
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="mt-6">
            <TeamMembersTab brandId={brandId} />
          </TabsContent>

          <TabsContent value="user" className="mt-6">
            <UserSettingsTab />
          </TabsContent>

          <TabsContent value="invoices" className="mt-6">
            {accountUrl ? (
              <div className="w-full bg-[#191919] rounded-lg overflow-hidden" style={{ height: '600px' }}>
                <iframe 
                  src={accountUrl} 
                  className="w-full h-full border-0" 
                  title="Invoices" 
                  sandbox="allow-scripts allow-same-origin allow-forms" 
                />
              </div>
            ) : (
              <Card className="bg-[#202020] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Invoice Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isAdmin && (
                    <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-500 text-sm">
                        Only administrators can edit these settings
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="account-url" className="text-white">
                      Invoice Page URL
                    </Label>
                    <Input
                      id="account-url"
                      type="url"
                      placeholder="https://example.com/invoices"
                      value={accountUrl}
                      onChange={(e) => setAccountUrl(e.target.value)}
                      className="bg-[#191919] border-white/10 text-white"
                      disabled={!isAdmin}
                    />
                    <p className="text-sm text-white/60">
                      This URL will be embedded in the Invoices tab
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
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
