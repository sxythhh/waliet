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
import { Skeleton } from "@/components/ui/skeleton";
export default function BrandAccount() {
  const {
    slug
  } = useParams();
  const navigate = useNavigate();
  const {
    isAdmin,
    loading: adminLoading
  } = useAdminCheck();
  const [brandId, setBrandId] = useState("");
  const [accountUrl, setAccountUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const sidebar = useSidebar();
  const isMobile = useIsMobile();
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      try {
        // Fetch brand data
        const {
          data: brandData,
          error: brandError
        } = (await supabase.from("brands").select("id, account_url").eq("slug", slug).maybeSingle()) as any;
        if (brandError) throw brandError;
        if (brandData) {
          setBrandId(brandData.id);
          setAccountUrl(brandData.account_url || "");
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
  if (loading || adminLoading) {
    return <div className="min-h-screen p-8 bg-[#191919]">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-12 w-full max-w-md" />
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>;
  }
  return <div className="min-h-screen p-4 md:p-8 bg-[#191919]">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Menu Button */}
        <div className="mb-6 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => sidebar.setOpenMobile(true)} className="text-white/60 hover:text-white hover:bg-white/10">
            <Menu className="h-6 w-6" />
          </Button>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-6">Account</h1>
        
        <Tabs defaultValue="invoices" className="w-full">
          <TabsList className="bg-[#202020] border-white/10">
            <TabsTrigger value="invoices" className="data-[state=active]:bg-[#191919]">
              Invoices
            </TabsTrigger>
            <TabsTrigger value="team" className="data-[state=active]:bg-[#191919]">
              Team
            </TabsTrigger>
            <TabsTrigger value="user" className="data-[state=active]:bg-[#191919]">
              User
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-6">
            {accountUrl ? <div className="w-full bg-[#191919] rounded-lg overflow-hidden" style={{
            height: '600px'
          }}>
                <iframe src={accountUrl} className="w-full h-full border-0" title="Invoices" sandbox="allow-scripts allow-same-origin allow-forms" />
              </div> : <Card className="bg-[#202020]">
                <CardHeader>
                  <CardTitle className="text-white">No Invoice Page Configured</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/60">
                    An administrator needs to configure the invoice page URL in the brand settings.
                  </p>
                </CardContent>
              </Card>}
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <TeamMembersTab brandId={brandId} />
          </TabsContent>

          <TabsContent value="user" className="mt-6">
            <UserSettingsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}