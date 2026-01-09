import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Copy, ExternalLink, Link2, BarChart3, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { CreateCampaignLinkDialog } from "./CreateCampaignLinkDialog";
import { LinkAnalyticsDialog } from "./LinkAnalyticsDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface CampaignLink {
  id: string;
  short_code: string;
  destination_url: string;
  title: string | null;
  description: string | null;
  total_clicks: number;
  unique_clicks: number;
  total_conversions: number;
  conversion_value: number;
  is_active: boolean;
  dub_short_link: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
  assigned_user: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface CampaignLinksTabProps {
  brandId: string;
  campaignId?: string;
  boostId?: string;
}

export function CampaignLinksTab({ brandId, campaignId, boostId }: CampaignLinksTabProps) {
  const [links, setLinks] = useState<CampaignLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = useState(false);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [totals, setTotals] = useState({
    totalClicks: 0,
    uniqueClicks: 0,
    totalConversions: 0,
    conversionValue: 0,
  });

  useEffect(() => {
    fetchLinks();
  }, [brandId, campaignId, boostId]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("campaign_links")
        .select(`
          *,
          assigned_user:profiles!campaign_links_assigned_to_fkey(id, username, full_name, avatar_url)
        `)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (campaignId) {
        query = query.eq("campaign_id", campaignId);
      } else if (boostId) {
        query = query.eq("bounty_campaign_id", boostId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLinks(data || []);

      // Calculate totals
      const totals = (data || []).reduce((acc, link) => ({
        totalClicks: acc.totalClicks + (link.total_clicks || 0),
        uniqueClicks: acc.uniqueClicks + (link.unique_clicks || 0),
        totalConversions: acc.totalConversions + (link.total_conversions || 0),
        conversionValue: acc.conversionValue + parseFloat(String(link.conversion_value || 0)),
      }), {
        totalClicks: 0,
        uniqueClicks: 0,
        totalConversions: 0,
        conversionValue: 0,
      });

      setTotals(totals);
    } catch (error) {
      console.error("Error fetching links:", error);
      toast.error("Failed to load links");
    } finally {
      setLoading(false);
    }
  };

  const copyLinkUrl = (link: CampaignLink) => {
    const url = link.dub_short_link || 
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-link-click?code=${link.short_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const toggleLinkActive = async (link: CampaignLink) => {
    try {
      const { error } = await supabase
        .from("campaign_links")
        .update({ is_active: !link.is_active })
        .eq("id", link.id);

      if (error) throw error;

      setLinks(prev => prev.map(l => 
        l.id === link.id ? { ...l, is_active: !l.is_active } : l
      ));
      toast.success(link.is_active ? "Link deactivated" : "Link activated");
    } catch (error) {
      console.error("Error toggling link:", error);
      toast.error("Failed to update link");
    }
  };

  const deleteLink = async (linkId: string) => {
    try {
      const { error } = await supabase
        .from("campaign_links")
        .delete()
        .eq("id", linkId);

      if (error) throw error;

      setLinks(prev => prev.filter(l => l.id !== linkId));
      toast.success("Link deleted");
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Failed to delete link");
    }
  };

  const openAnalytics = (linkId: string) => {
    setSelectedLinkId(linkId);
    setAnalyticsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Campaign Links</h3>
          <p className="text-sm text-muted-foreground">
            Create and track links for your creators
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Link
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
          <p className="text-xs text-muted-foreground mb-1">Total Clicks</p>
          <p className="text-2xl font-bold">{totals.totalClicks.toLocaleString()}</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
          <p className="text-xs text-muted-foreground mb-1">Unique Clicks</p>
          <p className="text-2xl font-bold">{totals.uniqueClicks.toLocaleString()}</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
          <p className="text-xs text-muted-foreground mb-1">Conversions</p>
          <p className="text-2xl font-bold">{totals.totalConversions.toLocaleString()}</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-4 border border-border/40">
          <p className="text-xs text-muted-foreground mb-1">Conversion Value</p>
          <p className="text-2xl font-bold">${totals.conversionValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Links Table */}
      {links.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/50 rounded-xl bg-muted/20">
          <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground font-medium">No links created yet</p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Create tracking links to share with your creators
          </p>
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create First Link
          </Button>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-border/40 bg-background">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/40 hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5 pl-4">Link</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Assigned To</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Clicks</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Conversions</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5">Status</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs py-2.5 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map(link => (
                <TableRow key={link.id} className="border-b border-border/30 hover:bg-muted/20">
                  <TableCell className="pl-4">
                    <div>
                      <p className="font-medium text-sm">
                        {link.title || link.short_code}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {link.destination_url}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {link.assigned_user ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={link.assigned_user.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(link.assigned_user.username || link.assigned_user.full_name || "?")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {link.assigned_user.username || link.assigned_user.full_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{link.total_clicks.toLocaleString()}</span>
                      <span className="text-muted-foreground ml-1">
                        ({link.unique_clicks} unique)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <span className="font-medium">{link.total_conversions}</span>
                      {link.conversion_value > 0 && (
                        <span className="text-green-500 ml-1">
                          ${parseFloat(String(link.conversion_value)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={link.is_active ? "default" : "secondary"}>
                      {link.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => copyLinkUrl(link)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => openAnalytics(link.id)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => toggleLinkActive(link)}
                      >
                        {link.is_active ? (
                          <ToggleRight className="h-4 w-4 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Link</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this link? This action cannot be undone and all click/conversion data will be lost.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteLink(link.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Link Dialog */}
      <CreateCampaignLinkDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        brandId={brandId}
        campaignId={campaignId}
        boostId={boostId}
        onSuccess={fetchLinks}
      />

      {/* Analytics Dialog */}
      {selectedLinkId && (
        <LinkAnalyticsDialog
          open={analyticsDialogOpen}
          onOpenChange={setAnalyticsDialogOpen}
          linkId={selectedLinkId}
        />
      )}
    </div>
  );
}
