import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Plus, Send, Clock, Users, Eye, Megaphone, CalendarIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Broadcast {
  id: string;
  brand_id: string;
  title: string;
  content: string;
  created_by: string | null;
  created_at: string;
  scheduled_for: string | null;
  sent_at: string | null;
  status: "draft" | "scheduled" | "sent";
  target_type: "all" | "campaigns" | "boosts";
  read_count?: number;
  total_recipients?: number;
}

interface Campaign {
  id: string;
  title: string;
}

interface Boost {
  id: string;
  title: string;
}

interface BrandBroadcastsTabProps {
  brandId: string;
}

export function BrandBroadcastsTab({ brandId }: BrandBroadcastsTabProps) {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetType, setTargetType] = useState<"all" | "campaigns" | "boosts">("all");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedBoosts, setSelectedBoosts] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState("12:00");

  useEffect(() => {
    fetchData();
  }, [brandId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch broadcasts
      const { data: broadcastsData, error: broadcastsError } = await supabase
        .from("brand_broadcasts")
        .select("*")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false });

      if (broadcastsError) throw broadcastsError;

      // Fetch read counts for each broadcast
      const broadcastsWithStats = await Promise.all(
        (broadcastsData || []).map(async (broadcast) => {
          const { count: readCount } = await supabase
            .from("brand_broadcast_reads")
            .select("id", { count: "exact", head: true })
            .eq("broadcast_id", broadcast.id);

          return {
            ...broadcast,
            read_count: readCount || 0
          };
        })
      );

      setBroadcasts(broadcastsWithStats);

      // Fetch campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("id, title")
        .eq("brand_id", brandId)
        .order("title");

      setCampaigns(campaignsData || []);

      // Fetch boosts
      const { data: boostsData } = await supabase
        .from("bounty_campaigns")
        .select("id, title")
        .eq("brand_id", brandId)
        .order("title");

      setBoosts(boostsData || []);
    } catch (error) {
      console.error("Error fetching broadcasts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setTargetType("all");
    setSelectedCampaigns([]);
    setSelectedBoosts([]);
    setScheduledDate(undefined);
    setScheduledTime("12:00");
  };

  const handleSendBroadcast = async (asDraft = false) => {
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in title and content");
      return;
    }

    if (targetType === "campaigns" && selectedCampaigns.length === 0) {
      toast.error("Please select at least one campaign");
      return;
    }

    if (targetType === "boosts" && selectedBoosts.length === 0) {
      toast.error("Please select at least one boost");
      return;
    }

    setIsSending(true);
    try {
      // Determine status and scheduled time
      let status: "draft" | "scheduled" | "sent" = asDraft ? "draft" : "sent";
      let scheduledFor: string | null = null;
      let sentAt: string | null = null;

      if (scheduledDate && !asDraft) {
        const [hours, minutes] = scheduledTime.split(":").map(Number);
        const scheduled = new Date(scheduledDate);
        scheduled.setHours(hours, minutes, 0, 0);

        if (scheduled > new Date()) {
          status = "scheduled";
          scheduledFor = scheduled.toISOString();
        } else {
          sentAt = new Date().toISOString();
        }
      } else if (!asDraft) {
        sentAt = new Date().toISOString();
      }

      // Create broadcast
      const { data: broadcast, error: broadcastError } = await supabase
        .from("brand_broadcasts")
        .insert({
          brand_id: brandId,
          title: title.trim(),
          content: content.trim(),
          created_by: user?.id,
          status,
          target_type: targetType,
          scheduled_for: scheduledFor,
          sent_at: sentAt
        })
        .select()
        .single();

      if (broadcastError) throw broadcastError;

      // Create targets if needed
      if (targetType === "campaigns" && selectedCampaigns.length > 0) {
        const targets = selectedCampaigns.map((campaignId) => ({
          broadcast_id: broadcast.id,
          campaign_id: campaignId
        }));

        const { error: targetsError } = await supabase
          .from("brand_broadcast_targets")
          .insert(targets);

        if (targetsError) throw targetsError;
      }

      if (targetType === "boosts" && selectedBoosts.length > 0) {
        const targets = selectedBoosts.map((boostId) => ({
          broadcast_id: broadcast.id,
          boost_id: boostId
        }));

        const { error: targetsError } = await supabase
          .from("brand_broadcast_targets")
          .insert(targets);

        if (targetsError) throw targetsError;
      }

      toast.success(
        asDraft
          ? "Broadcast saved as draft"
          : status === "scheduled"
          ? "Broadcast scheduled"
          : "Broadcast sent successfully"
      );

      resetForm();
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error creating broadcast:", error);
      toast.error("Failed to create broadcast");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId: string) => {
    try {
      const { error } = await supabase
        .from("brand_broadcasts")
        .delete()
        .eq("id", broadcastId);

      if (error) throw error;

      toast.success("Broadcast deleted");
      fetchData();
    } catch (error) {
      console.error("Error deleting broadcast:", error);
      toast.error("Failed to delete broadcast");
    }
  };

  const handleSendNow = async (broadcast: Broadcast) => {
    try {
      const { error } = await supabase
        .from("brand_broadcasts")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          scheduled_for: null
        })
        .eq("id", broadcast.id);

      if (error) throw error;

      toast.success("Broadcast sent");
      fetchData();
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast.error("Failed to send broadcast");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-muted/50">Draft</Badge>;
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Scheduled</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Sent</Badge>;
      default:
        return null;
    }
  };

  const getTargetLabel = (broadcast: Broadcast) => {
    switch (broadcast.target_type) {
      case "all":
        return "All creators";
      case "campaigns":
        return "Selected campaigns";
      case "boosts":
        return "Selected boosts";
      default:
        return "Unknown";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold">Broadcasts</h2>
          <p className="text-sm text-muted-foreground">
            Send announcements to creators in your campaigns
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Broadcast
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Create Broadcast</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Broadcast title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Message</Label>
                <Textarea
                  id="content"
                  placeholder="Write your announcement..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All creators in brand</SelectItem>
                    <SelectItem value="campaigns">Specific campaigns</SelectItem>
                    <SelectItem value="boosts">Specific boosts</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType === "campaigns" && campaigns.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Campaigns</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center gap-2">
                        <Checkbox
                          id={campaign.id}
                          checked={selectedCampaigns.includes(campaign.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                            } else {
                              setSelectedCampaigns(selectedCampaigns.filter((id) => id !== campaign.id));
                            }
                          }}
                        />
                        <label htmlFor={campaign.id} className="text-sm cursor-pointer">
                          {campaign.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {targetType === "boosts" && boosts.length > 0 && (
                <div className="space-y-2">
                  <Label>Select Boosts</Label>
                  <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                    {boosts.map((boost) => (
                      <div key={boost.id} className="flex items-center gap-2">
                        <Checkbox
                          id={boost.id}
                          checked={selectedBoosts.includes(boost.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBoosts([...selectedBoosts, boost.id]);
                            } else {
                              setSelectedBoosts(selectedBoosts.filter((id) => id !== boost.id));
                            }
                          }}
                        />
                        <label htmlFor={boost.id} className="text-sm cursor-pointer">
                          {boost.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Schedule (optional)</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[200px] justify-start text-left font-normal",
                          !scheduledDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={scheduledDate}
                        onSelect={setScheduledDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-[120px]"
                  />
                  {scheduledDate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setScheduledDate(undefined)}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleSendBroadcast(true)}
                  disabled={isSending}
                >
                  Save as Draft
                </Button>
                <Button
                  onClick={() => handleSendBroadcast(false)}
                  disabled={isSending}
                  className="gap-2"
                >
                  {scheduledDate ? (
                    <>
                      <Clock className="h-4 w-4" />
                      Schedule
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {broadcasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No broadcasts yet</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Create your first broadcast to reach creators
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((broadcast) => (
            <Card key={broadcast.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{broadcast.title}</h3>
                      {getStatusBadge(broadcast.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {broadcast.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {getTargetLabel(broadcast)}
                      </span>
                      {broadcast.status === "sent" && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {broadcast.read_count || 0} read
                        </span>
                      )}
                      {broadcast.scheduled_for && broadcast.status === "scheduled" && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Scheduled for {format(new Date(broadcast.scheduled_for), "PPP 'at' p")}
                        </span>
                      )}
                      {broadcast.sent_at && (
                        <span>
                          Sent {format(new Date(broadcast.sent_at), "PPP 'at' p")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(broadcast.status === "draft" || broadcast.status === "scheduled") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNow(broadcast)}
                        className="gap-1"
                      >
                        <Send className="h-3 w-3" />
                        Send Now
                      </Button>
                    )}
                    {broadcast.status !== "sent" && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteBroadcast(broadcast.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
